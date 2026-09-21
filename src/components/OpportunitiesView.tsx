import React, { useState, useMemo } from 'react';
import {
  Filter,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Opportunity,
  OpportunityCategory,
  ApplicationTrackingStatus,
  CandidateProfile,
} from '../types';
import { OpportunityCard } from './OpportunityCard';

interface OpportunitiesViewProps {
  opportunities: Opportunity[];
  profile: CandidateProfile;
  searchQuery: string;
  onSelectOpportunity: (opp: Opportunity) => void;
  onToggleSave: (id: string) => void;
  onUpdateStatus: (id: string, status: ApplicationTrackingStatus) => void;
  filterPreset?: 'all' | 'recommended' | 'saved';
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  profile,
  searchQuery,
  onSelectOpportunity,
  onToggleSave,
  onUpdateStatus,
  filterPreset = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [onlyRemote, setOnlyRemote] = useState<boolean>(false);
  const [onlyEligible, setOnlyEligible] = useState<boolean>(false);
  const [minScore, setMinScore] = useState<number>(filterPreset === 'recommended' ? 90 : 0);
  const [sortBy, setSortBy] = useState<'score' | 'deadline' | 'newest'>('score');

  const categories = [
    'ALL',
    'GOVERNMENT',
    'POLICY',
    'CYBERSECURITY',
    'INTERNATIONAL_AFFAIRS',
    'FELLOWSHIP',
    'WORK',
    'TECHNICAL_EXPERIENCE',
    'EDUCATION',
    'EVENTS',
  ];

  const tiers = ['ALL', 'Tier 1', 'Tier 2', 'Tier 3'];
  const sectors = [
    'ALL',
    'Government',
    'Think Tank / Research',
    'International Org',
    'Private Sector',
    'Academic',
    'Non-Profit',
  ];

  // Filtering logic
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Filter preset check
      if (filterPreset === 'saved' && !opp.isSaved) return false;
      if (filterPreset === 'recommended' && opp.matchBreakdown.finalScore < 90) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && opp.category !== selectedCategory) return false;

      // Tier filter
      if (selectedTier !== 'ALL' && !opp.sourceTier.includes(selectedTier)) return false;

      // Sector filter
      if (selectedSector !== 'ALL' && opp.sector !== selectedSector) return false;

      // Remote filter
      if (onlyRemote && !opp.isRemote) return false;

      // Eligibility filter
      if (onlyEligible && opp.hardEligibility !== 'CLEARLY_ELIGIBLE') return false;

      // Min Score
      if (minScore > 0 && opp.matchBreakdown.finalScore < minScore) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = opp.title.toLowerCase().includes(q);
        const matchesOrg = opp.organization.toLowerCase().includes(q);
        const matchesId = opp.id.toLowerCase().includes(q);
        const matchesSkills = opp.skills.some((s) => s.toLowerCase().includes(q));
        const matchesCategory = opp.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOrg && !matchesId && !matchesSkills && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    opportunities,
    filterPreset,
    selectedCategory,
    selectedTier,
    selectedSector,
    onlyRemote,
    onlyEligible,
    minScore,
    searchQuery,
  ]);

  // Sorting
  const sortedOpportunities = useMemo(() => {
    const list = [...filteredOpportunities];
    if (sortBy === 'score') {
      return list.sort((a, b) => b.matchBreakdown.finalScore - a.matchBreakdown.finalScore);
    }
    if (sortBy === 'deadline') {
      return list.sort((a, b) => {
        if (!a.applicationDeadline) return 1;
        if (!b.applicationDeadline) return -1;
        return new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
      });
    }
    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    return list;
  }, [filteredOpportunities, sortBy]);

  const clearFilters = () => {
    setSelectedCategory('ALL');
    setSelectedTier('ALL');
    setSelectedSector('ALL');
    setOnlyRemote(false);
    setOnlyEligible(false);
    setMinScore(filterPreset === 'recommended' ? 90 : 0);
  };

  const hasActiveFilters =
    selectedCategory !== 'ALL' ||
    selectedTier !== 'ALL' ||
    selectedSector !== 'ALL' ||
    onlyRemote ||
    onlyEligible ||
    (filterPreset !== 'recommended' && minScore > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
            {filterPreset === 'recommended' ? (
              <>
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Recommended for Peter (Match Score ≥ 90%)</span>
              </>
            ) : filterPreset === 'saved' ? (
              <span>Saved Shortlist & Application Targets</span>
            ) : (
              <span>Opportunity Discovery & Intelligence Catalog</span>
            )}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Showing {sortedOpportunities.length} opportunities out of {opportunities.length} continuously monitored records
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center space-x-2 text-xs">
          <label htmlFor="sort-select" className="text-neutral-500 font-medium whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-neutral-200 rounded-md px-2.5 py-1.5 text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
          >
            <option value="score">Final Match Score (Highest first)</option>
            <option value="deadline">Application Deadline (Urgent first)</option>
            <option value="newest">Recently Published</option>
          </select>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Tier, Sector, Remote, Eligibility, Min Score */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 text-xs">
          {/* Tier */}
          <div className="flex items-center space-x-1.5">
            <label htmlFor="tier-select" className="text-neutral-500 font-medium">
              Source Tier:
            </label>
            <select
              id="tier-select"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="ALL">All Tiers (1, 2, 3)</option>
              <option value="Tier 1">Tier 1 (Authoritative / Direct)</option>
              <option value="Tier 2">Tier 2 (Specialized Platforms)</option>
              <option value="Tier 3">Tier 3 (Discovery / Search)</option>
            </select>
          </div>

          {/* Sector */}
          <div className="flex items-center space-x-1.5">
            <label htmlFor="sector-select" className="text-neutral-500 font-medium">
              Sector:
            </label>
            <select
              id="sector-select"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Remote checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={onlyRemote}
              onChange={(e) => setOnlyRemote(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span>Remote / Hybrid Only</span>
          </label>

          {/* Hard Eligibility checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={onlyEligible}
              onChange={(e) => setOnlyEligible(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span>Clearly Eligible (1.0x) Only</span>
          </label>

          {/* Min Score Filter */}
          {filterPreset !== 'recommended' && (
            <div className="flex items-center space-x-1.5 ml-auto">
              <label htmlFor="min-score-select" className="text-neutral-500 font-medium">
                Min Match:
              </label>
              <select
                id="min-score-select"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-neutral-800 font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value={0}>Any Score</option>
                <option value={70}>≥ 70% (Baseline)</option>
                <option value={80}>≥ 80% (Strong)</option>
                <option value={90}>≥ 90% (Top Fit)</option>
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-900 ml-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Opportunity Card Grid */}
      {sortedOpportunities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedOpportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onSelect={onSelectOpportunity}
              onToggleSave={onToggleSave}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900">No opportunities matched your filters</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, lowering the minimum match threshold, or selecting all categories.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Clear All Active Filters
          </button>
        </div>
      )}
    </div>
  );
};
