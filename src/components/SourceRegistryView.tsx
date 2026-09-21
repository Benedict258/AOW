import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Activity,
  Layers,
} from 'lucide-react';
import { SourceRegistryItem } from '../types';

interface SourceRegistryViewProps {
  sources: SourceRegistryItem[];
  onTriggerSync: (sourceId: string) => void;
}

export const SourceRegistryView: React.FC<SourceRegistryViewProps> = ({
  sources,
  onTriggerSync,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const filteredSources = sources.filter((s) => {
    if (selectedTier === 'ALL') return true;
    return `Tier ${s.tier}` === selectedTier;
  });

  const handleSync = (id: string) => {
    setSyncingId(id);
    onTriggerSync(id);
    setTimeout(() => setSyncingId(null), 1200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Healthy / Active
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Degraded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            Standby
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
            <Database className="w-5 h-5 text-neutral-700" />
            <span>Four-Tier Source Registry & Ingestion Health</span>
          </h2>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Prioritizes high-signal, first-party agency boards (USAJOBS, State Dept, CISA, Think Tanks) before falling back to secondary aggregators to prevent noise and outdated listings.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-neutral-100 p-1 rounded-lg text-xs font-semibold shrink-0">
          {['ALL', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedTier === t
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left">Source Name</th>
                <th className="px-4 py-3 text-left">Tier Level</th>
                <th className="px-4 py-3 text-left">Ingestion Method</th>
                <th className="px-4 py-3 text-left">API Health</th>
                <th className="px-4 py-3 text-center">Reliability</th>
                <th className="px-4 py-3 text-left">Last Verified</th>
                <th className="px-4 py-3 text-right">Diagnostic Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {filteredSources.map((source) => (
                <tr key={source.sourceId} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-neutral-900">
                    <div className="flex items-center space-x-2">
                      <Server className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{source.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        source.tier === 1
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : source.tier === 2
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : source.tier === 3
                          ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      Tier {source.tier}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-neutral-600 font-mono text-[11px]">
                    {source.accessMethod}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(source.status)}
                  </td>

                  <td className="px-4 py-3 text-center font-semibold text-neutral-800">
                    {source.reliabilityScore}%
                  </td>

                  <td className="px-4 py-3 text-neutral-500 text-[11px]">
                    {new Date(source.lastChecked).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleSync(source.sourceId)}
                      disabled={syncingId === source.sourceId}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded text-neutral-800 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${syncingId === source.sourceId ? 'animate-spin' : ''}`}
                      />
                      <span>{syncingId === source.sourceId ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
