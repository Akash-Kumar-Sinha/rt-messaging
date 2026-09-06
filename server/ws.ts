import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";
import { verifyAuthToken, SessionUser } from "../lib/auth";
import {
  setUserOnline,
  setUserOffline,
  refreshUserHeartbeat,
  setTypingState,
  redisSub,
} from "../lib/redis";
import { processSendMessagePipeline } from "../lib/message-pipeline";
import {
  verifyConversationMembership,
  membersDb,
  receiptsDb,
  messagesDb,
  usersDb,
} from "../lib/db";

const port = parseInt(process.env.WS_PORT || "3001", 10);
const wss = new WebSocketServer({ port });

interface AuthenticatedSocket extends WebSocket {
  isAlive: boolean;
  user?: SessionUser;
  connectionId: string;
  rooms: Set<string>;
}

const userSockets = new Map<string, Set<AuthenticatedSocket>>();
const roomSockets = new Map<string, Set<AuthenticatedSocket>>();

// In-memory conversation member cache (30s TTL) to prevent repeated DB hits per event
const conversationMembersCache = new Map<string, { memberUserIds: string[]; cachedAt: number }>();
const MEMBER_CACHE_TTL_MS = 30000;

async function getConversationMemberIds(conversationId: string): Promise<string[]> {
  const now = Date.now();
  const cached = conversationMembersCache.get(conversationId);
  if (cached && now - cached.cachedAt < MEMBER_CACHE_TTL_MS) {
    return cached.memberUserIds;
  }

  const members = await membersDb.where({ conversationId }).all();
  const memberUserIds = members.map((m) => m.userId);
  conversationMembersCache.set(conversationId, { memberUserIds, cachedAt: now });
  return memberUserIds;
}

export function invalidateConversationMembersCache(conversationId: string) {
  conversationMembersCache.delete(conversationId);
}

/**
 * Broadcasts an event to all active sockets belonging to members of a conversation
 */
async function broadcastToConversationMembers(
  conversationId: string,
  event: string,
  data: any,
  excludeSocketOrId?: AuthenticatedSocket | string
) {
  try {
    const memberUserIds = await getConversationMemberIds(conversationId);
    const payload = JSON.stringify({ event, data });
    const sentSockets = new Set<WebSocket>();

    for (const userId of memberUserIds) {
      const sockets = userSockets.get(userId);
      if (sockets) {
        for (const socket of sockets) {
          const isExcluded =
            socket === excludeSocketOrId ||
            (typeof excludeSocketOrId === "string" && socket.connectionId === excludeSocketOrId);
          if (!isExcluded && socket.readyState === WebSocket.OPEN && !sentSockets.has(socket)) {
            sentSockets.add(socket);
            socket.send(payload);
          }
        }
      }
    }
  } catch (err) {
    console.error("broadcastToConversationMembers error:", err);
  }
}

