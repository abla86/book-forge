import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  PenTool,
  Radio,
  CheckCircle2,
  Zap,
  Target,
  Award,
  Maximize2,
  Film,
} from 'lucide-react';
import { PresentationPlan, Slide, SlideTransition, Participant, LiveReaction } from '../types';
import { THEMES } from '../data/themes';
import { AnnotationCanvasLayer } from './AnnotationOverlay';
import { CollaborativeWorkspaceOverlay } from './CollaborativeWorkspaceOverlay';

interface PresentationModeProps {
  plan: PresentationPlan;
  initialSlideIndex?: number;
  onClose: () => void;
  onOpenVideoExport?: () => void;
  isCollaborating?: boolean;
  sessionId?: string | null;
  participants?: Participant[];
  currentUserId?: string;
  remoteCursors?: Record<string, any>;
  reactions?: LiveReaction[];
  showRemoteCursors?: boolean;
  followPresenter?: boolean;
  isHost?: boolean;
  onToggleCursors?: () => void;
  onToggleFollow?: () => void;
  onSendReaction?: (emoji: string, xPercent: number, yPercent: number) => void;
  onOpenSessionModal?: () => void;
  onCursorMove?: (xPercent: number, yPercent: number) => void;
  onSlideChange?: (index: number) => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  plan,
  initialSlideIndex = 0,
  onClose,
  onOpenVideoExport,
  isCollaborating = false,
  sessionId = null,
  participants = [],
  currentUserId = '',
  remoteCursors = {},
  reactions = [],
  showRemoteCursors = true,
  followPresenter = true,
  isHost = false,
  onToggleCursors,
  onToggleFollow,
  onSendReaction,
  onOpenSessionModal,
  onCursorMove,
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
  const [showNotes, setShowNotes] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [laserEnabled, setLaserEnabled] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const [blankScreen, setBlankScreen] = useState<'none' | 'black' | 'white'>('none');
  const [transition, setTransition] = useState<SlideTransition>('fade');

  const theme = THEMES[plan.theme] || THEMES.startup;
  const currentSlide: Slide = plan.slides[currentIndex] || plan.slides[0];

  const navigateToSlide = (target: number | ((prev: number) => number)) => {
    setCurrentIndex((prev) => {
      const next = typeof target === 'function' ? target(prev) : target;
      const bounded = Math.max(0, Math.min(next, plan.slides.length - 1));
      if (bounded !== prev && onSlideChange) {
        onSlideChange(bounded);
      }
      return bounded;
    });
  };

  // Sync external slide index updates (e.g. from presenter when follow mode is on)
  useEffect(() => {
    if (initialSlideIndex !== undefined && initialSlideIndex !== currentIndex) {
      setCurrentIndex(initialSlideIndex);
    }
  }, [initialSlideIndex]);

