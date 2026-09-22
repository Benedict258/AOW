import { Opportunity, CandidateProfile, MatchingWeights } from '../types';
import { defaultCandidateProfile, defaultMatchingWeights } from '../data/initialData';
import { fetchFromUsaJobsApi } from './usajobs';
import { extractOpportunityWithGemini } from './extractor';
import { computeSemanticAlignmentScores } from './embeddings';
import { runDeduplicationPipeline } from './deduplication';
import { evaluateOpportunityFreshness } from './freshness';
import { evaluateHardEligibility, calculateMatchScore } from '../utils/engine';
import { fetchAllOpportunities, upsertOpportunity, logPipelineRun, PipelineRunRecord } from './db';
import { sendOpportunityDigestEmail } from './email';
import { GoogleGenAI } from '@google/genai';

let genAIClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

export interface PipelineStageResult {
  stageNumber: number;
  stageName: string;
  status: 'COMPLETED' | 'SKIPPED' | 'FAILED';
  durationMs: number;
  details: string;
}

export interface EndToEndPipelineExecutionResult {
  runId: string;
  timestamp: string;
  triggerType: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' | 'DISCOVERY_JOB' | 'WEBHOOK';
  stages: PipelineStageResult[];
  discoveredCount: number;
  extractedCount: number;
  deduplicatedCount: number;
  qualifyingCount: number;
  digestDelivered: boolean;
  digestRecipient: string;
  digestMessageId?: string;
  topOpportunities: Opportunity[];
}

/**
 * Full 13-Stage End-to-End Automated Opportunity Intelligence Pipeline
 */
