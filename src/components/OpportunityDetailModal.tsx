import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  FileText,
  Tag,
  Briefcase,
} from 'lucide-react';
import { Opportunity, ApplicationTrackingStatus, CandidateProfile } from '../types';

interface OpportunityDetailModalProps {
  opportunity: Opportunity | null;
  profile: CandidateProfile;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdatePriority: (id: string, priority: 'High' | 'Medium' | 'Low') => void;
  onToggleSave: (id: string) => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  profile,
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onUpdatePriority,
  onToggleSave,
}) => {
  if (!opportunity) return null;

  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(opportunity.notes || '');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(opportunity.aiExplanation);

  const copyId = () => {
    navigator.clipboard.writeText(opportunity.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(opportunity.id, notes);
  };

  const requestAiAnalysis = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/intelligence/explain-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity, profile }),
      });
      const data = await res.json();
      if (data.explanation) {
        setAiExplanation(data.explanation);
      }
    } catch (err) {
      console.error('Failed to get AI match explanation', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const { matchBreakdown } = opportunity;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-98 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-4 bg-neutral-50/50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <button
                onClick={copyId}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Copy Opportunity ID for Spreadsheet"
              >
                <span>{opportunity.id}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-500" />}
              </button>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-neutral-200 text-neutral-800">
                {opportunity.sourceTier}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
                {opportunity.category.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
                {opportunity.sector}
              </span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 leading-snug">
              {opportunity.title}
            </h2>
            <div className="flex items-center space-x-2 text-xs font-medium text-neutral-600 mt-1">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>{opportunity.organization}</span>
              <span className="text-neutral-300">•</span>
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              <span>{opportunity.location}</span>
              {opportunity.isRemote && (
                <span className="text-emerald-700 font-semibold">(Remote / Hybrid Option)</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Final Match Score</span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold text-neutral-900">{matchBreakdown.finalScore}%</span>
                <span className="text-xs text-neutral-500">({matchBreakdown.weightedScore} weighted)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Hard Multiplier</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-bold text-neutral-900">{matchBreakdown.hardEligibilityMultiplier}x</span>
                <span className="text-xs font-medium text-emerald-700">
                  {opportunity.hardEligibility === 'CLEARLY_ELIGIBLE' ? 'Eligible' : 'Check Rules'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Application Deadline</span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-xs font-semibold text-neutral-900">
                  {opportunity.applicationDeadline
                    ? new Date(opportunity.applicationDeadline).toLocaleDateString()
                    : 'Rolling / Continuous'}
                </span>
                <span className="text-[10px] font-bold uppercase text-neutral-500">{opportunity.status}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Source Registry</span>
              <span className="text-xs font-semibold text-neutral-800 mt-1 truncate">{opportunity.sourceName}</span>
              <span className="text-[10px] text-neutral-500">Verified: {new Date(opportunity.lastVerifiedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* AI Opportunity Intelligence Explainer */}
          <div className="p-4 rounded-lg bg-neutral-900 text-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span>AI Opportunity Intelligence Rationale</span>
              </div>
              <button
                onClick={requestAiAnalysis}
                disabled={isGeneratingAI}
                className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAI ? 'Analyzing...' : 'Refresh AI Rationale'}</span>
              </button>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed">
              {aiExplanation}
            </p>
          </div>

          {/* Hard Eligibility Checklist */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hard Eligibility Verification (Stage 1 Deterministic Rules)</span>
            </h3>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-1.5 text-xs">
              {opportunity.hardEligibilityReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-neutral-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
              <div className="pt-2 text-[11px] text-neutral-500 border-t border-neutral-200 mt-2">
                Citizenship requirement: <span className="font-semibold text-neutral-700">{opportunity.citizenshipRequirement}</span> • Education Standing: <span className="font-semibold text-neutral-700">{opportunity.educationRequirement}</span>
              </div>
            </div>
          </div>

          {/* Mathematical Multi-Factor Breakdown Table */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
              Multi-Factor Score Weighting Matrix
            </h3>
            <div className="border border-neutral-200 rounded-lg overflow-hidden text-xs">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50 text-neutral-500 font-medium">
                  <tr>
                    <th className="px-3 py-2 text-left">Factor</th>
                    <th className="px-3 py-2 text-center">Weight</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Weighted Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Career Alignment (16 Tracks)</td>
                    <td className="px-3 py-2 text-center text-neutral-500">25%</td>
                    <td className="px-3 py-2 text-right">{matchBreakdown.careerAlignment}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(matchBreakdown.careerAlignment * 0.25).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Skill Alignment (Python, SIEM, NIST, Linux)</td>
                    <td className="px-3 py-2 text-center text-neutral-500">20%</td>
                    <td className="px-3 py-2 text-right">{matchBreakdown.skillAlignment}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(matchBreakdown.skillAlignment * 0.2).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Eligibility Factor</td>
                    <td className="px-3 py-2 text-center text-neutral-500">15%</td>
                    <td className="px-3 py-2 text-right">{matchBreakdown.eligibilityScore}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(matchBreakdown.eligibilityScore * 0.15).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Experience Fit</td>
                    <td className="px-3 py-2 text-center text-neutral-500">10%</td>
                    <td className="px-3 py-2 text-right">{matchBreakdown.experienceFit}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(matchBreakdown.experienceFit * 0.1).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Education Fit (Rutgers MS IT & Analytics)</td>
                    <td className="px-3 py-2 text-center text-neutral-500">10%</td>
                    <td className="px-3 py-2 text-right">{matchBreakdown.educationFit}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(matchBreakdown.educationFit * 0.1).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Opportunity Value (Direct Tier 1-2 Priority)</td>
                    <td className="px-3 py-2 text-center text-neutral-500">10%</td>
                    <td className="px-3 py-2 text-right">{matchBreakdown.opportunityValue}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(matchBreakdown.opportunityValue * 0.1).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Location / Remote Fit (NYC / NJ / DC)</td>
                    <td className="px-3 py-2 text-center text-neutral-500">5%</td>
                    <td className="px-3 py-2 text-right">{(matchBreakdown.locationRemoteFit ?? matchBreakdown.locationScore ?? 90)}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(((matchBreakdown.locationRemoteFit ?? matchBreakdown.locationScore ?? 90)) * 0.05).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-neutral-800">Timing & Deadline Freshness</td>
                    <td className="px-3 py-2 text-center text-neutral-500">5%</td>
                    <td className="px-3 py-2 text-right">{(matchBreakdown.timingDeadlineFit ?? matchBreakdown.timingScore ?? 90)}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-neutral-900">{(((matchBreakdown.timingDeadlineFit ?? matchBreakdown.timingScore ?? 90)) * 0.05).toFixed(1)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-neutral-50 border-t border-neutral-200 font-bold">
                  <tr>
                    <td className="px-3 py-2 text-neutral-900">Final Weighted Multiplier Product</td>
                    <td className="px-3 py-2 text-center text-neutral-600">100%</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{matchBreakdown.hardEligibilityMultiplier}x</td>
                    <td className="px-3 py-2 text-right text-emerald-700 text-sm">{matchBreakdown.finalScore}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Description & Requirements */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
              Opportunity Description
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed mb-3">
              {opportunity.description}
            </p>

            <h4 className="text-xs font-semibold text-neutral-800 mb-1.5">Requirements & Qualifications:</h4>
            <ul className="list-disc list-inside text-xs text-neutral-600 space-y-1 mb-4">
              {opportunity.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>

            <h4 className="text-xs font-semibold text-neutral-800 mb-1.5">Required & Preferred Skills:</h4>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.skills.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-800 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Application Tracking & Spreadsheet Workflow */}
          <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50 space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-neutral-700" />
              <span>Application Tracking & Spreadsheet Sync</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                  Application Status
                </label>
                <select
                  value={opportunity.applicationStatus}
                  onChange={(e) => onUpdateStatus(opportunity.id, e.target.value as ApplicationTrackingStatus)}
                  className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
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

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                  Priority
                </label>
                <select
                  value={opportunity.priority}
                  onChange={(e) => onUpdatePriority(opportunity.id, e.target.value as any)}
                  className="w-full bg-white border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                  Spreadsheet Key
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    readOnly
                    value={opportunity.id}
                    className="w-full bg-neutral-100 border border-neutral-200 rounded px-2 py-1.5 text-neutral-600 font-mono text-[11px]"
                  />
                  <button
                    onClick={copyId}
                    className="p-1.5 bg-neutral-200 hover:bg-neutral-300 rounded text-neutral-700 cursor-pointer"
                    title="Copy Opportunity ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Application Notes (Custom resume tailoring, contact points, interview logs)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                rows={2}
                placeholder="Add private notes for Peter's application tracking..."
                className="w-full bg-white border border-neutral-200 rounded p-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <button
            onClick={() => onToggleSave(opportunity.id)}
            className="px-3 py-1.5 rounded text-xs font-medium border border-neutral-300 hover:bg-neutral-100 text-neutral-700 cursor-pointer"
          >
            {opportunity.isSaved ? '★ Saved to Shortlist' : '☆ Save Opportunity'}
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
            >
              Close
            </button>
            <a
              href={opportunity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <span>Apply / View Official Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
