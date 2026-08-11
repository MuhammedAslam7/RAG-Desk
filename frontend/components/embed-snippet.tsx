// frontend/components/embed-snippet.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

const REVEAL_SECONDS = 3;

export default function EmbedSnippet({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS);

  const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_URL || window.location.origin;

  const snippet = `<script
  src="${widgetOrigin}/widget.js"
  data-org="${slug}"
  data-url="${widgetOrigin}"
  async
></script>`;

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
        <Button
          size="sm"
          variant={revealed ? "secondary" : "outline"}
          onClick={toggleReveal}
          className="gap-1.5 flex-shrink-0"
          aria-expanded={revealed}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealed ? "Hide code" : "Show code"}
        </Button>
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