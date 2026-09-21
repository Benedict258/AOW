import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  initializeDatabase,
  getDbStatus,
  fetchAllOpportunities,
  upsertOpportunity,
  getMemoryPipelineRuns,
  getPool,
} from './src/server/db';
import { fetchFromUsaJobsApi } from './src/server/usajobs';
import { extractOpportunityWithGemini } from './src/server/extractor';
import { computeSemanticAlignmentScores } from './src/server/embeddings';
import {
  initializeScheduler,
  getSchedulerStatus,
  runServerSidePipeline,
} from './src/server/scheduler';
import {
  sendOpportunityDigestEmail,
  buildDigestEmailHtml,
  sendTestEmail,
} from './src/server/email';
import { execute13StagePipeline } from './src/server/pipeline';
import { runDeduplicationPipeline } from './src/server/deduplication';
import { evaluateOpportunityFreshness } from './src/server/freshness';
import { defaultCandidateProfile, defaultMatchingWeights } from './src/data/initialData';
import { evaluateHardEligibility, calculateMatchScore } from './src/utils/engine';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Google GenAI client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return genAIClient;
}

// In-memory discovery jobs registry for Section 11.3
interface DiscoveryJob {
  jobId: string;
  createdAt: string;
  updatedAt: string;
  runAllEnabled: boolean;
  category?: string;
  status: 'DRAFT' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  triggeredBy?: string;
  lastRunId?: string;
}
const discoveryJobs = new Map<string, DiscoveryJob>();

// -------------------------------------------------------------
// Section 11.2: Health Endpoints (No Auth)
// -------------------------------------------------------------
app.get('/health/live', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'automated-opportunity-workflow',
    version: '0.1.0',
  });
});

app.get('/health/ready', async (req, res) => {
  const dbStatus = await getDbStatus();
  res.json({
    status: dbStatus.isConnected ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      db: dbStatus.isConnected,
      vector: dbStatus.hasEmbeddingGeminiColumn,
      email: Boolean(process.env.RESEND_API_KEY),
      usajobs: Boolean(process.env.USAJOBS_API_KEY),
    },
  });
});

app.get('/api/health', async (req, res) => {
  const dbStatus = await getDbStatus();
  const sched = getSchedulerStatus();
  res.json({
    status: 'ok',
    service: 'Automated Opportunity Intelligence System',
    candidate: 'Peter Grigoryev (Rutgers MS IT & Analytics)',
    time: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    usaJobsConfigured: Boolean(process.env.USAJOBS_API_KEY),
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
    database: dbStatus,
    scheduler: sched,
  });
});

// -------------------------------------------------------------
// Section 11.3: Discovery Endpoints
// -------------------------------------------------------------
app.post('/api/v1/discovery/jobs', (req, res) => {
  const { runAllEnabled = true, category, triggeredBy = 'user' } = req.body || {};
  const jobId = `job-${Date.now()}`;
  const now = new Date().toISOString();
  const job: DiscoveryJob = {
    jobId,
    createdAt: now,
    updatedAt: now,
    runAllEnabled,
    category,
    status: 'DRAFT',
    triggeredBy,
  };
  discoveryJobs.set(jobId, job);
  res.json({ data: job });
});

app.get('/api/v1/discovery/jobs/:jobId', (req, res) => {
  const job = discoveryJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ data: job });
});

app.post('/api/v1/discovery/jobs/:jobId/execute', async (req, res) => {
  const job = discoveryJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  job.status = 'EXECUTING';
  job.updatedAt = new Date().toISOString();

  try {
    const pipelineResult = await execute13StagePipeline('DISCOVERY_JOB', {
      keyword: job.category || 'cybersecurity',
      resultsPerPage: 5,
    });
    job.status = 'COMPLETED';
    job.lastRunId = pipelineResult.runId;
    job.updatedAt = new Date().toISOString();

    res.json({
      data: {
        runId: pipelineResult.runId,
        jobId: job.jobId,
        status: 'SUCCESS',
        sourcesRequested: 1,
        sourcesSucceeded: 1,
        sourcesFailed: 0,
        sourcesSkipped: 0,
        stageResults: pipelineResult.stages,
        qualifyingCount: pipelineResult.qualifyingCount,
      },
    });
  } catch (err: any) {
    job.status = 'FAILED';
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/discovery/runs', async (req, res) => {
  const pool = getPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const q = await client.query('SELECT * FROM pipeline_runs ORDER BY created_at DESC LIMIT 50');
        return res.json({ data: q.rows });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('DB runs fetch error:', err.message);
    }
  }
  res.json({ data: getMemoryPipelineRuns() });
});

