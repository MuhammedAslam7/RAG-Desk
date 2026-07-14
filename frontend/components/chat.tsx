"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";

export default function Chat() {
  const { messages, input, setInput, send, loading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasScrolledOnce = useRef(false);

  useEffect(() => {
    if (messages.length === 0) return;
    // Instant jump on first load (page refresh), smooth scroll after that.
    bottomRef.current?.scrollIntoView({
      behavior: hasScrolledOnce.current ? "smooth" : "auto",
    });
    hasScrolledOnce.current = true;
  }, [messages]);

  // Focus the input on initial mount, and again whenever a send finishes
  // (loading flips true -> false). Can't focus while disabled during loading.
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await send();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Chat Header */}
      {/* <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chat Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Powered by your knowledge base
            </p>
          </div>
        </div>
      </div> */}

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary to-primary/70 rounded-full">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
              </Avatar>
              <Card className="bg-card border border-border text-foreground px-4 py-3 rounded-lg">
                <p className="text-sm leading-relaxed">
                  Hello! I&apos;m your AI assistant powered by RAG Desk. I can
                  answer questions based on your knowledge base and verified
                  facts. How can I help you today?
                </p>
              </Card>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                  <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary to-primary/70 rounded-full">
                    <span className="text-xs font-bold text-white">AI</span>
                  </div>
                </Avatar>
              )}

              <div
                className={`flex flex-col gap-1 max-w-sm lg:max-w-md ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <Card
                  className={`px-4 py-3 rounded-lg border-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {message.content ||
                      (message.role === "assistant" && loading ? "…" : "")}
                  </p>
                </Card>
                {message.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex-shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex gap-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your knowledge base..."
            disabled={loading}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}