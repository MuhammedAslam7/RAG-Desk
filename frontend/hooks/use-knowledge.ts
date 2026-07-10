"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiJson } from "@/lib/api-client";
import { KnowledgeSource } from "@/types";

export function useKnowledge() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);

  const refresh = useCallback(async () => {
    setSources(await apiJson<KnowledgeSource[]>("/api/v1/knowledge/list"));
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const addText = async (title: string, content: string) => {
    await apiFetch("/api/v1/knowledge/text", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    await refresh();
  };

  const addFaq = async (question: string, answer: string) => {
    await apiFetch("/api/v1/knowledge/faq", {
      method: "POST",
      body: JSON.stringify({ question, answer }),
    });
    await refresh();
  };

  const crawl = async (url: string, limit = 10) => {
    await apiFetch("/api/v1/knowledge/crawl", {
      method: "POST",
      body: JSON.stringify({ url, limit }),
    });
    await refresh();
  };

  const upload = async (file: File, title?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);
    // note: no Content-Type header so the browser sets the multipart boundary
    const token = await (window as any).Clerk?.session?.getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/knowledge/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    await refresh();
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/v1/knowledge/delete?id=${id}`, { method: "DELETE" });
    await refresh();
  };

  return { sources, addText, addFaq, crawl, upload, remove, refresh };
}