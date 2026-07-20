"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Users,
  Bot,
  BookOpen,
  Layers,
  Users2,
  Mail,
  Lightbulb,
  Plus,
  Globe,
  FileText,
  HelpCircle,
  Search,
  Loader2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";

const PIE_COLORS: Record<string, string> = {
  pdf: "var(--chart-1)",
  docx: "var(--chart-1)",
  crawl: "var(--chart-2)",
  faq: "var(--chart-4)",
  text: "var(--chart-5)",
  csv: "var(--chart-3)",
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
    </Card>
  );
}

function ComingSoonCard({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="border-border border-dashed bg-card/40 p-5">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

export default function Dashboard() {
  const { data, loading } = useDashboard();
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const pieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.sourcesByType).map(([type, count]) => ({
      name: type.toUpperCase(),
      value: count,
      color: PIE_COLORS[type] || "var(--chart-3)",
    }));
  }, [data]);

  const filteredConversations = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.recentConversations;
    const q = search.toLowerCase();
    return data.recentConversations.filter(
      (c) =>
        c.visitorId.toLowerCase().includes(q) ||
        (c.lastMessage || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const isNewOrg =
    !!data &&
    data.kpis.totalConversations === 0 &&
    Object.keys(data.sourcesByType).length === 0;

  const copyWidgetHint = async () => {
    await navigator.clipboard.writeText(
      `Go to Settings → Embed on your website to copy your widget snippet.`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const onboardingSteps = [
    { label: "Create organization", done: true },
    { label: "Upload knowledge", done: Object.keys(data.sourcesByType).length > 0 },
    { label: "Add facts", done: data.kpis.facts > 0 },
    { label: "Test the AI", done: data.kpis.aiResponses > 0 },
    { label: "Install the widget", done: data.kpis.totalVisitors > 0 },
    { label: "Invite your team", done: data.kpis.teamMembers > 1 },
  ];
  const readyPct = Math.round(
    (onboardingSteps.filter((s) => s.done).length / onboardingSteps.length) * 100
  );

  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome, {data.orgName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s how your AI assistant is doing.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
          {/* Onboarding empty state */}
          {isNewOrg && (
            <Card className="border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Welcome! Let&apos;s get your assistant ready
                </h2>
                <span className="text-sm font-semibold text-primary">{readyPct}% ready</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {onboardingSteps.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        s.done ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {s.done && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className={s.done ? "text-foreground" : "text-muted-foreground"}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            <KpiCard icon={MessageSquare} label="Conversations" value={data.kpis.totalConversations} />
            <KpiCard icon={Users} label="Visitors" value={data.kpis.totalVisitors} />
            <KpiCard icon={Bot} label="AI Replies" value={data.kpis.aiResponses} />
            <KpiCard icon={BookOpen} label="Knowledge Sources" value={Object.values(data.sourcesByType).reduce((a, b) => a + b, 0)} />
            <KpiCard icon={Layers} label="Knowledge Chunks" value={data.kpis.knowledgeChunks} />
            <KpiCard icon={Lightbulb} label="Verified Facts" value={data.kpis.facts} />
            <KpiCard icon={Users2} label="Team Members" value={data.kpis.teamMembers} sub={`${data.kpis.pendingInvitations} pending invite${data.kpis.pendingInvitations === 1 ? "" : "s"}`} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-border bg-card p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Conversations — last 7 days
              </h2>
              {data.dailyConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-16 text-center">
                  No conversations yet this week.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.dailyConversations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversations"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Knowledge sources by type
              </h2>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-16 text-center">
                  Upload your first source to see this chart.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {pieData.map((e) => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                    {e.name} ({e.value})
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Quick actions + Widget status + Team */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Quick actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dashboard/knowledge">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Plus className="h-3.5 w-3.5" /> Upload doc
                  </Button>
                </Link>
                <Link href="/dashboard/knowledge">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <HelpCircle className="h-3.5 w-3.5" /> Add FAQ
                  </Button>
                </Link>
                <Link href="/dashboard/knowledge">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Globe className="h-3.5 w-3.5" /> Crawl site
                  </Button>
                </Link>
                <Link href="/dashboard/facts">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5" /> Add fact
                  </Button>
                </Link>
                <Link href="/dashboard/team">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Mail className="h-3.5 w-3.5" /> Invite teammate
                  </Button>
                </Link>
                <Link href="/dashboard/chat">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Bot className="h-3.5 w-3.5" /> Test chatbot
                  </Button>
                </Link>
              </div>
              <Button
                onClick={copyWidgetHint}
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2 mt-2"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy widget code
              </Button>
            </Card>

            <Card className="border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Widget status</h2>
                <Badge variant={data.widget.status === "active" ? "default" : "destructive"}>
                  {data.widget.status === "active" ? "Online" : data.widget.status}
                </Badge>
              </div>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Position</dt>
                  <dd className="text-foreground">{data.widget.position}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Color</dt>
                  <dd className="flex items-center gap-1.5 text-foreground">
                    <span
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: data.widget.color || "#3b82f6" }}
                    />
                    {data.widget.color || "#3b82f6"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Allowed domains</dt>
                  <dd className="text-foreground truncate max-w-[140px] text-right">
                    {data.widget.allowedDomains || "Any"}
                  </dd>
                </div>
              </dl>
              <Link href="/dashboard/settings">
                <Button variant="ghost" size="sm" className="w-full justify-center gap-1 mt-4">
                  Manage widget <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </Card>

            <Card className="border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Team</h2>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{data.kpis.teamMembers}</p>
                  <p className="text-xs text-muted-foreground">
                    active member{data.kpis.teamMembers === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {data.kpis.pendingInvitations > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {data.kpis.pendingInvitations} invitation
                  {data.kpis.pendingInvitations === 1 ? "" : "s"} pending
                </p>
              )}
              <Link href="/dashboard/team">
                <Button variant="ghost" size="sm" className="w-full justify-center gap-1 mt-4">
                  Manage team <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </Card>
          </div>

          {/* Recent conversations + activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Recent conversations</h2>
              {filteredConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No conversations match yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((c) => (
                    <Link
                      key={c.chatId}
                      href="/dashboard/conversations"
                      className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          Visitor {c.visitorId.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {c.lastSender === "ai" ? "AI: " : "Visitor: "}
                          {c.lastMessage || "—"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-3">
                        {timeAgo(c.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Recent activity</h2>
              {data.recentSources.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nothing added yet — upload your first source.
                </p>
              ) : (
                <div className="relative pl-4 border-l border-border space-y-5">
                  {data.recentSources.map((s) => (
                    <div key={s.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-xs text-muted-foreground">{timeAgo(s.createdAt)}</p>
                      <p className="text-sm text-foreground">
                        {s.type === "crawl" ? "Website crawled" : `${s.type.toUpperCase()} added`}
                        {" — "}
                        <span className="text-muted-foreground">{s.title}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Coming soon: AI performance / satisfaction / usage / system / insights */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                More insights (need extra tracking to enable)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ComingSoonCard
                title="AI performance"
                hint="Accuracy, latency, hallucination and escalation tracking — requires per-message logging."
              />
              <ComingSoonCard
                title="Customer satisfaction"
                hint="Star ratings after each chat — requires a rating prompt in the widget."
              />
              <ComingSoonCard
                title="Usage & billing"
                hint="Tokens, embeddings, and storage used — requires usage metering on the LLM/embedding calls."
              />
              <ComingSoonCard
                title="System health"
                hint="Backend, database, and LLM provider uptime — requires a status/health-check service."
              />
              <ComingSoonCard
                title="Notifications"
                hint="Crawl failures, storage warnings, invite acceptances — requires an events/notifications table."
              />
              <ComingSoonCard
                title="AI-generated business insights"
                hint="Trends like 'refund questions up 22%' — requires topic-tagging conversations over time."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}