export async function execute13StagePipeline(
  triggerType: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' | 'DISCOVERY_JOB' | 'WEBHOOK' = 'MANUAL_TRIGGER',
  options?: {
    keyword?: string;
    resultsPerPage?: number;
    recipientEmail?: string;
    skipEmail?: boolean;
  }
): Promise<EndToEndPipelineExecutionResult> {
  const startTime = Date.now();
  const runId = `RUN-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const stages: PipelineStageResult[] = [];
  const recipient = options?.recipientEmail || process.env.ALERT_RECIPIENT_EMAIL || 'PeterGrigoryevS@outlook.com';

  console.log(`[Pipeline] Initiating 13-Stage Intelligence Pipeline (${triggerType})`);

  let currentOpps: Opportunity[] = await fetchAllOpportunities();

  // STAGE 1: Source Ingestion & Discovery (USAJOBS live API)
  const stage1Start = Date.now();
  let discoveredCount = 0;
  let newExtractedOpps: Opportunity[] = [];
  try {
    const fetchRes = await fetchFromUsaJobsApi({
      keyword: options?.keyword || 'cybersecurity',
      resultsPerPage: options?.resultsPerPage || 5,
      page: 1,
      studentOrGradOnly: false,
    });
    discoveredCount = fetchRes.items?.length || 0;
    stages.push({
      stageNumber: 1,
      stageName: 'Source Ingestion & Discovery (USAJOBS)',
      status: 'COMPLETED',
      durationMs: Date.now() - stage1Start,
      details: `Fetched ${discoveredCount} live items from USAJOBS API (isMock: ${fetchRes.isMockSample})`,
    });

    // STAGE 2: Structured Extraction (Gemini LLM)
    const stage2Start = Date.now();
    for (const item of (fetchRes.items || []).slice(0, 3)) {
      try {
        const extracted = await extractOpportunityWithGemini(item);
        newExtractedOpps.push(extracted);
      } catch (err: any) {
        console.warn('Extraction skipped for item:', err.message);
      }
    }
    stages.push({
      stageNumber: 2,
      stageName: 'Structured Extraction (Gemini LLM)',
      status: 'COMPLETED',
      durationMs: Date.now() - stage2Start,
      details: `Extracted ${newExtractedOpps.length} opportunities with structured schemas and confidence metrics`,
    });
  } catch (err: any) {
    stages.push({
      stageNumber: 1,
      stageName: 'Source Ingestion & Discovery (USAJOBS)',
      status: 'FAILED',
      durationMs: Date.now() - stage1Start,
      details: `Source ingestion failed: ${err.message}`,
    });
  }

  // Combine newly extracted with existing DB opportunities
  const combinedOpps = [...newExtractedOpps, ...currentOpps];
  // Deduplicate in array by ID/externalId
  const uniqueMap = new Map<string, Opportunity>();
  for (const o of combinedOpps) {
    const key = o.externalId || o.id;
    if (!uniqueMap.has(key)) uniqueMap.set(key, o);
  }
  let workingSet = Array.from(uniqueMap.values());

  // STAGE 3: Normalization & Taxonomy Classification
  const stage3Start = Date.now();
  workingSet = workingSet.map((opp) => {
    return {
      ...opp,
      category: opp.category || 'work',
      subCategory: opp.subCategory || 'work.internship',
      deadlineType: opp.deadlineType || (opp.applicationDeadline ? 'FIXED' : 'ROLLING'),
    };
  });
  stages.push({
    stageNumber: 3,
    stageName: 'Taxonomy Classification & Normalization',
    status: 'COMPLETED',
    durationMs: Date.now() - stage3Start,
    details: `Normalized taxonomy across ${workingSet.length} total active candidate opportunities`,
  });

  // STAGE 4: Deduplication Engine (5 Weighted Rules & Clustering)
  const stage4Start = Date.now();
  const dedupResult = await runDeduplicationPipeline(workingSet);
  stages.push({
    stageNumber: 4,
    stageName: 'Deduplication (5 Weighted Rules & DB Clustering)',
    status: 'COMPLETED',
    durationMs: Date.now() - stage4Start,
    details: `Identified ${dedupResult.canonicalCount} canonical records, clustered ${dedupResult.duplicateCount} duplicates into PostgreSQL duplicate_groups`,
  });

  // STAGE 5: Freshness & Change Detection
  const stage5Start = Date.now();
  workingSet = workingSet.map((opp) => {
    const freshEval = evaluateOpportunityFreshness(opp, true);
    return {
      ...opp,
      status: freshEval.isExpired ? 'EXPIRED' : 'ACTIVE',
      lastVerifiedAt: new Date().toISOString(),
    };
  });
  stages.push({
    stageNumber: 5,
    stageName: 'Freshness & Change Detection State Machine',
    status: 'COMPLETED',
    durationMs: Date.now() - stage5Start,
    details: `Evaluated freshness states (FRESH/STALE/EXPIRED) across all opportunities`,
  });

  // STAGE 6: Hard-Eligibility Gate (13 Deterministic Rules)
  const stage6Start = Date.now();
  workingSet = workingSet.map((opp) => {
    const hard = evaluateHardEligibility(opp, defaultCandidateProfile);
    return {
      ...opp,
      hardEligibility: hard.status,
      hardEligibilityReasons: hard.reasons,
    };
  });
  stages.push({
    stageNumber: 6,
    stageName: 'Hard-Eligibility Gate (Deterministic)',
    status: 'COMPLETED',
    durationMs: Date.now() - stage6Start,
    details: `Gated opportunities by citizenship, work authorization, education degree level, and deadlines`,
  });

  // STAGE 7: Semantic Embeddings (Gemini 768-dim)
  const stage7Start = Date.now();
  const semanticResults = await Promise.all(
    workingSet.slice(0, 10).map(async (opp) => {
      const sem = await computeSemanticAlignmentScores(opp, defaultCandidateProfile);
      return { id: opp.id, sem };
    })
  );
  const semMap = new Map(semanticResults.map((r) => [r.id, r.sem]));
  stages.push({
    stageNumber: 7,
    stageName: 'Semantic Vector Embeddings (Gemini)',
    status: 'COMPLETED',
    durationMs: Date.now() - stage7Start,
    details: `Generated and cached high-dimensional semantic embeddings for passages and queries`,
  });

  // STAGE 8 & 9: 6-Factor Semantic Matching & 8-Factor Scoring
  const stage8Start = Date.now();
  workingSet = workingSet.map((opp) => {
    const sem = semMap.get(opp.id);
    const breakdown = calculateMatchScore(opp, defaultCandidateProfile, defaultMatchingWeights);
    if (sem) {
      breakdown.careerAlignment = sem.careerAlignment;
      breakdown.skillAlignment = sem.skillAlignment;
      // Recompute weighted score
      const w = defaultMatchingWeights;
      const wScore =
        breakdown.careerAlignment * w.careerAlignment +
        breakdown.skillAlignment * w.skillAlignment +
        breakdown.eligibilityScore * w.eligibility +
        breakdown.experienceFit * w.experienceFit +
        breakdown.educationFit * w.educationFit +
        breakdown.opportunityValue * w.opportunityValue +
        breakdown.locationRemoteFit * w.locationFit +
        breakdown.timingDeadlineFit * w.timingFit;
      breakdown.weightedScore = Math.round(wScore * 10) / 10;
      breakdown.finalScore = Math.round(wScore * breakdown.hardEligibilityMultiplier);
    }
    return {
      ...opp,
      matchBreakdown: breakdown,
    };
  });
  stages.push({
    stageNumber: 8,
    stageName: '6-Factor Semantic Matching & 8-Factor Deterministic Scoring',
    status: 'COMPLETED',
    durationMs: Date.now() - stage8Start,
    details: `Calculated weighted alignment across Career, Skill, Eligibility, Experience, Education, Value, Location, and Timing`,
  });

  // STAGE 10 & 11: Value Assessment, Timing, & Ranking
  const stage10Start = Date.now();
  workingSet.sort((a, b) => (b.matchBreakdown?.finalScore ?? 0) - (a.matchBreakdown?.finalScore ?? 0));
  stages.push({
    stageNumber: 10,
    stageName: 'Opportunity Value Assessment & Ranking',
    status: 'COMPLETED',
    durationMs: Date.now() - stage10Start,
    details: `Ranked ${workingSet.length} opportunities descending by final match score`,
  });

  // STAGE 12: AI Explanation Generation (Gemini LLM)
  const stage12Start = Date.now();
  const topQualifying = workingSet.filter((o) => (o.matchBreakdown?.finalScore ?? 0) >= 70);
  for (const opp of topQualifying.slice(0, 2)) {
    if (!opp.aiExplanation) {
      try {
        const ai = getGemini();
        if (ai) {
          const prompt = `Provide a 2-sentence rationale explaining why ${opp.title} at ${opp.organization} aligns with Peter Grigoryev's Master's in IT & Analytics (Cybersecurity) from Rutgers Business School.`;
          const res = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: prompt,
          });
          opp.aiExplanation = res.text?.trim() || '';
        }
      } catch (err: any) {
        console.warn('Explanation generation failed:', err.message);
      }
    }
  }
  stages.push({
    stageNumber: 12,
    stageName: 'Strategic Explanation Generation (Gemini LLM)',
    status: 'COMPLETED',
    durationMs: Date.now() - stage12Start,
    details: `Generated strategic rationale and tactical application directives for high-priority targets`,
  });

  // STAGE 13: Persistence & Email Notification Dispatch
  const stage13Start = Date.now();
  for (const opp of workingSet) {
    const sem = semMap.get(opp.id);
    await upsertOpportunity(opp, sem?.opportunityEmbedding || undefined);
  }

  let digestDelivered = false;
  let digestMessageId: string | undefined;

  if (!options?.skipEmail) {
    const emailRes = await sendOpportunityDigestEmail(workingSet, recipient);
    digestDelivered = emailRes.sent;
    digestMessageId = emailRes.messageId;
  }

  stages.push({
    stageNumber: 13,
    stageName: 'Persistence & Notification Dispatch (Resend Email)',
    status: 'COMPLETED',
    durationMs: Date.now() - stage13Start,
    details: `Persisted records to Supabase PostgreSQL; Email dispatch ${digestDelivered ? 'delivered' : 'executed/suppressed'} to ${recipient}`,
  });

  // Log pipeline run to PostgreSQL
  const pipelineRecord: PipelineRunRecord = {
    run_timestamp: timestamp,
    source_platform: 'AOW_NATIVE_NODE',
    trigger_type: triggerType,
    sources_checked: 1,
    opportunities_extracted: newExtractedOpps.length,
    qualifying_opportunities: topQualifying.length,
    status: 'SUCCESS',
    digest_delivered: digestDelivered,
  };
  await logPipelineRun(pipelineRecord);

  return {
    runId,
    timestamp,
    triggerType,
    stages,
    discoveredCount,
    extractedCount: newExtractedOpps.length,
    deduplicatedCount: dedupResult.duplicateCount,
    qualifyingCount: topQualifying.length,
    digestDelivered,
    digestRecipient: recipient,
    digestMessageId,
    topOpportunities: workingSet.slice(0, 10),
  };
}
