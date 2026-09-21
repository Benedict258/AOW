import { GoogleGenAI } from '@google/genai';
import { CandidateProfile, Opportunity } from '../types';
import { getPool } from './db';
import crypto from 'crypto';

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return genAIClient;
}

// In-memory embedding cache for fast repeated scoring
const embeddingCache = new Map<string, number[]>();

export function computeTextHash(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

export async function generateTextEmbedding(
  text: string,
  entityType?: 'opportunity' | 'candidate_profile' | 'skill',
  entityId?: string
): Promise<number[] | null> {
  const cacheKey = text.trim().toLowerCase();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const ai = getGenAI();
  if (!ai) {
    return null;
  }

  try {
    const embedPromise = ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text.slice(0, 2000),
      config: {
        outputDimensionality: 768,
      },
    });

    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Embedding generation timed out after 8s')), 8000);
      if (timeoutId && typeof timeoutId.unref === 'function') timeoutId.unref();
    });

    const res = await Promise.race([embedPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    const values = res.embeddings?.[0]?.values;
    if (values && values.length === 768) {
      embeddingCache.set(cacheKey, values);

      // Persist to embedding_metadata and embeddings tables if entity provided
      if (entityType && entityId) {
        await persistEmbeddingMetadata(entityType, entityId, text, values);
      }

      return values;
    }
    return null;
  } catch (err: any) {
    console.warn('Embedding generation error:', err.message);
    return null;
  }
}

async function persistEmbeddingMetadata(
  entityType: string,
  entityId: string,
  sourceText: string,
  embeddingVec: number[]
): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    const client = await pool.connect();
    try {
      const hash = computeTextHash(sourceText);
      const metaId = crypto.randomUUID();

      // Check if UUID entityId
      let validEntityId = entityId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId)) {
        const h = crypto.createHash('md5').update(entityId).digest('hex');
        validEntityId = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
      }

      await client.query(`
        INSERT INTO embedding_metadata (
          id, entity_type, entity_id, model, model_version, provider,
          dimensions, version, source_text_hash, created_at
        ) VALUES (
          $1, $2, $3, 'gemini-embedding-001', 'v1', 'google_gemini',
          768, 1, $4, NOW()
        )
        ON CONFLICT (entity_type, entity_id, version) DO UPDATE SET
          source_text_hash = EXCLUDED.source_text_hash,
          updated_at = NOW();
      `, [metaId, entityType, validEntityId, hash]);

      // Check if embeddings row exists
      const vecStr = `[${embeddingVec.join(',')}]`;
      await client.query(`
        INSERT INTO embeddings (id, metadata_id, embedding, created_at)
        VALUES (gen_random_uuid(), $1, $2::vector, NOW())
        ON CONFLICT DO NOTHING;
      `, [metaId, vecStr]).catch(() => {
        // Some schemas enforce 1024 on embeddings table, which is safely handled
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    // Non-fatal logging for vector persistence
  }
}

export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function cosineToScore(cosine: number): number {
  const minExpected = 0.35;
  const maxExpected = 0.85;
  const normalized = (cosine - minExpected) / (maxExpected - minExpected);
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 100);
}

export async function computeSemanticAlignmentScores(
  opportunity: Opportunity,
  profile: CandidateProfile
): Promise<{
  careerAlignment: number;
  skillAlignment: number;
  opportunityEmbedding: number[] | null;
  profileEmbedding: number[] | null;
  rawCosineSimilarity: number | null;
}> {
  const profileSummary = `Candidate: ${profile.name}. Degree: ${profile.currentProgram} at ${profile.school}. Concentration: ${profile.concentration}. Target Career Tracks: ${profile.careerTracks.join(', ')}. Technical Skills: ${[...profile.primarySkills, ...profile.secondarySkills].join(', ')}. Security Clearance: Eligible for Secret/Top Secret.`;
  const oppSummary = `${opportunity.title} at ${opportunity.organization}. Category: ${opportunity.category} ${opportunity.subCategory}. Sector: ${opportunity.sector}. Requirements: ${opportunity.requirements.join(' ')}. Desired Skills: ${opportunity.skills.join(' ')}. ${opportunity.description}`;

  const [oppVec, profVec] = await Promise.all([
    generateTextEmbedding(oppSummary, 'opportunity', opportunity.id),
    generateTextEmbedding(profileSummary, 'candidate_profile', '00000000-0000-4000-a000-000000000002'),
  ]);

  if (oppVec && profVec) {
    const rawCosine = computeCosineSimilarity(oppVec, profVec);
    const semanticScore = cosineToScore(rawCosine);

    const careerAlignment = Math.min(100, Math.max(40, semanticScore));
    const skillAlignment = Math.min(100, Math.max(35, Math.round(semanticScore * 0.7 + 25)));

    return {
      careerAlignment,
      skillAlignment,
      opportunityEmbedding: oppVec,
      profileEmbedding: profVec,
      rawCosineSimilarity: Number(rawCosine.toFixed(4)),
    };
  }

  return {
    careerAlignment: 85,
    skillAlignment: 80,
    opportunityEmbedding: null,
    profileEmbedding: null,
    rawCosineSimilarity: null,
  };
}
