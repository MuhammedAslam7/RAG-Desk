"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  UserRound,
  Mail,
  Handshake,
  CheckCircle,
  Send,
  X,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { useEscalation } from "@/hooks/use-escalation";
import { EscalatedChatDetail } from "@/types";

export default function EscalationManager() {
  const {
    chats,
    loading,
    refresh,
    getDetail,
    claim,
    sendAgentReply,
    resolve,
  } = useEscalation();

  const [detail, setDetail] = useState<EscalatedChatDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Auto-scroll when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  const openChat = async (chatId: string) => {
    setDetailLoading(true);
    try {
      const d = await getDetail(chatId);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClaim = async (chatId: string) => {
    try {
      await claim(chatId);
      setClaimedId(chatId);
      // Refresh detail to show updated status
      const d = await getDetail(chatId);
      setDetail(d);
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !detail || sending) return;
    setSending(true);
    try {
      const result = await sendAgentReply(detail.chatId, replyText);
      setReplyText("");
      // Refresh the detail to show the new message
      const d = await getDetail(detail.chatId);
      setDetail(d);
    } catch (err) {
      console.error("Send reply failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (chatId: string) => {
    try {
      await resolve(chatId);
      setDetail(null);
      setClaimedId(null);
    } catch (err) {
      console.error("Resolve failed:", err);
    }
  };

  const renderMessages = () => {
    if (!detail) return null;
    return detail.messages.map((m) => (
      <div
        key={m.id}
        className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} mt-3`}
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
            <span className="text-[10px] font-semibold text-emerald-500 block mb-0.5">
              Agent
            </span>
          )}
          {m.sender === "ai" && (
            <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
              AI
            </span>
          )}
          {m.content}
        </div>
      </div>
    ));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "escalated":
        return (
          <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/5">
            <AlertCircle className="h-3 w-3 mr-1" />
            Waiting
          </Badge>
        );
      case "human_active":
        return (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/5">
            <Handshake className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Customer Conversations
        </h1>
        <p className="text-muted-foreground">
          Live conversations — <span className="text-amber-500 font-medium">{chats.length}</span> waiting for attention
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chats.length === 0 ? (
            <Card className="border-border bg-card/50 p-12 text-center">
              <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No live conversations
              </h3>
              <p className="text-muted-foreground">
                When a visitor requests a human agent, their conversation will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: list of escalated chats */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Open Requests
                </h2>
                {chats.map((c) => (
                  <Card
                    key={c.chatId}
                    onClick={() => openChat(c.chatId)}
                    className={`border-border bg-card/50 hover:bg-card transition-all p-4 cursor-pointer ${
                      detail?.chatId === c.chatId ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserRound className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.visitorName || `Visitor ${c.visitorId?.slice(0, 8) || "—"}`}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.lastSender === "ai" ? "AI: " : c.lastSender === "agent" ? "Agent: " : "Visitor: "}
                            {c.lastMessage || "—"}
                          </p>
                          {(c.visitorEmail || c.visitorName) && (
                            <div className="flex items-center gap-2 mt-1">
                              {c.visitorEmail && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Mail className="h-3 w-3" />
                                  {c.visitorEmail}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {getStatusBadge(c.status)}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.escalatedAt || c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {c.status === "escalated" && (
                      <div className="mt-3 pt-3 border-t border-border flex justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaim(c.chatId);
                          }}
                        >
                          <Handshake className="h-3.5 w-3.5" />
                          Claim
                        </Button>
                      </div>
                    )}
                    {c.status === "human_active" && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-emerald-500 flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(c.chatId);
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Right: conversation detail */}
              <div className="lg:sticky lg:top-0">
                {detail ? (
                  <Card className="border-border bg-card flex flex-col h-[600px]">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {detail.visitorName || `Visitor ${detail.visitorId?.slice(0, 8) || "—"}`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {detail.status === "human_active"
                            ? "Connected with agent"
                            : "Waiting for agent"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {detail.status === "human_active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => handleResolve(detail.chatId)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Resolve
                          </Button>
                        )}
                        {detail.status === "escalated" && (
                          <Button
                            size="sm"
                            onClick={() => handleClaim(detail.chatId)}
                            className="gap-1 text-xs"
                          >
                            <Handshake className="h-3.5 w-3.5" />
                            Claim
                          </Button>
                        )}
                        <button
                          onClick={() => setDetail(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 p-4 space-y-3">
                      {renderMessages()}
                      <div ref={bottomRef} />
                    </ScrollArea>
                    {detail.status === "human_active" && (
                      <div className="border-t border-border p-3 flex gap-2">
                        <Input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          className="bg-input border-border text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          disabled={sending}
                        />
                        <Button
                          size="icon"
                          className="flex-shrink-0"
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sending}
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    {detail.status === "escalated" && (
                      <div className="border-t border-border p-4 text-center">
                        <Button
                          variant="default"
                          className="gap-2"
                          onClick={() => handleClaim(detail.chatId)}
                        >
                          <Handshake className="h-4 w-4" />
                          Claim this conversation
                        </Button>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="border-border bg-card/50 p-12 text-center h-[600px] flex flex-col items-center justify-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Click on a conversation from the list to view messages and reply.
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
