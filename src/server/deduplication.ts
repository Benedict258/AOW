import crypto from 'crypto';
import { Opportunity } from '../types';
import { getPool } from './db';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateState: 'CANONICAL' | 'DUPLICATE' | 'POSSIBLE_DUPLICATE';
  canonicalOpportunityId: string;
  matchedRules: {
    rule: string;
    score: number;
    weight: number;
  }[];
  aggregateScore: number;
  fingerprint: string;
}

export interface DuplicateCluster {
  groupId: string;
  fingerprint: string;
  canonicalId: string;
  members: {
    opportunityId: string;
    state: 'CANONICAL' | 'DUPLICATE' | 'POSSIBLE_DUPLICATE';
    similarityToCanonical: number;
  }[];
  averageSimilarity: number;
}

/**
 * 7.1 URL Normalization
 * 1. Lowercase
 * 2. NFKD Unicode normalization
 * 3. Strip diacritics
 * 4. Replace non-alphanumeric with space
 * 5. Trim and collapse whitespace
 */
export function normalizeUrlForDedup(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const urlObj = new URL(rawUrl);
    // Strip common tracking queries
    const trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'];
    trackingKeys.forEach(k => urlObj.searchParams.delete(k));
    const cleanUrl = urlObj.toString().toLowerCase();
    return cleanUrl
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return rawUrl
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export function normalizeStringForDedup(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 7.3 Fingerprint Composition
 * SHA256(normalizedTitle + "|" + normalizedOrg + "|" + normalizedUrl).slice(0, 16)
 */
export function computeFingerprint(title: string, organization: string, url: string): string {
  const normTitle = normalizeStringForDedup(title);
  const normOrg = normalizeStringForDedup(organization);
  const normUrl = normalizeUrlForDedup(url);
  const combined = `${normTitle}|${normOrg}|${normUrl}`;
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
}

export function computeDescriptionHash(description: string): string {
  if (!description) return '';
  return crypto
    .createHash('sha256')
    .update(description.toLowerCase().trim())
    .digest('hex')
    .slice(0, 16);
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

export function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeStringForDedup(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeStringForDedup(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersectionCount++;
  });
  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * 7.4 5-Rule Weighted Pairwise Matching
 */
export function calculatePairwiseDeduplication(
  oppA: Opportunity,
  oppB: Opportunity
): {
  aggregateScore: number;
  matchedRules: { rule: string; score: number; weight: number }[];
} {
  const rules: { rule: string; score: number; weight: number }[] = [];

  // Rule 1: exact_external_id (weight 1.0)
  if (oppA.externalId && oppB.externalId && oppA.externalId.trim() === oppB.externalId.trim()) {
    rules.push({ rule: 'exact_external_id', score: 1.0, weight: 1.0 });
  }

  // Rule 2: url_match (weight 0.95)
  const normUrlA = normalizeUrlForDedup(oppA.url);
  const normUrlB = normalizeUrlForDedup(oppB.url);
  if (normUrlA && normUrlB && normUrlA === normUrlB) {
    rules.push({ rule: 'url_match', score: 1.0, weight: 0.95 });
  }

  // Rule 3: fingerprint_exact (weight 0.9)
  const fpA = computeFingerprint(oppA.title, oppA.organization, oppA.url);
  const fpB = computeFingerprint(oppB.title, oppB.organization, oppB.url);
  if (fpA && fpB && fpA === fpB) {
    rules.push({ rule: 'fingerprint_exact', score: 1.0, weight: 0.9 });
  }

  // Rule 4: title_org_similarity (weight 0.7)
  const titleSim = similarityRatio(normalizeStringForDedup(oppA.title), normalizeStringForDedup(oppB.title));
  const orgSim = similarityRatio(normalizeStringForDedup(oppA.organization), normalizeStringForDedup(oppB.organization));
  const combinedTitleOrg = titleSim * 0.7 + orgSim * 0.3;
  if (titleSim >= 0.7 && combinedTitleOrg >= 0.75) {
    rules.push({ rule: 'title_org_similarity', score: combinedTitleOrg, weight: 0.7 });
  }

  // Rule 5: content_fuzzy_match (weight 0.6)
  const descHashA = computeDescriptionHash(oppA.description || '');
  const descHashB = computeDescriptionHash(oppB.description || '');
  if (descHashA && descHashB && descHashA === descHashB) {
    rules.push({ rule: 'content_fuzzy_match', score: 1.0, weight: 0.6 });
  } else {
    const jTitle = jaccardSimilarity(oppA.title, oppB.title);
    const jOrg = jaccardSimilarity(oppA.organization, oppB.organization);
    const jScore = jTitle * 0.6 + jOrg * 0.4;
    if (jScore >= 0.8) {
      rules.push({ rule: 'content_fuzzy_match', score: jScore, weight: 0.6 });
    }
  }

  // 7.5 Aggregate Score
  const activeRules = rules.filter((r) => r.score > 0);
  const weightedSum = activeRules.reduce((sum, r) => sum + r.score * r.weight, 0);
  const weightTotal = activeRules.reduce((sum, r) => sum + r.weight, 0);
  const aggregateScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  return { aggregateScore, matchedRules: rules };
}

/**
 * 7.6 Clustering & Canonical Selection
 */
export async function runDeduplicationPipeline(opportunities: Opportunity[]): Promise<{
  clusters: DuplicateCluster[];
  canonicalCount: number;
  duplicateCount: number;
}> {
  const visited = new Set<string>();
  const clusters: DuplicateCluster[] = [];

  for (let i = 0; i < opportunities.length; i++) {
    const oppA = opportunities[i];
    if (visited.has(oppA.id)) continue;

    const groupMembers: { opp: Opportunity; score: number }[] = [{ opp: oppA, score: 1.0 }];
    visited.add(oppA.id);

    for (let j = i + 1; j < opportunities.length; j++) {
      const oppB = opportunities[j];
      if (visited.has(oppB.id)) continue;

      const { aggregateScore } = calculatePairwiseDeduplication(oppA, oppB);
      if (aggregateScore >= 0.75) {
        groupMembers.push({ opp: oppB, score: aggregateScore });
        visited.add(oppB.id);
      }
    }

    // Canonical selection: prefer candidate with non-empty externalId, tiebreak by earliest firstSeenAt
    groupMembers.sort((a, b) => {
      const hasExtA = Boolean(a.opp.externalId);
      const hasExtB = Boolean(b.opp.externalId);
      if (hasExtA && !hasExtB) return -1;
      if (!hasExtA && hasExtB) return 1;
      const timeA = new Date(a.opp.firstSeenAt || 0).getTime();
      const timeB = new Date(b.opp.firstSeenAt || 0).getTime();
      return timeA - timeB;
    });

    const canonical = groupMembers[0].opp;
    const fp = computeFingerprint(canonical.title, canonical.organization, canonical.url);
    const groupId = crypto.createHash('md5').update(`group-${canonical.id}-${fp}`).digest('hex');
    const formattedGroupId = `${groupId.slice(0, 8)}-${groupId.slice(8, 12)}-4${groupId.slice(13, 16)}-a${groupId.slice(17, 20)}-${groupId.slice(20, 32)}`;

    const members = groupMembers.map((m, idx) => ({
      opportunityId: m.opp.id,
      state: idx === 0 ? ('CANONICAL' as const) : m.score >= 0.9 ? ('DUPLICATE' as const) : ('POSSIBLE_DUPLICATE' as const),
      similarityToCanonical: m.score,
    }));

    const avgSim = groupMembers.reduce((acc, m) => acc + m.score, 0) / groupMembers.length;

    clusters.push({
      groupId: formattedGroupId,
      fingerprint: fp,
      canonicalId: canonical.id,
      members,
      averageSimilarity: Math.round(avgSim * 100) / 100,
    });
  }

  // Persist to PostgreSQL duplicate_groups and duplicate_members (Closing Known Gap!)
  await persistDuplicateClusters(clusters);

  const duplicateCount = clusters.reduce((acc, c) => acc + c.members.filter((m) => m.state !== 'CANONICAL').length, 0);

  return {
    clusters,
    canonicalCount: clusters.length,
    duplicateCount,
  };
}

async function persistDuplicateClusters(clusters: DuplicateCluster[]): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    const client = await pool.connect();
    try {
      for (const c of clusters) {
        // Find canonical UUID if present in DB
        let canonicalDbUuid: string | null = null;
        const findCan = await client.query('SELECT id FROM opportunities WHERE id::text = $1 OR external_id = $1 LIMIT 1', [c.canonicalId]);
        if (findCan.rows.length > 0) {
          canonicalDbUuid = findCan.rows[0].id;
        }

        await client.query(`
          INSERT INTO duplicate_groups (id, fingerprint, canonical_opportunity_id, duplicate_state, metadata)
          VALUES ($1, $2, $3, 'CANONICAL', $4::jsonb)
          ON CONFLICT (id) DO UPDATE SET
            canonical_opportunity_id = EXCLUDED.canonical_opportunity_id,
            updated_at = NOW();
        `, [
          c.groupId,
          c.fingerprint,
          canonicalDbUuid,
          JSON.stringify({ memberCount: c.members.length, averageSimilarity: c.averageSimilarity }),
        ]);

        for (const m of c.members) {
          const findOpp = await client.query('SELECT id FROM opportunities WHERE id::text = $1 OR external_id = $1 LIMIT 1', [m.opportunityId]);
          if (findOpp.rows.length > 0) {
            const oppDbUuid = findOpp.rows[0].id;
            await client.query(`
              INSERT INTO duplicate_members (group_id, opportunity_id, duplicate_state)
              VALUES ($1, $2, $3)
              ON CONFLICT (group_id, opportunity_id) DO UPDATE SET
                duplicate_state = EXCLUDED.duplicate_state;
            `, [c.groupId, oppDbUuid, m.state]);
          }
        }
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Deduplication] Could not persist duplicate groups to PostgreSQL:', err.message);
  }
}