function broadcastGlobal(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on("connection", (ws: WebSocket, request) => {
  const client = ws as AuthenticatedSocket;
  client.isAlive = true;
  client.connectionId = crypto.randomUUID();
  client.rooms = new Set<string>();

  client.on("pong", () => {
    client.isAlive = true;
    if (client.user) {
      refreshUserHeartbeat(client.user.id, client.connectionId);
    }
  });

  const parsedUrl = parse(request.url || "", true);
  const queryToken = parsedUrl.query.token as string | undefined;

  if (queryToken) {
    verifyAuthToken(queryToken).then(async (user) => {
      if (user) {
        await setupAuthenticatedSocket(client, user);
        client.send(
          JSON.stringify({
            event: "auth:success",
            data: { user },
          })
        );
      }
    });
  }

  client.on("message", async (rawMsg: Buffer) => {
    try {
      const payload = JSON.parse(rawMsg.toString());
      const { event, data } = payload;

      switch (event) {
        case "auth": {
          const token = data?.token;
          if (!token) {
            client.send(
              JSON.stringify({
                event: "error",
                data: { code: "UNAUTHORIZED", message: "Token missing" },
              })
            );
            return;
          }
          const user = await verifyAuthToken(token);
          if (!user) {
            client.send(
              JSON.stringify({
                event: "error",
                data: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
              })
            );
            return;
          }
          await setupAuthenticatedSocket(client, user);
          client.send(
            JSON.stringify({
              event: "auth:success",
              data: { user },
            })
          );
          break;
        }

        case "conversation:join": {
          if (!client.user) {
            client.send(
              JSON.stringify({
                event: "error",
                data: { code: "UNAUTHORIZED", message: "Authenticate first" },
              })
            );
            return;
          }
          const conversationId = data?.conversationId;
          if (!conversationId) return;

          const isMember = await verifyConversationMembership(
            conversationId,
            client.user.id
          );
          if (!isMember) {
            client.send(
              JSON.stringify({
                event: "error",
                data: {
                  code: "FORBIDDEN",
                  message: "You are not a member of this conversation",
                },
              })
            );
            return;
          }

          client.rooms.add(conversationId);
          if (!roomSockets.has(conversationId)) {
            roomSockets.set(conversationId, new Set());
          }
          roomSockets.get(conversationId)!.add(client);

          client.send(
            JSON.stringify({
              event: "conversation:joined",
              data: { conversationId },
            })
          );
          break;
        }

        case "conversation:leave": {
          const conversationId = data?.conversationId;
          if (!conversationId) return;
          client.rooms.delete(conversationId);
          roomSockets.get(conversationId)?.delete(client);
          break;
        }

        case "conversation:create": {
          if (!client.user) return;
          const { conversationId, recipientId } = data || {};
          if (!conversationId || !recipientId) return;

          const creatorData = {
            id: client.user.id,
            displayName: client.user.displayName,
            username: client.user.username,
            avatarUrl: client.user.avatarUrl,
          };

          const payload = JSON.stringify({
            event: "conversation:created",
            data: {
              conversationId,
              creator: creatorData,
            },
          });

          // Send directly to recipient's active sockets
          const recipientSockets = userSockets.get(recipientId);
          if (recipientSockets) {
            recipientSockets.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) {
                s.send(payload);
              }
            });
          }
          break;
        }

        case "message:send": {
          if (!client.user) {
            client.send(
              JSON.stringify({
                event: "message:error",
                data: {
                  clientMessageId: data?.clientMessageId,
                  code: "UNAUTHORIZED",
                  message: "Not authenticated",
                },
              })
            );
            return;
          }

          const result = await processSendMessagePipeline(
            client.user.id,
            data,
            client.connectionId
          );
          if (!result.success) {
            const isRateLimit = result.error?.code === "RATE_LIMITED";
            client.send(
              JSON.stringify({
                event: "message:error",
                data: {
                  clientMessageId: data?.clientMessageId,
                  code: isRateLimit ? "MESSAGE_RATE_LIMITED" : result.error?.code,
                  message: result.error?.message,
                  retryAfter: result.error?.details?.retryAfter,
                  details: result.error?.details,
                },
              })
            );
            return;
          }

          client.send(
            JSON.stringify({
              event: "message:ack",
              data: {
                clientMessageId: data?.clientMessageId,
                message: result.message,
              },
            })
          );

          // Sync with sender's other open tabs
          const senderSockets = userSockets.get(client.user.id);
          if (senderSockets) {
            const syncPayload = JSON.stringify({
              event: "message:sync",
              data: { message: result.message, clientMessageId: data?.clientMessageId },
            });
            senderSockets.forEach((s) => {
              if (s !== client && s.readyState === WebSocket.OPEN) {
                s.send(syncPayload);
              }
            });
          }
          break;
        }

        case "message:read": {
          if (!client.user) return;
          const { conversationId, messageId } = data || {};
          if (!conversationId) return;

          const isMember = await verifyConversationMembership(
            conversationId,
            client.user.id
          );
          if (!isMember) return;

          const now = new Date().toISOString();

          if (messageId) {
            const receipt = await receiptsDb
              .where({ messageId, userId: client.user.id })
              .first();
            if (receipt) {
              await receiptsDb.where({ id: receipt.id }).update({
                status: "READ",
                readAt: now,
              });
            }
          } else {
            const messages = await messagesDb.where({ conversationId }).all();
            for (const msg of messages) {
              const r = await receiptsDb
                .where({ messageId: msg.id, userId: client.user.id })
                .first();
              if (r && r.status !== "READ") {
                await receiptsDb.where({ id: r.id }).update({
                  status: "READ",
                  readAt: now,
                });
              }
            }
          }

          const member = await membersDb
            .where({ conversationId, userId: client.user.id })
            .first();
          if (member) {
            await membersDb.where({ id: member.id }).update({
              unreadCount: 0,
              lastReadAt: now,
            });
          }

          await broadcastToConversationMembers(
            conversationId,
            "message:read",
            {
              conversationId,
              userId: client.user.id,
              readAt: now,
            },
            client
          );
          break;
        }

        case "typing:start": {
          if (!client.user) return;
          const { conversationId } = data || {};
          if (!conversationId) return;

          await setTypingState(conversationId, client.user.id, true);
          await broadcastToConversationMembers(
            conversationId,
            "typing:update",
            {
              conversationId,
              userId: client.user.id,
              username: client.user.displayName || client.user.username,
              isTyping: true,
            },
            client
          );
          break;
        }

        case "typing:stop": {
          if (!client.user) return;
          const { conversationId } = data || {};
          if (!conversationId) return;

          await setTypingState(conversationId, client.user.id, false);
          await broadcastToConversationMembers(
            conversationId,
            "typing:update",
            {
              conversationId,
              userId: client.user.id,
              username: client.user.displayName || client.user.username,
              isTyping: false,
            },
            client
          );
          break;
        }

        case "message:react": {
          if (!client.user) return;
          const currentUserId = client.user.id;
          const { conversationId, messageId, emoji, action } = data || {};
          if (!conversationId || !messageId || !emoji) return;

          const isMember = await verifyConversationMembership(conversationId, currentUserId);
          if (!isMember) return;

          const msg =
            (await messagesDb.where({ id: messageId }).first()) ||
            (await messagesDb.where({ clientMessageId: messageId }).first());
          if (!msg || msg.conversationId !== conversationId) return;

          let rawMeta = msg.metadata;
          let metadata: any = {};
          if (typeof rawMeta === "string") {
            try {
              metadata = JSON.parse(rawMeta);
            } catch {
              metadata = {};
            }
          } else if (rawMeta && typeof rawMeta === "object") {
            metadata = { ...rawMeta };
          }

          let reactions = { ...(metadata.reactions || {}) };
          let userList: string[] = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];

          const hasReacted = userList.includes(currentUserId);
          const shouldAdd = action === "add" ? true : action === "remove" ? false : !hasReacted;

          if (shouldAdd) {
            if (!hasReacted) userList.push(currentUserId);
            reactions[emoji] = userList;
          } else {
            userList = userList.filter((id: string) => id !== currentUserId);
            if (userList.length === 0) {
              delete reactions[emoji];
            } else {
              reactions[emoji] = userList;
            }
          }

          metadata.reactions = reactions;
          await messagesDb.where({ id: msg.id }).update({ metadata });

          await broadcastToConversationMembers(
            conversationId,
            "message:reaction_updated",
            {
              conversationId,
              messageId: msg.id,
              clientMessageId: msg.clientMessageId,
              reactions,
              userId: currentUserId,
              emoji,
            }
          );
          break;
        }

        case "message:delete": {
          if (!client.user) return;
          const { conversationId, messageId } = data || {};
          if (!conversationId || !messageId) return;

          const isMember = await verifyConversationMembership(conversationId, client.user.id);
          if (!isMember) return;

          const msg = await messagesDb.where({ id: messageId }).first();
          if (!msg || msg.conversationId !== conversationId || msg.senderId !== client.user.id) return;

          await messagesDb.where({ id: messageId }).delete();

          await broadcastToConversationMembers(
            conversationId,
            "message:deleted",
            {
              conversationId,
              messageId,
            }
          );
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
    }
  });

  client.on("close", async () => {
    if (client.user) {
      const userId = client.user.id;
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(client);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }

      client.rooms.forEach((roomId) => {
        roomSockets.get(roomId)?.delete(client);
      });

      const activeCount = await setUserOffline(userId, client.connectionId);
      if (activeCount === 0) {
        broadcastGlobal("presence:update", {
          userId,
          status: "OFFLINE",
          lastSeenAt: new Date().toISOString(),
        });
      }
    }
  });
});

