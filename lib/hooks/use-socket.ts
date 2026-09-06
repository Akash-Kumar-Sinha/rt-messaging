"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SessionUser } from "../auth";

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";

export interface SocketMessageEvent {
  event: string;
  data: any;
}

export function useWebSocket(user: SessionUser | null, token: string | null) {
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const isAuthenticatedRef = useRef<boolean>(false);
  const pendingQueueRef = useRef<Map<string, { event: string; data: any }>>(new Map());
  const pendingEmitsRef = useRef<Array<{ event: string; data: any }>>([]);

  // Multi-tab synchronization scoped to user ID
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window && user?.id) {
      const channelName = `rt_chat_user_sync_${user.id}`;
      const bc = new BroadcastChannel(channelName);
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type && listenersRef.current.has(type)) {
          listenersRef.current.get(type)?.forEach((cb) => cb(payload));
        }
      };

      return () => {
        bc.close();
      };
    }
  }, [user?.id]);

  const emit = useCallback((event: string, data: any) => {
    const payload = JSON.stringify({ event, data });

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      (isAuthenticatedRef.current || event === "auth")
    ) {
      wsRef.current.send(payload);
    } else {
      pendingEmitsRef.current.push({ event, data });

      if (event === "message:send" && data?.clientMessageId) {
        pendingQueueRef.current.set(data.clientMessageId, { event, data });
      }
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  const connect = useCallback(() => {
    if (!token || !user) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus((prev) => (prev === "DISCONNECTED" ? "CONNECTING" : "RECONNECTING"));
    isAuthenticatedRef.current = false;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const defaultWsPort = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    const customWsUrl = process.env.NEXT_PUBLIC_WS_URL;
    const wsUrl =
      customWsUrl ||
      `${protocol}//${window.location.hostname}:${defaultWsPort}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("CONNECTED");
      reconnectAttemptsRef.current = 0;

      // Authenticate socket
      ws.send(JSON.stringify({ event: "auth", data: { token } }));
    };

    ws.onmessage = (messageEvent) => {
      try {
        const { event, data } = JSON.parse(messageEvent.data);

        if (event === "auth:success") {
          isAuthenticatedRef.current = true;

          // Flush queued emits once authenticated
          const queued = [...pendingEmitsRef.current];
          pendingEmitsRef.current = [];
          queued.forEach(({ event: evt, data: d }) => {
            try {
              ws.send(JSON.stringify({ event: evt, data: d }));
            } catch {}
          });

          // Flush pending queued messages
          if (pendingQueueRef.current.size > 0) {
            pendingQueueRef.current.forEach(({ event: evt, data: d }) => {
              try {
                ws.send(JSON.stringify({ event: evt, data: d }));
              } catch {}
            });
          }
        }

        if (event === "message:ack" && data?.clientMessageId) {
          pendingQueueRef.current.delete(data.clientMessageId);
        }

        if (listenersRef.current.has(event)) {
          listenersRef.current.get(event)?.forEach((cb) => cb(data));
        }

        if (["message:created", "message:sync", "message:read", "presence:update", "conversation:created"].includes(event)) {
          broadcastChannelRef.current?.postMessage({ type: event, payload: data });
        }
      } catch (err) {
        console.error("Failed to parse incoming WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setStatus("DISCONNECTED");
      isAuthenticatedRef.current = false;
      wsRef.current = null;

      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 8000);
      reconnectAttemptsRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.warn("WebSocket connection error:", err);
      ws.close();
    };
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, user, connect]);

  return {
    status,
    emit,
    on,
    reconnect: connect,
  };
}

