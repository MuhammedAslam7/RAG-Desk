"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useChat } from "@/hooks/use-chat";

const SUGGESTIONS = [
  "What can you help me with?",
  "Tell me about pricing",
  "What are your support hours?",
  "How do I get a refund?",
];

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="AI is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

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
      if (!input.trim() || loading) return;
      send();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="space-y-5">
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
              <div className="pl-11 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
                  {message.content ? (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : message.role === "assistant" && loading ? (
                    <TypingDots />
                  ) : null}
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
          className="max-w-4xl mx-auto flex gap-2.5"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your knowledge base..."
            disabled={loading}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-11 rounded-xl shadow-card"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 !size-11 rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="max-w-4xl mx-auto mt-2 text-[11px] text-muted-foreground/70 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Answers are grounded in your knowledge base and verified facts.
        </p>
      </div>
    </div>
  );
}