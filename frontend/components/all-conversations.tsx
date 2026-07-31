"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, Search, X, UserRound } from "lucide-react";
import { useConversations, WidgetSessionDetail } from "@/hooks/use-conversations";

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function AllConversations() {
  const { sessions, loading, getDetail } = useConversations();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<WidgetSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.visitorId || "").toLowerCase().includes(q) ||
      (s.lastMessage || "").toLowerCase().includes(q)
    );
  });

  const open = async (chatId: string) => {
    setDetailLoading(true);
    try {
      setDetail(await getDetail(chatId));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">All Conversations</h1>
          <p className="text-muted-foreground">
            Every widget conversation — {sessions.length} total
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitor or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-border bg-card/50 p-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No conversations yet
              </h3>
              <p className="text-muted-foreground">
                Widget conversations will show up here once visitors start chatting.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {filtered.map((s) => (
                  <Card
                    key={s.chatId}
                    onClick={() => open(s.chatId)}
                    className={`border-border bg-card/50 hover:bg-card transition-all p-4 cursor-pointer ${
                      detail?.chatId === s.chatId ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserRound className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            Visitor {(s.visitorId || "unknown").slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {s.lastSender === "ai" ? "AI: " : s.lastSender === "agent" ? "Agent: " : "Visitor: "}
                            {s.lastMessage || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="secondary">{s.messageCount} msgs</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(s.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="lg:sticky lg:top-0">
                {detailLoading ? (
                  <Card className="border-border bg-card/50 h-[600px] flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </Card>
                ) : detail ? (
                  <Card className="border-border bg-card flex flex-col h-[600px]">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <p className="font-semibold text-foreground text-sm">
                        Visitor {(detail.visitorId || "unknown").slice(0, 8)}
                      </p>
                      <button
                        onClick={() => setDetail(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ScrollArea className="flex-1 p-4 space-y-3">
                      {detail.messages.map((m, i) => (
                        <div
                          key={i}
                          className={`flex mb-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                              m.sender === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : m.sender === "agent"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-foreground rounded-bl-sm"
                                : "bg-card border border-border text-foreground rounded-bl-sm"
                            }`}
                          >
                            {m.sender === "agent" && (
                              <span className="text-[10px] font-semibold text-emerald-500 block mb-0.5">Agent</span>
                            )}
                            {m.sender === "ai" && (
                              <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">AI</span>
                            )}
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </Card>
                ) : (
                  <Card className="border-border bg-card/50 p-12 text-center h-[600px] flex flex-col items-center justify-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Click a conversation to view its full message history.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}