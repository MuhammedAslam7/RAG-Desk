"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiJson, apiFetch } from "@/lib/api-client";
import {
  EscalatedChat,
  EscalatedChatDetail,
  EscalationResult,
} from "@/types";

export function useEscalation() {
  const { isLoaded, isSignedIn } = useAuth();
  const [chats, setChats] = useState<EscalatedChat[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
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
      await refresh();
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
      await refresh();
      return result;
    },
    [refresh]
  );

  return {
    chats,
    loading,
    refresh,
    getDetail,
    claim,
    sendAgentReply,
    resolve,
  };
}