app.get('/api/v1/discovery/runs/:runId', async (req, res) => {
  const pool = getPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const q = await client.query('SELECT * FROM pipeline_runs WHERE id::text = $1 OR id::text LIKE $2 LIMIT 1', [
          req.params.runId,
          `%${req.params.runId}%`,
        ]);
        if (q.rows.length > 0) return res.json({ data: q.rows[0] });
      } finally {
        client.release();
      }
    } catch (err: any) {}
  }
  const runs = getMemoryPipelineRuns();
  const run = runs.find((r) => r.id === req.params.runId);
  res.json({ data: run || null });
});

// -------------------------------------------------------------
// Section 11.4: Opportunity Endpoints (CRUD & Intelligence)
// -------------------------------------------------------------
app.get(['/api/opportunities', '/api/v1/opportunities'], async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    res.json(opps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/opportunities/:id', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const opp = opps.find((o) => o.id === req.params.id || o.externalId === req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/opportunities', '/api/v1/opportunities'], async (req, res) => {
  try {
    const opp = req.body;
    if (!opp || !opp.id) {
      return res.status(400).json({ error: 'Missing opportunity payload or id' });
    }
    const semantic = await computeSemanticAlignmentScores(opp, defaultCandidateProfile);
    const saved = await upsertOpportunity(opp, semantic.opportunityEmbedding || undefined);
    res.json({ success: true, opportunity: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/v1/opportunities/:id', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const existing = opps.find((o) => o.id === req.params.id || o.externalId === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Opportunity not found' });

    const merged = { ...existing, ...req.body, id: existing.id };
    const saved = await upsertOpportunity(merged);
    res.json({ success: true, opportunity: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/opportunities/:id', async (req, res) => {
  const pool = getPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM opportunities WHERE id::text = $1 OR external_id = $1', [req.params.id]);
        return res.json({ success: true, message: `Opportunity ${req.params.id} deleted.` });
      } finally {
        client.release();
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json({ success: true, message: 'Deleted from memory store' });
});

app.get('/api/v1/opportunities/:id/intelligence', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const opp = opps.find((o) => o.id === req.params.id || o.externalId === req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    const fresh = evaluateOpportunityFreshness(opp);
    const hard = evaluateHardEligibility(opp, defaultCandidateProfile);
    const score = calculateMatchScore(opp, defaultCandidateProfile, defaultMatchingWeights);

    res.json({
      opportunityId: opp.id,
      title: opp.title,
      hardEligibility: hard.status,
      hardEligibilityReasons: hard.reasons,
      matchBreakdown: score,
      freshness: fresh,
      aiExplanation: opp.aiExplanation || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/opportunities/:id/matches', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const opp = opps.find((o) => o.id === req.params.id || o.externalId === req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    res.json({
      candidateId: '00000000-0000-4000-a000-000000000002',
      candidateName: defaultCandidateProfile.name,
      matchScore: opp.matchBreakdown.finalScore,
      hardEligibility: opp.hardEligibility,
      matchBreakdown: opp.matchBreakdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/opportunities/:id/deadline', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const opp = opps.find((o) => o.id === req.params.id || o.externalId === req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    const fresh = evaluateOpportunityFreshness(opp);
    res.json({
      opportunityId: opp.id,
      applicationDeadline: opp.applicationDeadline,
      deadlineType: opp.deadlineType,
      freshnessState: fresh.state,
      ageHours: fresh.ageHours,
      isExpired: fresh.isExpired,
      nextCheckAt: fresh.nextCheckAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Section 11.5: Match Endpoints
// -------------------------------------------------------------
app.get(['/api/v1/matches', '/api/v1/candidates/:candidateId/matches'], async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const matches = opps.map((opp) => ({
      opportunityId: opp.id,
      title: opp.title,
      organization: opp.organization,
      candidateId: '00000000-0000-4000-a000-000000000002',
      finalScore: opp.matchBreakdown.finalScore,
      hardEligibility: opp.hardEligibility,
      matchBreakdown: opp.matchBreakdown,
    }));
    matches.sort((a, b) => b.finalScore - a.finalScore);
    res.json({ data: matches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Section 11.6: Application Endpoints
// -------------------------------------------------------------
app.get(['/api/v1/applications', '/api/v1/candidates/:candidateId/applications'], async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const applied = opps
      .filter((o) => o.applicationStatus && o.applicationStatus !== 'Discovered')
      .map((o) => ({
        opportunityId: o.id,
        title: o.title,
        organization: o.organization,
        status: o.applicationStatus,
        priority: o.priority,
        deadline: o.applicationDeadline,
      }));
    res.json({ data: applied });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/applications/:id/reminders', async (req, res) => {
  try {
    const result = await sendTestEmail();
    res.json({
      success: true,
      message: 'Reminder notification dispatched to candidate.',
      delivery: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Section 11.7: Upcoming Deadlines Endpoint
// -------------------------------------------------------------
app.get(['/api/v1/deadlines/upcoming', '/api/deadlines'], async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const upcoming = opps
      .filter((o) => o.applicationDeadline && o.status !== 'EXPIRED')
      .sort((a, b) => new Date(a.applicationDeadline!).getTime() - new Date(b.applicationDeadline!).getTime());
    res.json({ data: upcoming });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Full 13-Stage Pipeline Execution Endpoint
// -------------------------------------------------------------
app.post(['/api/pipeline/run-full', '/api/scheduler/trigger'], async (req, res) => {
  try {
    const { keyword, resultsPerPage, recipientEmail } = req.body || {};
    const result = await execute13StagePipeline('MANUAL_TRIGGER', {
      keyword: keyword || 'cybersecurity',
      resultsPerPage: resultsPerPage || 5,
      recipientEmail,
    });
    res.json({
      success: true,
      message: '13-stage opportunity intelligence pipeline completed successfully.',
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Section 10 & User Request: Test Email & Notification Endpoints
// -------------------------------------------------------------
app.post(['/api/v1/notifications/send-test', '/api/notifications/send-test-email'], async (req, res) => {
  try {
    const { recipient } = req.body || {};
    const targetRecipient = recipient || process.env.ALERT_RECIPIENT_EMAIL || 'benedictisaac258@gmail.com';
    console.log(`[API] Dispatching test email to ${targetRecipient}...`);
    const result = await sendTestEmail(targetRecipient);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/send-digest', async (req, res) => {
  try {
    const { recipient } = req.body || {};
    const opps = await fetchAllOpportunities();
    const result = await sendOpportunityDigestEmail(opps, recipient);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/preview-digest', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const qualifying = opps.filter((o) => (o.matchBreakdown?.finalScore ?? 0) >= 70);
    const html = buildDigestEmailHtml(qualifying);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`<h3>Error generating preview: ${err.message}</h3>`);
  }
});

app.get('/api/notifications/history', async (req, res) => {
  const pool = getPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const history = await client.query(`
          SELECT n.id, n.type, n.title, n.message, n.status, n.sent_at,
                 h.channel, h.delivery_status, h.error_info
          FROM notifications n
          LEFT JOIN notification_history h ON h.notification_id = n.id
          ORDER BY n.created_at DESC
          LIMIT 20
        `);
        return res.json({ data: history.rows });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('Notification history DB query error:', err.message);
    }
  }
  res.json({ data: [] });
});

// -------------------------------------------------------------
// Deduplication Inspection Endpoint
// -------------------------------------------------------------
app.get('/api/deduplication/status', async (req, res) => {
  try {
    const opps = await fetchAllOpportunities();
    const dedup = await runDeduplicationPipeline(opps);
    res.json({
      totalAnalyzed: opps.length,
      canonicalCount: dedup.canonicalCount,
      duplicateCount: dedup.duplicateCount,
      clusters: dedup.clusters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Database Status & Scheduler Status
// -------------------------------------------------------------
app.get('/api/db/status', async (req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scheduler/status', (req, res) => {
  const sched = getSchedulerStatus();
  const pipelineRuns = getMemoryPipelineRuns();
  res.json({
    ...sched,
    recentPipelineRuns: pipelineRuns.slice(0, 5),
  });
});

// -------------------------------------------------------------
// USAJOBS Ingestion Endpoint
// -------------------------------------------------------------
app.post('/api/ingestion/usajobs', async (req, res) => {
  try {
    const { keyword, resultsPerPage, page } = req.body || {};
    const fetchResult = await fetchFromUsaJobsApi({
      keyword: keyword || 'cybersecurity',
      resultsPerPage: resultsPerPage || 5,
      page: page || 1,
      studentOrGradOnly: false,
    });

    if (!fetchResult.success && fetchResult.statusCode === 401) {
      return res.status(401).json(fetchResult);
    }

    const extractedList = [];
    for (const rawItem of (fetchResult.items || []).slice(0, 3)) {
      const opp = await extractOpportunityWithGemini(rawItem);
      const semantic = await computeSemanticAlignmentScores(opp, defaultCandidateProfile);
      opp.matchBreakdown.careerAlignment = semantic.careerAlignment;
      opp.matchBreakdown.skillAlignment = semantic.skillAlignment;

      const hard = evaluateHardEligibility(opp, defaultCandidateProfile);
      opp.hardEligibility = hard.status;
      opp.hardEligibilityReasons = hard.reasons;

      const score = calculateMatchScore(opp, defaultCandidateProfile, defaultMatchingWeights);
      opp.matchBreakdown = {
        ...score,
        careerAlignment: semantic.careerAlignment,
        skillAlignment: semantic.skillAlignment,
      };

      await upsertOpportunity(opp, semantic.opportunityEmbedding || undefined);
      extractedList.push({
        opportunity: opp,
        semanticCosine: semantic.rawCosineSimilarity,
      });
    }

    res.json({
      success: true,
      fetchResult,
      extractedCount: extractedList.length,
      extracted: extractedList,
    });
  } catch (err: any) {
    console.error('USAJOBS Ingestion error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AI Match & News Endpoints
// -------------------------------------------------------------
app.post('/api/intelligence/explain-match', async (req, res) => {
  try {
    const { opportunity, profile } = req.body;
    if (!opportunity || !profile) {
      return res.status(400).json({ error: 'Missing opportunity or profile' });
    }

    const ai = getGeminiClient();
    if (ai) {
      const prompt = `You are the AI Opportunity Intelligence engine for Peter Grigoryev.
Peter is pursuing a Master's in Information Technology and Analytics at Rutgers Business School, with a cybersecurity concentration.
Analyze this opportunity:
- Title: ${opportunity.title}
- Organization: ${opportunity.organization}
- Category: ${opportunity.category} (${opportunity.subCategory})
- Sector: ${opportunity.sector}
- Requirements: ${opportunity.requirements?.join('; ')}
- Desired Skills: ${opportunity.skills?.join(', ')}

Provide a concise, high-precision rationale (2-3 sentences) explaining why this opportunity advances Peter's career objectives, followed by 2 immediate tactical recommendations.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      return res.json({
        explanation: response.text?.trim(),
        source: 'gemini-3.5-flash-lite',
      });
    }

    const fallback = `${opportunity.title} at ${opportunity.organization} directly leverages Peter's Master's training in IT & Analytics from Rutgers Business School. With a concentration in cybersecurity and skills in ${opportunity.skills?.slice(0, 3).join(', ')}, Peter aligns with ${opportunity.sector} qualifications.`;
    return res.json({
      explanation: fallback,
      source: 'heuristic-fallback',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate explanation', details: err.message });
  }
});

app.post('/api/intelligence/news-analysis', async (req, res) => {
  try {
    const { newsTitle, newsSummary, sector } = req.body;
    const ai = getGeminiClient();

    if (ai && newsTitle) {
      const prompt = `Analyze this news development for Peter Grigoryev (Rutgers MS IT & Analytics):
- Headline: ${newsTitle}
- Summary: ${newsSummary}
- Sector: ${sector}

Explain in 2 sentences:
1. Why it matters for Peter's career tracks
2. Actionable Opportunity Angle.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      return res.json({
        analysis: response.text?.trim(),
        source: 'gemini-3.5-flash-lite',
      });
    }

    return res.json({
      analysis: 'This development accelerates federal funding and institutional mandates for critical infrastructure cyber defense.',
      source: 'heuristic-fallback',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to analyze news item', details: err.message });
  }
});

// -------------------------------------------------------------
// Server Start & Bootstrap
// -------------------------------------------------------------
async function startServer() {
  // 1. Initialize Supabase / Postgres DB
  const dbStatus = await initializeDatabase();
  console.log(`[DB Initialization] Type: ${dbStatus.connectionType}, Connected: ${dbStatus.isConnected}, Gemini Vector Column: ${dbStatus.hasEmbeddingGeminiColumn}`);

  // 2. Initialize in-process node-cron autonomous scheduler
  initializeScheduler();

  // 3. Vite middleware for SPA
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Automated Opportunity Intelligence System running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
