import React, { useState } from 'react';
import { Sparkles, Lightbulb, User, Layers, ArrowRight, Palette, Compass } from 'lucide-react';
import { GenerationRequest, ThemeName, ToneType } from '../types';
import { THEMES, SAMPLE_IDEAS } from '../data/themes';

interface FormSectionProps {
  onGenerate: (req: GenerationRequest) => void;
  isLoading: boolean;
  loadingStep: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  onGenerate,
  isLoading,
  loadingStep,
}) => {
  const [idea, setIdea] = useState(
    'An autonomous multi-agent AI platform that unifies enterprise operations, reduces manual coordination by 80%, and guarantees audit-grade compliance for Fortune 500 companies.'
  );
  const [companyName, setCompanyName] = useState('CogniFlow');
  const [presenterName, setPresenterName] = useState('Alex Morgan, Founder & CEO');
  const [targetAudience, setTargetAudience] = useState(
    'Enterprise COOs, VP of Operations, and Angel/Seed Investors'
  );
  const [theme, setTheme] = useState<ThemeName>('startup');
  const [tone, setTone] = useState<ToneType>('persuasive');
  const [slideCount, setSlideCount] = useState<number>(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || isLoading) return;
    onGenerate({
      idea: idea.trim(),
      companyName: companyName.trim() || undefined,
      presenterName: presenterName.trim() || undefined,
      targetAudience: targetAudience.trim() || undefined,
      theme,
      tone,
      slideCount,
    });
  };

  const handleApplyPreset = (sample: (typeof SAMPLE_IDEAS)[0]) => {
    setIdea(sample.idea);
    setCompanyName(sample.title.split('—')[0].trim());
    setTargetAudience(sample.targetAudience);
    setTheme(sample.theme);
    setTone(sample.tone);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Intro Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Trusity Story & Layout Engine
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Turn Raw Ideas into <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Investor-Ready</span> Pitch Decks
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Automatic narrative structure (Hook → Problem → Solution → Market → Proof → The Ask) with 7 bespoke themes, 15+ slide layouts, and embedded speaker notes.
        </p>
      </div>

      {/* Preset Pills */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Inspiration Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_IDEAS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(sample)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 transition-all text-left"
            >
              {sample.title.split('—')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Configuration Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6"
      >
        {/* Business Idea Input */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
            <span>What is your business idea or product?</span>
            <span className="text-xs text-slate-500 font-normal">
              {idea.length} characters
            </span>
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            placeholder="E.g. A marketplace that connects independent bakeries with local coffee shops for daily wholesale distribution..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            Describe the problem you solve, target market, and how your product works.
          </p>
        </div>

        {/* 2-Column Meta Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Company or Product Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. CogniFlow"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Presenter Name / Title
            </label>
            <input
              type="text"
              value={presenterName}
              onChange={(e) => setPresenterName(e.target.value)}
              placeholder="e.g. Alex Morgan, Founder & CEO"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Target Audience / Investor Profile
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. Enterprise COOs, VP Operations, Early Stage VCs"
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Theme Picker Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Themed Color Scheme (7 Available)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {(Object.keys(THEMES) as ThemeName[]).map((tKey) => {
              const t = THEMES[tKey];
              const isSelected = theme === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setTheme(tKey)}
                  className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm border border-white/20 mb-1.5 flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: t.bg, color: t.primary }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: t.primary }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-200 truncate w-full">
                    {t.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate w-full">
                    {tKey === 'startup'
                      ? 'Dark+Purple'
                      : tKey === 'corporate'
                      ? 'Executive'
                      : tKey === 'creative'
                      ? 'Warm Orange'
                      : tKey === 'dark_mode'
                      ? 'GitHub Dark'
                      : t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone & Slide Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Presentation Tone
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'persuasive', label: 'Persuasive' },
                  { id: 'professional', label: 'Professional' },
                  { id: 'inspirational', label: 'Inspirational' },
                  { id: 'technical', label: 'Technical' },
                  { id: 'concise', label: 'Concise' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    tone === t.id
                      ? 'bg-indigo-600 text-white border-indigo-500 font-semibold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Slide Count & Story Depth
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[6, 8, 10, 12].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSlideCount(count)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    slideCount === count
                      ? 'bg-indigo-600 text-white border-indigo-500 font-semibold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {count} Slides
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Standard seed pitch decks typically run 8 slides.
            </span>
          </div>
        </div>

        {/* Generate Button & Progress State */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || !idea.trim()}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{loadingStep || 'Synthesizing Pitch Deck...'}</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Complete Pitch Deck</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
