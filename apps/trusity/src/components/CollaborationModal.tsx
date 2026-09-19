import React, { useState } from 'react';
import {
  Users,
  X,
  Copy,
  Check,
  Radio,
  Share2,
  Crown,
  Send,
  Sparkles,
  MessageSquare,
  Settings,
  Compass,
  ArrowRight,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { Participant, CollaborationMessage, PresentationPlan } from '../types';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  sessionTitle: string;
  isConnected: boolean;
  isConnecting: boolean;
  isHost: boolean;
  currentUser: { id: string; name: string; color: string; avatar: string };
  participants: Participant[];
  messages: CollaborationMessage[];
  currentSlideIndex: number;
  totalSlides: number;
  currentPlan: PresentationPlan | null;
  followPresenter: boolean;
  onToggleFollow: () => void;
  onJoinSession: (sessionId: string, initialPlan?: PresentationPlan, forceHost?: boolean) => void;
  onLeaveSession: () => void;
  onUpdateProfile: (name: string, color: string) => void;
  onBroadcastSlide: (slideIndex: number, forceFollow?: boolean) => void;
  onBroadcastDeck: (plan: PresentationPlan, activeSlideIndex: number) => void;
  onSendMessage: (text: string, slideIndex?: number) => void;
  onSendReaction: (emoji: string, xPercent: number, yPercent: number) => void;
}

const COLOR_OPTIONS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#F43F5E', // Rose
  '#3B82F6', // Blue
  '#14B8A6', // Teal
];

export const CollaborationModal: React.FC<CollaborationModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  isConnected,
  isConnecting,
  isHost,
  currentUser,
  participants,
  messages,
  currentSlideIndex,
  totalSlides,
  currentPlan,
  followPresenter,
  onToggleFollow,
  onJoinSession,
  onLeaveSession,
  onUpdateProfile,
  onBroadcastSlide,
  onBroadcastDeck,
  onSendMessage,
  onSendReaction,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'settings'>('participants');
  const [newRoomId, setNewRoomId] = useState('');
  const [customName, setCustomName] = useState(currentUser.name);
  const [selectedColor, setSelectedColor] = useState(currentUser.color);
  const [chatInput, setChatInput] = useState('');

  if (!isOpen) return null;

  const currentInviteUrl = sessionId
    ? `${window.location.origin}${window.location.pathname}?session=${sessionId}`
    : '';

  const handleCopyLink = () => {
    if (!currentInviteUrl) return;
    navigator.clipboard.writeText(currentInviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCreateOrJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId.trim()) return;
    onJoinSession(newRoomId.trim(), currentPlan || undefined);
    setNewRoomId('');
  };

  const handleStartNewSession = () => {
    const randomId = `pitch-${Math.random().toString(36).substring(2, 8)}`;
    onJoinSession(randomId, currentPlan || undefined, true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(customName, selectedColor);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim(), currentSlideIndex);
    setChatInput('');
  };

  return (
    <div
      id="collaboration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="collaboration-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Collaborative Workspace
                </h3>
                {isConnected && (
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Real-time deck sync, participant tracking & live cursor overlay
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Active Session Card or Start Session Banner */}
          {isConnected && sessionId ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Active Room
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white font-mono">
                      {sessionId}
                    </span>
                    {isHost && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        <Crown className="w-3 h-3 text-amber-400" /> Host
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLeaveSession}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 rounded-lg transition-colors font-medium"
                  title="Disconnect from shared session"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Leave Room</span>
                </button>
              </div>

              {/* Shareable Link Bar */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5">
                <input
                  type="text"
                  readOnly
                  value={currentInviteUrl}
                  className="flex-1 bg-transparent text-xs text-slate-300 px-2 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Host Quick Actions */}
              {isHost && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
                  <button
                    type="button"
                    onClick={() => onBroadcastSlide(currentSlideIndex, true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors"
                    title="Force all room participants to navigate to current slide"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Broadcast Slide {currentSlideIndex + 1}</span>
                  </button>

                  {currentPlan && (
                    <button
                      type="button"
                      onClick={() => onBroadcastDeck(currentPlan, currentSlideIndex)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 font-semibold border border-indigo-700/50 transition-colors"
                      title="Send your latest presentation changes and layout to all viewers"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Push Deck Updates</span>
                    </button>
                  )}
                </div>
              )}

              {/* Guest Follow Toggle */}
              {!isHost && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${followPresenter ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-slate-300 font-medium">Follow Presenter's Navigation</span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleFollow}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      followPresenter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {followPresenter ? 'Following ON' : 'Independent'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-extrabold text-white">Start or Join a Collaborative Deck</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Invite co-founders, investors, or advisors to view this pitch deck simultaneously with live cursor tracking.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleStartNewSession}
                  disabled={isConnecting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isConnecting ? 'Connecting...' : 'Create Instant Room'}</span>
                </button>

                <form onSubmit={handleCreateOrJoin} className="flex-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    placeholder="Enter room code..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isConnecting || !newRoomId.trim()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs transition-colors"
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'participants'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Participants ({participants.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Room Chat ({messages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>My Profile & Cursor</span>
            </button>
          </div>

          {/* Tab 1: Active Participants */}
          {activeTab === 'participants' && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Currently Connected ({participants.length})
              </div>

              {participants.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
                  No other collaborators yet. Copy and share the room invite link above!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {participants.map((p) => {
                    const isSelf = p.id === currentUser.id;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Colored Avatar */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/20 shrink-0"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.avatar}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">
                                {p.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                                  You
                                </span>
                              )}
                              {p.isHost && (
                                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                                  <Crown className="w-2.5 h-2.5 text-amber-400" /> Host
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Viewing Slide {p.activeSlideIndex + 1} of {totalSlides}
                            </span>
                          </div>
                        </div>

                        {/* Slide Navigation Trigger */}
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => onBroadcastSlide(p.activeSlideIndex)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                              title={`Jump to Slide ${p.activeSlideIndex + 1}`}
                            >
                              View Slide {p.activeSlideIndex + 1}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Reactions Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">
                  Send Live Reaction to Room
                </span>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {['👏', '🔥', '🚀', '💡', '❤️', '🎯', '🙌'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onSendReaction(emoji, 50, 50)}
                      className="text-xl hover:scale-130 transition-transform p-1 rounded-lg hover:bg-slate-800"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: In-Session Chat */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-72">
              <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800 mb-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No messages yet. Say hello to everyone in the deck!
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="text-xs p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold" style={{ color: m.senderColor }}>
                          {m.senderName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          {m.slideIndex !== undefined && (
                            <span className="bg-slate-800 px-1 rounded text-slate-400">
                              Slide {m.slideIndex + 1}
                            </span>
                          )}
                          <span>{m.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-slate-200">{m.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendChat} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message or feedback..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Custom Profile & Cursor Settings */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Enter your name..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Cursor & Avatar Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform border-2 ${
                        selectedColor === c
                          ? 'scale-125 border-white shadow-md'
                          : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Cursor Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Preview:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {customName.substring(0, 2).toUpperCase() || 'ME'}
                  </div>
                  <div
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {customName || 'Anonymous'}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-md"
              >
                Save Profile
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            {isConnected ? (
              <span className="text-emerald-400 font-semibold">● Connected to Room {sessionId}</span>
            ) : (
              <span>Offline</span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
