import cron from 'node-cron';
import { fetchFromUsaJobsApi } from './usajobs';
import { extractOpportunityWithGemini } from './extractor';
import { computeSemanticAlignmentScores } from './embeddings';
import { defaultCandidateProfile, defaultMatchingWeights } from '../data/initialData';
import { evaluateHardEligibility, calculateMatchScore } from '../utils/engine';
import {
  fetchAllOpportunities,
  upsertOpportunity,
  logPipelineRun,
  PipelineRunRecord,
} from './db';
import { sendOpportunityDigestEmail, DigestDeliveryResult } from './email';
import { Opportunity } from '../types';

export interface SchedulerState {
  cronPattern: string;
  scheduleDescription: string;
  isActive: boolean;
  lastRunTime: string | null;
  nextRunTime: string;
  totalRunsCompleted: number;
  lastRunResult: {
    timestamp: string;
    triggerType: string;
    itemsFetched: number;
    itemsExtracted: number;
    qualifyingCount: number;
    digestResult?: DigestDeliveryResult;
    error?: string | null;
  } | null;
}

let lastRunTime: string | null = null;
let totalRunsCompleted = 0;
let isCurrentlyExecuting = false;
let lastRunResult: SchedulerState['lastRunResult'] = null;
let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

// Helper to calculate the next Mon/Wed/Fri at 8:00 AM
export function calculateNextScheduledRun(): string {
  const now = new Date();
  const target = new Date(now);
  target.setHours(8, 0, 0, 0);

  // Target days: 1 = Monday, 3 = Wednesday, 5 = Friday
  const targetDays = [1, 3, 5];

  for (let i = 0; i < 8; i++) {
    const day = target.getDay();
    if (targetDays.includes(day) && target.getTime() > now.getTime()) {
      return target.toISOString();
    }
    target.setDate(target.getDate() + 1);
    target.setHours(8, 0, 0, 0);
  }

  return target.toISOString();
}

export async function runServerSidePipeline(
  triggerType: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' = 'MANUAL_TRIGGER'
): Promise<{
  success: boolean;
  opportunities: Opportunity[];
  stats: {
    itemsFetched: number;
    itemsExtracted: number;
    qualifyingCount: number;
  };
  digestResult: DigestDeliveryResult;
  error?: string;
}> {
  if (isCurrentlyExecuting) {
    throw new Error('Pipeline run is already in progress.');
  }

  isCurrentlyExecuting = true;
  const startTime = new Date().toISOString();
  console.log(`[Pipeline] Starting autonomous intelligence cycle (${triggerType}) at ${startTime}`);

  try {
    // 1. Ingest from USAJOBS API
    const fetchResult = await fetchFromUsaJobsApi({
      keyword: 'cybersecurity',
      resultsPerPage: 5,
      studentOrGradOnly: true,
    });

    console.log(`[Pipeline Ingestion] Found ${fetchResult.items.length} items from USAJOBS (isMockSample: ${fetchResult.isMockSample})`);

    const extractedList: Opportunity[] = [];

    // 2. Structured Extraction & Embedding for each item
    for (const rawItem of fetchResult.items) {
      try {
        const opp = await extractOpportunityWithGemini(rawItem);

        // 3. Embed & Semantic Match
        const semantic = await computeSemanticAlignmentScores(opp, defaultCandidateProfile);
        opp.matchBreakdown.careerAlignment = semantic.careerAlignment;
        opp.matchBreakdown.skillAlignment = semantic.skillAlignment;

        // 4. Deterministic Hard Gate & Multi-Factor Scoring
        const hard = evaluateHardEligibility(opp, defaultCandidateProfile);
        opp.hardEligibility = hard.status;
        opp.hardEligibilityReasons = hard.reasons;

        const finalScoreBreakdown = calculateMatchScore(
          opp,
          defaultCandidateProfile,
          defaultMatchingWeights
        );
        opp.matchBreakdown = {
          ...finalScoreBreakdown,
          careerAlignment: semantic.careerAlignment,
          skillAlignment: semantic.skillAlignment,
        };

        // 5. Persist to Supabase / PostgreSQL table with embedding_gemini column
        await upsertOpportunity(opp, semantic.opportunityEmbedding || undefined);
        extractedList.push(opp);
      } catch (itemErr: any) {
        console.error('[Pipeline] Error processing listing item:', itemErr);
      }
    }

    // 6. Gather all current opportunities for qualification & digest
    const allOpps = await fetchAllOpportunities();
    const qualifyingOpps = allOpps.filter((o) => o.matchBreakdown.finalScore >= 70);

    // 7. Deliver real notification digest
    const digestResult = await sendOpportunityDigestEmail(allOpps);

    // 8. Log run to pipeline_runs table
    const runRecord: PipelineRunRecord = {
      run_timestamp: startTime,
      source_platform: 'AOW_NATIVE_NODE',
      trigger_type: triggerType,
      sources_checked: 1,
      opportunities_extracted: extractedList.length,
      qualifying_opportunities: qualifyingOpps.length,
      status: 'SUCCESS',
      digest_delivered: digestResult.sent,
    };
    await logPipelineRun(runRecord);

    totalRunsCompleted++;
    lastRunTime = new Date().toISOString();
    lastRunResult = {
      timestamp: lastRunTime,
      triggerType,
      itemsFetched: fetchResult.items.length,
      itemsExtracted: extractedList.length,
      qualifyingCount: qualifyingOpps.length,
      digestResult,
      error: null,
    };

    console.log(`[Pipeline] Completed successfully. ${extractedList.length} processed, ${qualifyingOpps.length} qualify.`);

    return {
      success: true,
      opportunities: allOpps,
      stats: {
        itemsFetched: fetchResult.items.length,
        itemsExtracted: extractedList.length,
        qualifyingCount: qualifyingOpps.length,
      },
      digestResult,
    };
  } catch (err: any) {
    console.error('[Pipeline] Failure in autonomous pipeline execution:', err);
    lastRunResult = {
      timestamp: new Date().toISOString(),
      triggerType,
      itemsFetched: 0,
      itemsExtracted: 0,
      qualifyingCount: 0,
      error: err.message,
    };

    await logPipelineRun({
      run_timestamp: startTime,
      source_platform: 'AOW_NATIVE_NODE',
      trigger_type: triggerType,
      sources_checked: 1,
      opportunities_extracted: 0,
      qualifying_opportunities: 0,
      status: 'FAILED',
      error_details: err.message,
      digest_delivered: false,
    });

    throw err;
  } finally {
    isCurrentlyExecuting = false;
  }
}

export function initializeScheduler(): void {
  // Cron schedule: Mon, Wed, Fri at 8:00 AM (0 8 * * 1,3,5)
  const CRON_SCHEDULE = '0 8 * * 1,3,5';

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('[Scheduler] Cron trigger activated for Mon/Wed/Fri 8:00 AM.');
      try {
        await runServerSidePipeline('SCHEDULED_CRON');
      } catch (err: any) {
        console.error('[Scheduler] Cron run failed:', err.message);
      }
    },
    {
      timezone: 'America/New_York',
    }
  );

  console.log(`[Scheduler] Registered autonomous cron job: ${CRON_SCHEDULE} (Mon/Wed/Fri 8:00 AM ET)`);
}

export function getSchedulerStatus(): SchedulerState {
  return {
    cronPattern: '0 8 * * 1,3,5',
    scheduleDescription: 'Monday, Wednesday, Friday at 8:00 AM ET',
    isActive: Boolean(scheduledTask),
    lastRunTime,
    nextRunTime: calculateNextScheduledRun(),
    totalRunsCompleted,
    lastRunResult,
  };
}
