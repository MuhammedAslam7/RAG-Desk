"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiJson, apiStream } from "@/lib/api-client";
import { ChatMessage } from "@/types";

interface ChatInit {
  chatId: string;
  messages: ChatMessage[];
}

export function useChat() {
  const { isLoaded, isSignedIn } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    apiJson<ChatInit>("/api/v1/chat")
      .then((data) => {
        setChatId(data.chatId);
        setMessages(data.messages);
      })
      .catch(console.error);
  }, [isLoaded, isSignedIn]);

  const send = useCallback(async () => {
    if (!input.trim() || !chatId) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    const aiId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: aiId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const uiMessages = [...messages, userMsg].map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text", text: m.content }],
    }));

    try {
      await apiStream("/api/v1/chat", { chatId, messages: uiMessages }, (token) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aiId ? { ...msg, content: msg.content + token } : msg,
          ),
        );
      });
    } finally {
      setLoading(false);
    }
  }, [input, chatId, messages]);

  return { messages, input, setInput, send, loading };
}