// frontend/hooks/use-widget-sessions.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiJson } from "@/lib/api-client";
import { WidgetSession, WidgetSessionDetail } from "@/types";

export function useWidgetSessions() {
  const { isLoaded, isSignedIn } = useAuth();
  const [sessions, setSessions] = useState<WidgetSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await apiJson<WidgetSession[]>("/api/v1/chat/widget-sessions"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

  const getDetail = (chatId: string) =>
    apiJson<WidgetSessionDetail>(`/api/v1/chat/widget-sessions/${chatId}`);

  return { sessions, loading, refresh, getDetail };
}