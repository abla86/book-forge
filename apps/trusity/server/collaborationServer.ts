import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import {
  Participant,
  PresentationPlan,
  CollaborationSessionState,
  CollaborationMessage,
  LiveReaction,
  CollaborationWsClientMessage,
  CollaborationWsServerMessage,
} from '../src/types';

interface ClientEntry {
  ws: WebSocket;
  participant: Participant;
}

interface ServerSession {
  sessionId: string;
  title: string;
  createdAt: string;
  hostId: string;
  currentSlideIndex: number;
  plan?: PresentationPlan;
  messages: CollaborationMessage[];
  clients: Map<string, ClientEntry>;
}

// Global active sessions map
const sessions = new Map<string, ServerSession>();

export function getSessionData(sessionId: string): CollaborationSessionState | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    title: session.title,
    createdAt: session.createdAt,
    hostId: session.hostId,
    currentSlideIndex: session.currentSlideIndex,
    plan: session.plan,
    messages: session.messages,
    participants: Array.from(session.clients.values()).map((c) => c.participant),
  };
}

export function createOrUpdateSession(
  sessionId: string,
  plan?: PresentationPlan,
  hostName?: string
): CollaborationSessionState {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      title: plan?.title || `Pitch Room: ${sessionId}`,
      createdAt: new Date().toISOString(),
      hostId: '',
      currentSlideIndex: 0,
      plan,
      messages: [],
      clients: new Map(),
    };
    sessions.set(sessionId, session);
  } else if (plan) {
    session.plan = plan;
    session.title = plan.title || session.title;
  }
  return getSessionData(sessionId)!;
}

