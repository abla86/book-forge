import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Target, DollarSign, Award, Layers } from 'lucide-react';
import { BusinessAnalysis, Slide } from '../types';

interface StoryArcInspectorProps {
  analysis: BusinessAnalysis;
  slides: Slide[];
}

export const StoryArcInspector: React.FC<StoryArcInspectorProps> = ({
  analysis,
  slides,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const storySteps = [
    { label: 'Hook', type: 'title', icon: '🎯' },
    { label: 'Problem', type: 'problem', icon: '⚠️' },
    { label: 'Solution', type: 'solution', icon: '💡' },
    { label: 'Market', type: 'market_opportunity', icon: '📈' },
    { label: 'How It Works', type: 'process_flow', icon: '⚙️' },
    { label: 'Advantage', type: 'comparison', icon: '⚔️' },
    { label: 'Business Model', type: 'business_model', icon: '💰' },
    { label: 'The Ask', type: 'call_to_action', icon: '🚀' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto mb-6 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/40 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-white block">
              Story Engine Arc & Strategic Analysis
            </span>
            <span className="text-[11px] text-slate-400">
              {analysis.companyName} • {slides.length} Slides structured across narrative progression
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="hidden sm:inline">{isOpen ? 'Hide Strategy' : 'View Strategy Arc'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-6">
          {/* Story Arc Progression Bar */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Narrative Sequence (Trusity Story Arc)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {storySteps.map((step, idx) => {
                const matchingSlide = slides.find(
                  (s) => s.slideType === step.type || s.layout.includes(step.type)
                );
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-center ${
                      matchingSlide
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="text-base block mb-1">{step.icon}</span>
                    <span className="text-xs font-bold block truncate">{step.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {matchingSlide ? `Slide ${slides.indexOf(matchingSlide) + 1}` : 'Optional'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Business Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" /> Core Problem & Target
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {analysis.coreProblem}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-800 text-slate-400">
                <strong>Audience:</strong> {analysis.targetAudience}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1 flex items-center gap-1">
                <Award className="w-3 h-3" /> Solution & Advantage
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {analysis.solutionSummary}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-800 text-slate-400">
                <strong>Moat:</strong> {analysis.keyDifferentiator}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Market & Monetization
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {analysis.marketSizeEstimate}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-800 text-slate-400">
                <strong>Model:</strong> {analysis.monetizationModel}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
