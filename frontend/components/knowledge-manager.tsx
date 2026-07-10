"use client";
import { useState } from "react";
import { useKnowledge } from "@/hooks/use-knowledge";

export default function KnowledgeManager() {
  const { sources, addText, addFaq, crawl, upload, remove } = useKnowledge();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">Knowledge base</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Add text</h2>
        <input className="border rounded px-2 py-1 w-full" placeholder="title"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="border rounded px-2 py-1 w-full" rows={4} placeholder="content"
          value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="px-3 py-1 rounded bg-blue-600 text-white"
          onClick={async () => { await addText(title, content); setTitle(""); setContent(""); }}>
          Add text
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Upload file (pdf/docx/csv/txt)</h2>
        <input type="file" accept=".pdf,.docx,.csv,.txt"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Crawl a site</h2>
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="https://…"
            value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={async () => { await crawl(url); setUrl(""); }}>
            Crawl
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Sources</h2><ul className="space-y-1">
          {sources.map((s) => (
            <li key={s.id} className="flex justify-between border-b py-1">
              <span>{s.title} <em className="text-gray-500">({s.type}, {s.chunkCount} chunks)</em></span>
              <button className="text-red-600" onClick={() => remove(s.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}