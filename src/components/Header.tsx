import React from 'react';
import {
  Compass,
  Briefcase,
  Star,
  Bookmark,
  Calendar,
  Newspaper,
  Award,
  Database,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  Activity,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  savedCount: number;
  trackedCount: number;
  urgentCount: number;
  isCycling: boolean;
  onRunCycle: () => void;
  onOpenPipelineStatus: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  trackedCount,
  urgentCount,
  isCycling,
  onRunCycle,
  onOpenPipelineStatus,
  searchQuery,
  setSearchQuery,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Compass },
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
    { id: 'recommended', label: 'Recommended', icon: Star },
    { id: 'saved', label: 'Saved', icon: Bookmark, badge: savedCount },
    { id: 'tracker', label: 'Application Tracker', icon: FileSpreadsheet, badge: trackedCount },
    { id: 'deadlines', label: 'Deadlines', icon: Calendar, badge: urgentCount, badgeColor: 'bg-rose-500 text-white' },
    { id: 'news', label: 'News & Intel', icon: Newspaper },
    { id: 'events-certs', label: 'Events & Certs', icon: Award },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'profile', label: 'Profile & Rules', icon: UserCheck },
  ];

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner: Identity & High-level Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tight text-lg shadow-xs">
            PG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-neutral-900 tracking-tight">
                Opportunity Intelligence System
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Mon/Wed/Fri Active
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">
              Peter Grigoryev • Rutgers Business School • MS IT & Analytics (Cybersecurity)
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-3">
          <div className="relative w-48 sm:w-64">
            <input
              id="global-search-input"
              type="text"
              placeholder="Search roles, agencies, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white text-neutral-800 placeholder-neutral-400"
            />
          </div>

          <button
            id="engine-status-button"
            onClick={onOpenPipelineStatus}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="View Real Pipeline & Database Subsystems"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Engine Subsystems</span>
          </button>

          <button
            id="run-cycle-button"
            onClick={onRunCycle}
            disabled={isCycling}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white rounded-md text-xs font-medium transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            title="Run Discovery, Deduplication, Verification & Matching cycle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCycling ? 'animate-spin' : ''}`} />
            <span>{isCycling ? 'Running Cycle...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                      tab.badgeColor || 'bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
