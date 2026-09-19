import React from 'react';
import {
  Presentation,
  Sparkles,
  Play,
  Download,
  Palette,
  RefreshCw,
  FileText,
  History,
  Users,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { ThemeName, Participant } from '../types';
import { THEMES } from '../data/themes';

interface HeaderProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onStartPresenting: () => void;
  onExportPPTX: () => void;
  onExportPDF: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportMarkdown?: () => void;
  onExportMP4?: () => void;
  onOpenVersionHistory?: () => void;
  onNewDeck: () => void;
  onOpenPolishModal?: () => void;
  onOpenImageStudio?: () => void;
  isPolishing?: boolean;
  hasSlides: boolean;
  isExporting: boolean;
  isCollaborating?: boolean;
  participants?: Participant[];
  onOpenCollaboration?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  onThemeChange,
  onStartPresenting,
  onExportPPTX,
  onExportPDF,
  onExportPNG,
  onExportJSON,
  onExportMarkdown,
  onExportMP4,
  onOpenVersionHistory,
  onNewDeck,
  onOpenPolishModal,
  onOpenImageStudio,
  isPolishing = false,
  hasSlides,
  isExporting,
  isCollaborating = false,
  participants = [],
  onOpenCollaboration,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d1117]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Trusity
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                AI Pitch Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Turn raw business ideas into investor-ready pitch decks
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {hasSlides && (
            <>
              {/* Quick Theme Switcher */}
              <div className="hidden md:flex items-center bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 gap-1">
                <Palette className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
                {(Object.keys(THEMES) as ThemeName[]).map((tKey) => {
                  const t = THEMES[tKey];
                  const isActive = currentTheme === tKey;
                  return (
                    <button
                      key={tKey}
                      onClick={() => onThemeChange(tKey)}
                      title={`${t.name} Theme — ${t.vibe}`}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: t.primary }}
                      />
                      <span className="hidden lg:inline">{t.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Professional Polish Action Button */}
              {onOpenPolishModal && (
                <button
                  onClick={onOpenPolishModal}
                  disabled={isPolishing}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-purple-200 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 hover:border-purple-400/80 rounded-xl transition-all shadow-sm shadow-purple-900/30 group"
                  title="Iterate through all slides with AI to standardize tone, fix grammar, and elevate phrasing"
                >
                  <Sparkles className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">Professional Polish</span>
                  <span className="sm:hidden">Polish</span>
                </button>
              )}

              {/* Present / Slideshow Button */}
              <button
                onClick={onStartPresenting}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
                title="Fullscreen presentation mode"
              >
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span className="hidden sm:inline">Present</span>
              </button>

              {/* Export Dropdown Group */}
              <div className="flex items-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/25 transition-all text-xs sm:text-sm font-semibold">
                <button
                  onClick={onExportPPTX}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-indigo-700/50 rounded-l-xl transition-all"
                  title="Download Microsoft PowerPoint (.pptx) file with speaker notes"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Exporting...' : 'Export PPTX'}</span>
                </button>
                <div className="w-[1px] h-5 bg-indigo-400/40" />
                <div className="relative group">
                  <button
                    className="px-2 py-2 hover:bg-indigo-700/50 rounded-r-xl transition-all"
                    title="More export formats"
                  >
                    ▾
                  </button>
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
                    <button
                      onClick={onExportPPTX}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <Presentation className="w-3.5 h-3.5 text-orange-400" />
                      PowerPoint (.pptx)
                    </button>
                    <button
                      onClick={onExportPDF}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-400" />
                      Print / PDF (.pdf)
                    </button>
                    <button
                      onClick={onExportPNG}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      Slide Images (.zip)
                    </button>
                    <button
                      onClick={onExportJSON}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Presentation Plan (.json)
                    </button>
                    {onExportMP4 && (
                      <button
                        onClick={onExportMP4}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center justify-between group/mp4"
                      >
                        <div className="flex items-center gap-2">
                          <Film className="w-3.5 h-3.5 text-pink-400 group-hover/mp4:text-pink-300" />
                          <span>Video (.mp4)</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          REC
                        </span>
                      </button>
                    )}
                    {onExportMarkdown && (
                      <button
                        onClick={onExportMarkdown}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        Markdown Outline (.md)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Version History Checkpoints Button */}
              {onOpenVersionHistory && (
                <button
                  onClick={onOpenVersionHistory}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-cyan-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm"
                  title="View deck version history and restore snapshots"
                >
                  <History className="w-4 h-4 text-cyan-400" />
                  <span className="hidden lg:inline">Versions</span>
                </button>
              )}

              {/* AI Visual & Stock Photo Studio Trigger */}
              {onOpenImageStudio && (
                <button
                  onClick={onOpenImageStudio}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-purple-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm"
                  title="AI-powered image search and generation studio"
                >
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span className="hidden lg:inline">Visuals</span>
                </button>
              )}

              {/* Real-time Collaborative Workspace Hub Trigger */}
              {onOpenCollaboration && (
                <button
                  onClick={onOpenCollaboration}
                  className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm ${
                    isCollaborating
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/90 shadow-emerald-900/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80'
                  }`}
                  title="Real-time multi-user collaborative workspace & live cursor tracking"
                >
                  {isCollaborating ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="hidden sm:inline">Live ({participants.length})</span>
                      <div className="flex -space-x-1.5 ml-0.5">
                        {participants.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-slate-900 shrink-0"
                            style={{ backgroundColor: p.color }}
                            title={p.name}
                          >
                            {p.avatar}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span className="hidden sm:inline">Collaborate</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* New Deck Button */}
          <button
            onClick={onNewDeck}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
            title="Create a new presentation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Idea</span>
          </button>
        </div>
      </div>
    </header>
  );
};
