import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Zap,
  DollarSign,
  Users,
  Target,
  Clock,
  Sparkles,
  Edit3,
  Check,
  ChevronDown,
  Layout,
  MessageSquare,
  Wand2,
  Plus,
  Trash2,
  Split,
  Copy,
  Sliders,
  Maximize2,
  Undo2,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Slide,
  LayoutName,
  ThemeName,
  BusinessAnalysis,
  SlideAnnotations,
  StickyNoteColor,
  SlideBackgroundStyle,
  Participant,
  LiveReaction,
  SlideVisualAsset,
} from '../types';
import { THEMES } from '../data/themes';
import {
  AnnotationToolbar,
  AnnotationCanvasLayer,
  ActiveAnnotationTool,
} from './AnnotationOverlay';
import { CollaborativeWorkspaceOverlay } from './CollaborativeWorkspaceOverlay';
import { SmartLayoutPanel } from './SmartLayoutPanel';
import {
  analyzeAndRecommendLayout,
  applySmartLayout,
  evaluateAndAutoAdaptLayout,
} from '../lib/smartLayout';

interface SlideCanvasProps {
  slide: Slide;
  slideIndex: number;
  totalSlides: number;
  themeName: ThemeName;
  onUpdateSlide: (updatedSlide: Slide) => void;
  onRegenerateSlide: (slide: Slide, instruction: string) => Promise<void>;
  analysis: BusinessAnalysis;
  isRegenerating: boolean;
  onOptimizeDeck?: () => void;
  onDuplicateSlide?: () => void;
  onSplitSlide?: () => void;
  onOpenImageStudio?: () => void;
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
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  slideIndex,
  totalSlides,
  themeName,
  onUpdateSlide,
  onRegenerateSlide,
  analysis,
  isRegenerating,
  onOptimizeDeck,
  onDuplicateSlide,
  onSplitSlide,
  onOpenImageStudio,
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
}) => {
  const theme = THEMES[themeName] || THEMES.startup;
  const [isEditing, setIsEditing] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showSmartLayoutPanel, setShowSmartLayoutPanel] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);

  // Slide visual asset (AI generated or stock photo)
  const visualAsset = slide.metadata?.visualAsset || slide.content.visualAsset;

  // Auto-Adapt state
  const [autoAdaptEnabled, setAutoAdaptEnabled] = useState(
    slide.metadata?.autoAdaptLayout !== false
  );
  const [autoAdaptNotification, setAutoAdaptNotification] = useState<{
    message: string;
    previousLayout: LayoutName;
  } | null>(null);

  // Annotation Tool state
  const [activeTool, setActiveTool] = useState<ActiveAnnotationTool>('select');
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(true);
  const [penColor, setPenColor] = useState<string>('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [stickyColor, setStickyColor] = useState<StickyNoteColor>('yellow');

  // Smart Layout analysis for current slide
  const recommendation = analyzeAndRecommendLayout(slide);

  // Local state for slide editing
  const [headline, setHeadline] = useState(slide.content.headline);
  const [subheadline, setSubheadline] = useState(slide.content.subheadline || '');
  const [badge, setBadge] = useState(slide.content.badge || '');
  const [speakerNotes, setSpeakerNotes] = useState(slide.content.speakerNotes || '');

  // Keep in sync when slide changes
  useEffect(() => {
    setHeadline(slide.content.headline);
    setSubheadline(slide.content.subheadline || '');
    setBadge(slide.content.badge || '');
    setSpeakerNotes(slide.content.speakerNotes || '');
    setAutoAdaptNotification(null);
    setIsEditing(false);
  }, [slide.id]);

  const handleSaveEdits = () => {
    onUpdateSlide({
      ...slide,
      content: {
        ...slide.content,
        headline,
        subheadline,
        badge,
        speakerNotes,
      },
    });
    setIsEditing(false);
  };

  const handleLayoutChange = (newLayout: LayoutName) => {
    const updated = applySmartLayout(slide, newLayout);
    onUpdateSlide(updated);
    setShowLayoutMenu(false);
  };

  const toggleAutoAdapt = () => {
    const nextState = !autoAdaptEnabled;
    setAutoAdaptEnabled(nextState);
    onUpdateSlide({
      ...slide,
      metadata: {
        ...slide.metadata,
        autoAdaptLayout: nextState,
      },
    });
  };

  const handleUndoAutoAdapt = () => {
    if (!autoAdaptNotification) return;
    const reverted = applySmartLayout(slide, autoAdaptNotification.previousLayout);
    onUpdateSlide(reverted);
    setAutoAdaptNotification(null);
  };

  // Content volume alteration handlers that trigger reactive Smart Layout re-evaluation
  const processSlideVolumeChange = (candidateSlide: Slide) => {
    if (autoAdaptEnabled) {
      const result = evaluateAndAutoAdaptLayout(candidateSlide);
      if (result.didChange) {
        onUpdateSlide(result.adaptedSlide);
        setAutoAdaptNotification({
          message: `Smart Layout Auto-Adapted: Switched to ${result.adaptedSlide.layout.replace(
            '_',
            ' '
          )} for visual harmony with ${candidateSlide.content.bulletPoints?.length || 0} items!`,
          previousLayout: result.previousLayout,
        });
        return;
      }
    }
    onUpdateSlide(candidateSlide);
  };

  const handleAddBulletPoint = () => {
    const current = slide.content.bulletPoints || [];
    const count = current.length + 1;
    const newPoint = `Key Pillar 0${count}: Critical growth vector and operational advantage.`;
    const updated: Slide = {
      ...slide,
      content: {
        ...slide.content,
        bulletPoints: [...current, newPoint],
      },
    };
    processSlideVolumeChange(updated);
  };

  const handleRemoveBulletPoint = (indexToRemove: number) => {
    const current = slide.content.bulletPoints || [];
    const updatedPoints = current.filter((_, idx) => idx !== indexToRemove);
    const updated: Slide = {
      ...slide,
      content: {
        ...slide.content,
        bulletPoints: updatedPoints,
      },
    };
    processSlideVolumeChange(updated);
  };

  const handleEditBulletPoint = (index: number, newText: string) => {
    const current = [...(slide.content.bulletPoints || [])];
    current[index] = newText;
    const updated: Slide = {
      ...slide,
      content: {
        ...slide.content,
        bulletPoints: current,
      },
    };
    onUpdateSlide(updated);
  };

  const handleBackgroundChange = (bgStyle: SlideBackgroundStyle) => {
    onUpdateSlide({
      ...slide,
      metadata: {
        ...slide.metadata,
        backgroundStyle: bgStyle,
      },
    });
    setShowBackgroundMenu(false);
  };

  // Annotations handlers
  const handleUpdateAnnotations = (newAnnotations: SlideAnnotations) => {
    onUpdateSlide({
      ...slide,
      metadata: {
        ...slide.metadata,
        annotations: newAnnotations,
        lastModified: new Date().toISOString(),
      },
    });
  };

  const handleUndoStroke = () => {
    const drawings = slide.metadata?.annotations?.drawings || [];
    if (drawings.length === 0) return;
    handleUpdateAnnotations({
      drawings: drawings.slice(0, -1),
      stickyNotes: slide.metadata?.annotations?.stickyNotes || [],
    });
  };

  const handleClearAllAnnotations = () => {
    const hasDrawings = (slide.metadata?.annotations?.drawings || []).length > 0;
    const hasNotes = (slide.metadata?.annotations?.stickyNotes || []).length > 0;
    if (!hasDrawings && !hasNotes) return;
    if (window.confirm('Clear all drawings and sticky notes on this slide?')) {
      handleUpdateAnnotations({
        drawings: [],
        stickyNotes: [],
      });
    }
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementPrompt.trim() || isRegenerating) return;
    await onRegenerateSlide(slide, refinementPrompt);
    setRefinementPrompt('');
  };

  const AVAILABLE_LAYOUTS: { id: LayoutName; label: string }[] = [
    { id: 'quad_grid', label: '2x2 Grid (Balanced 4 Pillars)' },
    { id: 'three_columns', label: '3-Column Cards' },
    { id: 'bullet_list', label: 'Structured Bullet List' },
    { id: 'split_with_stat', label: 'Split with Big Stat' },
    { id: 'split_text_image', label: 'Solution Feature Split' },
    { id: 'metrics_grid', label: 'Metrics Grid (TAM / Traction)' },
    { id: 'process_steps', label: 'Process Steps (1-2-3)' },
    { id: 'comparison_table', label: 'Comparison Matrix (Us vs Them)' },
    { id: 'swot_grid', label: 'SWOT 2x2 Grid' },
    { id: 'pricing_table', label: 'Pricing Table' },
    { id: 'team_cards', label: 'Team Profiles' },
    { id: 'centered_hero', label: 'Centered Hero (Title)' },
    { id: 'full_bleed_statement', label: 'Call to Action / The Ask' },
  ];

  const drawingsCount = (slide.metadata?.annotations?.drawings || []).length;
  const stickyNotes = slide.metadata?.annotations?.stickyNotes || [];
  const stickyNotesCount = stickyNotes.length;
  const unresolvedNotesCount = stickyNotes.filter((n) => !n.resolved).length;
  const bulletCount = slide.content.bulletPoints?.length || 0;
  const bgStyle: SlideBackgroundStyle = slide.metadata?.backgroundStyle || 'default';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Slide Toolbar */}
      <div className="w-full max-w-4xl mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Slide {slideIndex + 1} of {totalSlides}
          </span>
          <span className="font-semibold text-slate-400 capitalize hidden sm:inline">
            Type: <span className="text-indigo-400">{slide.slideType.replace('_', ' ')}</span>
          </span>

          {/* Visual Harmony Score Gauge */}
          <button
            type="button"
            onClick={() => setShowSmartLayoutPanel(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer"
            title={`Visual Harmony Score: ${recommendation.harmonyScore}% (${recommendation.densityLevel}). Click to inspect.`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                recommendation.harmonyScore >= 90
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : recommendation.harmonyScore >= 75
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                  : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
              }`}
            />
            <span className="font-bold text-slate-200">{recommendation.harmonyScore}% Harmony</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Auto-Adapt Toggle Switch */}
          <button
            type="button"
            onClick={toggleAutoAdapt}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
              autoAdaptEnabled
                ? 'bg-indigo-950/80 border-indigo-500/70 text-indigo-300 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-Adapt: Automatically re-evaluates layout choice (e.g. 4 items -> 2x2 grid) when content volume changes"
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoAdaptEnabled ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Auto-Adapt: {autoAdaptEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Split Slide Button (if dense with 5+ items) */}
          {bulletCount >= 5 && onSplitSlide && (
            <button
              type="button"
              onClick={onSplitSlide}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-600/50 text-amber-300 hover:bg-slate-800 transition-all font-semibold"
              title="Split high-density slide into two balanced slides"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split (1→2)</span>
            </button>
          )}

          {/* Duplicate Slide Button */}
          {onDuplicateSlide && (
            <button
              type="button"
              onClick={onDuplicateSlide}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-all font-medium"
              title="Duplicate current slide"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Layout Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-all font-medium"
            >
              <Layout className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Layout: <strong className="text-white">{slide.layout}</strong>
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 max-h-80 overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Slide Layout</span>
                  <span className="text-[10px] text-indigo-400 lowercase">content-mapped</span>
                </div>
                {AVAILABLE_LAYOUTS.map((lay) => {
                  const isRec = lay.id === recommendation.recommendedLayout;
                  const isCurrent = slide.layout === lay.id;
                  return (
                    <button
                      key={lay.id}
                      onClick={() => handleLayoutChange(lay.id)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between ${
                        isCurrent
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{lay.label}</span>
                        {isRec && !isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                            ✨ Best Fit
                          </span>
                        )}
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Background Style Selector */}
          <div className="relative">
            <button
              onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-all font-medium"
              title="Change slide background styling"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="capitalize">{bgStyle}</span>
            </button>
            {showBackgroundMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30">
                {(['default', 'mesh', 'dots', 'gradient', 'minimal'] as SlideBackgroundStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => handleBackgroundChange(style)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg capitalize ${
                      bgStyle === style ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Visual & Stock Photo Studio Trigger */}
          {onOpenImageStudio && (
            <button
              type="button"
              onClick={onOpenImageStudio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                visualAsset
                  ? 'bg-purple-900/50 border-purple-500/70 text-purple-200 hover:bg-purple-850 shadow-sm'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-purple-500/50'
              }`}
              title="Open AI Visual & Stock Photo Studio"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Visuals</span>
              {visualAsset && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              )}
            </button>
          )}

          {/* Inline Edit Toggle */}
          <button
            onClick={() => (isEditing ? handleSaveEdits() : setIsEditing(true))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
              isEditing
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Slide</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Slide</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auto-Adapt Toast Notification with Instant Undo */}
      {autoAdaptNotification && (
        <div className="w-full max-w-4xl mb-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-900 border border-indigo-500/70 text-indigo-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{autoAdaptNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={handleUndoAutoAdapt}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shrink-0 ml-3"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Layout</span>
          </button>
        </div>
      )}

      {/* Annotation Overlay Toolbar */}
      <AnnotationToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        isVisible={isOverlayVisible}
        setIsVisible={setIsOverlayVisible}
        penColor={penColor}
        setPenColor={setPenColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        stickyColor={stickyColor}
        setStickyColor={setStickyColor}
        onUndoStroke={handleUndoStroke}
        onClearAll={handleClearAllAnnotations}
        drawingsCount={drawingsCount}
        stickyNotesCount={stickyNotesCount}
        unresolvedNotesCount={unresolvedNotesCount}
      />

      {/* 16:9 Widescreen Slide Container */}
      <div
        id={`slide-canvas-${slide.id}`}
        onMouseMove={(e) => {
          if (!onCursorMove) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          onCursorMove(x, y);
        }}
        className="w-full max-w-4xl aspect-[16/9] rounded-2xl shadow-2xl overflow-hidden relative border transition-all duration-300 flex flex-col justify-between p-6 sm:p-10 select-text"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.cardBorder,
          color: theme.textPrimary,
          fontFamily: theme.fontFamily,
        }}
      >
        {/* Subtle Background Style Overlays */}
        {bgStyle === 'mesh' && (
          <div
            className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: theme.primary }}
          />
        )}
        {bgStyle === 'dots' && (
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${theme.textPrimary} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
        )}
        {bgStyle === 'gradient' && (
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${theme.primary} 0%, transparent 60%)`,
            }}
          />
        )}

        {/* AI Visual Background Layer (Photographic or Generative) */}
        {visualAsset && visualAsset.placement === 'hero_background' && (
          <div
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
            style={{
              opacity: visualAsset.opacity ?? 0.25,
              filter: visualAsset.blur ? `blur(${visualAsset.blur}px)` : 'none',
            }}
          >
            <img
              src={visualAsset.url}
              alt={visualAsset.alt || 'Slide backdrop'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {/* Gradient Contrast Mask ensuring typography remains crystal clear */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${theme.bg} 35%, transparent 100%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${theme.bg} 20%, transparent 80%)`,
              }}
            />
          </div>
        )}

        {/* Real-time Collaborative Workspace Overlay (Live cursors, active participants, reactions) */}
        {isCollaborating && (
          <CollaborativeWorkspaceOverlay
            currentSlideIndex={slideIndex}
            totalSlides={totalSlides}
            isConnected={isCollaborating}
            sessionId={sessionId || null}
            participants={participants || []}
            currentUserId={currentUserId || ''}
            remoteCursors={remoteCursors || {}}
            reactions={reactions || []}
            showRemoteCursors={showRemoteCursors !== false}
            followPresenter={followPresenter || false}
            isHost={isHost || false}
            onToggleCursors={onToggleCursors || (() => {})}
            onToggleFollow={onToggleFollow || (() => {})}
            onSendReaction={onSendReaction || (() => {})}
            onOpenSessionModal={onOpenSessionModal || (() => {})}
          />
        )}

        {/* Annotation Canvas Layer (SVG ink drawings & draggable sticky note cards) */}
        <AnnotationCanvasLayer
          annotations={slide.metadata?.annotations}
          onChangeAnnotations={handleUpdateAnnotations}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isVisible={isOverlayVisible}
          penColor={penColor}
          strokeWidth={strokeWidth}
          stickyColor={stickyColor}
        />

        {/* Decorative Top Accent Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: theme.primary }}
        />

        {/* Slide Header (Badge, Headline, Subheadline) */}
        <div className="relative z-10">
          {/* Badge & Header Visual Accent */}
          {slide.layout !== 'centered_hero' && (
            <div className="mb-2 flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="bg-black/30 border border-white/20 rounded px-2 py-0.5 text-xs font-bold"
                  style={{ color: theme.accent }}
                />
              ) : (
                <span
                  className="text-xs font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: `${theme.primary}20`,
                    color: theme.accent,
                    border: `1px solid ${theme.primary}40`,
                  }}
                >
                  {slide.content.badge || `0${slideIndex + 1}`}
                </span>
              )}

              {/* Header Accent Visual */}
              {visualAsset && visualAsset.placement === 'header_accent' && (
                <div className="w-6 h-6 rounded-md overflow-hidden border border-white/20 shadow-sm shrink-0">
                  <img
                    src={visualAsset.url}
                    alt={visualAsset.alt || 'Header visual'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Headline */}
          {slide.layout !== 'centered_hero' && (
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded px-3 py-1.5 text-xl sm:text-2xl font-black mb-1"
                  style={{ color: theme.textPrimary }}
                />
              ) : (
                <h2
                  className="text-xl sm:text-3xl font-black tracking-tight leading-tight"
                  style={{ color: theme.textPrimary }}
                >
                  {slide.content.headline}
                </h2>
              )}

              {/* Subheadline */}
              {isEditing ? (
                <input
                  type="text"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-xs mt-1"
                  style={{ color: theme.textSecondary }}
                />
              ) : (
                slide.content.subheadline && (
                  <p
                    className="text-xs sm:text-sm mt-1.5 font-normal opacity-90 max-w-3xl"
                    style={{ color: theme.textSecondary }}
                  >
                    {slide.content.subheadline}
                  </p>
                )
              )}
            </div>
          )}
        </div>

        {/* Dynamic Slide Content Body */}
        <div className="relative z-10 my-auto py-2">
          {/* 1. Layout: quad_grid (2x2 Grid) - 4 balanced items */}
          {slide.layout === 'quad_grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {(slide.content.bulletPoints || []).map((bp, idx) => {
                const parts = bp.includes(':')
                  ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
                  : [`Pillar 0${idx + 1}`, bp];
                const title = parts[0];
                const desc = parts[1];
                const icons = [Target, Zap, Award, CheckCircle2];
                const IconComp = icons[idx % icons.length];
                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-4 rounded-xl border flex flex-col justify-between shadow-sm relative group"
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={title}
                              onChange={(e) =>
                                handleEditBulletPoint(idx, `${e.target.value}: ${desc}`)
                              }
                              className="bg-black/30 border border-white/20 rounded px-1.5 py-0.5 text-xs font-bold text-white w-full"
                            />
                          ) : (
                            <h4
                              className="text-xs sm:text-sm font-bold truncate"
                              style={{ color: theme.textPrimary }}
                            >
                              {title}
                            </h4>
                          )}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBulletPoint(idx)}
                            className="text-rose-400 hover:text-rose-300 p-0.5"
                            title="Remove point"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={desc}
                          onChange={(e) =>
                            handleEditBulletPoint(idx, `${title}: ${e.target.value}`)
                          }
                          rows={2}
                          className="w-full bg-black/30 border border-white/20 rounded p-1 text-[11px] text-white"
                        />
                      ) : (
                        <p
                          className="text-[11px] sm:text-xs leading-relaxed"
                          style={{ color: theme.textSecondary }}
                        >
                          {desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Layout: three_columns (3 horizontal cards) */}
          {slide.layout === 'three_columns' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {(slide.content.bulletPoints || []).slice(0, 3).map((bp, idx) => {
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
                    className="p-4 rounded-xl border flex flex-col justify-between shadow-sm relative overflow-hidden"
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mb-2 mt-0.5"
                        style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={title}
                          onChange={(e) =>
                            handleEditBulletPoint(idx, `${e.target.value}: ${desc}`)
                          }
                          className="bg-black/30 border border-white/20 rounded px-1.5 py-0.5 text-xs font-bold text-white w-full mb-1"
                        />
                      ) : (
                        <h4
                          className="text-xs sm:text-sm font-bold mb-1"
                          style={{ color: theme.textPrimary }}
                        >
                          {title}
                        </h4>
                      )}
                      {isEditing ? (
                        <textarea
                          value={desc}
                          onChange={(e) =>
                            handleEditBulletPoint(idx, `${title}: ${e.target.value}`)
                          }
                          rows={2}
                          className="w-full bg-black/30 border border-white/20 rounded p-1 text-[11px] text-white"
                        />
                      ) : (
                        <p
                          className="text-[11px] sm:text-xs leading-relaxed"
                          style={{ color: theme.textSecondary }}
                        >
                          {desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Layout: centered_hero */}
          {slide.layout === 'centered_hero' && (
            <div className="text-center max-w-2xl mx-auto space-y-3 py-4">
              <span
                className="text-xs font-extrabold tracking-widest uppercase px-3 py-1 rounded-full"
                style={{ backgroundColor: `${theme.primary}20`, color: theme.accent }}
              >
                {slide.content.badge || 'EXECUTIVE SUMMARY'}
              </span>
              <h1
                className="text-2xl sm:text-4xl font-black tracking-tight leading-tight"
                style={{ color: theme.textPrimary }}
              >
                {slide.content.headline}
              </h1>
              {slide.content.subheadline && (
                <p
                  className="text-xs sm:text-base font-normal leading-relaxed opacity-90"
                  style={{ color: theme.textSecondary }}
                >
                  {slide.content.subheadline}
                </p>
              )}
            </div>
          )}

          {/* 4. Layout: split_with_stat */}
          {slide.layout === 'split_with_stat' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 space-y-3">
                {slide.content.bulletPoints?.map((bp, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                    >
                      <Zap className="w-3 h-3" />
                    </div>
                    <p
                      className="text-xs sm:text-sm font-medium leading-relaxed"
                      style={{ color: theme.textPrimary }}
                    >
                      {bp}
                    </p>
                  </div>
                ))}
              </div>

              {slide.content.statistic && (
                <div
                  className="md:col-span-5 p-5 rounded-2xl border text-center flex flex-col justify-center items-center shadow-lg"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <span
                    className="text-3xl sm:text-5xl font-black tracking-tight"
                    style={{ color: theme.primary }}
                  >
                    {slide.content.statistic.number}
                  </span>
                  <span
                    className="text-xs sm:text-sm font-bold mt-1 max-w-xs"
                    style={{ color: theme.textPrimary }}
                  >
                    {slide.content.statistic.label}
                  </span>
                  {slide.content.statistic.context && (
                    <span
                      className="text-[11px] mt-2 opacity-80"
                      style={{ color: theme.textSecondary }}
                    >
                      {slide.content.statistic.context}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Layout: metrics_grid */}
          {slide.layout === 'metrics_grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(slide.content.metrics || []).map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border shadow-md flex flex-col justify-between"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: theme.primary }} />
                    {m.change && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${theme.primary}20`,
                          color: theme.accent,
                        }}
                      >
                        {m.change}
                      </span>
                    )}
                  </div>
                  <div>
                    <span
                      className="text-2xl sm:text-4xl font-extrabold tracking-tight block"
                      style={{ color: theme.textPrimary }}
                    >
                      {m.value}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-bold mt-1 block"
                      style={{ color: theme.textPrimary }}
                    >
                      {m.label}
                    </span>
                  </div>
                  {m.subtext && (
                    <p
                      className="text-[11px] mt-2 font-normal"
                      style={{ color: theme.textSecondary }}
                    >
                      {m.subtext}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 6. Layout: comparison_table */}
          {slide.layout === 'comparison_table' && (
            <div
              className="rounded-xl border overflow-hidden shadow-md"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              }}
            >
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr style={{ backgroundColor: `${theme.primary}20` }}>
                    <th className="p-2.5 sm:p-3 font-bold" style={{ color: theme.textPrimary }}>
                      Capabilities & Architecture
                    </th>
                    <th
                      className="p-2.5 sm:p-3 font-extrabold text-center"
                      style={{ color: theme.accent }}
                    >
                      Our Solution
                    </th>
                    <th
                      className="p-2.5 sm:p-3 font-semibold text-center"
                      style={{ color: theme.textSecondary }}
                    >
                      {slide.content.competitorNames?.[0] || 'Traditional Alternative'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                  {(slide.content.comparisonRows || []).map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 sm:p-3 font-medium" style={{ color: theme.textPrimary }}>
                        {row.feature}
                      </td>
                      <td className="p-2.5 sm:p-3 text-center font-bold" style={{ color: theme.accent }}>
                        {row.us === true ? (
                          <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-400" />
                        ) : (
                          String(row.us)
                        )}
                      </td>
                      <td className="p-2.5 sm:p-3 text-center font-medium" style={{ color: theme.textSecondary }}>
                        {row.competitors === false ? (
                          <XCircle className="w-4 h-4 mx-auto text-rose-400/80" />
                        ) : (
                          String(row.competitors)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. Layout: process_steps */}
          {slide.layout === 'process_steps' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(slide.content.processSteps || []).map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between shadow-sm relative overflow-hidden"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white mb-2 shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  >
                    0{step.number || idx + 1}
                  </div>
                  <div>
                    <h3
                      className="text-xs sm:text-sm font-bold mb-1"
                      style={{ color: theme.textPrimary }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-[11px] sm:text-xs leading-relaxed"
                      style={{ color: theme.textSecondary }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 8. Layout: swot_grid */}
          {slide.layout === 'swot_grid' && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { title: 'STRENGTHS', items: slide.content.swot?.strengths || [], color: theme.accent },
                { title: 'WEAKNESSES', items: slide.content.swot?.weaknesses || [], color: theme.textSecondary },
                { title: 'OPPORTUNITIES', items: slide.content.swot?.opportunities || [], color: theme.primary },
                { title: 'THREATS', items: slide.content.swot?.threats || [], color: theme.textSecondary },
              ].map((quad, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-4 rounded-xl border"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <span
                    className="text-[10px] font-black tracking-wider block mb-1.5"
                    style={{ color: quad.color }}
                  >
                    {quad.title}
                  </span>
                  <ul className="space-y-1 text-[11px] sm:text-xs" style={{ color: theme.textPrimary }}>
                    {quad.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-400">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 9. Layout: pricing_table */}
          {slide.layout === 'pricing_table' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(slide.content.pricingTiers || []).map((tier, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border shadow-md flex flex-col justify-between relative"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: tier.isPopular ? theme.accent : theme.cardBorder,
                  }}
                >
                  {tier.isPopular && (
                    <span
                      className="absolute -top-2.5 right-4 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: theme.primary }}
                    >
                      Most Popular
                    </span>
                  )}
                  <div>
                    <h4
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{ color: tier.isPopular ? theme.accent : theme.textSecondary }}
                    >
                      {tier.name}
                    </h4>
                    <div className="flex items-baseline gap-1 my-1">
                      <span
                        className="text-xl sm:text-2xl font-black"
                        style={{ color: theme.textPrimary }}
                      >
                        {tier.price}
                      </span>
                      <span className="text-[10px]" style={{ color: theme.textSecondary }}>
                        {tier.period || '/mo'}
                      </span>
                    </div>
                    <p className="text-[11px] mb-3" style={{ color: theme.textSecondary }}>
                      {tier.description}
                    </p>
                    <ul className="space-y-1 text-[11px]" style={{ color: theme.textPrimary }}>
                      {tier.features.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 10. Layout: team_cards */}
          {slide.layout === 'team_cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(slide.content.teamMembers || []).map((member, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border text-center flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white mb-2 shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {member.avatarInitials || member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold" style={{ color: theme.textPrimary }}>
                    {member.name}
                  </h4>
                  <span
                    className="text-[11px] font-semibold mb-1"
                    style={{ color: theme.accent }}
                  >
                    {member.role}
                  </span>
                  <p
                    className="text-[11px] line-clamp-3 leading-tight"
                    style={{ color: theme.textSecondary }}
                  >
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 11. Layout: full_bleed_statement */}
          {slide.layout === 'full_bleed_statement' && (
            <div className="space-y-4">
              {slide.content.ctaAction?.askAmount && (
                <div
                  className="p-4 sm:p-5 rounded-2xl border text-center shadow-lg"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <span
                    className="text-[11px] font-bold tracking-widest uppercase block"
                    style={{ color: theme.accent }}
                  >
                    TARGET FUNDRAISING OBJECTIVE
                  </span>
                  <span
                    className="text-2xl sm:text-4xl font-black block mt-1"
                    style={{ color: theme.textPrimary }}
                  >
                    {slide.content.ctaAction.askAmount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 12. Default / bullet_list / fallback */}
          {slide.layout !== 'centered_hero' &&
            slide.layout !== 'quad_grid' &&
            slide.layout !== 'three_columns' &&
            slide.layout !== 'split_with_stat' &&
            slide.layout !== 'metrics_grid' &&
            slide.layout !== 'comparison_table' &&
            slide.layout !== 'process_steps' &&
            slide.layout !== 'swot_grid' &&
            slide.layout !== 'pricing_table' &&
            slide.layout !== 'team_cards' &&
            slide.layout !== 'full_bleed_statement' && (
              <div className="space-y-2.5 max-w-2xl">
                {(slide.content.bulletPoints || []).map((bp, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-xl group"
                    style={{ backgroundColor: `${theme.cardBg}80` }}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={bp}
                          onChange={(e) => handleEditBulletPoint(idx, e.target.value)}
                          className="w-full bg-black/30 border border-white/20 rounded px-2 py-0.5 text-xs text-white"
                        />
                      ) : (
                        <p
                          className="text-xs sm:text-sm font-medium leading-relaxed"
                          style={{ color: theme.textPrimary }}
                        >
                          {bp}
                        </p>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBulletPoint(idx)}
                        className="text-rose-400 hover:text-rose-300 p-0.5 ml-2"
                        title="Remove point"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Quick Add Point Trigger to easily test/use Smart Auto-Adaptation */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddBulletPoint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-xs font-semibold transition-all hover:border-indigo-400 text-slate-400 hover:text-indigo-300"
                    style={{ borderColor: `${theme.primary}40` }}
                    title="Add a point (triggers Smart Layout re-evaluation, e.g. 4 points -> 2x2 Grid)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item ({bulletCount} items • Auto-evaluates layout)</span>
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Slide Footer Branding & Page Number */}
        <div
          className="relative z-10 pt-2 border-t flex items-center justify-between text-[10px] opacity-70"
          style={{ borderColor: `${theme.textSecondary}25`, color: theme.textSecondary }}
        >
          <div className="flex items-center gap-2 truncate max-w-[65%]">
            <span>Trusity AI • {analysis.companyName || 'Pitch Deck'}</span>
            {visualAsset?.caption && (
              <span className="text-[9px] opacity-80 truncate border-l pl-2 border-current">
                {visualAsset.caption}
              </span>
            )}
          </div>
          <span>
            {slideIndex + 1} / {totalSlides}
          </span>
        </div>
      </div>

      {/* AI Single-Slide Refiner & Speaker Notes Bar */}
      <div className="w-full max-w-4xl mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Quick Refiner Prompt */}
        <form
          onSubmit={handleRefineSubmit}
          className="md:col-span-7 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 ml-1.5 shrink-0" />
          <input
            type="text"
            value={refinementPrompt}
            onChange={(e) => setRefinementPrompt(e.target.value)}
            placeholder="AI Refine: 'Make punchier', 'Add competitor angle', 'More concise'..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            disabled={isRegenerating}
          />
          <button
            type="submit"
            disabled={isRegenerating || !refinementPrompt.trim()}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shrink-0 transition-all"
          >
            {isRegenerating ? 'Polishing...' : 'Refine'}
          </button>
        </form>

        {/* Speaker Notes Summary */}
        <div className="md:col-span-5 flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Notes:</strong>{' '}
              {slide.content.speakerNotes
                ? slide.content.speakerNotes.substring(0, 60) + '...'
                : 'No notes'}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Layout Modal / Panel */}
      <SmartLayoutPanel
        isOpen={showSmartLayoutPanel}
        slide={slide}
        onClose={() => setShowSmartLayoutPanel(false)}
        onApplyLayout={(targetLayout) => {
          const updated = applySmartLayout(slide, targetLayout);
          onUpdateSlide(updated);
        }}
        onOptimizeDeck={onOptimizeDeck}
      />
    </div>
  );
};
