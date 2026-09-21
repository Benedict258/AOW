import React, { useState } from 'react';
import {
  Award,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  Terminal,
  Clock,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { Opportunity, ApplicationTrackingStatus } from '../types';

interface EventsAndCertsViewProps {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
}

export const EventsAndCertsView: React.FC<EventsAndCertsViewProps> = ({
  opportunities,
  onSelectOpportunity,
  onUpdateStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'certs'>('events');

  const events = opportunities.filter(
    (o) =>
      o.category === 'EVENTS' ||
      o.category === 'TECHNICAL_EXPERIENCE' ||
      o.opportunityType === 'Competition' ||
      o.opportunityType === 'Conference' ||
      o.opportunityType === 'Hackathon'
  );

  const certsAndEdu = opportunities.filter(
    (o) =>
      o.category === 'EDUCATION' ||
      o.opportunityType === 'Certification' ||
      o.opportunityType === 'Fellowship' ||
      o.title.toLowerCase().includes('voucher') ||
      o.title.toLowerCase().includes('grant') ||
      o.title.toLowerCase().includes('certification')
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
            <Award className="w-5 h-5 text-neutral-700" />
            <span>Events, CTFs, Competitions & Professional Certifications</span>
          </h2>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            High-leverage experiential pathways: collegiate cyber defense competitions (CCDC), BSides security summits, policy war games, and academic certification vouchers.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-neutral-100 p-1 rounded-lg text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'events' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Competitions & Events ({events.length})
          </button>
          <button
            onClick={() => setActiveSubTab('certs')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'certs' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Certifications & Grants ({certsAndEdu.length})
          </button>
        </div>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(activeSubTab === 'events' ? events : certsAndEdu).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectOpportunity(item)}
            className="bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-100 text-neutral-700">
                    {item.id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 text-white">
                    {item.opportunityType}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600">
                    {item.sector}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    item.matchBreakdown.finalScore >= 90
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {item.matchBreakdown.finalScore}% Fit
                </span>
              </div>

              <h3 className="text-base font-bold text-neutral-900 group-hover:text-neutral-950 mb-1 line-clamp-2">
                {item.title}
              </h3>

              <div className="flex items-center space-x-1.5 text-xs text-neutral-600 mb-3">
                <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-medium">{item.organization}</span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1.5 text-xs text-neutral-600 mb-3">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{item.location}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    Deadline: {item.applicationDeadline ? new Date(item.applicationDeadline).toLocaleDateString() : 'Rolling'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-neutral-600 line-clamp-2 mb-3">
                {item.description}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {item.skills.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-neutral-500">
                Tracking: <span className="font-semibold text-neutral-800">{item.applicationStatus}</span>
              </span>

              <div className="flex items-center space-x-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-neutral-400 hover:text-neutral-900"
                  title="Official portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => onSelectOpportunity(item)}
                  className="px-2.5 py-1 bg-neutral-900 text-white rounded text-[11px] font-semibold hover:bg-neutral-800"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