export function setupCollaborationWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    let currentSessionId: string | null = null;
    let currentUserId: string | null = null;

    const send = (msg: CollaborationWsServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(msg));
        } catch (err) {
          console.error('[CollaborationWS] Error sending message:', err);
        }
      }
    };

    const broadcastToSession = (
      sessionId: string,
      msg: CollaborationWsServerMessage,
      excludeUserId?: string
    ) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      const dataStr = JSON.stringify(msg);

      for (const [userId, client] of session.clients.entries()) {
        if (excludeUserId && userId === excludeUserId) continue;
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(dataStr);
          } catch (err) {
            console.error(`[CollaborationWS] Broadcast error to ${userId}:`, err);
          }
        }
      }
    };

    ws.on('message', (raw: Buffer | string) => {
      try {
        const payload: CollaborationWsClientMessage = JSON.parse(raw.toString());

        switch (payload.type) {
          case 'join': {
            const { sessionId, user, initialPlan, activeSlideIndex } = payload;
            if (!sessionId || !user || !user.id) {
              send({ type: 'error', message: 'Invalid join credentials' });
              return;
            }

            currentSessionId = sessionId;
            currentUserId = user.id;

            let session = sessions.get(sessionId);
            if (!session) {
              session = {
                sessionId,
                title: initialPlan?.title || `Session ${sessionId}`,
                createdAt: new Date().toISOString(),
                hostId: user.id,
                currentSlideIndex: activeSlideIndex ?? 0,
                plan: initialPlan,
                messages: [],
                clients: new Map(),
              };
              sessions.set(sessionId, session);
            } else {
              // If session doesn't have a plan yet but joiner has one, adopt it
              if (!session.plan && initialPlan) {
                session.plan = initialPlan;
                session.title = initialPlan.title;
              }
              // If no host exists yet, designate this user as host
              if (!session.hostId) {
                session.hostId = user.id;
              }
            }

            const isHost = session.hostId === user.id || Boolean(user.isHost);
            if (isHost && !session.hostId) {
              session.hostId = user.id;
            }

            const participant: Participant = {
              id: user.id,
              name: user.name || 'Anonymous Guest',
              color: user.color || '#6366F1',
              avatar: user.avatar || user.name.substring(0, 2).toUpperCase() || 'GU',
              isHost,
              activeSlideIndex: activeSlideIndex ?? session.currentSlideIndex,
              joinedAt: new Date().toISOString(),
              lastActive: Date.now(),
            };

            session.clients.set(user.id, { ws, participant });

            const sessionState: CollaborationSessionState = {
              sessionId: session.sessionId,
              title: session.title,
              createdAt: session.createdAt,
              hostId: session.hostId,
              currentSlideIndex: session.currentSlideIndex,
              plan: session.plan,
              messages: session.messages,
              participants: Array.from(session.clients.values()).map((c) => c.participant),
            };

            // 1. Send authoritative session state to newly joined client
            send({
              type: 'session_state',
              session: sessionState,
              yourId: user.id,
            });

            // 2. Broadcast join event to everyone else
            broadcastToSession(
              sessionId,
              {
                type: 'participant_joined',
                participant,
                message: `${participant.name} joined the collaboration session.`,
              },
              user.id
            );

            // 3. Update participant roster
            broadcastToSession(
              sessionId,
              {
                type: 'participants_updated',
                participants: sessionState.participants,
              }
            );

            console.log(`[CollaborationWS] User ${user.name} (${user.id}) joined room ${sessionId}. Total: ${session.clients.size}`);
            break;
          }

          case 'cursor_move': {
            if (!currentSessionId || !currentUserId) return;
            const session = sessions.get(currentSessionId);
            if (!session) return;

            const client = session.clients.get(currentUserId);
            if (!client) return;

            const now = Date.now();
            client.participant.lastActive = now;
            client.participant.cursor = {
              x: Math.max(0, Math.min(100, payload.x)),
              y: Math.max(0, Math.min(100, payload.y)),
              slideIndex: payload.slideIndex,
              lastActive: now,
            };

            // Broadcast cursor to other participants in this room
            broadcastToSession(
              currentSessionId,
              {
                type: 'cursor_update',
                userId: currentUserId,
                name: client.participant.name,
                color: client.participant.color,
                x: client.participant.cursor.x,
                y: client.participant.cursor.y,
                slideIndex: payload.slideIndex,
              },
              currentUserId
            );
            break;
          }

          case 'change_slide': {
            if (!currentSessionId || !currentUserId) return;
            const session = sessions.get(currentSessionId);
            if (!session) return;

            const client = session.clients.get(currentUserId);
            if (!client) return;

            client.participant.activeSlideIndex = payload.slideIndex;
            client.participant.lastActive = Date.now();

            const isBroadcast = Boolean(payload.isBroadcast) || client.participant.isHost;
            if (isBroadcast) {
              session.currentSlideIndex = payload.slideIndex;
            }

            broadcastToSession(
              currentSessionId,
              {
                type: 'slide_changed',
                activeSlideIndex: payload.slideIndex,
                senderId: currentUserId,
                senderName: client.participant.name,
                isBroadcast,
              },
              currentUserId
            );

            // Update participant roster so everyone sees who is on which slide
            broadcastToSession(currentSessionId, {
              type: 'participants_updated',
              participants: Array.from(session.clients.values()).map((c) => c.participant),
            });
            break;
          }

          case 'sync_deck': {
            if (!currentSessionId || !currentUserId) return;
            const session = sessions.get(currentSessionId);
            if (!session) return;

            const client = session.clients.get(currentUserId);
            if (!client) return;

            session.plan = payload.plan;
            session.currentSlideIndex = payload.activeSlideIndex ?? session.currentSlideIndex;
            session.title = payload.plan.title || session.title;

            broadcastToSession(
              currentSessionId,
              {
                type: 'deck_updated',
                plan: payload.plan,
                activeSlideIndex: session.currentSlideIndex,
                senderId: currentUserId,
                senderName: client.participant.name,
              },
              currentUserId
            );
            break;
          }

          case 'live_reaction': {
            if (!currentSessionId || !currentUserId) return;
            const session = sessions.get(currentSessionId);
            if (!session) return;

            const client = session.clients.get(currentUserId);
            const reaction: LiveReaction = {
              id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              emoji: payload.emoji,
              x: Math.max(5, Math.min(95, payload.x)),
              y: Math.max(5, Math.min(95, payload.y)),
              userName: client?.participant.name || 'Anonymous',
              color: client?.participant.color || '#EC4899',
              timestamp: Date.now(),
            };

            // Broadcast to ALL users in session (including sender so everyone sees the floating celebration)
            broadcastToSession(currentSessionId, {
              type: 'reaction_received',
              reaction,
            });
            break;
          }

          case 'chat_message': {
            if (!currentSessionId || !currentUserId) return;
            const session = sessions.get(currentSessionId);
            if (!session) return;

            const client = session.clients.get(currentUserId);
            if (!client || !payload.text.trim()) return;

            const message: CollaborationMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              senderId: currentUserId,
              senderName: client.participant.name,
              senderColor: client.participant.color,
              text: payload.text.trim(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              slideIndex: payload.slideIndex,
            };

            session.messages.push(message);
            if (session.messages.length > 50) {
              session.messages.shift();
            }

            broadcastToSession(currentSessionId, {
              type: 'chat_received',
              message,
            });
            break;
          }

          case 'heartbeat': {
            if (currentSessionId && currentUserId) {
              const session = sessions.get(currentSessionId);
              const client = session?.clients.get(currentUserId);
              if (client) {
                client.participant.lastActive = Date.now();
              }
            }
            break;
          }

          case 'leave': {
            cleanupClient();
            break;
          }
        }
      } catch (err) {
        console.error('[CollaborationWS] Message parsing error:', err);
      }
    });

    const cleanupClient = () => {
      if (!currentSessionId || !currentUserId) return;
      const session = sessions.get(currentSessionId);
      if (!session) return;

      const client = session.clients.get(currentUserId);
      const participantName = client?.participant.name || 'A participant';

      session.clients.delete(currentUserId);

      // If host left, appoint new host if anyone remains
      if (session.hostId === currentUserId && session.clients.size > 0) {
        const nextHost = Array.from(session.clients.values())[0];
        session.hostId = nextHost.participant.id;
        nextHost.participant.isHost = true;
      }

      broadcastToSession(currentSessionId, {
        type: 'participant_left',
        participantId: currentUserId,
        message: `${participantName} left the session.`,
      });

      broadcastToSession(currentSessionId, {
        type: 'participants_updated',
        participants: Array.from(session.clients.values()).map((c) => c.participant),
      });

      console.log(`[CollaborationWS] User ${currentUserId} left room ${currentSessionId}. Remaining: ${session.clients.size}`);

      currentSessionId = null;
      currentUserId = null;
    };

    ws.on('close', cleanupClient);
    ws.on('error', (err) => {
      console.error('[CollaborationWS] Socket error:', err);
      cleanupClient();
    });
  });
}
