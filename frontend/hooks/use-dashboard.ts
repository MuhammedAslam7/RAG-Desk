"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiJson } from "@/lib/api-client";
import { DashboardSummary } from "@/types";

export function useDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiJson<DashboardSummary>("/api/v1/dashboard/summary"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

  return { data, loading, refresh };
}