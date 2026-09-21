import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Search,
  Filter,
  Trash2,
  Calendar,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Opportunity, ApplicationTrackingStatus } from '../types';

interface ApplicationTrackerViewProps {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdatePriority: (id: string, priority: 'High' | 'Medium' | 'Low') => void;
  onAddNewManualOpportunity: (opp: Partial<Opportunity>) => void;
}

export const ApplicationTrackerView: React.FC<ApplicationTrackerViewProps> = ({
  opportunities,
  onSelectOpportunity,
  onUpdateStatus,
  onUpdateNotes,
  onUpdatePriority,
  onAddNewManualOpportunity,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New manual entry state
  const [newTitle, setNewTitle] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('High');

  const filteredList = opportunities.filter((opp) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') {
      return (
        opp.applicationStatus === 'Application Started' ||
        opp.applicationStatus === 'Applied' ||
        opp.applicationStatus === 'Interview' ||
        opp.applicationStatus === 'Saved'
      );
    }
    return opp.applicationStatus === filterStatus;
  });

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Opportunity ID',
      'Organization',
      'Opportunity Title',
      'Category',
      'URL',
      'Date Found',
      'Deadline',
      'Priority',
      'Match Score',
      'Status',
      'Notes',
    ];

    const rows = opportunities.map((o) => [
      `"${o.id}"`,
      `"${o.organization.replace(/"/g, '""')}"`,
      `"${o.title.replace(/"/g, '""')}"`,
      `"${o.category}"`,
      `"${o.url}"`,
      `"${new Date(o.firstSeenAt).toISOString().split('T')[0]}"`,
      `"${o.applicationDeadline ? new Date(o.applicationDeadline).toISOString().split('T')[0] : 'Rolling'}"`,
      `"${o.priority}"`,
      `"${o.matchBreakdown.finalScore}%"`,
      `"${o.applicationStatus}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Peter_Grigoryev_Opportunity_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy TSV for Google Sheets pasting
  const copyForGoogleSheets = () => {
    const headers = [
      'Opportunity ID',
      'Organization',
      'Opportunity Title',
      'Category',
      'URL',
      'Date Found',
      'Deadline',
      'Priority',
      'Match Score',
      'Status',
      'Notes',
    ];

    const rows = opportunities.map((o) => [
      o.id,
      o.organization,
      o.title,
      o.category,
      o.url,
      new Date(o.firstSeenAt).toISOString().split('T')[0],
      o.applicationDeadline ? new Date(o.applicationDeadline).toISOString().split('T')[0] : 'Rolling',
      o.priority,
      `${o.matchBreakdown.finalScore}%`,
      o.applicationStatus,
      o.notes || '',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2000);
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newOrg.trim()) return;

    onAddNewManualOpportunity({
      title: newTitle,
      organization: newOrg,
      url: newUrl || 'https://google.com',
      applicationDeadline: newDeadline || null,
      priority: newPriority,
      applicationStatus: 'Saved',
    });

    setNewTitle('');
    setNewOrg('');
    setNewUrl('');
    setNewDeadline('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner: Spreadsheet Integration explanation */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
            <span>Spreadsheet Synchronization Layer</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">Live Synced</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Application Pipeline & Tracker
          </h2>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Maintains permanent <span className="font-mono font-semibold text-neutral-800">Opportunity IDs</span> (e.g. OPP-2026-000101) so you can track applications directly in your personal Google Sheets or Excel workbook while keeping match metrics live.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={copyForGoogleSheets}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            title="Copies table data in tab-separated format ready to paste (Cmd+V) directly into Google Sheets"
          >
            {copiedTsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{copiedTsv ? 'Copied TSV to Clipboard!' : 'Copy for Google Sheets'}</span>
          </button>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 border border-neutral-300 hover:bg-neutral-50 rounded-md text-xs font-medium text-neutral-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Role</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-neutral-400 uppercase tracking-wider mr-2 text-[10px]">Filter View:</span>
        {['ALL', 'ACTIVE', 'Application Started', 'Applied', 'Interview', 'Saved', 'Discovered'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterStatus === status
                ? 'bg-neutral-900 text-white font-semibold'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            {status} ({opportunities.filter((o) => status === 'ALL' || (status === 'ACTIVE' ? ['Application Started', 'Applied', 'Interview', 'Saved'].includes(o.applicationStatus) : o.applicationStatus === status)).length})
          </button>
        ))}
      </div>

      {/* Spreadsheet Table View */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-3 text-left">Opportunity ID</th>
                <th className="px-3 py-3 text-left">Organization & Role</th>
                <th className="px-3 py-3 text-center">Score</th>
                <th className="px-3 py-3 text-left">Priority</th>
                <th className="px-3 py-3 text-left">Application Status</th>
                <th className="px-3 py-3 text-left">Deadline</th>
                <th className="px-3 py-3 text-left">Tracker Notes</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {filteredList.map((opp) => (
                <tr key={opp.id} className="hover:bg-neutral-50/60 transition-colors">
                  {/* ID */}
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-neutral-700">
                    <button
                      onClick={() => copyId(opp.id)}
                      className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-mono cursor-pointer"
                      title="Copy ID for your spreadsheet"
                    >
                      <span>{opp.id}</span>
                      {copiedId === opp.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-neutral-400" />
                      )}
                    </button>
                  </td>

                  {/* Organization & Role */}
                  <td className="px-3 py-2.5 max-w-[280px]">
                    <div
                      onClick={() => onSelectOpportunity(opp)}
                      className="font-semibold text-neutral-900 hover:text-neutral-700 cursor-pointer truncate"
                      title={opp.title}
                    >
                      {opp.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 flex items-center space-x-1 mt-0.5 truncate">
                      <span>{opp.organization}</span>
                      <span>•</span>
                      <span className="text-neutral-400">{opp.category}</span>
                    </div>
                  </td>

                  {/* Score */}
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        opp.matchBreakdown.finalScore >= 90
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : opp.matchBreakdown.finalScore >= 80
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {opp.matchBreakdown.finalScore}%
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <select
                      value={opp.priority}
                      onChange={(e) => onUpdatePriority(opp.id, e.target.value as any)}
                      className={`text-xs rounded px-2 py-1 font-semibold focus:outline-none border cursor-pointer ${
                        opp.priority === 'High'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : opp.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <select
                      value={opp.applicationStatus}
                      onChange={(e) => onUpdateStatus(opp.id, e.target.value as ApplicationTrackingStatus)}
                      className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
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
                  </td>

                  {/* Deadline */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-neutral-600 font-medium">
                    {opp.applicationDeadline
                      ? new Date(opp.applicationDeadline).toLocaleDateString()
                      : 'Rolling'}
                  </td>

                  {/* Notes inline edit */}
                  <td className="px-3 py-2.5 min-w-[220px]">
                    <input
                      type="text"
                      defaultValue={opp.notes || ''}
                      onBlur={(e) => onUpdateNotes(opp.id, e.target.value)}
                      placeholder="Add notes..."
                      className="w-full bg-transparent hover:bg-neutral-50 focus:bg-white border border-transparent hover:border-neutral-200 focus:border-neutral-300 rounded px-2 py-1 text-xs text-neutral-800 focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <a
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Open posting"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => onSelectOpportunity(opp)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-800 text-[11px] font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900">Add Manual Opportunity for Tracking</h3>
            <p className="text-xs text-neutral-500">
              Found an opportunity outside automated discovery? Add it here to generate an ID and sync it with your tracking spreadsheet.
            </p>

            <form onSubmit={handleCreateManual} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-medium mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cyber Threat Intelligence Analyst Intern"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-neutral-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-medium mb-1">Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandiant / Google Cloud"
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  className="w-full border border-neutral-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-medium mb-1">Posting URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full border border-neutral-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full border border-neutral-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full border border-neutral-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-semibold shadow-xs"
                >
                  Create & Track ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
