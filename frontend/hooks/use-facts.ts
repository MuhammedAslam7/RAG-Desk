"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, apiJson } from "@/lib/api-client";
import { Fact } from "@/types";

export function useFacts() {
  const { isLoaded, isSignedIn } = useAuth();
  const [facts, setFacts] = useState<Fact[]>([]);

  const refresh = useCallback(async () => {
    setFacts(await apiJson<Fact[]>("/api/v1/facts"));
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

  const create = async (subject: string, value: string) => {
    await apiFetch("/api/v1/facts", {
      method: "POST",
      body: JSON.stringify({ subject, value }),
    });
    await refresh();
  };

  const update = async (id: string, value: string) => {
    await apiFetch("/api/v1/facts", {
      method: "PATCH",
      body: JSON.stringify({ id, value }),
    });
    await refresh();
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/v1/facts?id=${id}`, { method: "DELETE" });
    await refresh();
  };

  return { facts, create, update, remove, refresh };
}