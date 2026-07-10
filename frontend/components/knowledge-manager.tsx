"use client";
import { useState } from "react";
import { useKnowledge } from "@/hooks/use-knowledge";
import RichTextEditor from "@/components/rich-text-editor";

type Method = "upload" | "paste" | "rich" | "faq" | "faqcsv" | "crawl";

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: "upload", label: "Upload file", hint: "PDF, DOCX, CSV, TXT, MD" },
  { id: "paste", label: "Paste text", hint: "Plain text block" },
  { id: "rich", label: "Rich text", hint: "Formatted editor" },
  { id: "faq", label: "Add FAQ", hint: "One question + answer" },
  { id: "faqcsv", label: "Import FAQ CSV", hint: "Bulk question/answer" },
  { id: "crawl", label: "Crawl website", hint: "Fetch pages from a URL" },
];

const TYPE_LABEL: Record<string, string> = {
  text: "Text", faq: "FAQ", pdf: "PDF", docx: "DOCX", csv: "CSV", crawl: "Web",
};

export default function KnowledgeManager() {
  const { sources, busy, addText, addFaq, crawl, upload, importFaqCsv, remove } = useKnowledge();
  const [method, setMethod] = useState<Method>("upload");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Knowledge base</h1>
        <p className="mt-1 text-[0.9375rem]" style={{ color: "var(--text-muted)" }}>
          Everything here is what your AI can answer from. Add sources, then test in chat.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* method rail */}
        <nav className="flex flex-col gap-1">
          {METHODS.map((m) => (
            <button
              key={m.id}
              className="tab flex-col !items-start gap-0.5"
              data-active={method === m.id}
              onClick={() => setMethod(m.id)}
            >
              <span>{m.label}</span>
              <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>
                {m.hint}
              </span>
            </button>
          ))}
        </nav>

        {/* active input */}
        <div className="card p-6">
          {method === "upload" && <UploadPanel onUpload={upload} busy={busy} />}
          {method === "paste" && <PastePanel onAdd={addText} busy={busy} />}
          {method === "rich" && <RichPanel onAdd={addText} busy={busy} />}
          {method === "faq" && <FaqPanel onAdd={addFaq} busy={busy} />}
          {method === "faqcsv" && <FaqCsvPanel onImport={importFaqCsv} busy={busy} />}
          {method === "crawl" && <CrawlPanel onCrawl={crawl} busy={busy} />}
        </div>
      </div>

      {/* sources */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Sources</h2>
          <span className="text-sm" style={{ color: "var(--text-faint)" }}>
            {sources.length} total
          </span>
        </div>
        {sources.length === 0 ? (
          <div className="card flex flex-col items-center gap-1 px-6 py-12 text-center">
            <p className="font-medium">No knowledge yet</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Add your first source above. Your AI stays quiet until it has something to read.
            </p>
          </div>
        ) : (
          <ul className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3"
                  style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {s.chunkCount} chunks
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge">{TYPE_LABEL[s.type] ?? s.type}</span>
                  <button className="btn btn-danger px-2.5 py-1 text-sm" onClick={() => remove(s.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---- panels ---- */

function UploadPanel({ onUpload, busy }: { onUpload: (f: File) => void; busy: boolean }) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <h3 className="mb-1 font-semibold">Upload a file</h3>
      <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
        PDF, DOCX, CSV, TXT, or Markdown. We extract, chunk, and embed it.
      </p>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition-colors"
        style={{
          borderColor: drag ? "var(--accent)" : "var(--border-strong)",
          background: drag ? "var(--accent-soft)" : "transparent",
        }}
      >
        <span className="font-medium">{busy ? "Uploading…" : "Drop a file or click to browse"}</span>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>Max ~20MB</span>
        <input
          type="file" accept=".pdf,.docx,.csv,.txt,.md,.markdown" className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
      </label>
    </div>
  );
}

function PastePanel({ onAdd, busy }: { onAdd: (t: string, c: string) => void; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Paste text</h3>
      <div>
        <label className="label">Title</label>
        <input className="input" placeholder="Refund policy" value={title}
               onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Content</label>
        <textarea className="textarea" rows={8} placeholder="Paste anything…"
                  value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy || !title.trim() || !content.trim()}
              onClick={() => { onAdd(title, content); setTitle(""); setContent(""); }}>
        {busy ? "Adding…" : "Add to knowledge"}
      </button>
    </div>
  );
}

function RichPanel({ onAdd, busy }: { onAdd: (t: string, c: string) => void; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Rich text</h3>
      <div>
        <label className="label">Title</label>
        <input className="input" placeholder="Onboarding guide" value={title}
               onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Content</label>
        <RichTextEditor onChange={setContent} />
      </div>
      <button className="btn btn-primary" disabled={busy || !title.trim() || !content.trim()}
              onClick={() => { onAdd(title, content); setTitle(""); setContent(""); }}>
        {busy ? "Adding…" : "Add to knowledge"}
      </button>
    </div>
  );
}

function FaqPanel({ onAdd, busy }: { onAdd: (q: string, a: string) => void; busy: boolean }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Add a single FAQ</h3>
      <div>
        <label className="label">Question</label>
        <input className="input" placeholder="How do I reset my password?" value={q}
               onChange={(e) => setQ(e.target.value)} />
      </div>
      <div>
        <label className="label">Answer</label>
        <textarea className="textarea" rows={5} value={a} onChange={(e) => setA(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy || !q.trim() || !a.trim()}
              onClick={() => { onAdd(q, a); setQ(""); setA(""); }}>
        {busy ? "Adding…" : "Add FAQ"}
      </button>
    </div>
  );
}

function FaqCsvPanel({ onImport, busy }: { onImport: (f: File) => void; busy: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Import FAQ CSV</h3>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        A CSV with <code>question</code> and <code>answer</code> columns. Each row becomes a FAQ.
      </p>
      <label className="btn btn-ghost cursor-pointer">
        {busy ? "Importing…" : "Choose CSV"}
        <input type="file" accept=".csv" className="hidden"
               onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
      </label>
    </div>
  );
}

function CrawlPanel({ onCrawl, busy }: { onCrawl: (u: string, l?: number) => void; busy: boolean }) {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(10);
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Crawl a website</h3>
      <div>
        <label className="label">Start URL</label>
        <input className="input" placeholder="https://docs.example.com" value={url}
               onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div>
        <label className="label">Page limit</label>
        <input className="input max-w-32" type="number" min={1} max={100} value={limit}
               onChange={(e) => setLimit(Number(e.target.value))} />
      </div>
      <button className="btn btn-primary" disabled={busy || !url.trim()}
              onClick={() => { onCrawl(url, limit); setUrl(""); }}>
        {busy ? "Crawling…" : "Crawl"}
      </button>
    </div>
  );
}