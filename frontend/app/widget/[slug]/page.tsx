"use client";
import { useState, useEffect, use, useRef, useMemo, useCallback } from "react";
import { X, Send, UserRound, MessageCircle } from "lucide-react";
import { ChatbotIcon } from "@/components/chatbot-icon";
import { WidgetConfig } from "@/types";
import { PREVIEW_CONFIG_MESSAGE } from "@/lib/widget-preview";

interface WidgetMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
}

const VISITOR_KEY = "rag_desk_visitor_id";
const CONTACT_KEY_PREFIX = "rag_desk_contact_";

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

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  instant: "Usually replies instantly",
  ai_assistant: "AI Assistant",
};

interface ServerMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
}

/**
 * Merge server-authoritative messages (from /history polling) with the locally
 * rendered list. The widget renders optimistic copies of messages it just sent
 * using client-generated ids, while the server stores the same logical messages
 * under its own ids. Matching by (role, content) lets us swap each optimistic
 * copy for its server version in place instead of appending duplicates — which
 * previously made every message appear twice after "Talk to human" escalation.
 */
function mergeServerMessages(
  prev: WidgetMessage[],
  serverMsgs: ServerMessage[]
): WidgetMessage[] {
  const next = [...prev];
  const used = new Set<string>();

  for (const sm of serverMsgs) {
    const role =
      sm.sender === "user" ? "user" : sm.sender === "agent" ? "agent" : "assistant";

    // 1) Exact server id is already rendered — nothing to do.
    const byId = next.findIndex((m) => m.id === sm.id);
    if (byId !== -1) {
      used.add(sm.id);
      continue;
    }

    // 2) A local copy with the same role + content (our optimistic send) —
    //    adopt the server id/createdAt in place so we don't duplicate it.
    const byContent = next.findIndex(
      (m) => !used.has(m.id) && m.role === role && m.content === sm.content
    );
    if (byContent !== -1) {
      next[byContent] = { ...next[byContent], id: sm.id, createdAt: sm.createdAt };
      used.add(sm.id);
      continue;
    }

    // 3) The local copy is still mid-stream (its content is a prefix of the
    //    stored version) — replace it with the complete server copy right away
    //    so a stream that dies partway never truncates or duplicates.
    const byPrefix = next.findIndex(
      (m) =>
        !used.has(m.id) &&
        m.role === role &&
        !!m.content &&
        m.content.length < sm.content.length &&
        sm.content.startsWith(m.content)
    );
    if (byPrefix !== -1) {
      next[byPrefix] = {
        ...next[byPrefix],
        id: sm.id,
        content: sm.content,
        createdAt: sm.createdAt,
      };
      used.add(sm.id);
      continue;
    }

    // 4) Genuinely new message (e.g. a human agent reply) — append.
    next.push({ id: sm.id, role, content: sm.content, createdAt: sm.createdAt });
    used.add(sm.id);
  }

  return next;
}

