"use client";

import { useState, useCallback, useEffect } from "react";
import { apiJson } from "@/lib/api-client";

export interface WidgetSessionSummary {
  chatId: string;
  visitorId: string | null;
  createdAt: string;
  messageCount: number;
  lastMessage: string | null;
  lastSender: string | null;
}

export interface WidgetSessionMessage {
  sender: string;
  content: string;
  createdAt: string;
}

export interface WidgetSessionDetail {
  chatId: string;
  visitorId: string | null;
  createdAt: string;
  messages: WidgetSessionMessage[];
}

export function useConversations() {
  const [sessions, setSessions] = useState<WidgetSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiJson<WidgetSessionSummary[]>(
        "/api/v1/chat/widget-sessions"
      );

      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch widget sessions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getDetail = useCallback(
    (chatId: string): Promise<WidgetSessionDetail> =>
      apiJson<WidgetSessionDetail>(
        `/api/v1/chat/widget-sessions/${chatId}`
      ),
    []
  );

  return {
    sessions,
    loading,
    refresh,
    getDetail,
  };
}