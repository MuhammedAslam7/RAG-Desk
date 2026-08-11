// frontend/components/embed-snippet.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function EmbedSnippet({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_URL || window.location.origin;

  const snippet = `<script
  src="${widgetOrigin}/widget.js"
  data-org="${slug}"
  data-url="${widgetOrigin}"
  async
></script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        Paste this snippet just before the closing{" "}
        <code className="text-xs bg-secondary px-1 py-0.5 rounded">&lt;/body&gt;</code> tag of
        your website to activate the widget. That&apos;s it — everything else is
        configured here in Settings.
      </p>
      <div className="relative">
        <pre className="bg-background border border-border rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono">
          {snippet}
        </pre>
        <Button size="sm" variant="outline" onClick={copy} className="absolute top-2 right-2 gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </>
  );
}