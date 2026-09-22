import React, { useState } from 'react';
import {
  Bookmark,
  ExternalLink,
  Clock,
  MapPin,
  ShieldCheck,
  Building2,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Opportunity, ApplicationTrackingStatus } from '../types';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onSelect: (opp: Opportunity) => void;
  onToggleSave: (id: string) => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onSelect,
  onToggleSave,
  onUpdateStatus,
}) => {
  const [copied, setCopied] = useState(false);

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(opportunity.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-[#E0FEF6]/10 text-[#E0FEF6] border-[#E0FEF6]/30';
    if (score >= 80) return 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30';
    if (score >= 70) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    return 'bg-white/5 text-white/60 border-white/10';
  };

  const getStatusBadge = () => {
    switch (opportunity.status) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent (&lt;3d)
          </span>
        );
      case 'CLOSING_SOON':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Closing Soon
          </span>
        );
      case 'DEADLINE_APPROACHING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/20">
            Approaching
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-white/40 border border-white/10">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E0FEF6]/10 text-[#E0FEF6] border border-[#E0FEF6]/20">
            Active
          </span>
        );
    }
  };

  const getTierBadge = () => {
    if (opportunity.sourceTier.includes('Tier 1')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
          Tier 1 Direct
        </span>
      );
    }
    if (opportunity.sourceTier.includes('Tier 2')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
          Tier 2 Platform
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-white/50 border border-white/10">
        Tier 3 Discovery
      </span>
    );
  };

  return (
    <div
      id={`opp-card-${opportunity.id}`}
      onClick={() => onSelect(opportunity)}
      className="bg-[#0B131C] rounded-2xl border border-white/10 hover:border-[#38BDF8]/40 hover:shadow-2xl transition-all p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF8]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={copyId}
              title="Click to copy Opportunity ID"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-[11px] font-mono transition-colors cursor-pointer border border-white/5"
            >
              <span>{opportunity.id}</span>
              {copied ? <Check className="w-2.5 h-2.5 text-[#E0FEF6]" /> : <Copy className="w-2.5 h-2.5 text-white/30" />}
            </button>
            {getTierBadge()}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 text-white/60 border border-white/10">
              {opportunity.category.replace('_', ' ')}
            </span>
          </div>

          {/* Match Score Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(opportunity.id);
              }}
              className="text-white/40 hover:text-amber-400 transition-colors p-1"
              title={opportunity.isSaved ? 'Remove from saved' : 'Save opportunity'}
            >
              <Bookmark className={`w-4 h-4 ${opportunity.isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <div
              className={`px-3 py-1 rounded-xl border text-xs font-black font-mono flex items-center gap-1 shadow-lg ${getScoreColor(
                opportunity.matchBreakdown.finalScore
              )}`}
              title={`Weighted Score: ${opportunity.matchBreakdown.weightedScore}% | Hard multiplier: ${opportunity.matchBreakdown.hardEligibilityMultiplier}x`}
            >
              <Sparkles className="w-3 h-3 text-[#E0FEF6]" />
              <span>{opportunity.matchBreakdown.finalScore}%</span>
            </div>
          </div>
        </div>

        {/* Opportunity Title */}
        <h3 className="text-lg font-extrabold text-white group-hover:text-[#E0FEF6] transition-colors line-clamp-2 tracking-tight">
          {opportunity.title}
        </h3>

        <div className="flex items-center gap-2 text-xs font-semibold text-white/60 mt-1.5 mb-3">
          <Building2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <span className="truncate">{opportunity.organization}</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40">{opportunity.sourceName}</span>
        </div>

        {/* Location & Status Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60 mb-4">
          <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <MapPin className="w-3 h-3 text-white/40" />
            <span className="truncate max-w-[200px] text-white/80">{opportunity.location}</span>
          </div>
          {opportunity.isRemote && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E0FEF6]/10 text-[#E0FEF6] border border-[#E0FEF6]/20">
              Remote / Telework
            </span>
          )}
          {getStatusBadge()}
        </div>

        {/* Hard Eligibility Indicator */}
        <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-start gap-2.5">
          <ShieldCheck
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              opportunity.hardEligibility === 'CLEARLY_ELIGIBLE'
                ? 'text-[#E0FEF6]'
                : opportunity.hardEligibility === 'ELIGIBILITY_UNCERTAIN'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          />
          <div className="text-xs text-white/70 leading-relaxed">
            <span className="font-extrabold text-white">
              {opportunity.hardEligibility === 'CLEARLY_ELIGIBLE'
                ? 'Eligible (1.0x)'
                : opportunity.hardEligibility === 'ELIGIBILITY_UNCERTAIN'
                ? 'Uncertain (0.5x)'
                : 'Ineligible (0.0x)'}
              :
            </span>{' '}
            {opportunity.hardEligibilityReasons[0] || 'Requirements align with Master’s student profile.'}
          </div>
        </div>

        {/* Skills preview */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {opportunity.skills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#121923] text-white/70 border border-white/5"
            >
              {skill}
            </span>
          ))}
          {opportunity.skills.length > 4 && (
            <span className="px-2 py-1 rounded-lg text-[10px] text-white/40 font-bold bg-white/5">
              +{opportunity.skills.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <label htmlFor={`tracking-${opportunity.id}`} className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Status:
          </label>
          <select
            id={`tracking-${opportunity.id}`}
            value={opportunity.applicationStatus}
            onChange={(e) => onUpdateStatus(opportunity.id, e.target.value as ApplicationTrackingStatus)}
            className="text-xs bg-[#121923] border border-white/10 rounded-lg px-2.5 py-1 text-white font-semibold focus:outline-none focus:border-[#38BDF8] cursor-pointer"
          >
            <option value="Discovered">Discovered</option>
            <option value="Qualified">Qualified</option>
            <option value="Recommended">Recommended</option>
            <option value="Saved">Saved</option>
            <option value="Application Started">Application Started</option>
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
            title="Open official posting"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => onSelect(opportunity)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#E0FEF6] hover:text-white transition-colors"
          >
            <span>Inspect</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
