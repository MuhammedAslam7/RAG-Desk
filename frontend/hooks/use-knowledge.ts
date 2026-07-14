"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, apiJson } from "@/lib/api-client";
import { KnowledgeSource } from "@/types";

async function authedUpload(path: string, form: FormData) {
  const token = await (window as any).Clerk?.session?.getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export function useKnowledge() {
  const { isLoaded, isSignedIn } = useAuth();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setSources(await apiJson<KnowledgeSource[]>("/api/v1/knowledge/list"));
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    refresh().catch(console.error);
  }, [isLoaded, isSignedIn, refresh]);

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
      await authedUpload("/api/v1/knowledge/upload", form);
    });

  const importFaqCsv = (file: File) =>
    wrap(async () => {
      const form = new FormData();
      form.append("file", file);
      await authedUpload("/api/v1/knowledge/faq/csv", form);
    });

  const remove = (id: string) =>
    wrap(async () => {
      await apiFetch(`/api/v1/knowledge/delete?id=${id}`, { method: "DELETE" });
    });

  return { sources, busy, addText, addFaq, crawl, upload, importFaqCsv, remove, refresh };
}