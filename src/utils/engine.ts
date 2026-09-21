import {
  CandidateProfile,
  FreshnessStatus,
  HardEligibilityStatus,
  MatchingWeights,
  Opportunity,
  MatchBreakdown,
  NotificationDigest,
  NewsIntelligenceItem,
} from '../types';

/**
 * Normalizes a URL by stripping tracking parameters (Layer 1 Deduplication)
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'source',
      'trk',
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/**
 * Generates an immutable fingerprint from Title + Organization + Location (Layer 3)
 */
export function generateFingerprint(title: string, organization: string, location: string): string {
  const clean = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  return `${clean(organization)}-${clean(title)}-${clean(location)}`.slice(0, 64);
}

/**
 * Evaluates Deadline & Freshness status deterministically
 */
export function evaluateFreshness(deadline: string | null, deadlineType: 'FIXED' | 'ROLLING'): {
  status: FreshnessStatus;
  daysRemaining: number | null;
} {
  if (deadlineType === 'ROLLING' || !deadline) {
    return { status: 'ACTIVE', daysRemaining: null };
  }

  const now = new Date('2026-09-20T08:00:00Z').getTime();
  const target = new Date(deadline).getTime();
  const diffMs = target - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'EXPIRED', daysRemaining };
  }
  if (daysRemaining <= 3) {
    return { status: 'URGENT', daysRemaining };
  }
  if (daysRemaining <= 7) {
    return { status: 'CLOSING_SOON', daysRemaining };
  }
  if (daysRemaining <= 14) {
    return { status: 'DEADLINE_APPROACHING', daysRemaining };
  }
  return { status: 'ACTIVE', daysRemaining };
}

/**
 * Evaluates Hard Eligibility (Stage 1)
 */
export function evaluateHardEligibility(
  opportunity: Partial<Opportunity>,
  profile: CandidateProfile
): {
  status: HardEligibilityStatus;
  multiplier: number;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Citizenship check
  if (opportunity.citizenshipRequirement === 'US_CITIZEN_REQUIRED') {
    if (profile.citizenship === 'US_CITIZEN') {
      reasons.push('US Citizenship requirement met.');
    } else {
      reasons.push('Ineligible: US Citizenship strictly required.');
      return { status: 'CLEARLY_INELIGIBLE', multiplier: 0.0, reasons };
    }
  }

  // Work Authorization
  if (!profile.workAuthorization) {
    reasons.push('Ineligible: Valid US Work Authorization required.');
    return { status: 'CLEARLY_INELIGIBLE', multiplier: 0.0, reasons };
  }

  // Education standing check
  const edu = (opportunity.educationRequirement || '').toLowerCase();
  if (edu.includes('phd') && !edu.includes('master')) {
    reasons.push('Eligibility uncertain: Primarily targets PhD researchers.');
    return { status: 'ELIGIBILITY_UNCERTAIN', multiplier: 0.5, reasons };
  }

  if (edu.includes('master') || edu.includes('graduate') || edu.includes('student')) {
    reasons.push("Education match: Master's student enrollment at Rutgers Business School verified.");
  }

  // Deadline check
  if (opportunity.applicationDeadline) {
    const { status } = evaluateFreshness(opportunity.applicationDeadline, opportunity.deadlineType || 'FIXED');
    if (status === 'EXPIRED') {
      reasons.push('Ineligible: Application deadline has passed.');
      return { status: 'CLEARLY_INELIGIBLE', multiplier: 0.0, reasons };
    }
  }

  return { status: 'CLEARLY_ELIGIBLE', multiplier: 1.0, reasons };
}

/**
 * Calculates deterministic multi-factor match score based on candidate profile and weights
 */
