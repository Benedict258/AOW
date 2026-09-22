import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Briefcase,
  Newspaper,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Executive Welcome & Rutgers Standing (Hero Card) */}
      <div className="bg-[#0B131C] rounded-2xl border border-white/10 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#38BDF8]/10 via-[#E0FEF6]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#E0FEF6] mb-2">
              <ShieldCheck className="w-4 h-4 text-[#E0FEF6]" />
              <span>Automated Career Intelligence Layer</span>
              <span className="text-white/30">•</span>
              <span className="text-[#38BDF8]">Autonomous Pipeline Active</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Good morning, Peter
            </h2>
            <p className="text-sm text-white/70 mt-2 max-w-2xl leading-relaxed">
              Monitoring 16 career tracks across <span className="font-extrabold text-white">Tier 1 Federal/Direct, Think Tanks, International Orgs, and Tech Leaders</span> tailored to your Rutgers MS in IT & Analytics cybersecurity concentration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 bg-[#121923] border border-white/10 rounded-xl text-xs">
              <span className="text-white/40 block text-[10px] uppercase font-black tracking-widest">Schedule</span>
              <span className="font-bold text-white font-mono">Mon / Wed / Fri 8 AM ET</span>
            </div>
            <div className="px-4 py-2.5 bg-[#E0FEF6]/10 border border-[#E0FEF6]/20 rounded-xl text-xs">
              <span className="text-[#E0FEF6] block text-[10px] uppercase font-black tracking-widest">Noise Filter</span>
              <span className="font-bold text-[#E0FEF6]">Empty Digests Suppressed</span>
            </div>
          </div>
        </div>

        {/* 4 Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10 relative z-10">
          <div
            onClick={() => onNavigateTab('opportunities')}
            className="p-4 bg-[#121923] hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <span className="text-xs text-white/60 font-bold">Active Opportunities</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">{opportunities.length}</span>
              <span className="text-[11px] text-white/40 font-semibold">across 4 tiers</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('recommended')}
            className="p-4 bg-[#E0FEF6]/10 hover:bg-[#E0FEF6]/15 border border-[#E0FEF6]/30 rounded-xl transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <span className="text-xs text-[#E0FEF6] font-bold">Top Matches (≥90%)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-[#E0FEF6] tracking-tight">{highMatchCount}</span>
              <span className="text-[11px] text-[#E0FEF6]/80 font-bold uppercase tracking-wider">High Relevance</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('deadlines')}
            className="p-4 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 rounded-xl transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <span className="text-xs text-rose-300 font-bold">Urgent Deadlines</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-rose-400 tracking-tight">{urgentDeadlines.length}</span>
              <span className="text-[11px] text-rose-300 font-semibold">&lt;7 days closing</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('tracker')}
            className="p-4 bg-[#38BDF8]/10 hover:bg-[#38BDF8]/15 border border-[#38BDF8]/30 rounded-xl transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <span className="text-xs text-[#38BDF8] font-bold">In Active Pipeline</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-[#38BDF8] tracking-tight">{activeApplications.length}</span>
              <span className="text-[11px] text-[#38BDF8]/80 font-semibold">spreadsheet sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Deadlines Alert Banner if any */}
      {urgentDeadlines.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-extrabold text-rose-300 tracking-wide">
                {urgentDeadlines.length} High-Relevance Opportunities Closing This Week
              </h4>
              <p className="text-xs text-rose-300/80 mt-1">
                Includes {urgentDeadlines[0].title} ({urgentDeadlines[0].organization}). Finalize applications before deadline expiration.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('deadlines')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer transition-all hover:scale-105"
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
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E0FEF6]" />
              <span>Highest Recommended Opportunities</span>
            </h3>
            <p className="text-xs text-white/50 font-medium">
              Evaluated with hard eligibility checks and 8-factor multi-dimensional scoring.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('recommended')}
            className="text-xs font-bold text-[#E0FEF6] hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View All ({opportunities.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <section className="bg-[#0B131C] rounded-2xl border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#38BDF8]" />
              <span>News-to-Opportunity Intelligence</span>
            </h3>
            <p className="text-xs text-white/50 font-medium">
              Transforming policy developments and federal mandates into actionable career pathways.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('news')}
            className="text-xs font-bold text-[#38BDF8] hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View Full Intel Wire</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {newsItems.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-white/10 bg-[#121923] hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-white/50 mb-2 font-mono">
                  <span className="font-bold text-[#38BDF8]">{item.source}</span>
                  <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                </div>
                <h4 className="text-base font-extrabold text-white mb-2 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-white/70 mb-4 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>

                {/* Why it matters for Peter */}
                <div className="p-3 rounded-xl bg-[#E0FEF6]/5 border border-[#E0FEF6]/20 text-xs text-white/90 mb-4">
                  <span className="font-black uppercase text-[10px] text-[#E0FEF6] tracking-widest block mb-1">
                    Why it matters for Peter:
                  </span>
                  <p className="text-xs leading-relaxed">{item.whyItMattersForPeter}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-xs font-medium text-white/50">
                  Linked to {item.relatedOpportunityIds.length} open opportunities
                </span>
                <button
                  onClick={() => onNavigateTab('news')}
                  className="font-bold text-[#E0FEF6] hover:text-white transition-colors"
                >
                  Explore Action Angle →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
