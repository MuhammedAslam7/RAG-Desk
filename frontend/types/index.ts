export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export interface Fact {
  id: string;
  subject: string;
  value: string;
  createdAt: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  type: string;
  chunkCount: number;
  createdAt: string;
}