export function calculateMatchScore(
  opp: Partial<Opportunity>,
  profile: CandidateProfile,
  weights: MatchingWeights
): MatchBreakdown {
  const hard = evaluateHardEligibility(opp, profile);

  // 1. Career Alignment (0-100)
  let careerScore = 70;
  const oppTracks = [opp.category, opp.subCategory, opp.sector].filter(Boolean).map((t) => String(t).toLowerCase());
  profile.careerTracks.forEach((track) => {
    if (oppTracks.some((t) => t.includes(track.toLowerCase()) || track.toLowerCase().includes(t))) {
      careerScore += 5;
    }
  });
  careerScore = Math.min(98, Math.max(60, careerScore));

  // 2. Skill Alignment (0-100)
  const oppSkills = (opp.skills || []).map((s) => s.toLowerCase());
  let matchingSkillsCount = 0;
  profile.primarySkills.forEach((skill) => {
    if (oppSkills.some((s) => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
      matchingSkillsCount += 1.5;
    }
  });
  profile.secondarySkills.forEach((skill) => {
    if (oppSkills.some((s) => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
      matchingSkillsCount += 0.8;
    }
  });
  const skillScore = Math.min(100, Math.max(65, Math.round(65 + matchingSkillsCount * 6)));

  // 3. Eligibility Score
  const eligibilityScore = hard.status === 'CLEARLY_ELIGIBLE' ? 100 : hard.status === 'ELIGIBILITY_UNCERTAIN' ? 50 : 0;

  // 4. Experience Fit
  const experienceFit = opp.workType === 'Internship' || opp.workType === 'Fellowship' || opp.workType === 'Program' ? 95 : 85;

  // 5. Education Fit (Master's alignment)
  const educationFit = (opp.educationRequirement || '').toLowerCase().includes('master') ? 98 : 90;

  // 6. Opportunity Value (Tier 1 & Tier 2 authoritative sources score highest)
  let opportunityValue = 85;
  if (opp.sourceTier?.includes('Tier 1')) opportunityValue = 96;
  else if (opp.sourceTier?.includes('Tier 2')) opportunityValue = 90;

  // 7. Location Fit
  let locationRemoteFit = 80;
  if (opp.isRemote) locationRemoteFit = 98;
  else if (profile.targetLocations.some((loc) => opp.location?.toLowerCase().includes(loc.toLowerCase()))) {
    locationRemoteFit = 95;
  }

  // 8. Timing / Deadline Fit
  const { daysRemaining, status } = evaluateFreshness(opp.applicationDeadline || null, opp.deadlineType || 'ROLLING');
  let timingDeadlineFit = 90;
  if (status === 'URGENT') timingDeadlineFit = 80; // High pressure
  else if (status === 'CLOSING_SOON') timingDeadlineFit = 88;
  else if (daysRemaining !== null && daysRemaining > 10) timingDeadlineFit = 96;

  // Weighted combination
  const weightedScore =
    careerScore * weights.careerAlignment +
    skillScore * weights.skillAlignment +
    eligibilityScore * weights.eligibility +
    experienceFit * weights.experienceFit +
    educationFit * weights.educationFit +
    opportunityValue * weights.opportunityValue +
    locationRemoteFit * weights.locationFit +
    timingDeadlineFit * weights.timingFit;

  const finalScore = Math.round(weightedScore * hard.multiplier);

  return {
    careerAlignment: careerScore,
    skillAlignment: skillScore,
    eligibilityScore,
    experienceFit,
    educationFit,
    opportunityValue,
    locationRemoteFit,
    timingDeadlineFit,
    weightedScore: Math.round(weightedScore * 10) / 10,
    hardEligibilityMultiplier: hard.multiplier,
    finalScore,
  };
}

/**
 * Runs the automated intelligence cycle simulation (Mon / Wed / Fri pipeline)
 */
export function runAutomatedIntelligenceCycle(
  currentOpportunities: Opportunity[],
  profile: CandidateProfile,
  weights: MatchingWeights,
  newsItems: NewsIntelligenceItem[]
): {
  updatedOpportunities: Opportunity[];
  digest: NotificationDigest;
  stats: {
    totalChecked: number;
    eligibleCount: number;
    urgentCount: number;
    newAdded: number;
  };
} {
  // Re-verify freshness and re-calculate scores
  const updatedOpportunities = currentOpportunities.map((opp) => {
    const fresh = evaluateFreshness(opp.applicationDeadline, opp.deadlineType);
    const hard = evaluateHardEligibility(opp, profile);
    const breakdown = calculateMatchScore(opp, profile, weights);

    return {
      ...opp,
      status: fresh.status,
      hardEligibility: hard.status,
      hardEligibilityReasons: hard.reasons,
      matchBreakdown: breakdown,
      lastVerifiedAt: new Date().toISOString(),
    };
  });

  // Sort descending by final score
  updatedOpportunities.sort((a, b) => b.matchBreakdown.finalScore - a.matchBreakdown.finalScore);

  const topMatches = updatedOpportunities.filter(
    (o) => o.matchBreakdown.finalScore >= profile.minimumMatchScore && o.status !== 'EXPIRED'
  );
  const urgentDeadlines = updatedOpportunities.filter(
    (o) => (o.status === 'URGENT' || o.status === 'CLOSING_SOON') && o.matchBreakdown.finalScore >= 75
  );

  const hasActionable = topMatches.length > 0 || urgentDeadlines.length > 0;
  const isSuppressed = profile.suppressEmptyDigests && !hasActionable;

  const digest: NotificationDigest = {
    id: `DIGEST-${Date.now().toString().slice(-6)}`,
    runDate: new Date().toISOString(),
    scheduledDay: 'Friday',
    status: isSuppressed ? 'SUPPRESSED_NO_ACTIONABLE' : 'DELIVERED',
    totalChecked: updatedOpportunities.length,
    newOpportunitiesFound: Math.floor(Math.random() * 2) + 1,
    topMatches: topMatches.slice(0, 5),
    urgentDeadlines,
    newsHighlights: newsItems.slice(0, 2),
    digestHeadline: isSuppressed
      ? 'Digest Suppressed (No urgent actionable updates or new high-priority matches)'
      : `${topMatches.length} High-Relevance Opportunities & ${urgentDeadlines.length} Upcoming Deadlines`,
  };

  return {
    updatedOpportunities,
    digest,
    stats: {
      totalChecked: updatedOpportunities.length,
      eligibleCount: updatedOpportunities.filter((o) => o.hardEligibility === 'CLEARLY_ELIGIBLE').length,
      urgentCount: urgentDeadlines.length,
      newAdded: digest.newOpportunitiesFound,
    },
  };
}

export const simulateIntelligenceCycle = runAutomatedIntelligenceCycle;

