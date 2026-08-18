"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiJson, apiUpload, apiUploadJob } from "@/lib/api-client";
import { KnowledgeJob, KnowledgeSource, KnowledgeSourceList } from "@/types";

const PAGE_SIZE = 20;
const POLL_MS = 800;

export type JobProgress = (p: KnowledgeJob) => void;

async function pollJob(jobId: string, onProgress?: JobProgress): Promise<KnowledgeJob> {
  for (;;) {
    const status = await apiJson<KnowledgeJob>(`/api/v1/knowledge/jobs/${jobId}`);
    onProgress?.(status);
    if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
      return status;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

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

  const crawl = (url: string, limit = 10, onProgress?: JobProgress) =>
    wrap(async () => {
      const { jobId } = await apiJson<{ jobId: string }>(
        "/api/v1/knowledge/crawl",
        { method: "POST", body: JSON.stringify({ url, limit }) }
      );
      const result = await pollJob(jobId, onProgress);
      if (result.status === "failed") throw new Error(result.error || "Crawl failed");
    });

  const upload = (file: File, title?: string, onProgress?: JobProgress) =>
    wrap(async () => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      // Real byte-level upload progress first, then poll the processing job.
      // Upload occupies the 0-10% band and processing the 10-100% band, so
      // the bar only ever moves forward (no 100% -> low-% jump between phases).
      const { jobId } = await apiUploadJob(
        "/api/v1/knowledge/upload",
        form,
        (loaded, total) => {
          if (total <= 0) return;
          const pct = Math.round((loaded / total) * 10);
          onProgress?.({
            id: "",
            kind: "upload",
            status: "running",
            stage: "uploading",
            progress: pct,
            message: "Uploading file…",
            error: null,
          });
        }
      );
      const result = await pollJob(jobId, (status) =>
        onProgress?.({
          ...status,
          progress: 10 + Math.round(status.progress * 0.9),
        })
      );
      if (result.status === "failed") throw new Error(result.error || "Upload failed");
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