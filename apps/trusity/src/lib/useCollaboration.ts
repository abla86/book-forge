import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Participant,
  PresentationPlan,
  CollaborationSessionState,
  CollaborationMessage,
  LiveReaction,
  RemoteCursor,
  CollaborationWsClientMessage,
  CollaborationWsServerMessage,
} from '../types';

const VIBRANT_COLORS = [
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

function getRandomColor(): string {
  return VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];
}

function getStoredUser() {
  const storedId = localStorage.getItem('trusity_user_id') || `user-${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem('trusity_user_id', storedId);

  const storedName = localStorage.getItem('trusity_user_name') || `User ${storedId.substring(5, 9)}`;
  const storedColor = localStorage.getItem('trusity_user_color') || getRandomColor();
  const initials = storedName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return {
    id: storedId,
    name: storedName,
    color: storedColor,
    avatar: initials || 'US',
  };
}

export interface UseCollaborationOptions {
  currentPlan: PresentationPlan | null;
  activeSlideIndex: number;
  onRemoteDeckUpdate?: (plan: PresentationPlan, activeSlideIndex: number) => void;
  onRemoteSlideChange?: (slideIndex: number, senderName: string, isBroadcast: boolean) => void;
  onNotification?: (msg: string) => void;
}

export function useCollaboration({
  currentPlan,
  activeSlideIndex,
  onRemoteDeckUpdate,
  onRemoteSlideChange,
  onNotification,
}: UseCollaborationOptions) {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { x: number; y: number; slideIndex: number; name: string; color: string; lastActive: number }>
  >({});
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [followPresenter, setFollowPresenter] = useState<boolean>(true);
  const [showRemoteCursors, setShowRemoteCursors] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorSendRef = useRef<number>(0);
  const lastSlideIndexRef = useRef<number>(activeSlideIndex);
  const activePlanRef = useRef<PresentationPlan | null>(currentPlan);

  // Keep references current
  useEffect(() => {
    lastSlideIndexRef.current = activeSlideIndex;
  }, [activeSlideIndex]);

  useEffect(() => {
    activePlanRef.current = currentPlan;
  }, [currentPlan]);

  // Clean up stale cursors every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, cursor] of Object.entries(next) as [string, RemoteCursor][]) {
          if (now - cursor.lastActive > 5000) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Clean up old reactions after 3.5s
  useEffect(() => {
    if (reactions.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setReactions((prev) => prev.filter((r) => now - r.timestamp < 3500));
    }, 3600);
    return () => clearTimeout(timer);
  }, [reactions]);

  const sendWsMessage = useCallback((msg: CollaborationWsClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch (err) {
        console.error('[Collaboration] Error sending WS message:', err);
      }
    }
  }, []);

  // Connect to WebSocket Server
  const connect = useCallback(
    (targetSessionId: string, initialPlan?: PresentationPlan, forceHost?: boolean) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsConnecting(true);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/collaboration`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setIsConnecting(false);
          setSessionId(targetSessionId);

          const joinMsg: CollaborationWsClientMessage = {
            type: 'join',
            sessionId: targetSessionId,
            user: {
              id: currentUser.id,
              name: currentUser.name,
              color: currentUser.color,
              avatar: currentUser.avatar,
              isHost: forceHost,
            },
            initialPlan: initialPlan || activePlanRef.current || undefined,
            activeSlideIndex: lastSlideIndexRef.current,
          };
          ws.send(JSON.stringify(joinMsg));
        };

        ws.onmessage = (event) => {
          try {
            const data: CollaborationWsServerMessage = JSON.parse(event.data);

            switch (data.type) {
              case 'session_state': {
                setSessionTitle(data.session.title || `Room ${data.session.sessionId}`);
                setParticipants(data.session.participants || []);
                setMessages(data.session.messages || []);
                const me = data.session.participants.find((p) => p.id === data.yourId);
                if (me) {
                  setIsHost(me.isHost);
                }

                // If room has an authoritative deck and we don't have one, or if joiner needs sync
                if (data.session.plan && onRemoteDeckUpdate) {
                  onRemoteDeckUpdate(data.session.plan, data.session.currentSlideIndex);
                }
                break;
              }

              case 'participant_joined': {
                setParticipants((prev) => {
                  if (prev.some((p) => p.id === data.participant.id)) return prev;
                  return [...prev, data.participant];
                });
                if (data.message && onNotification) {
                  onNotification(data.message);
                }
                break;
              }

              case 'participant_left': {
                setParticipants((prev) => prev.filter((p) => p.id !== data.participantId));
                setRemoteCursors((prev) => {
                  const next = { ...prev };
                  delete next[data.participantId];
                  return next;
                });
                if (data.message && onNotification) {
                  onNotification(data.message);
                }
                break;
              }

              case 'participants_updated': {
                setParticipants(data.participants);
                const me = data.participants.find((p) => p.id === currentUser.id);
                if (me) {
                  setIsHost(me.isHost);
                }
                break;
              }

              case 'cursor_update': {
                setRemoteCursors((prev) => ({
                  ...prev,
                  [data.userId]: {
                    x: data.x,
                    y: data.y,
                    slideIndex: data.slideIndex,
                    name: data.name,
                    color: data.color,
                    lastActive: Date.now(),
                  },
                }));
                break;
              }

              case 'deck_updated': {
                if (onRemoteDeckUpdate) {
                  onRemoteDeckUpdate(data.plan, data.activeSlideIndex);
                }
                if (onNotification) {
                  onNotification(`${data.senderName} updated the presentation deck.`);
                }
                break;
              }

              case 'slide_changed': {
                if (onRemoteSlideChange) {
                  onRemoteSlideChange(data.activeSlideIndex, data.senderName, data.isBroadcast);
                }
                break;
              }

              case 'reaction_received': {
                setReactions((prev) => [...prev.slice(-15), data.reaction]);
                break;
              }

              case 'chat_received': {
                setMessages((prev) => [...prev.slice(-49), data.message]);
                break;
              }

              case 'error': {
                console.error('[Collaboration Error]', data.message);
                if (onNotification) {
                  onNotification(`Collaboration warning: ${data.message}`);
                }
                break;
              }
            }
          } catch (err) {
            console.error('[Collaboration] Error parsing incoming message:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          setIsConnecting(false);
        };

        ws.onerror = (err) => {
          console.error('[Collaboration] WebSocket error:', err);
          setIsConnected(false);
          setIsConnecting(false);
        };
      } catch (err) {
        console.error('[Collaboration] Connection initiation failed:', err);
        setIsConnecting(false);
      }
    },
    [currentUser, onNotification, onRemoteDeckUpdate, onRemoteSlideChange]
  );

  // Join or create a session
  const joinSession = useCallback(
    (targetSessionId: string, initialPlan?: PresentationPlan, forceHost?: boolean) => {
      const cleanId = targetSessionId.trim().replace(/[^a-zA-Z0-9-_]/g, '');
      if (!cleanId) return;

      // Update URL query parameter without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('session', cleanId);
      window.history.replaceState({}, '', url.toString());

      connect(cleanId, initialPlan, forceHost);
    },
    [connect]
  );

  // Leave session
  const leaveSession = useCallback(() => {
    if (wsRef.current) {
      sendWsMessage({ type: 'leave' });
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setSessionId(null);
    setParticipants([]);
    setRemoteCursors({});
    setMessages([]);

    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.replaceState({}, '', url.toString());
  }, [sendWsMessage]);

  // Update profile
  const updateUserProfile = useCallback((name: string, color: string) => {
    const trimmed = name.trim() || 'Anonymous';
    const initials = trimmed
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const updated = {
      id: currentUser.id,
      name: trimmed,
      color,
      avatar: initials || 'US',
    };

    localStorage.setItem('trusity_user_name', trimmed);
    localStorage.setItem('trusity_user_color', color);
    setCurrentUser(updated);
  }, [currentUser.id]);

  // Broadcast mouse position over slide canvas
  const broadcastCursor = useCallback(
    (xPercent: number, yPercent: number, slideIndex: number) => {
      if (!isConnected) return;
      const now = Date.now();
      // Throttle cursor sends to max every 35ms (~30fps) for snappy yet light performance
      if (now - lastCursorSendRef.current < 35) return;
      lastCursorSendRef.current = now;

      sendWsMessage({
        type: 'cursor_move',
        x: Math.round(xPercent * 10) / 10,
        y: Math.round(yPercent * 10) / 10,
        slideIndex,
      });
    },
    [isConnected, sendWsMessage]
  );

  // Broadcast slide change
  const broadcastSlideChange = useCallback(
    (slideIndex: number, isBroadcast: boolean = false) => {
      if (!isConnected) return;
      sendWsMessage({
        type: 'change_slide',
        slideIndex,
        isBroadcast: isBroadcast || isHost,
      });
    },
    [isConnected, isHost, sendWsMessage]
  );

  // Broadcast full deck update
  const broadcastDeckUpdate = useCallback(
    (plan: PresentationPlan, currentSlide: number) => {
      if (!isConnected) return;
      sendWsMessage({
        type: 'sync_deck',
        plan,
        activeSlideIndex: currentSlide,
      });
    },
    [isConnected, sendWsMessage]
  );

  // Send live floating reaction
  const sendReaction = useCallback(
    (emoji: string, xPercent: number = 50, yPercent: number = 50, slideIndex: number = 0) => {
      if (!isConnected) return;
      sendWsMessage({
        type: 'live_reaction',
        emoji,
        x: xPercent,
        y: yPercent,
        slideIndex,
      });
    },
    [isConnected, sendWsMessage]
  );

  // Send in-session chat message
  const sendMessage = useCallback(
    (text: string, slideIndex?: number) => {
      if (!isConnected || !text.trim()) return;
      sendWsMessage({
        type: 'chat_message',
        text,
        slideIndex: slideIndex ?? lastSlideIndexRef.current,
      });
    },
    [isConnected, sendWsMessage]
  );

  // Check URL on initial mount for `?session=ROOM_ID`
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get('session');
    if (sessionFromUrl && !sessionId && !isConnected) {
      joinSession(sessionFromUrl, currentPlan || undefined);
    }
  }, []);

  return {
    currentUser,
    sessionId,
    sessionTitle,
    isConnected,
    isConnecting,
    participants,
    remoteCursors,
    reactions,
    messages,
    isHost,
    followPresenter,
    setFollowPresenter,
    showRemoteCursors,
    setShowRemoteCursors,
    joinSession,
    leaveSession,
    updateUserProfile,
    broadcastCursor,
    broadcastSlideChange,
    broadcastDeckUpdate,
    sendReaction,
    sendMessage,
  };
}
