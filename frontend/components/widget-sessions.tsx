// frontend/components/widget-sessions.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, User as UserIcon, X } from "lucide-react";
import { useWidgetSessions } from "@/hooks/use-widget-sessions";
import { WidgetSessionDetail } from "@/types";

export default function WidgetSessions() {
  const { sessions, loading } = useWidgetSessions();
  const { getDetail } = useWidgetSessions();
  const [detail, setDetail] = useState<WidgetSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openChat = async (chatId: string) => {
    setDetailLoading(true);
    try {
      setDetail(await getDetail(chatId));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Customer Conversations
        </h1>
        <p className="text-muted-foreground">
          Real conversations from your website widget
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <Card className="border-border bg-card/50 p-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No customer conversations yet
              </h3>
              <p className="text-muted-foreground">
                Once your widget is live on your website, conversations will show up here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <Card
                  key={s.chatId}
                  onClick={() => openChat(s.chatId)}
                  className="border-border bg-card/50 hover:bg-card transition-all p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          Visitor {s.visitorId.slice(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {s.lastSender === "ai" ? "AI: " : "Visitor: "}
                          {s.lastMessage || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="secondary">{s.messageCount} messages</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="border-border bg-card w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="font-semibold text-foreground">
                Visitor {detail.visitorId.slice(0, 8)}
              </p>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {detailLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              ) : (
                detail.messages.map((m, i) => (
                  <div key={i} className={m.sender === "user" ? "text-right" : "text-left"}>
                    <span
                      className={`inline-block px-3 py-2 rounded-lg text-sm max-w-[85%] ${
                        m.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.content}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}