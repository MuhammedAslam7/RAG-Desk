"use client";
import { useState, use } from "react";

export default function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    const msg = input;
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setInput("");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: slug, message: msg }),
    });
    if (!res.body) return;

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
        if (payload === "[DONE]") return;
        try {
          const { text } = JSON.parse(payload);
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1].content += text;
            return copy;
          });
        } catch {}
      }
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="space-y-2 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="inline-block px-2 py-1 rounded bg-gray-100">{m.content}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}