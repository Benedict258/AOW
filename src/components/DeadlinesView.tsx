import React from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
  Building2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Opportunity, ApplicationTrackingStatus } from '../types';

interface DeadlinesViewProps {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
}

export const DeadlinesView: React.FC<DeadlinesViewProps> = ({
  opportunities,
  onSelectOpportunity,
  onUpdateStatus,
}) => {
  const urgent = opportunities.filter((o) => o.status === 'URGENT');
  const closingSoon = opportunities.filter((o) => o.status === 'CLOSING_SOON');
  const approaching = opportunities.filter((o) => o.status === 'DEADLINE_APPROACHING');
  const activeOrRolling = opportunities.filter(
    (o) => o.status === 'ACTIVE' || o.deadlineType === 'ROLLING'
  );

  const renderDeadlineGroup = (
    title: string,
    badgeText: string,
    badgeColor: string,
    items: Opportunity[],
    icon: React.ReactNode
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-sm font-bold text-neutral-900 tracking-tight">{title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeColor}`}>
            {items.length} {badgeText}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((opp) => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity(opp)}
              className="bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 p-4 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                    {opp.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      opp.matchBreakdown.finalScore >= 90
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {opp.matchBreakdown.finalScore}% Match
                  </span>
                </div>

                <h4 className="text-sm font-bold text-neutral-900 group-hover:text-neutral-950 line-clamp-1">
                  {opp.title}
                </h4>

                <div className="flex items-center space-x-1.5 text-xs text-neutral-600 mt-0.5 mb-2.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="truncate">{opp.organization}</span>
                </div>

                <div className="p-2 rounded bg-neutral-50 border border-neutral-100 text-xs flex items-center justify-between text-neutral-700 mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-medium">
                      {opp.applicationDeadline
                        ? `Due: ${new Date(opp.applicationDeadline).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}`
                        : 'Rolling Application'}
                    </span>
                  </div>
                  <span className="font-semibold text-neutral-900">
                    Status: {opp.applicationStatus}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                <select
                  value={opp.applicationStatus}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateStatus(opp.id, e.target.value as ApplicationTrackingStatus)}
                  className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 font-medium text-[11px] focus:outline-none"
                >
                  <option value="Discovered">Discovered</option>
                  <option value="Saved">Saved</option>
                  <option value="Application Started">Application Started</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                </select>

                <button
                  onClick={() => onSelectOpportunity(opp)}
                  className="inline-flex items-center space-x-1 font-semibold text-neutral-900 hover:text-neutral-700"
                >
                  <span>Review Application</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
          Application Deadline Timeline & Urgency Tracker
        </h2>
        <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
          Deterministic freshness management ensures Peter never misses critical application windows for federal traineeships, policy fellowships, and student competitions.
        </p>
      </div>

      {renderDeadlineGroup(
        'Critical / Urgent Window (< 3 Days Remaining)',
        'Urgent',
        'bg-rose-100 text-rose-800',
        urgent,
        <AlertTriangle className="w-4 h-4 text-rose-600" />
      )}

      {renderDeadlineGroup(
        'Closing Soon (3 to 7 Days Remaining)',
        'Action Required',
        'bg-amber-100 text-amber-800',
        closingSoon,
        <Clock className="w-4 h-4 text-amber-600" />
      )}

      {renderDeadlineGroup(
        'Approaching Deadlines (7 to 14 Days Remaining)',
        'In Preparation',
        'bg-blue-100 text-blue-800',
        approaching,
        <Calendar className="w-4 h-4 text-blue-600" />
      )}

      {renderDeadlineGroup(
        'Active Cohorts & Rolling Windows (> 14 Days)',
        'Active',
        'bg-emerald-100 text-emerald-800',
        activeOrRolling,
        <CheckCircle className="w-4 h-4 text-emerald-600" />
      )}
    </div>
  );
};
