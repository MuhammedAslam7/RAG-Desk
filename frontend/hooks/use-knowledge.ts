"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiJson, apiUpload } from "@/lib/api-client";
import { KnowledgeSource, KnowledgeSourceList } from "@/types";

const PAGE_SIZE = 20;

export function useKnowledge() {
  const { isLoaded, isSignedIn } = useAuth();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (offset: number) => {
    return apiJson<KnowledgeSourceList>(
      `/api/v1/knowledge/list?limit=${PAGE_SIZE}&offset=${offset}`
    );
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchPage(0);
    setSources(data.items);
    setTotal(data.total);
  }, [fetchPage]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || sources.length >= total) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(sources.length);
      setSources((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, sources.length, total, fetchPage]);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const addText = (title: string, content: string) =>
    wrap(async () => {
      await apiFetch("/api/v1/knowledge/text", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
    });

  const addFaq = (question: string, answer: string) =>
    wrap(async () => {
      await apiFetch("/api/v1/knowledge/faq", {
        method: "POST",
        body: JSON.stringify({ question, answer }),
      });
    });

  const crawl = (url: string, limit = 10) =>
    wrap(async () => {
      await apiFetch("/api/v1/knowledge/crawl", {
        method: "POST",
        body: JSON.stringify({ url, limit }),
      });
    });

  const upload = (file: File, title?: string) =>
    wrap(async () => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      await apiUpload("/api/v1/knowledge/upload", form);
    });

  const importFaqCsv = (file: File) =>
    wrap(async () => {
      const form = new FormData();
      form.append("file", file);
      await apiUpload("/api/v1/knowledge/faq/csv", form);
    });

  const remove = (id: string) =>
    wrap(async () => {
      await apiFetch(`/api/v1/knowledge/delete?id=${id}`, { method: "DELETE" });
    });

  return {
    sources,
    total,
    busy,
    loadingMore,
    loadMore,
    addText,
    addFaq,
    crawl,
    upload,
    importFaqCsv,
    remove,
    refresh,
  };
}