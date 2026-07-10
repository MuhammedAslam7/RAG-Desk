"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiJson } from "@/lib/api-client";
import { Fact } from "@/types";

export function useFacts() {
  const [facts, setFacts] = useState<Fact[]>([]);

  const refresh = useCallback(async () => {
    setFacts(await apiJson<Fact[]>("/api/v1/facts"));
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

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