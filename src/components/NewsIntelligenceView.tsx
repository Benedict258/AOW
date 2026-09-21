import React, { useState } from 'react';
import {
  Newspaper,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Building2,
  Tag,
  RefreshCw,
  Send,
} from 'lucide-react';
import { NewsIntelligenceItem, Opportunity } from '../types';

interface NewsIntelligenceViewProps {
  newsItems: NewsIntelligenceItem[];
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
}

export const NewsIntelligenceView: React.FC<NewsIntelligenceViewProps> = ({
  newsItems,
  opportunities,
  onSelectOpportunity,
}) => {
  const [customHeadline, setCustomHeadline] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [analyzingCustom, setAnalyzingCustom] = useState(false);
  const [customResult, setCustomResult] = useState<string | null>(null);

  const handleAnalyzeCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHeadline.trim()) return;
    setAnalyzingCustom(true);
    setCustomResult(null);

    try {
      const res = await fetch('/api/intelligence/news-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsTitle: customHeadline,
          newsSummary: customSummary || 'Recent development in policy/cybersecurity',
          sector: 'Government / Tech Policy',
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setCustomResult(data.analysis);
      }
    } catch (err) {
      console.error('Failed to analyze custom news item:', err);
    } finally {
      setAnalyzingCustom(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center space-x-2">
          <Newspaper className="w-5 h-5 text-neutral-700" />
          <span>Tier 4 News & Policy Intelligence Wire</span>
        </h2>
        <p className="text-xs text-neutral-600 mt-1 max-w-3xl leading-relaxed">
          The system does not merely forward news articles. It identifies actionable relationships between federal policy directives, emerging cyber threats, and career programs relevant to Peter's Rutgers Master's degree.
        </p>
      </div>

      {/* Live News Items Grid */}
      <div className="space-y-4">
        {newsItems.map((item) => {
          const linkedOpps = opportunities.filter((o) =>
            item.relatedOpportunityIds.includes(o.id)
          );

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4"
            >
              {/* Top row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-neutral-900 text-white">
                    {item.sector}
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">{item.source}</span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-xs text-neutral-500">
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  <span>Read Wire Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Title & Summary */}
              <div>
                <h3 className="text-base font-bold text-neutral-900 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              {/* Dual Intelligence Analysis Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* Why it matters for Peter */}
                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs">
                  <span className="font-bold text-[10px] uppercase text-amber-900 tracking-wider flex items-center space-x-1 mb-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Strategic Relevance for Peter</span>
                  </span>
                  <p className="text-amber-950 text-xs leading-relaxed">
                    {item.whyItMattersForPeter}
                  </p>
                </div>

                {/* Actionable Opportunity Angle */}
                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs">
                  <span className="font-bold text-[10px] uppercase text-emerald-900 tracking-wider flex items-center space-x-1 mb-1">
                    <Building2 className="w-3 h-3 text-emerald-600" />
                    <span>Actionable Recruitment / Fellowship Angle</span>
                  </span>
                  <p className="text-emerald-950 text-xs leading-relaxed">
                    {item.actionableInsight}
                  </p>
                </div>
              </div>

              {/* Connected Live Opportunities */}
              {linkedOpps.length > 0 && (
                <div className="pt-3 border-t border-neutral-100">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                    Connected Live Opportunities in Catalog:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {linkedOpps.map((opp) => (
                      <div
                        key={opp.id}
                        onClick={() => onSelectOpportunity(opp)}
                        className="p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="truncate mr-2">
                          <span className="text-[10px] font-mono text-neutral-500 mr-1.5">{opp.id}</span>
                          <span className="text-xs font-semibold text-neutral-900">{opp.title}</span>
                          <div className="text-[11px] text-neutral-500 truncate">{opp.organization}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-neutral-200 text-neutral-800 shrink-0">
                          {opp.matchBreakdown.finalScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI News Intelligence Analyzer for Peter */}
      <div className="bg-neutral-900 text-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Analyze Custom News Development with Gemini Intelligence
          </h3>
        </div>
        <p className="text-xs text-neutral-300">
          Paste any emerging news headline, White House executive order, or agency announcement to evaluate how it impacts Peter's career tracks and generate immediate application angles.
        </p>

        <form onSubmit={handleAnalyzeCustom} className="space-y-3 text-xs">
          <div>
            <label className="block text-neutral-300 font-medium mb-1">News Headline</label>
            <input
              type="text"
              required
              placeholder="e.g. DHS launches AI Safety Board Cyber Defense Student Fellowship"
              value={customHeadline}
              onChange={(e) => setCustomHeadline(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1">Details / Brief Context (Optional)</label>
            <textarea
              rows={2}
              placeholder="Optional summary or article excerpt..."
              value={customSummary}
              onChange={(e) => setCustomSummary(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={analyzingCustom}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzingCustom ? 'animate-spin' : ''}`} />
            <span>{analyzingCustom ? 'Analyzing with Gemini...' : 'Analyze Strategic Angle'}</span>
          </button>
        </form>

        {customResult && (
          <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700 text-xs space-y-2 mt-4 animate-in fade-in">
            <span className="font-bold text-amber-300 text-[11px] uppercase tracking-wider block">
              Gemini Strategic Intelligence Rationale:
            </span>
            <p className="text-neutral-200 leading-relaxed whitespace-pre-line">{customResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};
