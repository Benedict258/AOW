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
  Search,
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
    { id: 'tracker', label: 'Tracker', icon: FileSpreadsheet, badge: trackedCount },
    { id: 'deadlines', label: 'Deadlines', icon: Calendar, badge: urgentCount, badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
    { id: 'news', label: 'News & Intel', icon: Newspaper },
    { id: 'events-certs', label: 'Events & Certs', icon: Award },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'profile', label: 'Profile', icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050B10]/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E0FEF6]/20 to-[#38BDF8]/20 flex items-center justify-center font-black text-lg text-[#E0FEF6] border border-white/10 shadow-lg">
            PG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black italic uppercase tracking-tighter text-white">
                OIS
                <span className="ml-2 text-xs font-bold not-italic tracking-wider uppercase text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded-full border border-[#38BDF8]/20">
                  AOW Intel
                </span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#E0FEF6]/10 text-[#E0FEF6] border border-[#E0FEF6]/20">
                Mon/Wed/Fri Cron Active
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium tracking-tight">
              Peter Grigoryev • Rutgers MS IT & Analytics (Cybersecurity)
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Search bar */}
          <div className="relative flex-1 md:w-56 lg:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search roles, agencies, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-[#121923] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#38BDF8] transition-all"
            />
          </div>

          <button
            id="engine-status-button"
            onClick={onOpenPipelineStatus}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#121923] hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
            title="View Real Pipeline Subsystems"
          >
            <Activity className="w-3.5 h-3.5 text-[#E0FEF6]" />
            <span className="hidden sm:inline">Engine Subsystems</span>
          </button>

          <button
            id="run-cycle-button"
            onClick={onRunCycle}
            disabled={isCycling}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E0FEF6] hover:bg-[#E0FEF6]/90 active:scale-95 text-[#050B10] font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-[#E0FEF6]/10 disabled:opacity-60 cursor-pointer"
            title="Run Discovery, Deduplication, Verification & Matching cycle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCycling ? 'animate-spin' : ''}`} />
            <span>{isCycling ? 'Executing Pipeline...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Floating Pill Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 bg-[#121923]/90 border border-white/10 p-1.5 rounded-full shadow-2xl max-w-fit mx-auto md:mx-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E0FEF6]' : 'text-white/40'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black uppercase ${
                      tab.badgeColor || 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30'
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
