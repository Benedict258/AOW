import pg from 'pg';
import crypto from 'crypto';
import { Opportunity, SourceRegistryItem } from '../types';
import { initialOpportunities, initialSourceRegistry } from '../data/initialData';

const { Pool } = pg;

export interface PipelineRunRecord {
  id?: string;
  run_timestamp: string;
  source_platform: string;
  trigger_type: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER';
  sources_checked: number;
  opportunities_extracted: number;
  qualifying_opportunities: number;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  error_details?: string | null;
  digest_delivered: boolean;
}

export interface DbStatus {
  isConfigured: boolean;
  isConnected: boolean;
  connectionType: 'supabase_postgres' | 'local_fallback_cache';
  hasEmbeddingGeminiColumn: boolean;
  error?: string;
  tableCounts?: {
    opportunities: number;
    sources: number;
    pipeline_runs: number;
  };
}

let pool: pg.Pool | null = null;
let isInitialized = false;
let hasGeminiColumn = false;
let lastDbError: string | null = null;

// Fallback in-memory/runtime store when external DB string is pending
let memoryOpportunities: Opportunity[] = [...initialOpportunities];
let memorySources: SourceRegistryItem[] = [...initialSourceRegistry];
let memoryPipelineRuns: PipelineRunRecord[] = [];

export function getDbConnectionString(): string | null {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || null;
}

export function getPool(): pg.Pool | null {
  const connectionString = getDbConnectionString();
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    try {
      pool = new Pool({
        connectionString,
        ssl: connectionString.includes('sslmode=disable')
          ? false
          : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
        lastDbError = err.message;
      });
    } catch (err: any) {
      console.error('Failed to initialize PostgreSQL pool:', err);
      lastDbError = err.message;
      pool = null;
    }
  }

  return pool;
}

