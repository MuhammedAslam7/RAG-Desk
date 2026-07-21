"use client";
import { useState, useEffect, use, useRef, useMemo } from "react";
import { X, Send } from "lucide-react";
import { ChatbotIcon } from "@/components/chatbot-icon";

interface WidgetConfig {
  orgName: string;
  status: string;
  greeting: string | null;
  color: string | null;
  position: string;
  theme: string;
  widgetWidth: string;
  widgetHeight: string;
  borderRadius: string;
  font: string;
  showShadow: boolean;
  animation: string;
}

interface WidgetMessage {
  id: string;
  role: string;
  content: string;
}

const VISITOR_KEY = "rag_desk_visitor_id";

const WIDTH_PX: Record<string, number> = { small: 320, medium: 380, large: 440 };
const HEIGHT_PX: Record<string, number> = { small: 480, medium: 600, large: 720 };
const RADIUS_PX: Record<string, number> = { square: 0, rounded: 16, full: 28 };
const FONT_STACK: Record<string, string> = {
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  roboto: "'Roboto', ui-sans-serif, system-ui, sans-serif",
  poppins: "'Poppins', ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, sans-serif",
};
const GOOGLE_FONT_HREF: Record<string, string> = {
  roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap",
  poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
};

export default function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [prefersDark, setPrefersDark] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/config?org=${slug}`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [slug]);

  // "auto" theme: best available proxy for the visitor's own preference
  // (cross-origin iframes can't read the host site's theme directly)
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Load a Google Font stylesheet on demand for the selected font
  useEffect(() => {
    const font = config?.font;
    if (!font || !GOOGLE_FONT_HREF[font]) return;
    const id = `widget-font-${font}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONT_HREF[font];
    document.head.appendChild(link);
  }, [config?.font]);

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

  const width = WIDTH_PX[config?.widgetWidth || "medium"];
  const height = HEIGHT_PX[config?.widgetHeight || "medium"];
  const radius = RADIUS_PX[config?.borderRadius || "rounded"];

  useEffect(() => {
    window.parent.postMessage(
      {
        type: "rag-desk-widget-state",
        position: config?.position || "bottom-right",
        open: isOpen,
        width,
        height,
        radius,
      },
      "*"
    );
  }, [config, isOpen, width, height, radius]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const accent = config?.color || "#3b82f6";

  const resolvedTheme = useMemo(() => {
    if (!config) return "dark";
    if (config.theme === "auto") return prefersDark ? "dark" : "light";
    return config.theme;
  }, [config, prefersDark]);

  const animClass =
    config?.animation && config.animation !== "none"
      ? `widget-anim-${config.animation}`
      : "";

  const send = async () => {
    if (!input.trim() || !visitorId || sendingRef.current || loading) return;
    sendingRef.current = true;
    setLoading(true);

    const msg = input;
    const userId = crypto.randomUUID();
    const aiId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", content: msg },
      { id: aiId, role: "assistant", content: "" },
    ]);
    setInput("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: slug, message: msg, visitorId }),
      });

      if (!res.ok || !res.body) {
        setMessages((m) =>
          m.map((x) =>
            x.id === aiId ? { ...x, content: "Sorry, something went wrong. Please try again." } : x
          )
        );
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
              setMessages((m) =>
                m.map((x) => (x.id === aiId ? { ...x, content: x.content + text } : x))
              );
            }
          } catch {
            /* ignore keep-alive / non-json */
          }
        }
      }
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (e.repeat || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };

  if (config?.status === "suspended" || config?.status === "inactive") {
    return null;
  }

  const fontFamily = FONT_STACK[config?.font || "inter"];

  // ---- CLOSED: bubble ----
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
        className={`group h-full w-full rounded-full flex items-center justify-center overflow-hidden bg-card border border-border transition-shadow hover:shadow-xl active:scale-95 ${
          config?.showShadow === false ? "" : "shadow-lg"
        } ${resolvedTheme === "light" ? "widget-light" : ""}`}
      >
        <ChatbotIcon className="w-[62%] h-[62%] transition-transform duration-150 group-hover:scale-110" />
      </button>
    );
  }

  // ---- OPEN ----
  return (
    <div
      key={isOpen ? "open" : "closed"}
      className={`relative flex flex-col h-full w-full bg-background text-foreground overflow-hidden border border-border ${
        config?.showShadow === false ? "" : "shadow-2xl"
      } ${resolvedTheme === "light" ? "widget-light" : ""} ${animClass}`}
      style={{ borderRadius: radius, fontFamily }}
    >
      <button
        onClick={() => setIsOpen(false)}
        aria-label="Close chat"
        className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full p-1.5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex-1 overflow-auto p-4 pt-12 space-y-3 bg-background">
        {messages.length === 0 && (
          <div className="text-left">
            <span className="inline-block px-3 py-2 rounded-2xl rounded-bl-sm bg-card text-card-foreground border border-border shadow-sm text-sm">
              {config?.greeting || "Hi! How can I help you today?"}
            </span>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block px-3 py-2 text-sm max-w-[85%] break-words whitespace-pre-wrap shadow-sm ${
                m.role === "user"
                  ? "rounded-2xl rounded-br-sm"
                  : "rounded-2xl rounded-bl-sm bg-card text-card-foreground border border-border"
              }`}
              style={m.role === "user" ? { backgroundColor: accent, color: "#fff" } : undefined}
            >
              {m.content ? (
                m.content
              ) : m.role === "assistant" && loading ? (
                <span className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                </span>
              ) : null}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-border flex-shrink-0 bg-card">
        <input
          ref={inputRef}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          name="widget-message"
          className="border border-border bg-input/40 text-foreground placeholder:text-muted-foreground rounded-full px-4 py-2 flex-1 outline-none text-sm focus-visible:ring-2"
          style={{ ["--tw-ring-color" as any]: accent }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!visitorId || loading}
          placeholder="Type your message..."
        />
        <button
          type="button"
          className="h-9 w-9 flex-shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95"
          style={{ backgroundColor: accent }}
          onClick={send}
          disabled={!visitorId || loading || !input.trim()}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}