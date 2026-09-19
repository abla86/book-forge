import React, { useState, useRef, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  MessageSquare,
  Undo2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Minimize2,
  MousePointer,
} from 'lucide-react';
import {
  DrawingStroke,
  DrawingPoint,
  StickyNote,
  StickyNoteColor,
  SlideAnnotations,
} from '../types';

export type ActiveAnnotationTool = 'select' | 'pen' | 'highlighter' | 'sticky' | 'eraser';

export const STICKY_COLORS: Record<
  StickyNoteColor,
  { bg: string; border: string; header: string; text: string; pinBg: string }
> = {
  yellow: {
    bg: 'bg-amber-100 dark:bg-amber-950/95',
    border: 'border-amber-400 dark:border-amber-600',
    header: 'bg-amber-200/90 dark:bg-amber-900/70 text-amber-950 dark:text-amber-200',
    text: 'text-amber-950 dark:text-amber-100 placeholder-amber-700/60 dark:placeholder-amber-400/40',
    pinBg: 'bg-amber-400 text-amber-950 shadow-amber-500/40',
  },
  pink: {
    bg: 'bg-rose-100 dark:bg-rose-950/95',
    border: 'border-rose-400 dark:border-rose-600',
    header: 'bg-rose-200/90 dark:bg-rose-900/70 text-rose-950 dark:text-rose-200',
    text: 'text-rose-950 dark:text-rose-100 placeholder-rose-700/60 dark:placeholder-rose-400/40',
    pinBg: 'bg-rose-400 text-rose-950 shadow-rose-500/40',
  },
  blue: {
    bg: 'bg-sky-100 dark:bg-sky-950/95',
    border: 'border-sky-400 dark:border-sky-600',
    header: 'bg-sky-200/90 dark:bg-sky-900/70 text-sky-950 dark:text-sky-200',
    text: 'text-sky-950 dark:text-sky-100 placeholder-sky-700/60 dark:placeholder-sky-400/40',
    pinBg: 'bg-sky-400 text-sky-950 shadow-sky-500/40',
  },
  green: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/95',
    border: 'border-emerald-400 dark:border-emerald-600',
    header: 'bg-emerald-200/90 dark:bg-emerald-900/70 text-emerald-950 dark:text-emerald-200',
    text: 'text-emerald-950 dark:text-emerald-100 placeholder-emerald-700/60 dark:placeholder-emerald-400/40',
    pinBg: 'bg-emerald-400 text-emerald-950 shadow-emerald-500/40',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950/95',
    border: 'border-purple-400 dark:border-purple-600',
    header: 'bg-purple-200/90 dark:bg-purple-900/70 text-purple-950 dark:text-purple-200',
    text: 'text-purple-950 dark:text-purple-100 placeholder-purple-700/60 dark:placeholder-purple-400/40',
    pinBg: 'bg-purple-400 text-purple-950 shadow-purple-500/40',
  },
};

export const PEN_COLORS = [
  { id: '#EF4444', label: 'Coral Red' },
  { id: '#F59E0B', label: 'Amber Gold' },
  { id: '#10B981', label: 'Emerald' },
  { id: '#06B6D4', label: 'Cyan' },
  { id: '#8B5CF6', label: 'Violet' },
  { id: '#FFFFFF', label: 'White' },
];

