"use client";
import { useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";

export default function Chat() {
  const { messages, input, setInput, send, loading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto flex h-[calc(100vh-57px)] w-full max-w-2xl flex-col px-4">
      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.length === 0 && !loading && (
          <div className="mt-24 text-center">
            <p className="text-lg font-medium">Ask me anything</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              I answer from your knowledge base and verified facts.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <span
              className="inline-block max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed"
              style={
                m.role === "user"
                  ? { background: "var(--accent)", color: "var(--accent-ink)" }
                  : { background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }
              }
            >
              {m.content || (loading ? "…" : "")}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex gap-2 border-t py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something…"
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}