import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  EyeOff,
  Radio,
  Share2,
  Sparkles,
  Smile,
  Compass,
  Zap,
} from 'lucide-react';
import { Participant, LiveReaction } from '../types';

interface RemoteCursorData {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  slideIndex: number;
  name: string;
  color: string;
  lastActive: number;
}

interface CollaborativeWorkspaceOverlayProps {
  currentSlideIndex: number;
  totalSlides: number;
  isConnected: boolean;
  sessionId: string | null;
  participants: Participant[];
  currentUserId: string;
  remoteCursors: Record<string, RemoteCursorData>;
  reactions: LiveReaction[];
  showRemoteCursors: boolean;
  followPresenter: boolean;
  isHost: boolean;
  onToggleCursors: () => void;
  onToggleFollow: () => void;
  onSendReaction: (emoji: string, xPercent: number, yPercent: number) => void;
  onOpenSessionModal: () => void;
}

export const CollaborativeWorkspaceOverlay: React.FC<CollaborativeWorkspaceOverlayProps> = ({
  currentSlideIndex,
  totalSlides,
  isConnected,
  sessionId,
  participants,
  currentUserId,
  remoteCursors,
  reactions,
  showRemoteCursors,
  followPresenter,
  isHost,
  onToggleCursors,
  onToggleFollow,
  onSendReaction,
  onOpenSessionModal,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Filter remote cursors for currently displayed slide and active within 5 seconds
  const activeCursors = (Object.entries(remoteCursors) as [string, RemoteCursorData][]).filter(([userId, cursor]) => {
    if (userId === currentUserId) return false;
    if (cursor.slideIndex !== currentSlideIndex) return false;
    return Date.now() - cursor.lastActive < 5000;
  });

  // Filter floating reactions on current slide
  const activeReactions = reactions.filter((r) => {
    return Date.now() - r.timestamp < 3000;
  });

  const otherParticipants = participants.filter((p) => p.id !== currentUserId);

  if (!isConnected) {
    return null;
  }

  return (
    <>
      {/* 1. Remote Cursors Layer (Pure overlay inside slide canvas) */}
      {showRemoteCursors && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {activeCursors.map(([userId, cursor]) => {
            return (
              <div
                key={`cursor-${userId}`}
                className="absolute transition-all duration-75 ease-out pointer-events-none"
                style={{
                  left: `${cursor.x}%`,
                  top: `${cursor.y}%`,
                  transform: 'translate(-2px, -2px)',
                }}
              >
                {/* SVG Pointer Arrow with user's vibrant color */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="drop-shadow-md filter"
                >
                  <path
                    d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                    fill={cursor.color || '#6366F1'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* User Name Tag Badge */}
                <div
                  className="absolute left-4 top-3 px-2 py-0.5 rounded-md text-[10px] font-bold text-white whitespace-nowrap shadow-lg flex items-center gap-1 border border-white/20 select-none animate-in fade-in duration-200"
                  style={{ backgroundColor: cursor.color || '#6366F1' }}
                >
                  <span>{cursor.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Floating Emoji Celebrations / Live Reactions */}
      <div className="absolute inset-0 pointer-events-none z-35 overflow-hidden">
        {activeReactions.map((r) => {
          const age = Date.now() - r.timestamp;
          const progress = age / 3000; // 0 to 1
          const translateY = progress * -120; // Float upwards
          const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
          const scale = 1 + progress * 0.4;

          return (
            <div
              key={r.id}
              className="absolute pointer-events-none select-none flex flex-col items-center"
              style={{
                left: `${r.x}%`,
                top: `${r.y}%`,
                transform: `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`,
                opacity,
                transition: 'transform 0.1s linear, opacity 0.15s ease-out',
              }}
            >
              <span className="text-3xl sm:text-4xl filter drop-shadow-lg">{r.emoji}</span>
              <span
                className="text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full mt-1 border border-white/20 shadow-md"
                style={{ backgroundColor: r.color }}
              >
                {r.userName}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. Floating In-Canvas Collaborative Control Dock */}
      <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl text-xs select-none">
        {/* Session Status & Participant Avatars */}
        <button
          type="button"
          onClick={onOpenSessionModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-850 transition-colors text-slate-200 group"
          title={`Collaborative Room: ${sessionId}. Click to view participants & share link.`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          <span className="font-semibold text-xs text-slate-200">
            {participants.length} {participants.length === 1 ? 'user' : 'users'}
          </span>

          {/* Stacked mini avatars */}
          <div className="flex -space-x-1.5 ml-1">
            {participants.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-slate-900 shadow-sm shrink-0"
                style={{ backgroundColor: p.color }}
                title={`${p.name}${p.isHost ? ' (Host)' : ''} - on slide ${p.activeSlideIndex + 1}`}
              >
                {p.avatar}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[8px] font-bold flex items-center justify-center border border-slate-900 shrink-0">
                +{participants.length - 3}
              </div>
            )}
          </div>
        </button>

        <div className="w-[1px] h-4 bg-slate-800" />

        {/* Quick Reaction Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
            title="Send real-time reaction"
          >
            <Smile className="w-4 h-4" />
          </button>

          {showReactionPicker && (
            <div className="absolute bottom-full right-0 mb-2 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {['👏', '🔥', '🚀', '💡', '❤️', '🎯'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSendReaction(emoji, 50 + (Math.random() * 20 - 10), 50 + (Math.random() * 20 - 10));
                    setShowReactionPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 hover:bg-slate-800 rounded-lg transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Remote Cursors */}
        <button
          type="button"
          onClick={onToggleCursors}
          className={`p-1.5 rounded-lg transition-colors ${
            showRemoteCursors
              ? 'text-indigo-400 bg-indigo-950/60 border border-indigo-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={showRemoteCursors ? 'Hide collaborator cursors' : 'Show collaborator cursors'}
        >
          {showRemoteCursors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Follow Presenter Toggle (for non-hosts or hosts wanting sync) */}
        {!isHost && (
          <button
            type="button"
            onClick={onToggleFollow}
            className={`p-1.5 rounded-lg transition-colors ${
              followPresenter
                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={followPresenter ? 'Following Presenter slide navigation (ON)' : 'Independent browsing (Follow OFF)'}
          >
            <Radio className="w-4 h-4" />
          </button>
        )}

        {/* Open Hub Button */}
        <button
          type="button"
          onClick={onOpenSessionModal}
          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-sm ml-0.5"
          title="Open Collaboration Workspace Panel"
        >
          <Share2 className="w-3 h-3" />
          <span className="hidden sm:inline">Hub</span>
        </button>
      </div>
    </>
  );
};
