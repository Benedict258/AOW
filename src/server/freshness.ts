import { Opportunity } from '../types';

export type FreshnessState = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNKNOWN';

export interface FreshnessEvaluation {
  state: FreshnessState;
  ageHours: number | null;
  isActive: boolean;
  isExpired: boolean;
  confidence: number;
  nextCheckAt: string;
}

export interface ChangeDetectionResult {
  hasChanged: boolean;
  changeType: 'NONE' | 'TITLE' | 'DESCRIPTION' | 'DEADLINE' | 'STATUS' | 'COMPENSATION' | 'LOCATION' | 'MULTIPLE';
  changedFields: string[];
}

/**
 * 8.1 Status State Machine
 */
export function evaluateOpportunityFreshness(
  opp: Opportunity,
  sourceReachable: boolean = true
): FreshnessEvaluation {
  const now = Date.now();
  const lastSeen = opp.lastVerifiedAt || opp.firstSeenAt;

  let ageHours: number | null = null;
  let state: FreshnessState = 'UNKNOWN';

  if (!lastSeen) {
    state = 'UNKNOWN';
  } else {
    const lastSeenTime = new Date(lastSeen).getTime();
    ageHours = Math.max(0, (now - lastSeenTime) / (1000 * 60 * 60));

    if (ageHours > 720) {
      state = 'EXPIRED'; // > 30 days
    } else if (ageHours > 72) {
      state = 'STALE'; // > 3 days
    } else {
      state = 'FRESH';
    }
  }

  // Verification Engine (Section 8.5)
  const statusStr = (opp.status || '').toUpperCase();
  const isClosed = statusStr.includes('CLOSED') || statusStr.includes('EXPIRED') || statusStr.includes('FILLED');

  let deadlinePassed = false;
  if (opp.applicationDeadline) {
    deadlinePassed = new Date(opp.applicationDeadline).getTime() < now;
  }

  const isActive = sourceReachable && !deadlinePassed && !isClosed;
  const isExpired = deadlinePassed || isClosed || state === 'EXPIRED';

  // Confidence formula:
  // confidence = 0.5; if sourceReachable: +0.3; if url: +0.1; if deadlinePassed: *0.5
  let confidence = 0.5;
  if (sourceReachable) confidence += 0.3;
  if (opp.url) confidence += 0.1;
  if (deadlinePassed) confidence *= 0.5;
  confidence = Math.min(1.0, Math.max(0.0, Math.round(confidence * 100) / 100));

  const nextCheckAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  return {
    state,
    ageHours: ageHours !== null ? Math.round(ageHours * 10) / 10 : null,
    isActive,
    isExpired,
    confidence,
    nextCheckAt,
  };
}

/**
 * 8.4 Change Detection between versions
 */
export function detectOpportunityChanges(
  previous: Partial<Opportunity>,
  current: Partial<Opportunity>
): ChangeDetectionResult {
  const fieldsToCheck: (keyof Opportunity)[] = [
    'title',
    'description',
    'organization',
    'location',
    'applicationDeadline',
    'status',
    'workType',
    'url',
  ];

  const changedFields: string[] = [];

  for (const field of fieldsToCheck) {
    const prevVal = String(previous[field] || '').trim().toLowerCase();
    const currVal = String(current[field] || '').trim().toLowerCase();
    if (prevVal !== currVal) {
      changedFields.push(field);
    }
  }

  if (changedFields.length === 0) {
    return { hasChanged: false, changeType: 'NONE', changedFields: [] };
  }
  if (changedFields.length === 1) {
    const f = changedFields[0].toUpperCase();
    const typeMap: Record<string, ChangeDetectionResult['changeType']> = {
      TITLE: 'TITLE',
      DESCRIPTION: 'DESCRIPTION',
      APPLICATIONDEADLINE: 'DEADLINE',
      STATUS: 'STATUS',
      LOCATION: 'LOCATION',
    };
    return {
      hasChanged: true,
      changeType: typeMap[f] || 'MULTIPLE',
      changedFields,
    };
  }

  return {
    hasChanged: true,
    changeType: 'MULTIPLE',
    changedFields,
  };
}
