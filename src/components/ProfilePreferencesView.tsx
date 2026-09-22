import React, { useState } from 'react';
import {
  UserCheck,
  GraduationCap,
  Shield,
  Sliders,
  Bell,
  Mail,
  Check,
  Save,
  FileText,
  Sparkles,
} from 'lucide-react';
import { CandidateProfile, MatchingWeights, Opportunity } from '../types';

interface ProfilePreferencesViewProps {
  profile: CandidateProfile;
  weights: MatchingWeights;
  onUpdateProfile: (p: CandidateProfile) => void;
  onUpdateWeights: (w: MatchingWeights) => void;
  opportunities: Opportunity[];
}

export const ProfilePreferencesView: React.FC<ProfilePreferencesViewProps> = ({
  profile,
  weights,
  onUpdateProfile,
  onUpdateWeights,
  opportunities,
}) => {
  const [localProfile, setLocalProfile] = useState<CandidateProfile>(profile);
  const [localWeights, setLocalWeights] = useState<MatchingWeights>(weights);
  const [showDigestPreview, setShowDigestPreview] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onUpdateProfile(localProfile);
    onUpdateWeights(localWeights);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const highFitOpps = opportunities
    .filter((o) => o.matchBreakdown.finalScore >= 85)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-neutral-700" />
            <span>Profile & Rules Configuration</span>
          </h2>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Configure candidate ground truth for deterministic hard eligibility filtering, multi-factor weighting, and Monday/Wednesday/Friday digest delivery.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Changes Applied!' : 'Save Configurations'}</span>
        </button>
      </div>

      {/* Grid: Candidate Ground Truth + Matching Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Ground Truth Box */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-neutral-900 font-bold text-sm">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Candidate Ground Truth (Rutgers MS IT & Analytics)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-500 font-medium mb-1">Full Name & Email</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={localProfile.name}
                  onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                  className="bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-900 font-medium"
                />
                <input
                  type="email"
                  value={localProfile.email}
                  onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                  className="bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-500 font-medium mb-1">Academic Program & Concentration</label>
              <input
                type="text"
                value={`${localProfile.currentProgram} - ${localProfile.concentration}`}
                readOnly
                className="w-full bg-neutral-100 border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-800 font-medium cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">University</label>
                <input
                  type="text"
                  value={localProfile.school}
                  readOnly
                  className="w-full bg-neutral-100 border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-800 font-medium cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Expected Graduation</label>
                <input
                  type="text"
                  value={localProfile.expectedGraduation}
                  onChange={(e) => setLocalProfile({ ...localProfile, expectedGraduation: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-neutral-900 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Citizenship Standing</label>
                <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-900 font-semibold text-xs flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{localProfile.citizenship.replace('_', ' ')}</span>
                </div>
              </div>
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Clearance Eligibility</label>
                <div className="p-2 bg-neutral-50 border border-neutral-200 rounded text-neutral-800 font-medium text-xs truncate">
                  Eligible for US Secret / Top Secret / Public Trust
                </div>
              </div>
            </div>

            {/* Target Locations */}
            <div>
              <label className="block text-neutral-500 font-medium mb-1">Target Geographic Markets</label>
              <div className="flex flex-wrap gap-1.5">
                {localProfile.targetLocations.map((loc, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-800">
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Factor Mathematical Scoring Weights Box */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-neutral-900 font-bold text-sm">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Multi-Factor Scoring Weights</span>
            </div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase">Sum: 100%</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700">Career Track Alignment</span>
                <span className="font-bold text-neutral-900">{localWeights.careerAlignment * 100}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.05"
                value={localWeights.careerAlignment}
                onChange={(e) => setLocalWeights({ ...localWeights, careerAlignment: parseFloat(e.target.value) })}
                className="w-full accent-neutral-900"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700">Skill Alignment (Python, SIEM, NIST)</span>
                <span className="font-bold text-neutral-900">{localWeights.skillAlignment * 100}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.3"
                step="0.05"
                value={localWeights.skillAlignment}
                onChange={(e) => setLocalWeights({ ...localWeights, skillAlignment: parseFloat(e.target.value) })}
                className="w-full accent-neutral-900"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700">Eligibility Factor</span>
                <span className="font-bold text-neutral-900">{Math.round(localWeights.eligibility * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.25"
                step="0.05"
                value={localWeights.eligibility}
                onChange={(e) => setLocalWeights({ ...localWeights, eligibility: parseFloat(e.target.value) })}
                className="w-full accent-neutral-900"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700">Experience Fit</span>
                <span className="font-bold text-neutral-900">{localWeights.experienceFit * 100}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.2"
                step="0.05"
                value={localWeights.experienceFit}
                onChange={(e) => setLocalWeights({ ...localWeights, experienceFit: parseFloat(e.target.value) })}
                className="w-full accent-neutral-900"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700">Education Fit (Graduate Level)</span>
                <span className="font-bold text-neutral-900">{localWeights.educationFit * 100}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.2"
                step="0.05"
                value={localWeights.educationFit}
                onChange={(e) => setLocalWeights({ ...localWeights, educationFit: parseFloat(e.target.value) })}
                className="w-full accent-neutral-900"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-700">Opportunity Value (Direct Tier 1)</span>
                <span className="font-bold text-neutral-900">{localWeights.opportunityValue * 100}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.2"
                step="0.05"
                value={localWeights.opportunityValue}
                onChange={(e) => setLocalWeights({ ...localWeights, opportunityValue: parseFloat(e.target.value) })}
                className="w-full accent-neutral-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Schedule & Delivery Settings */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 text-neutral-900 font-bold text-sm">
          <Bell className="w-4 h-4 text-indigo-600" />
          <span>Notification Schedule & Quality Control (Section 25-27)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
            <span className="font-bold text-neutral-800 block">Schedule Cadence</span>
            <p className="text-neutral-600 leading-relaxed">
              Dispatches every <span className="font-semibold text-neutral-900">Monday, Wednesday, Friday at 08:00 AM EST</span> before business hours.
            </p>
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              Active Automation
            </div>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
            <span className="font-bold text-neutral-800 block">Empty Digest Suppression</span>
            <p className="text-neutral-600 leading-relaxed">
              If no newly qualified or urgent opportunities reach the minimum score threshold, suppression prevents inbox fatigue.
            </p>
            <label className="flex items-center space-x-2 font-semibold text-neutral-900 cursor-pointer pt-1">
              <input type="checkbox" defaultChecked className="rounded text-neutral-900 focus:ring-neutral-900" />
              <span>Suppress empty alerts</span>
            </label>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col justify-between">
            <div>
              <span className="font-bold text-neutral-800 block">Digest Preview</span>
              <p className="text-neutral-600 text-xs mt-1">
                Preview how high-priority items format for Peter's email notification digest.
              </p>
            </div>
            <button
              onClick={() => setShowDigestPreview(true)}
              className="mt-3 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Preview Email Digest
            </button>
          </div>
        </div>
      </div>

      {/* Email Digest Preview Modal */}
      {showDigestPreview && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">Digest Preview</span>
                <h3 className="text-base font-bold text-neutral-900">
                  Opportunity Intelligence Digest: Monday Briefing for Peter Grigoryev
                </h3>
              </div>
              <button
                onClick={() => setShowDigestPreview(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 text-xs font-mono space-y-3">
              <div className="text-neutral-500 pb-2 border-b border-neutral-200">
                To: PeterGrigoryevS@outlook.com<br />
                Subject: [Opportunity Intel] 3 High-Relevance Roles + 1 Policy Wire for Rutgers MS IT&A
              </div>

              <div className="text-neutral-800 space-y-3 font-sans">
                <p>Hello Peter,</p>
                <p>
                  Here is your automated Monday intelligence digest. 3 new opportunities match your Rutgers MS in IT & Analytics cybersecurity specialization:
                </p>

                {highFitOpps.map((o) => (
                  <div key={o.id} className="p-3 bg-white rounded border border-neutral-200 space-y-1">
                    <div className="flex justify-between font-bold text-neutral-900">
                      <span>{o.title} — {o.organization}</span>
                      <span className="text-emerald-700">{o.matchBreakdown.finalScore}% Match</span>
                    </div>
                    <div className="text-neutral-500 text-[11px]">
                      ID: {o.id} • Due: {o.applicationDeadline ? new Date(o.applicationDeadline).toLocaleDateString() : 'Rolling'} • {o.sector}
                    </div>
                    <p className="text-neutral-700 text-xs italic">
                      "{o.aiExplanation.slice(0, 160)}..."
                    </p>
                  </div>
                ))}

                <p className="text-neutral-500 text-[11px] pt-2 border-t border-neutral-200">
                  Opportunity Intelligence System • Tracking 16 Career Tracks • Mon/Wed/Fri Automated Delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
