import React from 'react';
import {
  Sparkles,
  Layout,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
  Layers,
  Wand2,
  Sliders,
  Activity,
} from 'lucide-react';
import { Slide, LayoutName, SmartLayoutRecommendation } from '../types';
import { analyzeAndRecommendLayout, applySmartLayout } from '../lib/smartLayout';

interface SmartLayoutPanelProps {
  slide: Slide;
  onApplyLayout: (targetLayout: LayoutName) => void;
  onOptimizeDeck?: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const LAYOUT_LABELS: Record<LayoutName, string> = {
  centered_hero: 'Centered Hero (Title & Hook)',
  split_with_stat: 'Split with Standout Stat',
  bullet_list: 'Structured Bullet List',
  split_text_image: 'Solution & Feature Split',
  process_steps: 'Process Steps (1-2-3)',
  metrics_grid: 'Metrics Grid (TAM / Traction)',
  comparison_table: 'Comparison Matrix (Us vs Them)',
  timeline_horizontal: 'Horizontal Timeline',
  swot_grid: 'SWOT 2x2 Quadrant Grid',
  roadmap_horizontal: 'Execution Roadmap',
  pricing_table: 'Tiered Pricing Table',
  team_cards: 'Leadership Team Profiles',
  business_detail: 'Business Model Detail',
  full_bleed_statement: 'Call to Action & The Ask',
  fallback_layout: 'Standard Content Layout',
  quad_grid: '2x2 Grid (Balanced 4 Pillars)',
  three_columns: '3-Column Cards',
};

export const SmartLayoutPanel: React.FC<SmartLayoutPanelProps> = ({
  slide,
  onApplyLayout,
  onOptimizeDeck,
  onClose,
  isOpen,
}) => {
  if (!isOpen) return null;

  const rec: SmartLayoutRecommendation = analyzeAndRecommendLayout(slide);
  const isCurrentlyOptimal = slide.layout === rec.recommendedLayout;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Smart Layout Engine</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Content-Aware
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Re-evaluates layout choice based on content volume, density, and 16:9 visual harmony
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Visual Harmony Score Gauge */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Visual Harmony Score
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    rec.harmonyScore >= 90
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : rec.harmonyScore >= 75
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {rec.harmonyScore}% • {rec.densityLevel}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  rec.harmonyScore >= 90
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : rec.harmonyScore >= 75
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500'
                }`}
                style={{ width: `${rec.harmonyScore}%` }}
              />
            </div>

            <p className="text-xs text-slate-400">
              {rec.contentVolumeSummary.balanceStatus}
            </p>
          </div>

          {/* Top Recommendation Hero */}
          <div
            className={`p-4 rounded-xl border ${
              isCurrentlyOptimal
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : 'bg-indigo-950/40 border-indigo-700/70 shadow-lg shadow-indigo-950/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                {isCurrentlyOptimal ? 'Current Layout Is Optimal' : 'Recommended Visual Layout'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Fit Score: {rec.score}/100
              </span>
            </div>

            <h4 className="text-base font-extrabold text-white">
              {LAYOUT_LABELS[rec.recommendedLayout] || rec.recommendedLayout}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{rec.reason}</p>

            {/* Detected Content Signals */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
              {rec.featuresIdentified.map((feat, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
                >
                  ✓ {feat}
                </span>
              ))}
            </div>

            {!isCurrentlyOptimal && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onApplyLayout(rec.recommendedLayout);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Recommended Layout</span>
                </button>
              </div>
            )}
          </div>

          {/* Alternative Layouts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Alternative Compatible Layouts</span>
              <span className="text-[11px] text-slate-500">Ranked by content volume harmony</span>
            </div>

            <div className="space-y-2">
              {rec.alternativeLayouts.map((alt) => {
                const isSelected = slide.layout === alt.layout;
                return (
                  <div
                    key={alt.layout}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500 text-white'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {LAYOUT_LABELS[alt.layout] || alt.layout}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{alt.reason}</p>
                    </div>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => {
                        onApplyLayout(alt.layout);
                        onClose();
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                        isSelected
                          ? 'bg-slate-700 text-slate-400 cursor-default'
                          : 'bg-slate-700 hover:bg-indigo-600 text-white'
                      }`}
                    >
                      {isSelected ? 'Applied' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Whole-Deck Layout Optimization Section */}
          {onOptimizeDeck && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 p-3 rounded-xl">
              <div>
                <span className="text-xs font-bold text-white block">Deck-Wide Layout Harmony</span>
                <span className="text-[11px] text-slate-400 block">
                  Re-evaluates every slide to maximize visual rhythm and avoid repetitive layouts
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onOptimizeDeck();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 rounded-lg transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Optimize Deck</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
