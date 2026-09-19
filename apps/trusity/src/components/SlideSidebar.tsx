import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Copy,
  PenTool,
  StickyNote,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import { Slide, SlideType, ThemeName } from '../types';
import { THEMES } from '../data/themes';

interface SlideSidebarProps {
  slides: Slide[];
  activeIndex: number;
  themeName: ThemeName;
  onSelectSlide: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onAddSlide: () => void;
  onDuplicateSlide?: (index: number) => void;
}

export const SlideSidebar: React.FC<SlideSidebarProps> = ({
  slides,
  activeIndex,
  themeName,
  onSelectSlide,
  onMoveUp,
  onMoveDown,
  onDeleteSlide,
  onAddSlide,
  onDuplicateSlide,
}) => {
  const theme = THEMES[themeName] || THEMES.startup;
  const [filterText, setFilterText] = useState('');

  const filteredSlidesWithIndices = slides
    .map((s, idx) => ({ slide: s, originalIndex: idx }))
    .filter(({ slide }) => {
      if (!filterText.trim()) return true;
      const term = filterText.toLowerCase();
      return (
        slide.content.headline?.toLowerCase().includes(term) ||
        slide.slideType.toLowerCase().includes(term) ||
        slide.layout.toLowerCase().includes(term) ||
        slide.content.bulletPoints?.some((bp) => bp.toLowerCase().includes(term))
      );
    });

  return (
    <div className="w-full lg:w-72 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-3 shadow-xl max-h-[750px] overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Slide Deck
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 font-semibold text-slate-400">
            {slides.length}
          </span>
        </div>
        <button
          onClick={onAddSlide}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-transparent rounded-lg transition-all"
          title="Add a new blank slide"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Slide</span>
        </button>
      </div>

      {/* Quick Search / Filter Input */}
      {slides.length > 5 && (
        <div className="mb-2 px-1 relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter slides..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Slide Thumbnails List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredSlidesWithIndices.map(({ slide: s, originalIndex: index }) => {
          const isActive = index === activeIndex;
          const hasDrawings = (s.metadata?.annotations?.drawings || []).length > 0;
          const stickyNotes = s.metadata?.annotations?.stickyNotes || [];
          const hasStickyNotes = stickyNotes.length > 0;
          const unresolvedNotes = stickyNotes.filter((n) => !n.resolved).length;

          return (
            <div
              key={s.id}
              onClick={() => onSelectSlide(index)}
              className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                isActive
                  ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black w-4 h-4 rounded bg-slate-800 text-slate-400 flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span
                    className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded"
                    style={{
                      backgroundColor: `${theme.primary}25`,
                      color: theme.accent,
                    }}
                  >
                    {s.slideType.replace('_', ' ')}
                  </span>

                  {/* Indicators for annotations & visuals */}
                  {hasDrawings && (
                    <PenTool className="w-3 h-3 text-red-400" title="Has drawing annotations" />
                  )}
                  {hasStickyNotes && (
                    <span
                      className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400"
                      title={`${stickyNotes.length} notes (${unresolvedNotes} open)`}
                    >
                      <StickyNote className="w-3 h-3" />
                      {unresolvedNotes > 0 && `(${unresolvedNotes})`}
                    </span>
                  )}
                  {(s.metadata?.visualAsset || s.content.visualAsset) && (
                    <ImageIcon
                      className="w-3 h-3 text-purple-400"
                      title="Has visual asset / stock photography"
                    />
                  )}
                </div>

                {/* Move, Duplicate & Delete controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onDuplicateSlide && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSlide(index);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-indigo-300"
                      title="Duplicate slide"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveUp(index);
                    }}
                    disabled={index === 0}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveDown(index);
                    }}
                    disabled={index === slides.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlide(index);
                      }}
                      className="p-1 rounded text-rose-400 hover:text-rose-300"
                      title="Delete slide"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slide Headline Preview */}
              <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                {s.content.headline || 'Untitled Slide'}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-slate-500 font-mono">
                  {s.layout}
                </span>
                {s.metadata?.harmonyScore && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      s.metadata.harmonyScore >= 90
                        ? 'bg-emerald-400'
                        : s.metadata.harmonyScore >= 75
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    title={`Harmony score: ${s.metadata.harmonyScore}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
