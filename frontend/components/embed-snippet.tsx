// frontend/components/embed-snippet.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code2 } from "lucide-react";

export default function EmbedSnippet({
  slug,
  position,
}: {
  slug: string;
  position: string;
}) {
  const [copied, setCopied] = useState(false);
  const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_URL || window.location.origin;

// frontend/components/embed-snippet.tsx
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
    <Card className="border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Code2 className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Embed on your website</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Paste this snippet just before the closing{" "}
        <code className="text-xs bg-secondary px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
        If you change the widget position in Settings, re-copy and re-paste this snippet.
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
    </Card>
  );
}