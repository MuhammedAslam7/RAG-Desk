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

export interface OrganizationSettings {
  websiteUrl: string | null;
  fallbackEmail: string | null;
  language: string;
  allowedDomains: string | null;
  widgetGreeting: string | null;
  widgetColor: string | null;
  widgetPosition: string;
}

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  settings: OrganizationSettings;
}