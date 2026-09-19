import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  CheckCircle2,
  X,
  ArrowRight,
  RotateCcw,
  SpellCheck,
  Layers,
  Volume2,
  ChevronRight,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { PresentationPlan, ToneType, PolishOptions, PolishResult } from '../types';

interface PolishModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PresentationPlan;
  onApplyPolish: (options: PolishOptions) => Promise<PolishResult | null>;
  onRevertPolish?: () => void;
  canRevert?: boolean;
}

const TONE_OPTIONS: { id: ToneType; label: string; desc: string }[] = [
  { id: 'persuasive', label: 'Persuasive', desc: 'High-conviction, urgent investor narrative' },
  { id: 'professional', label: 'Professional', desc: 'Polished, authoritative executive register' },
  { id: 'inspirational', label: 'Inspirational', desc: 'Visionary, bold, and emotionally resonant' },
  { id: 'technical', label: 'Technical', desc: 'Data-grounded, architectural, and precise' },
  { id: 'concise', label: 'Concise', desc: 'Zero-fluff, punchy, high-signal brevity' },
];

export const PolishModal: React.FC<PolishModalProps> = ({
  isOpen,
  onClose,
  plan,
  onApplyPolish,
  onRevertPolish,
  canRevert = false,
}) => {
  const [selectedTone, setSelectedTone] = useState<ToneType>(plan.tone || 'persuasive');
  const [customInstruction, setCustomInstruction] = useState('');
  const [focusTone, setFocusTone] = useState(true);
  const [focusGrammar, setFocusGrammar] = useState(true);
  const [focusPhrasing, setFocusPhrasing] = useState(true);
  const [focusSpeakerNotes, setFocusSpeakerNotes] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [lastResult, setLastResult] = useState<PolishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartPolish = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingStep(1);

    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const focusAreas: string[] = [];
      if (focusTone) focusAreas.push('Standardize tone across all slides');
      if (focusGrammar) focusAreas.push('Fix grammar, spelling, and capitalization');
      if (focusPhrasing) focusAreas.push('Improve phrasing, parallelism, and punchiness');
      if (focusSpeakerNotes) focusAreas.push('Refine presenter speaker notes and verbal transitions');

      const result = await onApplyPolish({
        targetTone: selectedTone,
        focusAreas,
        customInstruction: customInstruction.trim() || undefined,
      });

      clearInterval(stepInterval);
      if (result) {
        setLastResult(result);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err?.message || 'Failed to polish presentation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    setLastResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Professional Polish</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI Editorial Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Iterates through all {plan.slides.length} slides to standardize voice, grammar, and phrasing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-200 text-xs font-semibold underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-pulse">
                  <Wand2 className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {plan.slides.length}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white">
                  Polishing All {plan.slides.length} Slides
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  The AI is scanning your pitch deck, harmonizing phrasing, standardizing vocabulary, and refining talk track scripts.
                </p>
              </div>

              {/* Progress Stepper */}
              <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 space-y-2 text-left">
                <div className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      processingStep >= 1 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className={processingStep >= 1 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                    1. Scanning all slides for tone inconsistencies & weak verbs
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      processingStep >= 2 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className={processingStep >= 2 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                    2. Enforcing parallel phrasing and punchy headlines
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      processingStep >= 3 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className={processingStep >= 3 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                    3. Correcting grammar, capitalization, and punctuation
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      processingStep >= 4 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className={processingStep >= 4 ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                    4. Polishing presenter speaker notes and transition cues
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Success / Result State */}
          {!isProcessing && lastResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-200">
                    Polish Complete: {lastResult.polishedCount} Slides Refined
                  </h4>
                  <p className="text-xs text-emerald-400/90">
                    Your entire presentation deck now shares a unified, high-conviction voice with parallel bullet phrasing and crisp delivery notes.
                  </p>
                </div>
              </div>

              {/* Changelog Highlights */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-purple-400" />
                    AI Editorial Improvements Applied:
                  </span>
                  <span className="text-[11px] text-slate-400">Tone: {selectedTone}</span>
                </div>
                <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                  {lastResult.changelog.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Comparison */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Deck Consistency Summary
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Targeted Tone
                    </span>
                    <span className="font-semibold text-white capitalize">{selectedTone}</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Harmonized register across all {lastResult.polishedCount} slides
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Speaker Notes
                    </span>
                    <span className="font-semibold text-emerald-400">Natural Script Cues</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Equipped with spoken transitions for confident stage delivery
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Form (When not processing and no fresh result) */}
          {!isProcessing && !lastResult && (
            <>
              {/* Target Tone Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Target Voice & Tone</span>
                  <span className="text-[11px] text-slate-400">Standardizes all slides to this style</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TONE_OPTIONS.map((t) => {
                    const isSelected = selectedTone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTone(t.id)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-0.5 ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200 shadow-sm'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{t.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <span className="text-[11px] text-slate-400">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Polish Pillars Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Polish Focus Areas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={focusTone}
                      onChange={(e) => setFocusTone(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        Tone Consistency
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Harmonize vocabulary and conviction across all slides
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={focusGrammar}
                      onChange={(e) => setFocusGrammar(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <SpellCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Grammar & Typos
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Correct syntax errors, punctuation, and capitalization
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={focusPhrasing}
                      onChange={(e) => setFocusPhrasing(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Parallel Phrasing
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Eliminate passive voice; align bullet structures
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={focusSpeakerNotes}
                      onChange={(e) => setFocusSpeakerNotes(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                        Speaker Notes & Transitions
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Refine verbal talk tracks with fluent slide bridges
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optional Custom Refinement Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Custom Editorial Guidance (Optional)</span>
                  <span className="text-[11px] text-slate-400">Additional AI guidance</span>
                </label>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="e.g. Make it more concise for Tier-1 VC partners, or emphasize B2B SaaS metrics..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Information pill */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  All {plan.slides.length} slides will be sequentially polished while preserving your layouts, diagrams, and metrics.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/95">
          <div>
            {canRevert && onRevertPolish && !isProcessing && (
              <button
                type="button"
                onClick={onRevertPolish}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors"
                title="Revert to pre-polish deck state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Last Polish</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!lastResult ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartPolish}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:via-indigo-500 hover:to-pink-500 rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Polishing All Slides...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Polish Entire Deck ({plan.slides.length} Slides)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDone}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
              >
                <span>Done & View Polished Deck</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
