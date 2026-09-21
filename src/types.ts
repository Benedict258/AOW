/**
 * Peter Grigoryev — Opportunity Intelligence System
 * Domain Types & Schemas
 */

export type OpportunityCategory =
  | 'WORK'
  | 'TECHNICAL_EXPERIENCE'
  | 'CYBERSECURITY'
  | 'GOVERNMENT'
  | 'POLICY'
  | 'INTERNATIONAL_AFFAIRS'
  | 'FELLOWSHIP'
  | 'EDUCATION'
  | 'EVENTS'
  | 'NEWS';

export type OpportunitySubCategory =
  // WORK
  | 'Internship'
  | 'Co-op'
  | 'Part-time'
  | 'Full-time'
  | 'Contract'
  | 'Apprenticeship'
  // TECHNICAL EXPERIENCE
  | 'Hackathon'
  | 'Competition'
  | 'Open Source'
  | 'Research'
  | 'Project Program'
  | 'Challenge'
  // CYBERSECURITY
  | 'CTF'
  | 'Security Program'
  | 'Security Operations'
  | 'Threat Intelligence'
  // GOVERNMENT
  | 'Federal'
  | 'State'
  | 'Local'
  | 'Public Sector'
  | 'Intelligence'
  | 'National Security'
  | 'Government Technology'
  // POLICY
  | 'Technology Policy'
  | 'AI Policy'
  | 'Cyber Policy'
  | 'Data Policy'
  | 'Digital Governance'
  // INTERNATIONAL AFFAIRS
  | 'Diplomacy'
  | 'Foreign Policy'
  | 'International Security'
  | 'International Development'
  | 'Global Governance'
  // FELLOWSHIP
  | 'Academic Fellowship'
  | 'Research Fellowship'
  | 'Leadership Fellowship'
  | 'Policy Fellowship'
  // EDUCATION
  | 'Certification'
  | 'Course'
  | 'Bootcamp'
  | 'Training'
  | 'Professional Program'
  // EVENTS
  | 'Conference'
  | 'Career Fair'
  | 'Workshop'
  | 'Webinar'
  | 'Networking';

export type HardEligibilityStatus =
  | 'CLEARLY_ELIGIBLE'      // multiplier: 1.0
  | 'ELIGIBILITY_UNCERTAIN'  // multiplier: 0.5
  | 'CLEARLY_INELIGIBLE';    // multiplier: 0.0

export type FreshnessStatus =
  | 'DISCOVERED'
  | 'ACTIVE'
  | 'DEADLINE_APPROACHING' // 7-14 days
  | 'CLOSING_SOON'        // 3-7 days
  | 'URGENT'              // <3 days
  | 'EXPIRED'
  | 'CLOSED'
  | 'STALE';

export type ApplicationTrackingStatus =
  | 'Discovered'
  | 'Qualified'
  | 'Recommended'
  | 'Viewed'
  | 'Saved'
  | 'Application Started'
  | 'Applied'
  | 'Interview'
  | 'Accepted'
  | 'Rejected';

export type SourceTier =
  | 'Tier 1 — Direct/Authoritative'
  | 'Tier 2 — Specialized Platform'
  | 'Tier 3 — Discovery/Search'
  | 'Tier 4 — News/Intel';

export interface MatchBreakdown {
  careerAlignment: number;       // 0-100 (weight 25%)
  skillAlignment: number;        // 0-100 (weight 20%)
  eligibilityScore: number;      // 0-100 (weight 15%)
  experienceFit: number;         // 0-100 (weight 10%)
  educationFit: number;          // 0-100 (weight 10%)
  opportunityValue: number;      // 0-100 (weight 10%)
  locationRemoteFit?: number;     // 0-100 (weight 5%)
  locationScore?: number;        // 0-100
  timingDeadlineFit?: number;     // 0-100 (weight 5%)
  timingScore?: number;          // 0-100
  weightedScore: number;         // 0-100
  hardEligibilityMultiplier: number; // 1.0, 0.5, or 0.0
  finalScore: number;            // hardMultiplier * weightedScore
}

