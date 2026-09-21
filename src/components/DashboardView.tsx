import React from 'react';
import {
  Compass,
  Sparkles,
  AlertTriangle,
  Clock,
  Briefcase,
  Building2,
  Newspaper,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
} from 'lucide-react';
import { Opportunity, NewsIntelligenceItem, CandidateProfile, ApplicationTrackingStatus } from '../types';
import { OpportunityCard } from './OpportunityCard';

interface DashboardViewProps {
  opportunities: Opportunity[];
  newsItems: NewsIntelligenceItem[];
  profile: CandidateProfile;
  onSelectOpportunity: (opp: Opportunity) => void;
  onToggleSave: (id: string) => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  opportunities,
  newsItems,
  profile,
  onSelectOpportunity,
  onToggleSave,
  onUpdateStatus,
  onNavigateTab,
}) => {
  const topMatches = [...opportunities]
    .sort((a, b) => b.matchBreakdown.finalScore - a.matchBreakdown.finalScore)
    .slice(0, 3);

  const urgentDeadlines = opportunities.filter(
    (o) => (o.status === 'URGENT' || o.status === 'CLOSING_SOON') && o.matchBreakdown.finalScore >= 70
  );

  const activeApplications = opportunities.filter(
    (o) =>
      o.applicationStatus === 'Application Started' ||
      o.applicationStatus === 'Applied' ||
      o.applicationStatus === 'Interview'
  );

  const highMatchCount = opportunities.filter((o) => o.matchBreakdown.finalScore >= 90).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Executive Welcome & Rutgers Standing */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <span>Automated Career Intelligence Layer</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">Pipeline Active</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Good morning, Peter
            </h2>
            <p className="text-sm text-neutral-600 mt-1 max-w-2xl leading-relaxed">
              Monitoring 16 career tracks across <span className="font-semibold text-neutral-800">Tier 1 Federal/Direct, Think Tanks, International Orgs, and Tech Leaders</span> tailored to your Rutgers MS in IT & Analytics cybersecurity concentration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
              <span className="text-neutral-500 block text-[10px] uppercase font-bold">Schedule</span>
              <span className="font-semibold text-neutral-900">Mon / Wed / Fri 8 AM</span>
            </div>
            <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
              <span className="text-neutral-500 block text-[10px] uppercase font-bold">Noise Filter</span>
              <span className="font-semibold text-emerald-700">Empty Digests Suppressed</span>
            </div>
          </div>
        </div>

        {/* 4 Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-100">
          <div
            onClick={() => onNavigateTab('opportunities')}
            className="p-3.5 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200 rounded-lg transition-colors cursor-pointer group"
          >
            <span className="text-xs text-neutral-500 font-medium">Active Opportunities</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-neutral-900">{opportunities.length}</span>
              <span className="text-[11px] text-neutral-500">across 4 tiers</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('recommended')}
            className="p-3.5 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors cursor-pointer group"
          >
            <span className="text-xs text-emerald-800 font-medium">Top Matches (≥90%)</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-emerald-900">{highMatchCount}</span>
              <span className="text-[11px] text-emerald-700 font-medium">High Relevance</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('deadlines')}
            className="p-3.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer group"
          >
            <span className="text-xs text-rose-800 font-medium">Urgent Deadlines</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-rose-900">{urgentDeadlines.length}</span>
              <span className="text-[11px] text-rose-700 font-medium">&lt;7 days closing</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('tracker')}
            className="p-3.5 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200 rounded-lg transition-colors cursor-pointer group"
          >
            <span className="text-xs text-neutral-500 font-medium">In Active Pipeline</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-neutral-900">{activeApplications.length}</span>
              <span className="text-[11px] text-neutral-500">spreadsheet sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Deadlines Alert Banner if any */}
      {urgentDeadlines.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                {urgentDeadlines.length} High-Relevance Opportunities Closing This Week
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Includes {urgentDeadlines[0].title} ({urgentDeadlines[0].organization}). Finalize applications before deadline expiration.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('deadlines')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer"
          >
            <span>Review Deadlines</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top 3 Recommended Opportunities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Highest Recommended Opportunities</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Evaluated with hard eligibility checks and 8-factor multi-dimensional scoring.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('recommended')}
            className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 flex items-center space-x-1"
          >
            <span>View All ({opportunities.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topMatches.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onSelect={onSelectOpportunity}
              onToggleSave={onToggleSave}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      </section>

      {/* News-to-Opportunity Intelligence Section */}
      <section className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
              <Newspaper className="w-4 h-4 text-neutral-700" />
              <span>News-to-Opportunity Intelligence</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Transforming policy developments and federal mandates into actionable career pathways.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('news')}
            className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 flex items-center space-x-1"
          >
            <span>View Full Intel Wire</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newsItems.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
                  <span className="font-semibold text-neutral-700">{item.source}</span>
                  <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mb-2 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-neutral-600 mb-3 line-clamp-2">
                  {item.summary}
                </p>

                {/* Why it matters for Peter */}
                <div className="p-2.5 rounded bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900 mb-3">
                  <span className="font-bold block text-[10px] uppercase text-amber-800 tracking-wider">
                    Why it matters for Peter:
                  </span>
                  <p className="text-[11px] leading-relaxed mt-0.5">{item.whyItMattersForPeter}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-neutral-500">
                  Linked to {item.relatedOpportunityIds.length} open opportunities
                </span>
                <button
                  onClick={() => onNavigateTab('news')}
                  className="font-semibold text-neutral-900 hover:text-neutral-700"
                >
                  Explore Action Angle →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Peter's Active Career Ecosystem Tracks Overview */}
      <section className="bg-neutral-50 rounded-xl border border-neutral-200 p-5">
        <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
          Active Multi-Track Intelligence Coverage (16 Dimensions)
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {profile.careerTracks.map((track, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-neutral-200 text-neutral-800 shadow-2xs"
            >
              {track}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
