import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Film,
  Download,
  Play,
  RotateCcw,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
  Music,
  Layers,
  Clock,
  Sliders,
  X,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileVideo,
} from 'lucide-react';
import {
  PresentationPlan,
  VideoExportSettings,
  VideoExportProgress,
  VideoExportResult,
  VideoTransitionStyle,
  VideoResolution,
} from '../types';
import { CleanSlideView } from './CleanSlideView';
import {
  recordPresentationVideo,
  captureAllSlideCanvases,
  getSupportedVideoMimeType,
} from '../lib/videoRecorder';
import { createAudioCueEngine } from '../lib/audioCues';
import { THEMES } from '../data/themes';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PresentationPlan;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  plan,
}) => {
  if (!isOpen) return null;

  const theme = THEMES[plan.theme] || THEMES.startup;
  const supportedCodec = getSupportedVideoMimeType();

  // Settings State
  const [settings, setSettings] = useState<VideoExportSettings>({
    resolution: '1080p',
    slideDuration: 4.5,
    transitionStyle: 'slide',
    transitionDuration: 0.8,
    audioCues: true,
    introOutroAudio: true,
    ambientMusic: true,
    audioVolume: 0.85,
    showCaptions: true,
    showProgressBar: true,
    enableAudioMonitor: false,
  });

  // Export Lifecycle State
  const [stage, setStage] = useState<'config' | 'capturing' | 'recording' | 'completed'>(
    'config'
  );
  const [progress, setProgress] = useState<VideoExportProgress>({
    phase: 'idle',
    currentSlide: 1,
    totalSlides: plan.slides.length,
    percent: 0,
    elapsedSeconds: 0,
    totalEstimatedSeconds: Math.round(
      plan.slides.length * 4.5 + (plan.slides.length - 1) * 0.8
    ),
    message: '',
  });
  const [exportResult, setExportResult] = useState<VideoExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Calculate total video duration estimate
  const estimatedSeconds = Math.round(
    plan.slides.length * settings.slideDuration +
      (plan.slides.length > 1 ? (plan.slides.length - 1) * settings.transitionDuration : 0)
  );

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Sound test button handler
  const handleTestSound = () => {
    try {
      const audio = createAudioCueEngine(true);
      audio.playSlideChime(settings.audioVolume);
      setTimeout(() => {
        audio.close();
      }, 1000);
    } catch (err) {
      console.warn('Audio test error:', err);
    }
  };

  // Start Recording Action
  const handleStartExport = async () => {
    setErrorMessage(null);
    setStage('capturing');
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      // 1. Step 1: Capture slide canvases from offscreen stage
      const slideIds = plan.slides.map((_, idx) => `offscreen-video-slide-${idx}`);
      setProgress({
        phase: 'capturing',
        currentSlide: 1,
        totalSlides: plan.slides.length,
        percent: 5,
        elapsedSeconds: 0,
        totalEstimatedSeconds: estimatedSeconds,
        message: 'Rendering slide layouts and graphics for video...',
      });

      const slideCanvases = await captureAllSlideCanvases(slideIds, (curr, total) => {
        const pct = Math.round((curr / total) * 20);
        setProgress((prev) => ({
          ...prev,
          currentSlide: curr,
          percent: pct,
          message: `Rendering slide ${curr} of ${total}...`,
        }));
      });

      if (abortCtrl.signal.aborted) return;

      // 2. Step 2: Record presentation frames via MediaRecorder
      setStage('recording');

      const result = await recordPresentationVideo({
        plan,
        slideCanvases,
        settings,
        signal: abortCtrl.signal,
        onProgress: (prog) => {
          setProgress(prog);
        },
        onFrameUpdate: (masterCanvas) => {
          if (previewCanvasRef.current) {
            const pCtx = previewCanvasRef.current.getContext('2d');
            if (pCtx) {
              pCtx.drawImage(
                masterCanvas,
                0,
                0,
                previewCanvasRef.current.width,
                previewCanvasRef.current.height
              );
            }
          }
        },
      });

      setExportResult(result);
      setStage('completed');
    } catch (err: any) {
      if (err.message && err.message.includes('cancelled')) {
        setStage('config');
      } else {
        console.error('Video recording failed:', err);
        setErrorMessage(err.message || 'Failed to record presentation video.');
        setStage('config');
      }
    }
  };

  const handleCancelRecording = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStage('config');
  };

  const handleDownloadVideo = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Offscreen Staging Container for high-res slide captures */}
      <div
        style={{
          position: 'fixed',
          left: -99999,
          top: 0,
          width: 1920,
          height: 1080,
          pointerEvents: 'none',
          zIndex: -100,
          overflow: 'hidden',
        }}
      >
        {plan.slides.map((slide, idx) => (
          <CleanSlideView
            key={slide.id || idx}
            id={`offscreen-video-slide-${idx}`}
            slide={slide}
            slideIndex={idx}
            totalSlides={plan.slides.length}
            themeName={plan.theme}
            deckTitle={plan.title}
            width={1920}
            height={1080}
          />
        ))}
      </div>

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Export to MP4 Video
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  MediaRecorder API
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Record presentation playback with animated transitions and synchronized audio cues
              </p>
            </div>
          </div>

          <button
            onClick={stage === 'recording' ? handleCancelRecording : onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Message if any */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Recording Issue</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STAGE 1: CONFIGURATION MODE */}
          {stage === 'config' && (
            <div className="space-y-6">
              {/* Deck Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-8 rounded"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Presentation</span>
                    <strong className="text-slate-200 truncate block max-w-[200px]">
                      {plan.title}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Slides</span>
                    <strong className="text-slate-200">{plan.slides.length} Slides</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-slate-400 block text-[11px]">Est. Video Length</span>
                    <strong className="text-emerald-400">~{formatSeconds(estimatedSeconds)} ({estimatedSeconds}s)</strong>
                  </div>
                </div>
              </div>

              {/* Grid of Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Timing & Transitions */}
                <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Timing & Transitions
                  </h3>

                  {/* Slide Display Duration */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">Slide Display Duration</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {settings.slideDuration}s per slide
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[
                        { label: 'Quick (3s)', val: 3.0 },
                        { label: 'Standard (4.5s)', val: 4.5 },
                        { label: 'Detailed (7s)', val: 7.0 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, slideDuration: preset.val }))
                          }
                          className={`py-1.5 px-2 text-xs rounded-lg border font-semibold transition-all ${
                            settings.slideDuration === preset.val
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="12.0"
                      step="0.5"
                      value={settings.slideDuration}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          slideDuration: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Transition Style */}
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-2">
                      Transition Animation Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'slide',
                          name: 'Slide Push',
                          desc: 'Modern horizontal glide',
                        },
                        {
                          id: 'fade',
                          name: 'Crossfade',
                          desc: 'Smooth cinematic dissolve',
                        },
                        {
                          id: 'zoom',
                          name: 'Dynamic Zoom',
                          desc: 'Gentle scale & fade',
                        },
                        {
                          id: 'wipe',
                          name: 'Wipe Reveal',
                          desc: 'Directional edge reveal',
                        },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              transitionStyle: t.id as VideoTransitionStyle,
                            }))
                          }
                          className={`p-3 rounded-xl border text-left transition-all ${
                            settings.transitionStyle === t.id
                              ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-200">{t.name}</span>
                            {settings.transitionStyle === t.id && (
                              <Check className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transition Speed */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">Transition Duration</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {settings.transitionDuration}s
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { label: 'Snappy (0.5s)', val: 0.5 },
                        { label: 'Balanced (0.8s)', val: 0.8 },
                        { label: 'Cinematic (1.2s)', val: 1.2 },
                      ].map((s) => (
                        <button
                          key={s.val}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, transitionDuration: s.val }))
                          }
                          className={`flex-1 py-1 px-2 text-xs rounded-lg border font-semibold transition-all ${
                            settings.transitionDuration === s.val
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Audio Cues & Quality */}
                <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      Audio Cues & Soundtrack
                    </h3>
                    <button
                      type="button"
                      onClick={handleTestSound}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                      title="Play audio cue sample"
                    >
                      <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                      Test Chime
                    </button>
                  </div>

                  {/* Audio Cues Toggles */}
                  <div className="space-y-2.5">
                    {/* Slide Transition Chime */}
                    <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.audioCues}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, audioCues: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-200 block font-semibold">
                          Slide Transition Chimes
                        </strong>
                        <span className="text-slate-400 text-[11px] leading-tight">
                          Gentle crystal chime + aerodynamic whoosh synchronized to slide movements
                        </span>
                      </div>
                    </label>

                    {/* Intro & Outro Chimes */}
                    <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.introOutroAudio}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            introOutroAudio: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-200 block font-semibold">
                          Intro & Finale Fanfare
                        </strong>
                        <span className="text-slate-400 text-[11px] leading-tight">
                          Harmonic opening chord on title slide and resolving cadence on conclusion
                        </span>
                      </div>
                    </label>

                    {/* Ambient Presentation Pad */}
                    <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.ambientMusic}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            ambientMusic: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-200 block font-semibold">
                          Ambient Presentation Pad
                        </strong>
                        <span className="text-slate-400 text-[11px] leading-tight">
                          Relaxing, low-profile synth pad playing softly in background
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Volume Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Audio Volume</span>
                      <span className="font-mono text-slate-400">
                        {Math.round(settings.audioVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.audioVolume}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          audioVolume: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Video Resolution & Overlays */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Video Resolution</span>
                      <div className="flex gap-1.5">
                        {(['1080p', '720p'] as VideoResolution[]).map((res) => (
                          <button
                            key={res}
                            type="button"
                            onClick={() => setSettings((prev) => ({ ...prev, resolution: res }))}
                            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                              settings.resolution === res
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {res === '1080p' ? '1080p Full HD' : '720p HD'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Burn-in Speaker Notes Captions</span>
                      <input
                        type="checkbox"
                        checked={settings.showCaptions}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, showCaptions: e.target.checked }))
                        }
                        className="rounded border-slate-700 text-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Bottom Progress Bar Line</span>
                      <input
                        type="checkbox"
                        checked={settings.showProgressBar}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            showProgressBar: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-700 text-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: CAPTURING & RECORDING LIVE PROGRESS */}
          {(stage === 'capturing' || stage === 'recording') && (
            <div className="space-y-5 py-2">
              {/* Live Canvas Monitor */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl">
                <canvas
                  ref={previewCanvasRef}
                  width={1280}
                  height={720}
                  className="w-full h-full object-contain"
                />

                {/* Top Recording Overlay HUD */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 border border-red-500/50 backdrop-blur-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-red-300 uppercase tracking-wider">
                      {stage === 'capturing' ? 'STAGING SLIDES' : 'REC LIVE (30 FPS)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 border border-slate-700/80 backdrop-blur-md text-xs font-mono text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {formatSeconds(progress.elapsedSeconds)} /{' '}
                      {formatSeconds(progress.totalEstimatedSeconds)}
                    </span>
                  </div>
                </div>

                {/* Bottom Slide Info HUD */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="px-3 py-1.5 rounded-xl bg-black/75 border border-slate-700/80 backdrop-blur-md text-xs text-slate-200 font-medium truncate max-w-[80%]">
                    Slide {progress.currentSlide} of {progress.totalSlides}:{' '}
                    <strong className="text-indigo-300">
                      {plan.slides[progress.currentSlide - 1]?.content?.headline || ''}
                    </strong>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/50 backdrop-blur-md text-xs text-indigo-300 font-bold font-mono">
                    {progress.percent}%
                  </div>
                </div>
              </div>

              {/* Progress Bar & Status Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                    {progress.message || 'Recording presentation playback...'}
                  </span>
                  <span className="font-mono font-bold text-indigo-400">
                    {progress.percent}%
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-200 rounded-full"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: RECORDING COMPLETED & PREVIEW PLAYER */}
          {stage === 'completed' && exportResult && (
            <div className="space-y-5">
              {/* Ready Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Presentation Video Recorded Successfully!
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                      Ready to download as high-quality video with transitions and audio cues.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadVideo}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </button>
              </div>

              {/* In-Modal Video Player */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                <video
                  ref={videoPlayerRef}
                  src={exportResult.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Video Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Duration</span>
                  <strong className="text-slate-200 font-mono text-sm">
                    {formatSeconds(exportResult.durationSeconds)}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Resolution</span>
                  <strong className="text-slate-200 font-mono text-sm">
                    {settings.resolution === '1080p' ? '1920 × 1080 Full HD' : '1280 × 720 HD'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">File Size</span>
                  <strong className="text-slate-200 font-mono text-sm">
                    {formatFileSize(exportResult.fileSizeBytes)}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Format / Codec</span>
                  <strong className="text-slate-200 font-mono text-sm">
                    {supportedCodec.extension.toUpperCase()} Video
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Format: {supportedCodec.label}</span>
          </div>

          <div className="flex items-center gap-3">
            {stage === 'config' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Video className="w-4 h-4" />
                  Start MP4 Recording
                </button>
              </>
            )}

            {(stage === 'capturing' || stage === 'recording') && (
              <button
                type="button"
                onClick={handleCancelRecording}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-900/60 border border-rose-800/80 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
                Cancel Recording
              </button>
            )}

            {stage === 'completed' && (
              <>
                <button
                  type="button"
                  onClick={() => setStage('config')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-record with New Settings
                </button>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download MP4 Video
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