export async function initializeDatabase(): Promise<DbStatus> {
  const connectionString = getDbConnectionString();
  if (!connectionString) {
    return {
      isConfigured: false,
      isConnected: false,
      connectionType: 'local_fallback_cache',
      hasEmbeddingGeminiColumn: false,
      error: 'DATABASE_URL or SUPABASE_DB_URL environment variable is not configured.',
      tableCounts: {
        opportunities: memoryOpportunities.length,
        sources: memorySources.length,
        pipeline_runs: memoryPipelineRuns.length,
      },
    };
  }

  const p = getPool();
  if (!p) {
    return {
      isConfigured: true,
      isConnected: false,
      connectionType: 'local_fallback_cache',
      hasEmbeddingGeminiColumn: false,
      error: lastDbError || 'Could not instantiate database pool.',
    };
  }

  try {
    const client = await p.connect();
    try {
      // 1. Check/Add embedding_gemini column alongside existing embedding column
      // Do NOT touch existing embedding column!
      await client.query(`
        DO $$
        BEGIN
          BEGIN
            CREATE EXTENSION IF NOT EXISTS vector;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS embedding_gemini VECTOR(768);
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'AOW_NATIVE_NODE';
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END $$;
      `);
      hasGeminiColumn = true;
      isInitialized = true;
      lastDbError = null;

      // Check counts
      const oppCountRes = await client.query('SELECT COUNT(*) FROM opportunities').catch(() => ({ rows: [{ count: 0 }] }));
      const srcCountRes = await client.query('SELECT COUNT(*) FROM sources').catch(() => ({ rows: [{ count: 0 }] }));
      const runsCountRes = await client.query('SELECT COUNT(*) FROM pipeline_runs').catch(() => ({ rows: [{ count: 0 }] }));

      return {
        isConfigured: true,
        isConnected: true,
        connectionType: 'supabase_postgres',
        hasEmbeddingGeminiColumn: hasGeminiColumn,
        tableCounts: {
          opportunities: parseInt(oppCountRes.rows[0]?.count || '0', 10),
          sources: parseInt(srcCountRes.rows[0]?.count || '0', 10),
          pipeline_runs: parseInt(runsCountRes.rows[0]?.count || '0', 10),
        },
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('PostgreSQL connection check failed:', err.message);
    lastDbError = err.message;
    return {
      isConfigured: true,
      isConnected: false,
      connectionType: 'local_fallback_cache',
      hasEmbeddingGeminiColumn: false,
      error: err.message,
      tableCounts: {
        opportunities: memoryOpportunities.length,
        sources: memorySources.length,
        pipeline_runs: memoryPipelineRuns.length,
      },
    };
  }
}

export async function getDbStatus(): Promise<DbStatus> {
  return initializeDatabase();
}

export async function fetchAllOpportunities(): Promise<Opportunity[]> {
  const p = getPool();
  if (!p) {
    return memoryOpportunities;
  }

  try {
    const client = await p.connect();
    try {
      const res = await client.query(`
        SELECT * FROM opportunities 
        ORDER BY created_at DESC NULLS LAST 
        LIMIT 200
      `);

      if (res.rows.length === 0) {
        return memoryOpportunities;
      }

      // Map rows from existing Postgres schema to Opportunity TypeScript model
      return res.rows.map((row: any) => {
        const matchBreakdown = row.match_breakdown || row.matchBreakdown || {
          careerAlignment: 85,
          skillAlignment: 85,
          eligibilityScore: 100,
          experienceFit: 85,
          educationFit: 90,
          opportunityValue: 90,
          locationRemoteFit: 90,
          timingDeadlineFit: 85,
          weightedScore: row.score || 85,
          hardEligibilityMultiplier: 1.0,
          finalScore: row.score || 85,
        };

        return {
          id: row.id ? String(row.id) : `OPP-${Date.now()}`,
          externalId: row.external_id || row.externalId || `EXT-${row.id}`,
          title: row.title || 'Untitled Opportunity',
          organization: row.organization || 'Federal Agency',
          category: row.category || 'WORK',
          subCategory: row.sub_category || row.subCategory || 'Internship',
          sector: row.sector || 'Government',
          sourceTier: row.source_tier || row.sourceTier || 'Tier 1 — Direct/Authoritative',
          sourceName: row.source_name || row.sourceName || 'USAJOBS',
          url: row.url || 'https://www.usajobs.gov',
          location: row.location || 'Washington, DC',
          isRemote: Boolean(row.is_remote ?? row.isRemote ?? false),
          workType: row.work_type || row.workType || 'Internship',
          description: row.description || '',
          requirements: Array.isArray(row.requirements) ? row.requirements : [row.requirements || ''],
          skills: Array.isArray(row.skills) ? row.skills : (row.skills ? String(row.skills).split(',') : []),
          educationRequirement: row.education_requirement || row.educationRequirement || "Master's Degree Preferred",
          citizenshipRequirement: row.citizenship_requirement || row.citizenshipRequirement || 'US_CITIZEN_REQUIRED',
          publishedAt: row.published_at || row.created_at || new Date().toISOString(),
          applicationDeadline: row.application_deadline || row.deadline || null,
          deadlineType: row.deadline_type || 'FIXED',
          status: row.status || 'ACTIVE',
          hardEligibility: row.hard_eligibility || 'CLEARLY_ELIGIBLE',
          hardEligibilityReasons: row.hard_eligibility_reasons || ['Eligibility verified'],
          matchBreakdown: matchBreakdown,
          aiExplanation: row.ai_explanation || '',
          firstSeenAt: row.created_at || new Date().toISOString(),
          lastVerifiedAt: row.updated_at || new Date().toISOString(),
          fingerprint: row.fingerprint || `fp-${row.id}`,
          isSaved: Boolean(row.is_saved ?? false),
          applicationStatus: row.application_status || 'Discovered',
          priority: row.priority || 'High',
        };
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Fallback to memory cache on fetchAllOpportunities error:', err.message);
    return memoryOpportunities;
  }
}

export async function upsertOpportunity(
  opp: Opportunity,
  geminiEmbedding?: number[]
): Promise<Opportunity> {
  const p = getPool();
  if (!p) {
    // Update memory cache
    const idx = memoryOpportunities.findIndex((o) => o.id === opp.id || o.externalId === opp.externalId);
    if (idx >= 0) {
      memoryOpportunities[idx] = { ...opp };
    } else {
      memoryOpportunities.unshift(opp);
    }
    return opp;
  }

  try {
    const client = await p.connect();
    try {
      // 1. Resolve deterministic UUID for id
      let oppUuid = opp.id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opp.id)) {
        const hash = crypto.createHash('md5').update(opp.id).digest('hex');
        oppUuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      }

      // 2. Resolve source_id
      const srcQuery = await client.query('SELECT id FROM sources WHERE name ILIKE $1 LIMIT 1', [`%${opp.sourceName || 'USAJOBS'}%`]);
      let sourceId = srcQuery.rows[0]?.id;
      if (!sourceId) {
        const fallbackSrc = await client.query('SELECT id FROM sources LIMIT 1');
        sourceId = fallbackSrc.rows[0]?.id || '00000000-0000-4000-a000-000000000010';
      }

      const embeddingStr = geminiEmbedding && geminiEmbedding.length === 768
        ? `[${geminiEmbedding.join(',')}]`
        : null;

      const query = `
        INSERT INTO opportunities (
          id, stable_id, source_id, external_id, title, organization, category, sub_category,
          sector, source_tier, source_name, url, location, is_remote,
          work_type, description, requirements, skills, education_requirement,
          citizenship_requirement, application_deadline, deadline_type,
          status, hard_eligibility, hard_eligibility_reasons, score,
          match_breakdown, ai_explanation, source_platform, embedding_gemini,
          application_status, priority, is_saved, updated_at
        ) VALUES (
          $1, $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24, $25,
          $26, $27, 'AOW_NATIVE_NODE', $28::vector,
          $29, $30, $31, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          organization = EXCLUDED.organization,
          description = EXCLUDED.description,
          score = EXCLUDED.score,
          match_breakdown = EXCLUDED.match_breakdown,
          ai_explanation = EXCLUDED.ai_explanation,
          source_platform = 'AOW_NATIVE_NODE',
          embedding_gemini = COALESCE(EXCLUDED.embedding_gemini, opportunities.embedding_gemini),
          application_status = EXCLUDED.application_status,
          priority = EXCLUDED.priority,
          is_saved = EXCLUDED.is_saved,
          updated_at = NOW()
        RETURNING *;
      `;

      await client.query(query, [
        oppUuid,
        sourceId,
        opp.externalId || opp.id,
        opp.title,
        opp.organization,
        opp.category,
        opp.subCategory,
        opp.sector,
        opp.sourceTier,
        opp.sourceName,
        opp.url,
        opp.location,
        opp.isRemote,
        opp.workType,
        opp.description,
        JSON.stringify(opp.requirements),
        opp.skills,
        opp.educationRequirement,
        opp.citizenshipRequirement,
        opp.applicationDeadline ? new Date(opp.applicationDeadline).toISOString() : null,
        opp.deadlineType,
        opp.status,
        opp.hardEligibility,
        JSON.stringify(opp.hardEligibilityReasons),
        opp.matchBreakdown.finalScore,
        JSON.stringify(opp.matchBreakdown),
        opp.aiExplanation || '',
        embeddingStr,
        opp.applicationStatus,
        opp.priority,
        opp.isSaved,
      ]);

      return opp;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Upsert opportunity falling back to memory:', err.message);
    const idx = memoryOpportunities.findIndex((o) => o.id === opp.id);
    if (idx >= 0) {
      memoryOpportunities[idx] = opp;
    } else {
      memoryOpportunities.unshift(opp);
    }
    return opp;
  }
}

export async function logPipelineRun(record: PipelineRunRecord): Promise<void> {
  memoryPipelineRuns.unshift(record);
  const p = getPool();
  if (!p) return;

  try {
    const client = await p.connect();
    try {
      await client.query(`
        INSERT INTO pipeline_runs (
          run_timestamp, source_platform, trigger_type, sources_checked,
          opportunities_extracted, qualifying_opportunities, status,
          error_details, digest_delivered, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, NOW()
        )
      `, [
        record.run_timestamp,
        record.source_platform || 'AOW_NATIVE_NODE',
        record.trigger_type,
        record.sources_checked,
        record.opportunities_extracted,
        record.qualifying_opportunities,
        record.status,
        record.error_details || null,
        record.digest_delivered,
      ]);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Could not log pipeline run to Postgres (cached locally):', err.message);
  }
}

export function getMemoryPipelineRuns(): PipelineRunRecord[] {
  return memoryPipelineRuns;
}