  // Mouse move for Laser Pointer & Collaboration Cursors
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (laserEnabled) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
    if (onCursorMove) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onCursorMove(x, y);
      }
    }
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If screen is blanked, any key dismisses it
      if (blankScreen !== 'none') {
        setBlankScreen('none');
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        navigateToSlide((prev) => Math.min(prev + 1, plan.slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        navigateToSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes((prev) => !prev);
      } else if (e.key === 'l' || e.key === 'L') {
        setLaserEnabled((prev) => !prev);
      } else if (e.key === 'b' || e.key === 'B') {
        setBlankScreen((prev) => (prev === 'black' ? 'none' : 'black'));
      } else if (e.key === 'w' || e.key === 'W') {
        setBlankScreen((prev) => (prev === 'white' ? 'none' : 'white'));
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plan.slides.length, onClose, blankScreen, onSlideChange]);

  // Practice Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden ${
        laserEnabled ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Interactive Laser Pointer Dot */}
      {laserEnabled && (
        <div
          className="fixed pointer-events-none rounded-full w-6 h-6 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-500 shadow-[0_0_20px_6px_rgba(239,68,68,0.95)] ring-4 ring-red-400/80 animate-pulse"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* Blackout / Whiteout pause screens */}
      {blankScreen === 'black' && (
        <div
          onClick={() => setBlankScreen('none')}
          className="fixed inset-0 z-40 bg-black flex items-center justify-center text-slate-500 text-sm cursor-pointer"
        >
          <span>Screen paused (Click or press B to resume)</span>
        </div>
      )}
      {blankScreen === 'white' && (
        <div
          onClick={() => setBlankScreen('none')}
          className="fixed inset-0 z-40 bg-white flex items-center justify-center text-slate-400 text-sm cursor-pointer"
        >
          <span>Screen paused (Click or press W to resume)</span>
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <div className="p-4 flex items-center justify-between z-20 text-white/80 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-tight text-white text-sm">
            {plan.title}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/90">
            Slide {currentIndex + 1} / {plan.slides.length}
          </span>
          <span className="text-[11px] text-slate-400 capitalize hidden sm:inline">
            Layout: <strong className="text-indigo-300">{currentSlide.layout.replace('_', ' ')}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Transition Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 text-xs text-slate-300">
            <span>FX:</span>
            {(['fade', 'slide', 'zoom'] as SlideTransition[]).map((t) => (
              <button
                key={t}
                onClick={() => setTransition(t)}
                className={`px-1.5 py-0.5 rounded capitalize ${
                  transition === t ? 'bg-indigo-600 text-white font-bold' : 'hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Laser Pointer Toggle */}
          <button
            onClick={() => setLaserEnabled(!laserEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              laserEnabled ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 ring-2 ring-red-400' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Toggle Laser Pointer (L)"
          >
            <Radio className={`w-3.5 h-3.5 ${laserEnabled ? 'animate-spin text-white' : 'text-red-400'}`} />
            <span>Laser {laserEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Timer HUD */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTime(seconds)}</span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="hover:text-white ml-1"
              title={timerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setSeconds(0)}
              className="hover:text-white"
              title="Reset timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Toggle Annotations Overlay */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              showAnnotations ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Toggle Review Annotations"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{showAnnotations ? 'Notes On' : 'Notes Off'}</span>
          </button>

          {/* Toggle Speaker Notes Overlay */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              showNotes ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Toggle Speaker Notes (N)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{showNotes ? 'Hide Notes' : 'Show Notes'}</span>
          </button>

          {/* Export to MP4 Video */}
          {onOpenVideoExport && (
            <button
              onClick={onOpenVideoExport}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white transition-all shadow-md shadow-pink-600/20"
              title="Record presentation to MP4 video"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export MP4</span>
            </button>
          )}

          {/* Exit Fullscreen Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Exit Presentation (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Presentation Stage */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
        <div
          key={currentIndex}
          onMouseMove={handleMouseMove}
          className={`w-full max-w-6xl aspect-[16/9] rounded-2xl shadow-2xl overflow-hidden relative border p-8 sm:p-14 flex flex-col justify-between transition-all duration-300 ${
            transition === 'zoom'
              ? 'scale-100 opacity-100 animate-in zoom-in-95'
              : transition === 'slide'
              ? 'opacity-100 animate-in slide-in-from-right-4'
              : 'opacity-100 animate-in fade-in'
          }`}
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.cardBorder,
            color: theme.textPrimary,
            fontFamily: theme.fontFamily,
          }}
        >
          {/* Collaborative Workspace Overlay */}
          {isCollaborating && (
            <CollaborativeWorkspaceOverlay
              currentSlideIndex={currentIndex}
              totalSlides={plan.slides.length}
              isConnected={isCollaborating}
              sessionId={sessionId || null}
              participants={participants}
              currentUserId={currentUserId}
              remoteCursors={remoteCursors}
              reactions={reactions}
              showRemoteCursors={showRemoteCursors}
              followPresenter={followPresenter}
              isHost={isHost}
              onToggleCursors={onToggleCursors || (() => {})}
              onToggleFollow={onToggleFollow || (() => {})}
              onSendReaction={onSendReaction || (() => {})}
              onOpenSessionModal={onOpenSessionModal || (() => {})}
            />
          )}

          {/* Review Annotations Overlay */}
          <AnnotationCanvasLayer
            annotations={currentSlide.metadata?.annotations}
            activeTool="select"
            isVisible={showAnnotations}
            penColor="#EF4444"
            strokeWidth={3}
            stickyColor="yellow"
            isReadOnly={true}
          />

          {/* Top Line */}
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ backgroundColor: theme.primary }}
          />

          {/* Slide Header */}
          <div>
            {currentSlide.layout !== 'centered_hero' && (
              <>
                <span
                  className="text-xs font-black tracking-widest uppercase px-3 py-1 rounded-md inline-block mb-3"
                  style={{
                    backgroundColor: `${theme.primary}25`,
                    color: theme.accent,
                    border: `1px solid ${theme.primary}40`,
                  }}
                >
                  {currentSlide.content.badge || `0${currentIndex + 1}`}
                </span>
                <h1
                  className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight"
                  style={{ color: theme.textPrimary }}
                >
                  {currentSlide.content.headline}
                </h1>
                {currentSlide.content.subheadline && (
                  <p
                    className="text-sm sm:text-lg mt-2 font-normal opacity-90 max-w-4xl"
                    style={{ color: theme.textSecondary }}
                  >
                    {currentSlide.content.subheadline}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Body Content by Layout */}
          <div className="my-auto py-4">
            {/* 1. Centered Hero */}
            {currentSlide.layout === 'centered_hero' && (
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <span
                  className="text-xs sm:text-sm font-bold tracking-widest uppercase px-3 py-1 rounded-full inline-block"
                  style={{ backgroundColor: `${theme.primary}25`, color: theme.accent }}
                >
                  {currentSlide.content.badge || 'EXECUTIVE SUMMARY'}
                </span>
                <h1
                  className="text-3xl sm:text-6xl font-black tracking-tight leading-tight"
                  style={{ color: theme.textPrimary }}
                >
                  {currentSlide.content.headline}
                </h1>
                {currentSlide.content.subheadline && (
                  <p
                    className="text-base sm:text-xl font-normal leading-relaxed opacity-90"
                    style={{ color: theme.textSecondary }}
                  >
                    {currentSlide.content.subheadline}
                  </p>
                )}
              </div>
            )}

            {/* 2. 2x2 Grid (quad_grid) - 4 balanced items */}
            {currentSlide.layout === 'quad_grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full">
                {(currentSlide.content.bulletPoints || []).map((bp, idx) => {
                  const parts = bp.includes(':')
                    ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
                    : [`Key Pillar 0${idx + 1}`, bp];
                  const title = parts[0];
                  const desc = parts[1];
                  const icons = [Target, Zap, Award, CheckCircle2];
                  const IconComp = icons[idx % icons.length];
                  return (
                    <div
                      key={idx}
                      className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between shadow-lg"
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm sm:text-base font-bold" style={{ color: theme.textPrimary }}>
                          {title}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                        {desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. 3-Columns (three_columns) - 3 horizontal cards */}
            {currentSlide.layout === 'three_columns' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
                {(currentSlide.content.bulletPoints || []).slice(0, 3).map((bp, idx) => {
                  const parts = bp.includes(':')
                    ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
                    : [`Pillar 0${idx + 1}`, bp];
                  const title = parts[0];
                  const desc = parts[1];
                  const icons = [Zap, Award, Target];
                  const IconComp = icons[idx % icons.length];
                  return (
                    <div
                      key={idx}
                      className="p-6 rounded-2xl border flex flex-col justify-between shadow-xl relative overflow-hidden"
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <div>
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mb-3 mt-1"
                          style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <h4 className="text-base sm:text-lg font-bold mb-2" style={{ color: theme.textPrimary }}>
                          {title}
                        </h4>
                        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                          {desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Split with Stat */}
            {currentSlide.layout === 'split_with_stat' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7 space-y-4">
                  {currentSlide.content.bulletPoints?.map((bp, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                      >
                        ✓
                      </div>
                      <p className="text-sm sm:text-lg font-medium leading-relaxed">
                        {bp}
                      </p>
                    </div>
                  ))}
                </div>

                {currentSlide.content.statistic && (
                  <div
                    className="md:col-span-5 p-8 rounded-3xl border text-center shadow-xl"
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                  >
                    <span
                      className="text-5xl sm:text-7xl font-black block"
                      style={{ color: theme.primary }}
                    >
                      {currentSlide.content.statistic.number}
                    </span>
                    <span className="text-base sm:text-lg font-bold block mt-2">
                      {currentSlide.content.statistic.label}
                    </span>
                    {currentSlide.content.statistic.context && (
                      <span className="text-xs sm:text-sm mt-3 block opacity-80" style={{ color: theme.textSecondary }}>
                        {currentSlide.content.statistic.context}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. Metrics Grid */}
            {currentSlide.layout === 'metrics_grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(currentSlide.content.metrics || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between"
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                  >
                    <span className="text-3xl sm:text-5xl font-black block mb-2" style={{ color: theme.textPrimary }}>
                      {m.value}
                    </span>
                    <span className="text-sm sm:text-lg font-bold block" style={{ color: theme.accent }}>
                      {m.label}
                    </span>
                    {m.change && (
                      <span className="text-xs font-bold mt-2 text-emerald-400 block">
                        {m.change}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 6. Process Steps */}
            {currentSlide.layout === 'process_steps' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(currentSlide.content.processSteps || []).map((step, idx) => (
                  <div
                    key={idx}
                    className="p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between relative"
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white mb-3"
                      style={{ backgroundColor: theme.primary }}
                    >
                      0{step.number || idx + 1}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold mb-2" style={{ color: theme.textPrimary }}>
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback Bullet List for presentation */}
            {currentSlide.layout !== 'centered_hero' &&
              currentSlide.layout !== 'quad_grid' &&
              currentSlide.layout !== 'three_columns' &&
              currentSlide.layout !== 'split_with_stat' &&
              currentSlide.layout !== 'metrics_grid' &&
              currentSlide.layout !== 'process_steps' && (
                <div className="space-y-4 max-w-3xl">
                  {(currentSlide.content.bulletPoints || []).map((bp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-2xl"
                      style={{ backgroundColor: `${theme.cardBg}80` }}
                    >
                      <span className="text-lg font-bold" style={{ color: theme.primary }}>
                        •
                      </span>
                      <p className="text-base sm:text-xl font-medium leading-relaxed">
                        {bp}
                      </p>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Footer */}
          <div
            className="pt-4 border-t flex items-center justify-between text-xs opacity-70"
            style={{ borderColor: `${theme.textSecondary}25`, color: theme.textSecondary }}
          >
            <span>Trusity AI • {plan.title}</span>
            <span>
              {currentIndex + 1} / {plan.slides.length}
            </span>
          </div>
        </div>

        {/* Presenter Speaker Notes HUD Overlay */}
        {showNotes && (
          <div className="absolute bottom-20 left-10 right-10 bg-slate-950/95 border border-amber-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-md max-h-48 overflow-y-auto text-amber-200 text-sm leading-relaxed z-30 font-sans">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Presenter Speaker Script
              </span>
              <span>Press 'N' to toggle</span>
            </div>
            <p className="italic">
              "{currentSlide.content.speakerNotes || 'No notes available for this slide.'}"
            </p>
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation Bar */}
      <div className="p-4 flex items-center justify-center gap-4 z-20 bg-gradient-to-t from-black/90 to-transparent">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
          disabled={currentIndex === 0}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-all"
          title="Previous slide (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-1.5">
          {plan.slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
              title={`Jump to slide ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, plan.slides.length - 1))}
          disabled={currentIndex === plan.slides.length - 1}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-all"
          title="Next slide (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
