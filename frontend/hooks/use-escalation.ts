"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiJson, apiFetch } from "@/lib/api-client";
import {
  EscalatedChat,
  EscalatedChatDetail,
  EscalationResult,
} from "@/types";

export type RealtimeMessage = {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
};

export type RealtimeChatEvent =
  | { type: "chat_updated"; chatId: string; status: string }
  | { type: "message"; chatId: string; message: RealtimeMessage };

type EventListener = (evt: RealtimeChatEvent) => void;

export function useEscalation() {
  const { isLoaded, isSignedIn } = useAuth();
  const [chats, setChats] = useState<EscalatedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const listeners = useRef(new Set<EventListener>());

  /**
   * Reload the conversation list. Only the first load (or an explicit,
   * non-silent call) toggles the full-page loader — background refreshes
   * (SSE events, safety-net poll) pass silent=true so the UI never flashes.
   */
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setChats(
        await apiJson<EscalatedChat[]>("/api/v1/chat/escalated")
      );
    } catch (err) {
      console.error("Failed to load escalated chats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

  // Real-time event stream: one EventSource per signed-in user, fanning
  // events out to every subscriber. EventSource reconnects automatically,
  // so a dropped connection (deploy, network blip) recovers on its own.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/events`;
    const es = new EventSource(url, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as RealtimeChatEvent;
        listeners.current.forEach((cb) => cb(evt));
      } catch {
        /* ignore heartbeats / non-JSON frames */
      }
    };
    // onerror: EventSource handles reconnection itself; nothing to do here.
    return () => es.close();
  }, [isLoaded, isSignedIn]);

  const subscribeToEvents = useCallback((cb: EventListener) => {
    listeners.current.add(cb);
    return () => {
      listeners.current.delete(cb);
    };
  }, []);

  const getDetail = useCallback(
    (chatId: string) =>
      apiJson<EscalatedChatDetail>(`/api/v1/chat/escalated/${chatId}`),
    []
  );

  const claim = useCallback(
    async (chatId: string) => {
      const result = await apiJson<EscalationResult>(
        `/api/v1/chat/${chatId}/claim`,
        { method: "POST" }
      );
      await refresh(true);
      return result;
    },
    [refresh]
  );

  const sendAgentReply = useCallback(
    async (chatId: string, content: string) => {
      const res = await apiFetch(`/api/v1/chat/${chatId}/agent-reply`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    []
  );

  const resolve = useCallback(
    async (chatId: string) => {
      const result = await apiJson<EscalationResult>(
        `/api/v1/chat/${chatId}/resolve`,
        { method: "POST" }
      );
      await refresh(true);
      return result;
    },
    [refresh]
  );

  return {
    chats,
    loading,
    refresh,
    subscribeToEvents,
    getDetail,
    claim,
    sendAgentReply,
    resolve,
  };
}