export interface Opportunity {
  id: string; // e.g. "OPP-2026-000101"
  externalId: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  subCategory: OpportunitySubCategory | string;
  opportunityType?: string;
  sector: 'Government' | 'Private Sector' | 'International Org' | 'Think Tank / Research' | 'Defense / NatSec' | 'Academic' | 'Non-Profit';
  sourceTier: SourceTier;
  sourceName: string;
  url: string;
  location: string;
  isRemote: boolean;
  workType: 'Full-Time' | 'Internship' | 'Fellowship' | 'Co-op' | 'Certification' | 'Event' | 'Program' | 'Competition';
  description: string;
  requirements: string[];
  skills: string[];
  educationRequirement: string;
  citizenshipRequirement: 'US_CITIZEN_REQUIRED' | 'US_PERMANENT_RESIDENT' | 'OPEN_TO_ALL' | 'UNCERTAIN';
  publishedAt: string;
  applicationDeadline: string | null;
  deadlineType: 'FIXED' | 'ROLLING';
  status: FreshnessStatus;
  hardEligibility: HardEligibilityStatus;
  hardEligibilityReasons: string[];
  matchBreakdown: MatchBreakdown;
  aiExplanation: string;
  firstSeenAt: string;
  lastVerifiedAt: string;
  fingerprint: string;
  isSaved?: boolean;
  
  // Application Tracking attributes (for integration with spreadsheet workflow)
  applicationStatus: ApplicationTrackingStatus;
  applicationStartedDate?: string;
  appliedDate?: string;
  followUpDate?: string;
  interviewDate?: string;
  outcome?: string;
  notes?: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface NewsIntelligenceItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string;
  sector: string;
  topics: string[];
  whyItMattersForPeter: string;
  actionableInsight: string;
  relatedOpportunityIds: string[];
  relatedAgencies: string[];
}

export interface SourceRegistryItem {
  sourceId: string;
  name: string;
  organization: string;
  tier: 1 | 2 | 3 | 4;
  category: OpportunityCategory;
  accessMethod: 'API' | 'RSS/Feed' | 'Direct Ingestion' | 'Search Provider';
  apiUrl?: string;
  reliabilityScore: number; // 0 - 100
  rateLimit: string;
  status: 'HEALTHY' | 'ACTIVE' | 'DEGRADED';
  lastChecked: string;
  enabled: boolean;
  opportunitiesFound: number;
}

export interface CandidateProfile {
  name: string;
  email: string;
  currentProgram: string;
  school: string;
  concentration: string;
  expectedGraduation: string;
  citizenship: 'US_CITIZEN' | 'OTHER';
  workAuthorization: boolean;
  targetLocations: string[];
  remotePreference: 'REMOTE_PREFERRED' | 'HYBRID_ACCEPTABLE' | 'ONSITE_ACCEPTABLE' | 'ANY';
  primarySkills: string[];
  secondarySkills: string[];
  careerTracks: string[];
  targetSectors: string[];
  minimumMatchScore: number;
  notificationSchedule: 'MON_WED_FRI' | 'DAILY' | 'WEEKLY_SUNDAY';
  suppressEmptyDigests: boolean;
}

export interface MatchingWeights {
  careerAlignment: number;       // default 0.25
  skillAlignment: number;        // default 0.20
  eligibility: number;           // default 0.15
  experienceFit: number;         // default 0.10
  educationFit: number;          // default 0.10
  opportunityValue: number;      // default 0.10
  locationFit: number;           // default 0.05
  timingFit: number;             // default 0.05
}

export interface NotificationDigest {
  id: string;
  runDate: string;
  scheduledDay: 'Monday' | 'Wednesday' | 'Friday' | 'Ad-Hoc';
  status: 'DELIVERED' | 'SUPPRESSED_NO_ACTIONABLE';
  totalChecked: number;
  newOpportunitiesFound: number;
  topMatches: Opportunity[];
  urgentDeadlines: Opportunity[];
  newsHighlights: NewsIntelligenceItem[];
  digestHeadline: string;
}
