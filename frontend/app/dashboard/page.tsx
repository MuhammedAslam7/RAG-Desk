"use client";

import Link from "next/link";
import { FileText, Lightbulb, MessageSquare, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  {
    href: "/dashboard/knowledge",
    title: "Upload docs, import FAQs, or crawl a site to build your knowledge base.",
    icon: FileText,
    color: "from-indigo-500/40 to-blue-500/40",
  },
  {
    href: "/dashboard/facts",
    title: "Pin current truths your AI should always trust over older documents.",
    icon: Lightbulb,
    color: "from-purple-500/40 to-pink-500/40",
  },
  {
    href: "/",
    title: "Ask a question and see how the assistant answers from your knowledge.",
    icon: MessageSquare,
    color: "from-cyan-500/40 to-blue-500/40",
  },
];

const QUICK_TIPS = [
  {
    icon: "📄",
    title: "Start with docs",
    description: "Upload PDFs or paste text to teach your AI",
  },
  {
    icon: "📌",
    title: "Add facts",
    description: "Pin key information to override old data",
  },
  {
    icon: "💬",
    title: "Test & refine",
    description: "Chat to verify answers before going live",
  },
];

export default function Dashboard() {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Welcome back</h1>
        <p className="text-muted-foreground">
          Manage your AI knowledge base and get started with your assistant.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <Card className="h-full border-border bg-gradient-to-br from-card/80 to-card hover:from-card hover:to-card/80 transition-all cursor-pointer group overflow-hidden">
                    {/* Top gradient section */}
                    <div
                      className={`h-40 bg-gradient-to-br ${action.color} flex items-center justify-center border-b border-border/50`}
                    >
                      <Icon className="h-16 w-16 text-primary/60 group-hover:text-primary transition-colors" />
                    </div>

                    {/* Content section */}
                    <div className="p-6">
                      <p className="text-sm text-foreground leading-relaxed mb-4">
                        {action.title}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-primary hover:text-primary/80 gap-2 h-auto font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Get started
                      </Button>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Tips Section */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              Quick Tips
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {QUICK_TIPS.map((tip, idx) => (
                <Card
                  key={idx}
                  className="border-border bg-gradient-to-br from-card/80 to-card p-6 hover:from-card hover:to-card/80 transition-all"
                >
                  <div className="text-3xl mb-3">{tip.icon}</div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tip.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
