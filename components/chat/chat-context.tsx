"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionUser } from "@/lib/auth";
import { useWebSocket, ConnectionStatus } from "@/lib/hooks/use-socket";
import { ConversationSummary } from "./conversation-sidebar";
import { MessageItem } from "./message-bubble";
import { parseReactionsBlob, type FailureReason } from "./message-types";
import { toast } from "@/components/ui/toast";
import { NotificationItem } from "./notification-toast";

interface ChatContextType {
  currentUser: SessionUser;
  authToken: string | null;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeConversation: ConversationSummary | undefined;
  messages: MessageItem[];
  hasMoreMessages: boolean;
  loadingMessages: boolean;
  loadingMoreMessages: boolean;
  typingUsers: string[];
  socketStatus: ConnectionStatus;
  socketEmit: (event: string, data: any) => void;
  notification: NotificationItem | null;
  dismissNotification: () => void;
  fetchConversations: () => Promise<void>;
  selectConversation: (id: string | null) => void;
  loadMoreMessages: () => Promise<void>;
  replyingToMessage: MessageItem | null;
  setReplyingToMessage: (msg: MessageItem | null) => void;
  forwardingMessage: MessageItem | null;
  setForwardingMessage: (msg: MessageItem | null) => void;
  forwardMessage: (targetConversationId: string, message: MessageItem) => Promise<boolean>;
  reactToMessage: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string) => void;
  sendMessage: (payload: {
    type: "TEXT" | "IMAGE" | "GIF" | "STICKER";
    content?: string;
    mediaId?: string;
    metadata?: any;
  }) => void;
  retryMessage: (msg: MessageItem) => void;
  handleUserSwitched: (user: SessionUser, token: string) => void;
  logout: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({
  initialUser,
  initialToken,
  children,
}: {
  initialUser: SessionUser;
  initialToken: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const activeConversationId = (params?.id as string) || null;

  const [currentUser, setCurrentUser] = useState<SessionUser>(initialUser);
  const [authToken, setAuthToken] = useState<string | null>(initialToken);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState<boolean>(false);
  const [typingUsersMap, setTypingUsersMap] = useState<Map<string, string>>(new Map());
  const [notification, setNotification] = useState<NotificationItem | null>(null);

  const [replyingToMessage, setReplyingToMessage] = useState<MessageItem | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageItem | null>(null);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const { status: socketStatus, emit: socketEmit, on: socketOn, reconnect } = useWebSocket(
    currentUser,
    authToken
  );

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/conversations", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentUser, authToken]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const selectConversation = useCallback(
    (id: string | null) => {
      setReplyingToMessage(null);
      if (!id) {
        router.push("/chat");
      } else {
        router.push(`/chat/${id}`);
      }
    },
    [router]
  );

  const fetchMessages = useCallback(
    async (convId: string) => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/conversations/${convId}/messages?limit=30`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          setHasMoreMessages(data.hasMore);
          setNextCursor(data.nextCursor);

          socketEmit("message:read", { conversationId: convId });
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [authToken, socketEmit]
  );

  // When active conversation ID changes, join room & load messages
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      socketEmit("conversation:join", { conversationId: activeConversationId });
      setTypingUsersMap(new Map());

      return () => {
        socketEmit("conversation:leave", { conversationId: activeConversationId });
      };
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages, socketEmit]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversationId || !nextCursor || loadingMoreMessages || !hasMoreMessages) {
      return;
    }

    setLoadingMoreMessages(true);
    try {
      const res = await fetch(
        `/api/conversations/${activeConversationId}/messages?limit=30&before=${nextCursor}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      const data = await res.json();
      if (data.messages) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMoreMessages(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [activeConversationId, nextCursor, loadingMoreMessages, hasMoreMessages, authToken]);

  // WebSocket Event Listeners
  useEffect(() => {
    const unMsgCreated = socketOn("message:created", (data) => {
      const { message } = data;
      if (!message) return;

      if (message.conversationId === activeConversationId) {
        setMessages((prev) => {
          const existingIdx = prev.findIndex(
            (m) =>
              (m.clientMessageId && m.clientMessageId === message.clientMessageId) ||
              m.id === message.id
          );
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...message };
            return updated;
          }
          return [...prev, message];
        });

        socketEmit("message:read", {
          conversationId: activeConversationId,
          messageId: message.id,
        });
      } else if (message.senderId !== currentUser?.id) {
        const msgBody =
          message.content ||
          (message.type === "IMAGE"
            ? "Sent a photo"
            : message.type === "GIF"
            ? "Sent a GIF"
            : "Sent a sticker");

        setNotification({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: "MESSAGE",
          title: message.sender?.displayName || "New Message",
          body: msgBody,
          conversationId: message.conversationId,
          avatarUrl: message.sender?.avatarUrl,
          senderName: message.sender?.displayName,
        });
      }

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === message.conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }

        const isFromMe = message.senderId === currentUser?.id;
        return prev.map((c) => {
          if (c.id === message.conversationId) {
            const isCurrent = c.id === activeConversationId;
            return {
              ...c,
              lastMessage: message,
              unreadCount: isFromMe ? c.unreadCount : (isCurrent ? 0 : c.unreadCount + 1),
              updatedAt: message.createdAt,
            };
          }
          return c;
        });
      });
    });

    const unConvCreated = socketOn("conversation:created", (data) => {
      fetchConversations();

      if (data?.creator && data.creator.id !== currentUser?.id) {
        const creatorName = data.creator.displayName || data.creator.username || "Someone";
        const convBody = `${creatorName} started a new chat with you.`;

        setNotification({
          id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: "FRIEND_ADDED",
          title: "New Conversation",
          body: convBody,
          conversationId: data.conversationId,
          avatarUrl: data.creator.avatarUrl,
          senderName: creatorName,
        });
      }
    });

    const unMsgAck = socketOn("message:ack", (data) => {
      const { clientMessageId, message } = data;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, ...message, clientMessageId }
            : m
        )
      );

      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? { ...c, lastMessage: message, updatedAt: message.createdAt }
            : c
        )
      );
    });

    const unMsgSync = socketOn("message:sync", (data) => {
      const { message, clientMessageId } = data;
      if (message.conversationId === activeConversationId) {
        setMessages((prev) => {
          const existingIdx = prev.findIndex(
            (m) =>
              (m.clientMessageId && m.clientMessageId === clientMessageId) ||
              m.id === message.id
          );
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...message };
            return updated;
          }
          return [...prev, message];
        });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? { ...c, lastMessage: message, updatedAt: message.createdAt }
            : c
        )
      );
    });

    const unMsgErr = socketOn("message:error", (data) => {
      const { clientMessageId, message: errorMsg, code } = data;
      let failureReason: FailureReason = "NETWORK_FAILED";
      if (
        code === "MODERATION_REJECTED" ||
        (errorMsg && /prohibited|profanity/i.test(errorMsg))
      ) {
        failureReason = "PROFANITY_REJECTED";
      } else if (
        code === "MODERATION_FAILED" ||
        code === "MEDIA_INVALID" ||
        (errorMsg && /moderation/i.test(errorMsg))
      ) {
        failureReason = "MODERATION_FAILED";
      } else if (
        code === "MESSAGE_RATE_LIMITED" ||
        code === "RATE_LIMITED" ||
        (errorMsg && /rate limit|too quickly/i.test(errorMsg))
      ) {
        failureReason = "RATE_LIMITED";
      } else {
        failureReason = "NETWORK_FAILED";
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, status: "FAILED", failureReason, errorReason: errorMsg }
            : m
        )
      );
    });

    const unMsgRead = socketOn("message:read", (data) => {
      const { conversationId, userId } = data;
      if (conversationId === activeConversationId && userId !== currentUser?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUser?.id ? { ...m, status: "READ" } : m))
        );
      }
    });

    const unMsgReaction = socketOn("message:reaction_updated", (data) => {
      const { messageId, clientMessageId, reactions } = data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ||
          (clientMessageId && m.clientMessageId === clientMessageId) ||
          m.id === clientMessageId
            ? {
                ...m,
                metadata: {
                  ...(m.metadata || {}),
                  reactions,
                },
              }
            : m
        )
      );
    });

    const unMsgDeleted = socketOn("message:deleted", (data) => {
      const { messageId } = data;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    const unTyping = socketOn("typing:update", (data) => {
      const { conversationId, userId, username, isTyping } = data;
      if (conversationId === activeConversationId && userId !== currentUser?.id) {
        setTypingUsersMap((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, username);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    });

    const unPresence = socketOn("presence:update", (data) => {
      const { userId, status, lastSeenAt } = data;
      const isOnline = status === "ONLINE";

      setConversations((prev) =>
        prev.map((c) => {
          let updated = false;
          let otherUser = c.otherUser;
          let participants = c.participants;

          if (otherUser && otherUser.id === userId) {
            otherUser = {
              ...otherUser,
              isOnline,
              ...(lastSeenAt ? { lastSeenAt } : {}),
            };
            updated = true;
          }

          if (participants && participants.some((p) => p.id === userId)) {
            participants = participants.map((p) =>
              p.id === userId
                ? { ...p, isOnline, ...(lastSeenAt ? { lastSeenAt } : {}) }
                : p
            );
            updated = true;
          }

          return updated ? { ...c, otherUser, participants } : c;
        })
      );
    });

    return () => {
      unMsgCreated();
      unConvCreated();
      unMsgAck();
      unMsgSync();
      unMsgErr();
      unMsgRead();
      unMsgReaction();
      unMsgDeleted();
      unTyping();
      unPresence();
    };
  }, [activeConversationId, currentUser?.id, socketOn, socketEmit, fetchConversations]);

  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeConversationId || !currentUser) return;

      // Optimistic reaction update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId && m.clientMessageId !== messageId) return m;
          const currentReactions = parseReactionsBlob(m.metadata?.reactions);
          let userList: string[] = Array.isArray(currentReactions[emoji])
            ? [...currentReactions[emoji]]
            : [];

          if (userList.includes(currentUser.id)) {
            userList = userList.filter((id) => id !== currentUser.id);
            if (userList.length === 0) {
              delete currentReactions[emoji];
            } else {
              currentReactions[emoji] = userList;
            }
          } else {
            userList.push(currentUser.id);
            currentReactions[emoji] = userList;
          }

          return {
            ...m,
            metadata: {
              ...(m.metadata || {}),
              reactions: currentReactions,
            },
          };
        })
      );

      if (socketStatus === "CONNECTED") {
        socketEmit("message:react", {
          conversationId: activeConversationId,
          messageId,
          emoji,
        });
      } else {
        // Fallback to REST API if socket is disconnected
        fetch(`/api/messages/${messageId}/react`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ emoji, conversationId: activeConversationId }),
        }).catch((err) => console.warn("HTTP react fallback warning:", err));
      }
    },
    [activeConversationId, currentUser, socketStatus, socketEmit, authToken]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!activeConversationId || !currentUser) return;

      // Optimistic delete
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      socketEmit("message:delete", {
        conversationId: activeConversationId,
        messageId,
      });
    },
    [activeConversationId, currentUser, socketEmit]
  );

  const sendMessage = useCallback(
    (payload: {
      type: "TEXT" | "IMAGE" | "GIF" | "STICKER";
      content?: string;
      mediaId?: string;
      metadata?: any;
    }) => {
      if (!activeConversationId || !currentUser) return;

      const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();

      let finalMetadata = payload.metadata ? { ...payload.metadata } : {};
      if (replyingToMessage) {
        finalMetadata.replyTo = {
          id: replyingToMessage.id,
          senderName:
            replyingToMessage.sender?.displayName ||
            replyingToMessage.sender?.username ||
            "User",
          content:
            replyingToMessage.content ||
            (replyingToMessage.type === "IMAGE"
              ? "Photo"
              : replyingToMessage.type === "GIF"
              ? "GIF"
              : "Sticker"),
        };
        setReplyingToMessage(null);
      }

      const optimisticMessage: MessageItem = {
        id: clientMessageId,
        conversationId: activeConversationId,
        senderId: currentUser.id,
        clientMessageId,
        type: payload.type,
        content: payload.content || null,
        metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : null,
        media: payload.mediaId
          ? {
              id: payload.mediaId,
              url: `/api/media/${payload.mediaId}`,
              originalFilename: "image.jpg",
              mimeType: "image/jpeg",
            }
          : null,
        status: "PENDING",
        createdAt: now,
        sender: currentUser,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      socketEmit("message:send", {
        clientMessageId,
        conversationId: activeConversationId,
        type: payload.type,
        content: payload.content,
        metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined,
        mediaId: payload.mediaId,
      });
    },
    [activeConversationId, currentUser, socketEmit, replyingToMessage]
  );

  const forwardMessage = useCallback(
    async (targetConversationId: string, messageToForward: MessageItem): Promise<boolean> => {
      if (!currentUser) return false;

      const clientMessageId = `fwd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();

      let baseMeta: Record<string, any> = {};
      if (messageToForward.type === "GIF") {
        const m = (messageToForward.metadata || {}) as Record<string, any>;
        baseMeta = {
          id: m.id,
          title: m.title,
          url: m.url,
          previewUrl: m.previewUrl,
          width: m.width,
          height: m.height,
          provider: m.provider,
        };
      } else if (messageToForward.type === "STICKER") {
        const m = (messageToForward.metadata || {}) as Record<string, any>;
        baseMeta = {
          id: m.id,
          packId: m.packId,
          packName: m.packName,
          name: m.name,
          url: m.url,
          emoji: m.emoji,
        };
      }

      const forwardMetadata = {
        ...baseMeta,
        isForwarded: true,
        forwardedFrom:
          messageToForward.sender?.displayName ||
          messageToForward.sender?.username ||
          "User",
      };

      if (targetConversationId === activeConversationId) {
        const optimisticMessage: MessageItem = {
          id: clientMessageId,
          conversationId: targetConversationId,
          senderId: currentUser.id,
          clientMessageId,
          type: messageToForward.type,
          content: messageToForward.content || null,
          metadata: forwardMetadata,
          media: messageToForward.media || null,
          status: "PENDING",
          createdAt: now,
          sender: currentUser,
        };
        setMessages((prev) => [...prev, optimisticMessage]);

        if (socketStatus === "CONNECTED") {
          socketEmit("message:send", {
            clientMessageId,
            conversationId: targetConversationId,
            type: messageToForward.type,
            content: messageToForward.content || undefined,
            mediaId: messageToForward.media?.id || undefined,
            metadata: forwardMetadata,
          });
          return true;
        }
      }

      try {
        const res = await fetch(`/api/conversations/${targetConversationId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            clientMessageId,
            type: messageToForward.type,
            content: messageToForward.content || undefined,
            mediaId: messageToForward.media?.id || undefined,
            metadata: forwardMetadata,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.message) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === targetConversationId
                  ? { ...c, lastMessage: data.message, updatedAt: data.message.createdAt }
                  : c
              )
            );
          }
          return true;
        }

        const errData = await res.json().catch(() => ({}));
        setNotification({
          id: `err_${Date.now()}`,
          type: "SYSTEM",
          title: "Forward Failed",
          body: errData.error || "Could not deliver forwarded message.",
        });
        return false;
      } catch (err) {
        console.error("Error forwarding message:", err);
        return false;
      }
    },
    [currentUser, activeConversationId, socketStatus, socketEmit, authToken]
  );

  const retryMessage = useCallback(
    (msg: MessageItem) => {
      if (
        !msg.clientMessageId ||
        !activeConversationId ||
        msg.failureReason === "PROFANITY_REJECTED"
      ) {
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === msg.clientMessageId
            ? { ...m, status: "PENDING", failureReason: undefined, errorReason: undefined }
            : m
        )
      );

      socketEmit("message:send", {
        clientMessageId: msg.clientMessageId,
        conversationId: activeConversationId,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        mediaId: msg.media?.id,
      });
    },
    [activeConversationId, socketEmit]
  );

  const handleUserSwitched = (user: SessionUser, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    router.push("/chat");
    setTimeout(() => {
      fetchConversations();
    }, 100);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/");
  };

  const typingUsers = Array.from(typingUsersMap.values());

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        authToken,
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        hasMoreMessages,
        loadingMessages,
        loadingMoreMessages,
        typingUsers,
        socketStatus,
        socketEmit,
        notification,
        dismissNotification,
        fetchConversations,
        selectConversation,
        loadMoreMessages,
        replyingToMessage,
        setReplyingToMessage,
        forwardingMessage,
        setForwardingMessage,
        forwardMessage,
        reactToMessage,
        deleteMessage,
        sendMessage,
        retryMessage,
        handleUserSwitched,
        logout,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
