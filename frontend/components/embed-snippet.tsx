// frontend/components/embed-snippet.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye, EyeOff, RotateCcw, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const REVEAL_SECONDS = 3;

export default function EmbedSnippet({
  token,
  onRotate,
}: {
  token: string;
  onRotate: (newToken: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS);
  const [rotating, setRotating] = useState(false);

  const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_URL || window.location.origin;

  // The embed exposes the org's opaque *widget token* — never the slug. This
  // matches how Intercom (app_id), Crisp (website_id) and Chatwoot
  // (websiteToken) identify embeds publicly.
  const snippet = `<script
  src="${widgetOrigin}/widget.js"
  data-token="${token}"
  data-url="${widgetOrigin}"
  async
></script>`;

  const rotate = async () => {
    if (
      !window.confirm(
        "Regenerating your widget token immediately breaks every existing embed. " +
          "You'll need to re-paste the new snippet. Continue?"
      )
    )
      return;
    setRotating(true);
    try {
      const res = await apiFetch("/api/v1/settings/rotate-widget-token", {
        method: "POST",
      });
      const data = await res.json();
      onRotate(data.widgetToken);
      setCopied(false);
      setRevealed(true);
    } finally {
      setRotating(false);
    }
  };

  // Auto-hide the snippet a few seconds after it's revealed
  useEffect(() => {
    if (!revealed) return;
    const end = Date.now() + REVEAL_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        setRevealed(false);
        setCopied(false);
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [revealed]);

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReveal = () => {
    if (!revealed) {
      setSecondsLeft(REVEAL_SECONDS);
      setCopied(false);
      setRevealed(true);
    } else {
      setRevealed(false);
      setCopied(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Paste this snippet just before the closing{" "}
          <code className="text-xs bg-secondary px-1 py-0.5 rounded">&lt;/body&gt;</code> tag of
          your website to activate the widget. That&apos;s it — everything else is
          configured here in Settings.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={rotate}
            disabled={rotating}
            className="gap-1.5"
            title="Regenerate the widget token. Existing embeds stop working immediately."
          >
            {rotating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Regenerate
          </Button>
          <Button
            size="sm"
            variant={revealed ? "secondary" : "outline"}
            onClick={toggleReveal}
            className="gap-1.5"
            aria-expanded={revealed}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? "Hide code" : "Show code"}
          </Button>
        </div>
      </div>

      {revealed && (
        <div className="relative mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <pre className="bg-background border border-border rounded-lg p-4 pr-28 text-xs text-foreground overflow-x-auto font-mono">
            {snippet}
          </pre>
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground bg-secondary rounded-md px-1.5 py-1.5 tabular-nums">
              hides in {secondsLeft}s
            </span>
            <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}