export default function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [prefersDark, setPrefersDark] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [contact, setContact] = useState<{ name: string; email: string; phone: string }>({
    name: "", email: "", phone: "",
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const [escalated, setEscalated] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const escalatedRef = useRef(false);

  // Keep a ref mirror of `escalated` so async callbacks (e.g. send) never read
  // a stale closure value between the "Talk to human" click and the re-render.
  useEffect(() => {
    escalatedRef.current = escalated;
  }, [escalated]);

  // ── Preview-mode refs ──────────────────────────────────────
  const isPreview = useRef(false);
  const previewOverrideRef = useRef<Partial<WidgetConfig> | null>(null);

  // Detect ?preview=1 once on mount.
  useEffect(() => {
    isPreview.current = new URLSearchParams(window.location.search).has("preview");
  }, []);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    const preview = isPreview.current;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/config?org=${slug}`)
      .then((r) => r.json())
      .then((cfg: WidgetConfig) => {
        // If a preview override arrived before the fetch finished, apply it.
        const merged = preview && previewOverrideRef.current
          ? { ...cfg, ...previewOverrideRef.current }
          : cfg;
        setConfig(merged);
        setIsOpen(preview ? true : !merged.startMinimized);
      })
      .catch(() => setConfig(null));
  }, [slug]);

  // ── Preview-mode listener: accept config overrides from the settings page ─
  useEffect(() => {
    if (!isPreview.current) return;
    function handlePreviewMessage(event: MessageEvent) {
      if (event.data?.type !== PREVIEW_CONFIG_MESSAGE) return;
      const incoming = event.data.config as Partial<WidgetConfig>;
      previewOverrideRef.current = incoming;
      setConfig((prev) => (prev ? { ...prev, ...incoming } : prev));
    }
    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, []);

  // Skip auto-open trigger messages in preview mode (the host-page embed
  // doesn't exist, and we force-open on mount anyway).
  useEffect(() => {
    if (!config || isPreview.current) return;
    window.parent.postMessage(
      {
        type: "rag-desk-widget-triggers",
        autoOpenSeconds: config.autoOpenSeconds,
        autoOpenOnScroll: config.autoOpenOnScroll,
        autoOpenOnExitIntent: config.autoOpenOnExitIntent,
      },
      "*"
    );
  }, [config]);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

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
    // In preview mode: use a throwaway visitor ID (never touch localStorage)
    // so testing the widget doesn't pollute real visitor history.
    if (isPreview.current) {
      setVisitorId(crypto.randomUUID());
      return;
    }

    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    setVisitorId(id);

    try {
      const saved = localStorage.getItem(CONTACT_KEY_PREFIX + slug);
      if (saved) {
        const parsed = JSON.parse(saved);
        setContact(parsed);
        setContactSubmitted(true);
      }
    } catch {
      /* ignore */
    }

    // Restore prior conversation and check escalation status in one call
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/history?org=${slug}&visitorId=${id}`)
      .then((r) => r.json())
      .then((data: { chatId: string | null; messages: { id: string; sender: string; content: string }[] }) => {
        if (data.chatId) {
          chatIdRef.current = data.chatId;
        }
        if (data.messages?.length) {
          // Detect if escalation happened (agent messages present)
          const hasAgent = data.messages.some((m) => m.sender === "agent");
          if (hasAgent) {
            setEscalated(true);
          }
          setMessages(
            data.messages.map((m) => ({
              id: m.id,
              role: m.sender === "ai" ? "assistant" : m.sender === "agent" ? "agent" : "user",
              content: m.content,
            }))
          );
          setShowWelcome(false);
        }
      })
      .catch(() => {
        /* no history available — start fresh, not fatal */
      });
  }, [slug]);

  // ---- Poll for new agent messages when escalated ----
  useEffect(() => {
    if (!escalated || !visitorId || !chatIdRef.current) return;
    const poll = () => {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/history?org=${slug}&visitorId=${visitorId}`
      )
        .then((r) => r.json())
        .then((data: { messages: ServerMessage[] }) => {
          if (data.messages?.length) {
            setMessages((prev) => mergeServerMessages(prev, data.messages));
          }
        })
        .catch(() => {});
    };
    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [escalated, visitorId, slug]);

  const handleEscalate = async () => {
    if (!chatIdRef.current || escalating) return;
    setEscalating(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/escalate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org: slug,
            chatId: chatIdRef.current,
            visitorId,
          }),
        }
      );
      if (res.ok) {
        setEscalated(true);
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: "You have been connected to a human agent. They will join shortly.",
          },
        ]);
      }
    } catch (err) {
      console.error("Escalation failed:", err);
    } finally {
      setEscalating(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const width = WIDTH_PX[config?.widgetWidth || "medium"];
  const height = HEIGHT_PX[config?.widgetHeight || "medium"];
  const radius = RADIUS_PX[config?.borderRadius || "rounded"];

  const reportState = useCallback(() => {
    window.parent.postMessage(
      {
        type: "rag-desk-widget-state",
        position: config?.position || "bottom-right",
        open: isOpen,
        width,
        height,
        radius,
        keepOpenAcrossPages: config?.keepOpenAcrossPages ?? false,
      },
      "*"
    );
  }, [config, isOpen, width, height, radius]);

  useEffect(() => {
    reportState();
  }, [reportState]);

  // Host page can ask us to auto-open (scroll / exit-intent / timer are detected there,
  // since a cross-origin iframe can't see host page scroll/mouse events directly)
  useEffect(() => {
    function handleHostMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== "rag-desk-request-open") return;
      setIsOpen(true);
    }
    window.addEventListener("message", handleHostMessage);
    return () => window.removeEventListener("message", handleHostMessage);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Minimize after inactivity (inert in preview mode — the iframe is always open)
  useEffect(() => {
    if (isPreview.current) return;
    const seconds = config?.minimizeAfterInactivitySeconds;
    if (!isOpen || !seconds) return;

    const reset = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => setIsOpen(false), seconds * 1000);
    };
    reset();
    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [isOpen, config?.minimizeAfterInactivitySeconds]);

  const accent = config?.color || "#3b82f6";
  const userBubble = config?.userBubbleColor || accent;
  const aiBubbleStyle = config?.aiBubbleColor
    ? { backgroundColor: config.aiBubbleColor }
    : undefined;
  const textStyle = config?.messageTextColor ? { color: config.messageTextColor } : undefined;

  const resolvedTheme = useMemo(() => {
    if (!config) return "dark";
    if (config.theme === "auto") return prefersDark ? "dark" : "light";
    return config.theme;
  }, [config, prefersDark]);

  const animClass =
    config?.animation && config.animation !== "none" ? `widget-anim-${config.animation}` : "";

  const needsContactForm =
    !!config &&
    (config.askVisitorName || config.askVisitorEmail || config.askVisitorPhone) &&
    !contactSubmitted;

  const contactRequired = !!config && (config.requireContactFields || !config.allowAnonymousChat);

  const submitContact = () => {
    if (!config) return;
    if (contactRequired) {
      if (config.askVisitorName && !contact.name.trim()) return setContactError("Please enter your name.");
      if (config.askVisitorEmail && !contact.email.trim()) return setContactError("Please enter your email.");
      if (config.askVisitorPhone && !contact.phone.trim()) return setContactError("Please enter your phone number.");
    }
    setContactError(null);
    setContactSubmitted(true);
    try {
      localStorage.setItem(CONTACT_KEY_PREFIX + slug, JSON.stringify(contact));
    } catch {
      /* ignore */
    }
  };

 const send = async (initialText?: string) => {
    const text = initialText ?? input;
    if (!text.trim() || !visitorId || sendingRef.current || loading) return;
    if (needsContactForm && contactRequired) return;

    sendingRef.current = true;
    setLoading(true);
    setShowWelcome(false);

    const userId = crypto.randomUUID();
    const aiId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", content: text },
      // Once escalated, the AI no longer replies — human agent answers arrive
      // through history polling — so don't render a phantom AI bubble (which
      // also prevented a bogus "Sorry, I didn't get a response" from showing).
      ...(escalatedRef.current ? [] : [{ id: aiId, role: "assistant", content: "" }]),
    ]);
    setInput("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/widget/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org: slug,
          message: text,
          visitorId,
          chatId: chatIdRef.current || undefined,
          visitorName: contact.name || undefined,
          visitorEmail: contact.email || undefined,
          visitorPhone: contact.phone || undefined,
        }),
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
      let gotAnyText = false;

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
            const parsed = JSON.parse(payload);
            if (parsed.chatId) {
              chatIdRef.current = parsed.chatId;
            }
            // Chat is in human-handoff mode (escalated / agent takeover /
            // resolved) — the server intentionally won't stream an AI reply.
            // Switch the UI to agent mode and drop the phantom AI bubble so we
            // don't surface a misleading "no response" error.
            if (parsed.status && parsed.status !== "active") {
              gotAnyText = true;
              setEscalated(true);
              setMessages((m) => m.filter((x) => x.id !== aiId));
              continue;
            }
            if (parsed.text) {
              gotAnyText = true;
              setMessages((m) =>
                m.map((x) => (x.id === aiId ? { ...x, content: x.content + parsed.text } : x))
              );
            }
          } catch {
            /* ignore keep-alive / non-json */
          }
        }
      }

      if (!gotAnyText) {
        setMessages((m) =>
          m.map((x) =>
            x.id === aiId
              ? { ...x, content: "Sorry, I didn't get a response. Please try again." }
              : x
          )
        );
      }
    } catch (err) {
      console.error("Widget chat error:", err);
      // If the stream delivered partial text before failing, keep it — the
      // history poll will replace it with the complete server copy. Only show
      // an error bubble when nothing at all came back.
      setMessages((m) =>
        m.map((x) =>
          x.id === aiId && !x.content
            ? { ...x, content: "Sorry, something went wrong. Please try again." }
            : x
        )
      );
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
  const headerBg = config?.headerBgColor || undefined;
  const headerText = config?.headerTextColor || undefined;

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
        {config?.botAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.botAvatarUrl} alt="" className="w-[62%] h-[62%] object-contain" />
        ) : (
          <ChatbotIcon className="w-[62%] h-[62%] transition-transform duration-150 group-hover:scale-110" />
        )}
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
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0"
        style={{ backgroundColor: headerBg, color: headerText }}
      >
        <div className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
          {config?.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.companyLogoUrl} alt="" className="w-full h-full object-cover" />
          ) : config?.botAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.botAvatarUrl} alt="" className="w-2/3 h-2/3 object-contain" />
          ) : (
            <ChatbotIcon className="w-2/3 h-2/3" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: headerText }}>
            {escalated ? "Support Agent" : (config?.botName || "Support AI")}
          </p>
          {(escalated) ? (
            <p className="text-xs opacity-80 truncate flex items-center gap-1" style={{ color: headerText }}>
              <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Connected to agent
            </p>
          ) : config?.showOnlineStatus ? (
            <p className="text-xs opacity-70 truncate" style={{ color: headerText }}>
              {STATUS_LABEL[config.statusText] || "Online"}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Talk to a human button — only when not escalated */}
          {!escalated && messages.length > 0 && !needsContactForm && (
            <button
              onClick={handleEscalate}
              disabled={escalating}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-current opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40 flex items-center gap-1"
              style={{ color: headerText || "currentColor" }}
            >
              <UserRound className="h-3 w-3" />
              {escalating ? "Connecting..." : "Talk to human"}
            </button>
          )}
          {config?.showCloseButton !== false && (
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-current opacity-70 hover:opacity-100 rounded-full p-1.5 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-background">
        {/* Welcome screen (only before the first message and contact form is done) */}
        {showWelcome && messages.length === 0 && !needsContactForm && (
          <div className="space-y-3">
            {(config?.welcomeTitle || config?.welcomeDescription) && (
              <div>
                {config?.welcomeTitle && (
                  <p className="text-base font-semibold text-foreground">{config.welcomeTitle}</p>
                )}
                {config?.welcomeDescription && (
                  <p className="text-sm text-muted-foreground mt-1">{config.welcomeDescription}</p>
                )}
              </div>
            )}
            <div className="text-left">
              <span className="inline-block px-3 py-2 rounded-2xl rounded-bl-sm bg-card text-card-foreground border border-border shadow-sm text-sm">
                {config?.greeting || "Hi! How can I help you today?"}
              </span>
            </div>
            {config && config.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {config.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary text-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pre-chat contact form */}
        {needsContactForm && (
          <div className="space-y-3 max-w-xs">
            {config?.welcomeTitle && (
              <p className="text-base font-semibold text-foreground">{config.welcomeTitle}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {config?.welcomeDescription || "Tell us a bit about yourself to get started."}
            </p>
            {config?.askVisitorName && (
              <input
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                placeholder="Your name"
                className="w-full border border-border bg-input/40 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
            )}
            {config?.askVisitorEmail && (
              <input
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                placeholder="Your email"
                type="email"
                className="w-full border border-border bg-input/40 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
            )}
            {config?.askVisitorPhone && (
              <input
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                placeholder="Your phone number"
                className="w-full border border-border bg-input/40 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
            )}
            {contactError && <p className="text-xs text-destructive">{contactError}</p>}
            <button
              onClick={submitContact}
              className="w-full rounded-lg py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              {config?.startChatButtonText || "Start Chat"}
            </button>
            {!contactRequired && (
              <button
                onClick={() => setContactSubmitted(true)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        )}

       {/* Messages */}
        {!needsContactForm &&
          messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
              {m.role === "system" ? (
                <div className="text-center">
                  <span
                    className="inline-block px-3 py-2 text-xs max-w-[90%] break-words whitespace-pre-wrap rounded-lg bg-secondary/50 text-muted-foreground italic"
                  >
                    {m.content}
                  </span>
                </div>
              ) : m.role === "agent" ? (
                <div>
                  <span
                    className="inline-block px-3 py-2 text-sm max-w-[85%] break-words whitespace-pre-wrap shadow-sm rounded-2xl rounded-bl-sm bg-emerald-500/10 text-foreground border border-emerald-500/30"
                  >
                    <span className="text-[10px] font-semibold text-emerald-500 block mb-0.5">
                      Agent
                    </span>
                    {m.content}
                  </span>
                </div>
              ) : (
                <span
                  className={`inline-block px-3 py-2 text-sm max-w-[85%] break-words whitespace-pre-wrap shadow-sm rounded-2xl ${
                    m.role === "user"
                      ? "rounded-br-sm"
                      : `rounded-bl-sm border border-border ${
                          config?.aiBubbleColor ? "" : "bg-card text-card-foreground"
                        }`
                  }`}
                  style={{
                    ...(m.role === "user"
                      ? { backgroundColor: userBubble, color: "#fff" }
                      : aiBubbleStyle),
                    ...(m.role === "assistant" ? textStyle : undefined),
                  }}
                >
                  {m.content ? (
                    m.content
                  ) : m.role === "assistant" && loading && config?.aiThinkingAnimation !== false ? (
                    <span className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                    </span>
                  ) : null}
                </span>
              )}
              {config?.showTimestamps && m.content && m.role !== "system" && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {config?.showReadReceipts && m.role === "user" && m.content && " · Seen"}
                </div>
              )}
            </div>
          ))}
        <div ref={bottomRef} />
      </div>

      {/* AI disclaimer — hide when escalated */}
      {config?.showAiDisclaimer && !needsContactForm && !escalated && (
        <p className="text-[10px] text-center text-muted-foreground py-1 border-t border-border/50">
          Responses are generated by AI and may be inaccurate.
        </p>
      )}

      {/* Input — show different placeholder when escalated */}
      {!needsContactForm && (
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
            placeholder={escalated ? "Reply to agent..." : "Type your message..."}
          />
          <button
            type="button"
            className="h-9 w-9 flex-shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95"
            style={{ backgroundColor: accent }}
            onClick={() => send()}
            disabled={!visitorId || loading || !input.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
