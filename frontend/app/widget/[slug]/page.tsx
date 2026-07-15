// frontend/app/widget/[slug]/page.tsx
"use client";
import { useState, useEffect, use, useRef } from "react";

interface WidgetConfig {
  orgName: string;
  status: string;
  greeting: string | null;
  color: string | null;
  position: string;
}

interface WidgetMessage {
  role: string;
  content: string;
}

const VISITOR_KEY = "rag_desk_visitor_id";

export default function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch org branding/config on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/config?org=${slug}`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [slug]);

  // Create/load a stable anonymous visitor id, client-side only
  useEffect(() => {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    setVisitorId(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const accent = config?.color || "#3b82f6";

  const send = async () => {
    if (!input.trim() || !visitorId || loading) return;
    const msg = input;
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: slug, message: msg, visitorId }),
      });

      if (!res.ok || !res.body) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1].content = "Sorry, something went wrong. Please try again.";
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1].content += text;
                return copy;
              });
            }
          } catch {
            /* ignore keep-alive / non-json */
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      send();
    }
  };

  if (config?.status === "suspended" || config?.status === "inactive") {
    return (
      <div className="p-4 text-sm text-gray-500 flex items-center justify-center h-full">
        This assistant is currently unavailable.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-white">
      <div
        className="p-3 border-b font-semibold flex-shrink-0"
        style={{ backgroundColor: accent, color: "#fff" }}
      >
        {config?.orgName || "Support"}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-left">
            <span className="inline-block px-3 py-2 rounded bg-gray-100 text-gray-800">
              {config?.greeting || "Hi! How can I help you today?"}
            </span>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className="inline-block px-3 py-2 rounded max-w-[85%] break-words whitespace-pre-wrap"
              style={
                m.role === "user"
                  ? { backgroundColor: accent, color: "#fff" }
                  : { background: "#f3f4f6", color: "#1f2937" }
              }
            >
              {m.content || (m.role === "assistant" && loading ? "…" : "")}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t flex-shrink-0">
        <input
          className="border rounded px-2 py-1 flex-1 outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as any]: accent }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!visitorId || loading}
          placeholder="Type your message..."
        />
        <button
          className="px-3 py-1 text-white rounded disabled:opacity-50"
          style={{ backgroundColor: accent }}
          onClick={send}
          disabled={!visitorId || loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}