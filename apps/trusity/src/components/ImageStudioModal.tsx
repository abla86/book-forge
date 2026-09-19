import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Search,
  Wand2,
  Sliders,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Layers,
  Eye,
  Trash2,
  CheckCircle2,
  Cpu,
  TrendingUp,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import {
  Slide,
  SlideVisualAsset,
  StockPhotoItem,
  VisualContextAnalysis,
  VisualPlacement,
  ThemeConfig,
} from '../types';
import { THEMES } from '../data/themes';
import {
  analyzeSlideVisualContext,
  searchStockPhotos,
  generateCustomVisual,
} from '../api';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
  themeName: string;
  presentationTitle?: string;
  onApplyVisual: (asset: SlideVisualAsset | null, applyToAllSlides?: boolean) => void;
}

type TabType = 'stock' | 'generate' | 'tune';

const CATEGORIES = [
  'All',
  'Technology & AI',
  'Business & Leadership',
  'Finance & Markets',
  'Abstract & Shapes',
  'Architecture & Minimal',
  'Green & Sustainable',
  'Healthcare & Science',
];

const STYLE_PRESETS = [
  {
    id: 'isometric_pipeline',
    name: '3D Isometric Pipeline',
    desc: 'Multi-tiered floating isometric platforms with data beams & glowing servers',
    icon: Cpu,
  },
  {
    id: 'neural_mesh',
    name: 'Neural Synapse Mesh',
    desc: 'Interconnected AI neural network with glowing synaptic conduits',
    icon: Zap,
  },
  {
    id: 'growth_infographic',
    name: 'Growth Trajectory',
    desc: 'Exponential financial curve with glowing milestone markers & gradient fill',
    icon: TrendingUp,
  },
  {
    id: 'glass_quadrant',
    name: 'Glass Translucent Quadrant',
    desc: 'Frosted translucent quadrant cards with neon corner accents',
    icon: LayoutGrid,
  },
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  slide,
  themeName,
  presentationTitle,
  onApplyVisual,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [aspectRatioFilter, setAspectRatioFilter] = useState<string>('All');

  // Analysis State
  const [analysis, setAnalysis] = useState<VisualContextAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Stock Photos
  const [photos, setPhotos] = useState<StockPhotoItem[]>([]);
  const [isSearchingPhotos, setIsSearchingPhotos] = useState<boolean>(false);

  // Selected Asset Draft
  const [draftAsset, setDraftAsset] = useState<SlideVisualAsset | null>(
    slide.metadata?.visualAsset || slide.content.visualAsset || null
  );

  // Generator State
  const [selectedPreset, setSelectedPreset] = useState<string>('isometric_pipeline');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<SlideVisualAsset | null>(null);

  // Fine-tuning settings
  const [placement, setPlacement] = useState<VisualPlacement>(
    draftAsset?.placement || 'hero_background'
  );
  const [opacity, setOpacity] = useState<number>(draftAsset?.opacity ?? 0.25);
  const [blur, setBlur] = useState<number>(draftAsset?.blur ?? 0);
  const [caption, setCaption] = useState<string>(draftAsset?.caption || '');
  const [applyToAll, setApplyToAll] = useState<boolean>(false);

  const theme: ThemeConfig = THEMES[themeName] || THEMES.startup;

  // Initialize and analyze slide context when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset or load existing asset
    const existing = slide.metadata?.visualAsset || slide.content.visualAsset || null;
    setDraftAsset(existing);
    if (existing) {
      setPlacement(existing.placement);
      setOpacity(existing.opacity ?? 0.25);
      setBlur(existing.blur ?? 0);
      setCaption(existing.caption || '');
    }

    // Run AI Visual Context Analysis
    loadContextAnalysis();
    loadStockPhotos('');
  }, [isOpen, slide.id]);

  const loadContextAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeSlideVisualContext(slide, themeName, presentationTitle);
      setAnalysis(res);
      if (!customPrompt) {
        setCustomPrompt(res.aiPrompt);
      }
      if (!draftAsset) {
        setPlacement(res.recommendedPlacement);
      }
    } catch (err) {
      console.warn('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadStockPhotos = async (query: string, cat?: string, ar?: string) => {
    setIsSearchingPhotos(true);
    try {
      const targetCat = cat !== undefined ? cat : selectedCategory;
      const targetAr = ar !== undefined ? ar : aspectRatioFilter;
      const res = await searchStockPhotos(query, targetCat, targetAr, 24);
      setPhotos(res.results);
    } catch (err) {
      console.warn('Failed to load photos:', err);
    } finally {
      setIsSearchingPhotos(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStockPhotos(searchQuery, selectedCategory, aspectRatioFilter);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    loadStockPhotos(searchQuery, cat, aspectRatioFilter);
  };

  const handleSelectPhoto = (photo: StockPhotoItem) => {
    const asset: SlideVisualAsset = {
      id: `stock-${photo.id}-${Date.now()}`,
      url: photo.url,
      source: 'stock_photo',
      alt: photo.title,
      caption: `Photo by ${photo.author} on Unsplash`,
      authorName: photo.author,
      authorUrl: photo.authorUrl,
      placement: placement,
      aspectRatio: photo.aspectRatio,
      opacity: placement === 'hero_background' ? opacity : 1.0,
      blur: blur,
    };
    setDraftAsset(asset);
    setCaption(asset.caption || '');
  };

  const handleGenerateVisual = async () => {
    setIsGenerating(true);
    try {
      const asset = await generateCustomVisual({
        prompt: customPrompt || `${slide.content.headline} strategic infographic`,
        stylePreset: selectedPreset,
        aspectRatio: '16:9',
        themePrimary: theme.primary,
        themeSecondary: theme.accent,
        headline: slide.content.headline,
      });
      setGeneratedResult(asset);
      setDraftAsset({
        ...asset,
        placement: placement,
        opacity: placement === 'hero_background' ? opacity : 1.0,
        blur: blur,
      });
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!draftAsset) {
      onApplyVisual(null, applyToAll);
      onClose();
      return;
    }

    const finalAsset: SlideVisualAsset = {
      ...draftAsset,
      placement,
      opacity: placement === 'hero_background' ? opacity : 1.0,
      blur,
      caption: caption.trim() || undefined,
    };

    onApplyVisual(finalAsset, applyToAll);
    onClose();
  };

  const handleRemoveVisual = () => {
    setDraftAsset(null);
    onApplyVisual(null, false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AI Visual & Stock Photo Studio
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Slide {slide.slideNumber || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md sm:max-w-xl">
                Select context-relevant stock photography or synthesize custom vector graphics for &quot;{slide.content.headline}&quot;
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Context Intelligence Strip */}
        <div className="px-4 sm:px-6 py-2.5 bg-indigo-950/40 border-b border-indigo-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : 'text-indigo-400'}`} />
              <span>AI Context Keywords:</span>
            </div>
            {analysis?.keywords && analysis.keywords.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {analysis.keywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery(kw);
                      setActiveTab('stock');
                      loadStockPhotos(kw);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 transition-all text-[11px]"
                    title={`Search stock photos for "${kw}"`}
                  >
                    #{kw}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic">
                {isAnalyzing ? 'Analyzing slide narrative with Gemini...' : 'Analyzing keywords...'}
              </span>
            )}
          </div>

          {analysis && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
              <span>Recommended:</span>
              <strong className="text-indigo-300 capitalize">{analysis.recommendedStyle}</strong>
              <span className="text-slate-600">•</span>
              <strong className="text-purple-300">{analysis.recommendedPlacement.replace('_', ' ')}</strong>
            </div>
          )}
        </div>

        {/* Main Tabs Navigation */}
        <div className="flex border-b border-slate-800 px-4 sm:px-6 bg-slate-900/60">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'stock'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Curated Stock Photos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {photos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'generate'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>AI Custom Visuals</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold">
              SVG + Vector
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tune')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'tune'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Placement & Styling</span>
            {draftAsset && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: CURATED STOCK PHOTOS */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Search Bar and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search high-res stock photos (e.g. cloud server, executive meeting, neural network)..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-20 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          loadStockPhotos('');
                        }}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Search
                    </button>
                  </div>
                </form>

                {/* Aspect Ratio Filter */}
                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-xl p-1 text-xs">
                  <span className="text-slate-400 px-2 font-medium">Aspect:</span>
                  {['All', '16:9', '4:3', '1:1'].map((ar) => (
                    <button
                      key={ar}
                      onClick={() => {
                        setAspectRatioFilter(ar);
                        loadStockPhotos(searchQuery, selectedCategory, ar);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                        aspectRatioFilter === ar
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Quick Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Photos Grid */}
              {isSearchingPhotos ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Curating high-resolution photographic collection...</span>
                </div>
              ) : photos.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <p className="text-sm font-semibold">No stock photos matched your search.</p>
                  <p className="text-xs text-slate-500">
                    Try searching for broader terms like &quot;technology&quot;, &quot;business&quot;, &quot;architecture&quot;, or click one of the AI keyword pills above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {photos.map((photo) => {
                    const isSelected = draftAsset?.url === photo.url;
                    return (
                      <div
                        key={photo.id}
                        onClick={() => handleSelectPhoto(photo)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 bg-slate-950 flex flex-col ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/80 shadow-lg shadow-indigo-500/20'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {/* Image Thumbnail */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                          <img
                            src={photo.thumbnailUrl}
                            alt={photo.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />

                          {/* Top Tag Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white/90">
                              {photo.category}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-slate-300">
                              {photo.aspectRatio}
                            </span>
                          </div>

                          {/* Selected Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                            <span className="text-xs font-semibold text-white">
                              {isSelected ? 'Selected' : 'Click to select'}
                            </span>
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-2.5 flex items-center justify-between text-xs bg-slate-900/90">
                          <span className="font-semibold text-slate-200 truncate pr-2" title={photo.title}>
                            {photo.title}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            by {photo.author}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI CUSTOM VISUALS */}
          {activeTab === 'generate' && (
            <div className="space-y-5">
              {/* Style Presets Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Choose Graphic Style Preset</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STYLE_PRESETS.map((p) => {
                    const Icon = p.icon;
                    const isPicked = selectedPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPreset(p.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isPicked
                            ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isPicked ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-white">
                              {p.name}
                            </span>
                            {isPicked && <Check className="w-4 h-4 text-purple-400" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {p.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prompt Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Visual Prompt Specification
                  </label>
                  {analysis?.aiPrompt && (
                    <button
                      type="button"
                      onClick={() => setCustomPrompt(analysis.aiPrompt)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>✨ Reset to AI Suggestion</span>
                    </button>
                  )}
                </div>

                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe your desired visual or let the AI prompt synthesize it automatically..."
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 resize-none font-mono"
                />

                {/* Quick Suggestion Pills */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-500 text-[11px]">Inspire:</span>
                  {[
                    'Translucent glass cards & glowing indigo nodes',
                    'Clean isometric data pipeline with cyan lasers',
                    'Exponential ARR growth curve with glowing milestones',
                    'Minimalist corporate architecture with volumetric lighting',
                  ].map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomPrompt(sug)}
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition-all"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Action Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400">
                  Synthesizes scalable SVG vector graphics tailored to your current theme palette ({themeName}).
                </div>

                <button
                  type="button"
                  onClick={handleGenerateVisual}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Vector Art...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Custom Visual</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Result Preview */}
              {(generatedResult || (draftAsset && draftAsset.source === 'custom_svg')) && (
                <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Generated Visual Ready</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      16:9 Crisp Vector Graphic
                    </span>
                  </div>

                  <div className="w-full max-w-lg mx-auto aspect-[16/9] rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-xl">
                    <img
                      src={(generatedResult || draftAsset)?.url}
                      alt="Generated Graphic"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="text-center">
                    <span className="text-xs text-slate-300 font-medium">
                      This visual is selected. Click <strong>Apply Visual to Slide</strong> below or tune placement in the next tab.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLACEMENT & STYLING */}
          {activeTab === 'tune' && (
            <div className="space-y-5">
              {!draftAsset ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">No visual asset selected yet.</p>
                  <p className="text-xs text-slate-500">
                    Select a stock photo from the <strong>Stock Photos</strong> tab or generate one in <strong>AI Custom Visuals</strong>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Controls Column */}
                  <div className="space-y-4">
                    {/* Placement Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Slide Layout Placement
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            id: 'hero_background' as VisualPlacement,
                            name: 'Hero Background',
                            desc: 'Atmospheric backdrop with gradient contrast mask',
                          },
                          {
                            id: 'split_media' as VisualPlacement,
                            name: 'Split Media Card',
                            desc: 'Prominent card side-by-side with content',
                          },
                          {
                            id: 'header_accent' as VisualPlacement,
                            name: 'Header Accent',
                            desc: 'Compact visual badge in the slide header',
                          },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPlacement(opt.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              placement === opt.id
                                ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="block text-xs font-bold">{opt.name}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                              {opt.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opacity Slider (Relevant for Background) */}
                    {placement === 'hero_background' && (
                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">
                            Background Opacity (Atmospheric Blend)
                          </span>
                          <span className="font-mono font-bold text-indigo-400">
                            {Math.round(opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.80"
                          step="0.05"
                          value={opacity}
                          onChange={(e) => setOpacity(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">
                          Keeps slide text 100% legible by gently blending the photograph into the background theme ({theme.bg}).
                        </p>
                      </div>
                    )}

                    {/* Blur Slider */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Soft Focus Blur</span>
                        <span className="font-mono font-bold text-indigo-400">{blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="1"
                        value={blur}
                        onChange={(e) => setBlur(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Caption / Attribution */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Image Caption / Attribution (Optional)
                      </label>
                      <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="e.g. Photo by Taylor Vick on Unsplash"
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Scope Checkbox */}
                    {placement === 'hero_background' && (
                      <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:bg-slate-900 transition-all">
                        <input
                          type="checkbox"
                          checked={applyToAll}
                          onChange={(e) => setApplyToAll(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Apply this backdrop aesthetic to <strong>all slides</strong> across the entire deck</span>
                      </label>
                    )}
                  </div>

                  {/* Live Mini Preview Column */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Live Slide Preview</span>
                    </label>

                    <div
                      className="w-full aspect-[16/9] rounded-xl border border-slate-700 overflow-hidden relative shadow-2xl flex flex-col justify-between p-4 text-left"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.textPrimary,
                        fontFamily: theme.fontFamily,
                      }}
                    >
                      {/* Background Visual Rendering */}
                      {placement === 'hero_background' && draftAsset && (
                        <div
                          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
                          style={{
                            opacity: opacity,
                            filter: blur > 0 ? `blur(${blur}px)` : 'none',
                          }}
                        >
                          <img
                            src={draftAsset.url}
                            alt={draftAsset.alt}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(to right, ${theme.bg} 40%, transparent 100%)`,
                            }}
                          />
                        </div>
                      )}

                      {/* Header */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${theme.primary}25`, color: theme.accent }}
                          >
                            {slide.content.badge || 'Executive Pitch'}
                          </span>
                          {placement === 'header_accent' && draftAsset && (
                            <div className="w-5 h-5 rounded overflow-hidden border border-white/20">
                              <img
                                src={draftAsset.url}
                                alt="accent"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                        <h3 className="text-xs sm:text-sm font-black tracking-tight line-clamp-1">
                          {slide.content.headline}
                        </h3>
                        {slide.content.subheadline && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">
                            {slide.content.subheadline}
                          </p>
                        )}
                      </div>

                      {/* Content Area */}
                      <div className="relative z-10 my-auto">
                        {placement === 'split_media' && draftAsset ? (
                          <div className="grid grid-cols-2 gap-2 items-center">
                            <div className="space-y-1">
                              {(slide.content.bulletPoints || []).slice(0, 2).map((bp, i) => (
                                <div key={i} className="text-[9px] text-slate-300 line-clamp-1 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                  <span>{bp}</span>
                                </div>
                              ))}
                            </div>
                            <div className="aspect-[16/9] rounded-lg overflow-hidden border border-white/20 shadow-lg relative bg-black/40">
                              <img
                                src={draftAsset.url}
                                alt={draftAsset.alt}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              {caption && (
                                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-white px-1.5 py-0.5 truncate">
                                  {caption}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {(slide.content.bulletPoints || []).slice(0, 3).map((bp, i) => (
                              <div key={i} className="text-[9px] text-slate-300 line-clamp-1 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                <span>{bp}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="relative z-10 flex items-center justify-between text-[8px] text-slate-500 pt-1 border-t border-white/10">
                        <span>{presentationTitle || 'Pitch Deck'}</span>
                        {caption && placement === 'hero_background' && (
                          <span className="truncate max-w-[160px] opacity-70">{caption}</span>
                        )}
                        <span>Slide {slide.slideNumber || '1'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div>
            {(slide.metadata?.visualAsset || slide.content.visualAsset) && (
              <button
                type="button"
                onClick={handleRemoveVisual}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Visual</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!draftAsset}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{applyToAll ? 'Apply to All Slides' : 'Apply Visual to Slide'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