interface AnnotationToolbarProps {
  activeTool: ActiveAnnotationTool;
  setActiveTool: (tool: ActiveAnnotationTool) => void;
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  penColor: string;
  setPenColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  stickyColor: StickyNoteColor;
  setStickyColor: (color: StickyNoteColor) => void;
  onUndoStroke: () => void;
  onClearAll: () => void;
  drawingsCount: number;
  stickyNotesCount: number;
  unresolvedNotesCount: number;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  setActiveTool,
  isVisible,
  setIsVisible,
  penColor,
  setPenColor,
  strokeWidth,
  setStrokeWidth,
  stickyColor,
  setStickyColor,
  onUndoStroke,
  onClearAll,
  drawingsCount,
  stickyNotesCount,
  unresolvedNotesCount,
}) => {
  const totalAnnotations = drawingsCount + stickyNotesCount;

  return (
    <div className="w-full max-w-4xl mb-2.5 flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-900/95 border border-slate-800 rounded-xl text-xs shadow-xl backdrop-blur-md">
      {/* Primary Interaction Modes */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all font-semibold ${
            activeTool === 'select'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Select and interact with slide elements"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Interact</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all font-semibold ${
            activeTool === 'pen'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Draw freehand ink sketch"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Pen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('highlighter')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all font-semibold ${
            activeTool === 'highlighter'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Translucent highlighter"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Highlight</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('sticky')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all font-semibold ${
            activeTool === 'sticky'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Click anywhere on slide preview to place a sticky note"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Sticky Note</span>
        </button>
      </div>

      {/* Dynamic Tool Palettes */}
      {(activeTool === 'pen' || activeTool === 'highlighter') && (
        <div className="flex items-center gap-2 border-l border-slate-800 pl-2">
          <div className="flex items-center gap-1">
            {PEN_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setPenColor(c.id)}
                className={`w-5 h-5 rounded-full border transition-all ${
                  penColor === c.id
                    ? 'ring-2 ring-indigo-400 scale-110 border-white'
                    : 'border-slate-700 hover:scale-105'
                }`}
                style={{ backgroundColor: c.id }}
                title={c.label}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            {[2, 4, 7].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setStrokeWidth(w)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  strokeWidth === w
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {w === 2 ? 'Fine' : w === 4 ? 'Med' : 'Bold'}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === 'sticky' && (
        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
          <span className="text-[11px] text-slate-400">Color:</span>
          {(['yellow', 'pink', 'blue', 'green', 'purple'] as StickyNoteColor[]).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setStickyColor(col)}
              className={`w-4 h-4 rounded-full border transition-all ${
                stickyColor === col
                  ? 'ring-2 ring-purple-400 scale-110'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{
                backgroundColor:
                  col === 'yellow'
                    ? '#FBBF24'
                    : col === 'pink'
                    ? '#F43F5E'
                    : col === 'blue'
                    ? '#38BDF8'
                    : col === 'green'
                    ? '#34D399'
                    : '#C084FC',
              }}
              title={`New notes in ${col}`}
            />
          ))}
        </div>
      )}

      {/* Action Controls & Layer Toggles */}
      <div className="flex items-center gap-1.5 ml-auto">
        {drawingsCount > 0 && (
          <button
            type="button"
            onClick={onUndoStroke}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Undo last pen stroke"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        )}

        {totalAnnotations > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Clear all annotations on this slide"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            isVisible
              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
          }`}
          title={isVisible ? 'Hide overlay layer' : 'Show overlay layer'}
        >
          {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isVisible ? 'Hide Layer' : 'Show Layer'}</span>
        </button>

        {totalAnnotations > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-semibold">
            {stickyNotesCount > 0 && `${unresolvedNotesCount} note${unresolvedNotesCount === 1 ? '' : 's'}`}
            {stickyNotesCount > 0 && drawingsCount > 0 && ' • '}
            {drawingsCount > 0 && `${drawingsCount} ink`}
          </span>
        )}
      </div>
    </div>
  );
};

interface AnnotationCanvasLayerProps {
  annotations?: SlideAnnotations;
  onChangeAnnotations?: (annotations: SlideAnnotations) => void;
  activeTool: ActiveAnnotationTool;
  setActiveTool?: (tool: ActiveAnnotationTool) => void;
  isVisible: boolean;
  penColor: string;
  strokeWidth: number;
  stickyColor: StickyNoteColor;
  isReadOnly?: boolean;
}

export const AnnotationCanvasLayer: React.FC<AnnotationCanvasLayerProps> = ({
  annotations = { drawings: [], stickyNotes: [] },
  onChangeAnnotations,
  activeTool,
  setActiveTool,
  isVisible,
  penColor,
  strokeWidth,
  stickyColor,
  isReadOnly = false,
}) => {
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef<boolean>(false);

  const drawings = annotations.drawings || [];
  const stickyNotes = annotations.stickyNotes || [];

  const getRelativeCoords = useCallback((clientX: number, clientY: number): DrawingPoint | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isReadOnly || !isVisible || !onChangeAnnotations) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const coords = getRelativeCoords(e.clientX, e.clientY);
      if (!coords) return;

      isDrawingRef.current = true;
      const newStroke: DrawingStroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        points: [coords],
        color: penColor,
        width: activeTool === 'highlighter' ? strokeWidth * 2.8 : strokeWidth,
        isHighlighter: activeTool === 'highlighter',
        createdAt: Date.now(),
      };
      setCurrentStroke(newStroke);
    } else if (activeTool === 'sticky') {
      const coords = getRelativeCoords(e.clientX, e.clientY);
      if (!coords) return;

      const newNote: StickyNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: Math.min(coords.x, 75),
        y: Math.min(coords.y, 70),
        text: '',
        color: stickyColor,
        author: 'Reviewer',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        resolved: false,
        isMinimized: false,
      };

      onChangeAnnotations({
        ...annotations,
        stickyNotes: [...stickyNotes, newNote],
      });

      if (setActiveTool) {
        setActiveTool('select');
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isReadOnly || !isVisible || !onChangeAnnotations) return;

    if (isDrawingRef.current && currentStroke) {
      const coords = getRelativeCoords(e.clientX, e.clientY);
      if (!coords) return;

      if (currentStroke.points.length < 500) {
        setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, coords] } : null));
      }
      return;
    }

    if (draggingNoteId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentXPercent = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const currentYPercent = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      const clampedX = Math.min(80, Math.max(1, currentXPercent));
      const clampedY = Math.min(80, Math.max(1, currentYPercent));

      onChangeAnnotations({
        ...annotations,
        stickyNotes: stickyNotes.map((note) =>
          note.id === draggingNoteId
            ? { ...note, x: Number(clampedX.toFixed(2)), y: Number(clampedY.toFixed(2)) }
            : note
        ),
      });
    }
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current && currentStroke && onChangeAnnotations) {
      isDrawingRef.current = false;
      if (currentStroke.points.length > 1) {
        const updatedDrawings = [...drawings, currentStroke].slice(-100);
        onChangeAnnotations({
          ...annotations,
          drawings: updatedDrawings,
        });
      }
      setCurrentStroke(null);
    }

    if (draggingNoteId) {
      setDraggingNoteId(null);
    }
  };

  const handleUpdateNoteText = (id: string, text: string) => {
    if (!onChangeAnnotations) return;
    const sanitized = text.slice(0, 500);
    onChangeAnnotations({
      ...annotations,
      stickyNotes: stickyNotes.map((n) => (n.id === id ? { ...n, text: sanitized } : n)),
    });
  };

  const handleToggleResolveNote = (id: string) => {
    if (!onChangeAnnotations) return;
    onChangeAnnotations({
      ...annotations,
      stickyNotes: stickyNotes.map((n) => (n.id === id ? { ...n, resolved: !n.resolved } : n)),
    });
  };

  const handleToggleMinimizeNote = (id: string) => {
    if (!onChangeAnnotations) return;
    onChangeAnnotations({
      ...annotations,
      stickyNotes: stickyNotes.map((n) => (n.id === id ? { ...n, isMinimized: !n.isMinimized } : n)),
    });
  };

  const handleDeleteNote = (id: string) => {
    if (!onChangeAnnotations) return;
    onChangeAnnotations({
      ...annotations,
      stickyNotes: stickyNotes.filter((n) => n.id !== id),
    });
  };

  const handleChangeNoteColor = (id: string, color: StickyNoteColor) => {
    if (!onChangeAnnotations) return;
    onChangeAnnotations({
      ...annotations,
      stickyNotes: stickyNotes.map((n) => (n.id === id ? { ...n, color } : n)),
    });
  };

  const handleNoteDragStart = (e: React.PointerEvent, note: StickyNote) => {
    e.stopPropagation();
    if (isReadOnly || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const notePixelX = (note.x / 100) * rect.width;
    const notePixelY = (note.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - (rect.left + notePixelX),
      y: e.clientY - (rect.top + notePixelY),
    });
    setDraggingNoteId(note.id);
  };

  const renderPathData = (points: DrawingPoint[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute inset-0 z-20 select-none ${
        activeTool === 'select' || isReadOnly
          ? 'pointer-events-none'
          : 'cursor-crosshair pointer-events-auto'
      }`}
    >
      {/* SVG Drawing Layer */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full absolute inset-0 pointer-events-none"
      >
        {drawings.map((stroke) => (
          <path
            key={stroke.id}
            d={renderPathData(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width * 0.28}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={stroke.isHighlighter ? 0.45 : 0.95}
            style={{
              mixBlendMode: stroke.isHighlighter ? 'multiply' : 'normal',
            }}
          />
        ))}

        {currentStroke && (
          <path
            d={renderPathData(currentStroke.points)}
            fill="none"
            stroke={currentStroke.color}
            strokeWidth={currentStroke.width * 0.28}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={currentStroke.isHighlighter ? 0.45 : 0.95}
          />
        )}
      </svg>

      {/* Interactive Sticky Notes Layer */}
      {stickyNotes.map((note, index) => {
        const colors = STICKY_COLORS[note.color] || STICKY_COLORS.yellow;

        if (note.isMinimized) {
          return (
            <div
              key={note.id}
              style={{
                left: `${note.x}%`,
                top: `${note.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute pointer-events-auto cursor-pointer p-1.5 rounded-full shadow-lg border border-white/50 flex items-center justify-center transition-transform hover:scale-125 z-30 ${colors.pinBg}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMinimizeNote(note.id);
              }}
              title={`Sticky note #${index + 1}: "${note.text || 'Empty'}" (Click to expand)`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {note.resolved && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
              )}
            </div>
          );
        }

        return (
          <div
            key={note.id}
            style={{
              left: `${note.x}%`,
              top: `${note.y}%`,
              transform: 'translate(0, 0)',
            }}
            className={`absolute pointer-events-auto w-48 sm:w-56 rounded-xl shadow-2xl border ${colors.bg} ${colors.border} z-30 overflow-hidden flex flex-col transition-opacity ${
              note.resolved ? 'opacity-70' : 'opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Note Drag Bar */}
            <div
              onPointerDown={(e) => handleNoteDragStart(e, note)}
              className={`px-2.5 py-1.5 ${colors.header} cursor-grab active:cursor-grabbing flex items-center justify-between select-none border-b border-black/10`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                <span>{note.author || 'Reviewer'}</span>
                <span className="text-[10px] opacity-60 font-normal">{note.createdAt}</span>
              </div>

              <div className="flex items-center gap-1">
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleToggleResolveNote(note.id)}
                    className={`p-0.5 rounded hover:bg-black/10 transition-colors ${
                      note.resolved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={note.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleMinimizeNote(note.id)}
                  className="p-0.5 rounded hover:bg-black/10 opacity-60 hover:opacity-100 transition-colors"
                  title="Minimize note"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-0.5 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400 opacity-60 hover:opacity-100 transition-colors"
                    title="Delete sticky note"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Note Editable Text */}
            <div className="p-2">
              <textarea
                value={note.text}
                onChange={(e) => handleUpdateNoteText(note.id, e.target.value)}
                readOnly={isReadOnly}
                rows={3}
                placeholder="Pitch review comment..."
                className={`w-full bg-transparent resize-none text-xs font-medium focus:outline-none leading-relaxed ${colors.text} ${
                  note.resolved ? 'line-through opacity-80' : ''
                }`}
              />

              {!isReadOnly && (
                <div className="pt-1.5 mt-1 border-t border-black/10 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1">
                    {(['yellow', 'pink', 'blue', 'green', 'purple'] as StickyNoteColor[]).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handleChangeNoteColor(note.id, col)}
                        className={`w-3 h-3 rounded-full border ${
                          note.color === col ? 'ring-1 ring-black scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            col === 'yellow'
                              ? '#FBBF24'
                              : col === 'pink'
                              ? '#F43F5E'
                              : col === 'blue'
                              ? '#38BDF8'
                              : col === 'green'
                              ? '#34D399'
                              : '#C084FC',
                        }}
                        title={col}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] opacity-50 font-mono">
                    {note.text.length}/500
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
