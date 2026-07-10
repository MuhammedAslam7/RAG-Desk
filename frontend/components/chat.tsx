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
    <div className="max-w-2xl mx-auto w-full flex flex-col h-screen p-4">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block px-3 py-2 rounded-lg whitespace-pre-wrap ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
              }`}
            >
              {m.content || (loading ? "…" : "")}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 pt-3"
      >
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something…"
          disabled={loading}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          disabled={loading}
        >
          Send
        </button>
      </form>
    </div>
  );
}