async function setupAuthenticatedSocket(client: AuthenticatedSocket, user: SessionUser) {
  client.user = user;
  if (!userSockets.has(user.id)) {
    userSockets.set(user.id, new Set());
  }
  userSockets.get(user.id)!.add(client);

  const activeCount = await setUserOnline(user.id, client.connectionId);
  if (activeCount === 1) {
    broadcastGlobal("presence:update", {
      userId: user.id,
      status: "ONLINE",
    });
  }

  await usersDb.where({ id: user.id }).update({ lastSeenAt: new Date().toISOString() });
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const client = ws as AuthenticatedSocket;
    if (!client.isAlive) {
      return client.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

try {
  redisSub.subscribe("chat:events", (err) => {
    if (err) console.warn("Redis subscription warning:", err);
  });

  redisSub.on("message", async (channel, message) => {
    if (channel === "chat:events") {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === "MESSAGE_CREATED") {
          await broadcastToConversationMembers(
            parsed.conversationId,
            "message:created",
            { message: parsed.message },
            parsed.excludeConnectionId
          );
        } else if (parsed.type === "MESSAGE_READ") {
          await broadcastToConversationMembers(parsed.conversationId, "message:read", {
            conversationId: parsed.conversationId,
            userId: parsed.userId,
            messageId: parsed.messageId,
            readAt: parsed.readAt,
          });
        } else if (parsed.type === "MESSAGE_REACTION_UPDATED") {
          await broadcastToConversationMembers(parsed.conversationId, "message:reaction_updated", {
            conversationId: parsed.conversationId,
            messageId: parsed.messageId,
            clientMessageId: parsed.clientMessageId,
            reactions: parsed.reactions,
            userId: parsed.userId,
            emoji: parsed.emoji,
          });
        } else if (parsed.type === "CONVERSATION_CREATED") {
          const { memberIds, conversationId, creator } = parsed;
          if (conversationId) {
            invalidateConversationMembersCache(conversationId);
          }
          if (Array.isArray(memberIds)) {
            const payload = JSON.stringify({
              event: "conversation:created",
              data: { conversationId, creator },
            });
            for (const memberId of memberIds) {
              const sockets = userSockets.get(memberId);
              if (sockets) {
                sockets.forEach((s) => {
                  if (s.readyState === WebSocket.OPEN) {
                    s.send(payload);
                  }
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to process Redis pubsub message:", e);
      }
    }
  });
} catch (err) {
  console.warn("Redis pubsub setup error:", err);
}

console.log(`> Standalone WebSocket Server listening on ws://localhost:${port}`);
