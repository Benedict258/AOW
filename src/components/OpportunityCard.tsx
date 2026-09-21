import React, { useState } from 'react';
import {
  Bookmark,
  ExternalLink,
  Clock,
  MapPin,
  ShieldCheck,
  Building2,
  Sparkles,
  CheckCircle2,
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
    if (score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    if (score >= 80) return 'bg-blue-50 text-blue-700 border-blue-300';
    if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-300';
    return 'bg-neutral-100 text-neutral-600 border-neutral-200';
  };

  const getStatusBadge = () => {
    switch (opportunity.status) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent (&lt;3 days)
          </span>
        );
      case 'CLOSING_SOON':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Closing Soon (3-7 days)
          </span>
        );
      case 'DEADLINE_APPROACHING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Approaching (7-14 days)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
    }
  };

  const getTierBadge = () => {
    if (opportunity.sourceTier.includes('Tier 1')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Tier 1 Direct
        </span>
      );
    }
    if (opportunity.sourceTier.includes('Tier 2')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          Tier 2 Platform
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
        Tier 3 Discovery
      </span>
    );
  };

  return (
    <div
      id={`opp-card-${opportunity.id}`}
      onClick={() => onSelect(opportunity)}
      className="bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all p-5 flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Stable ID for tracking */}
            <button
              onClick={copyId}
              title="Click to copy Opportunity ID for application spreadsheet"
              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-mono font-medium transition-colors cursor-pointer"
            >
              <span>{opportunity.id}</span>
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 text-neutral-400" />}
            </button>
            {getTierBadge()}
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
              {opportunity.category.replace('_', ' ')}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">
              {opportunity.sector}
            </span>
          </div>

          {/* Match Score Badge */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(opportunity.id);
              }}
              className="text-neutral-400 hover:text-amber-500 transition-colors p-1"
              title={opportunity.isSaved ? 'Remove from saved' : 'Save opportunity'}
            >
              <Bookmark className={`w-4 h-4 ${opportunity.isSaved ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>

            <div
              className={`px-2.5 py-1 rounded-md border text-xs font-bold flex items-center space-x-1 ${getScoreColor(
                opportunity.matchBreakdown.finalScore
              )}`}
              title={`Weighted Score: ${opportunity.matchBreakdown.weightedScore}% | Hard multiplier: ${opportunity.matchBreakdown.hardEligibilityMultiplier}x`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{opportunity.matchBreakdown.finalScore}%</span>
            </div>
          </div>
        </div>

        {/* Opportunity Title & Organization */}
        <h3 className="text-base font-semibold text-neutral-900 group-hover:text-neutral-950 transition-colors line-clamp-2">
          {opportunity.title}
        </h3>

        <div className="flex items-center space-x-2 text-xs font-medium text-neutral-600 mt-1 mb-3">
          <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="truncate">{opportunity.organization}</span>
          <span className="text-neutral-300">•</span>
          <span className="text-neutral-500">{opportunity.sourceName}</span>
        </div>

        {/* Location, Remote, Deadline Status */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-neutral-500 mb-3.5">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-neutral-400" />
            <span className="truncate max-w-[200px]">{opportunity.location}</span>
          </div>
          {opportunity.isRemote && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              Remote / Hybrid
            </span>
          )}
          <div className="flex items-center space-x-1.5">
            {getStatusBadge()}
          </div>
        </div>

        {/* Hard Eligibility indicator */}
        <div className="mb-3.5 p-2 bg-neutral-50 rounded border border-neutral-100 flex items-start space-x-2 text-xs">
          <ShieldCheck
            className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
              opportunity.hardEligibility === 'CLEARLY_ELIGIBLE'
                ? 'text-emerald-600'
                : opportunity.hardEligibility === 'ELIGIBILITY_UNCERTAIN'
                ? 'text-amber-500'
                : 'text-rose-500'
            }`}
          />
          <div className="text-[11px] text-neutral-600 leading-snug">
            <span className="font-medium text-neutral-800">
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
        <div className="flex flex-wrap gap-1 mb-4">
          {opportunity.skills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700"
            >
              {skill}
            </span>
          ))}
          {opportunity.skills.length > 4 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] text-neutral-400 font-medium">
              +{opportunity.skills.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Footer Controls: Tracking Status & Details */}
      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <label htmlFor={`tracking-${opportunity.id}`} className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
            Status:
          </label>
          <select
            id={`tracking-${opportunity.id}`}
            value={opportunity.applicationStatus}
            onChange={(e) => onUpdateStatus(opportunity.id, e.target.value as ApplicationTrackingStatus)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
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

        <div className="flex items-center space-x-2">
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
            title="Open official posting"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => onSelect(opportunity)}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-neutral-900 hover:text-neutral-700"
          >
            <span>Inspect</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
