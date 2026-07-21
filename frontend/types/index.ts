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

  theme: string;
  widgetWidth: string;
  widgetHeight: string;
  borderRadius: string;
  font: string;
  showShadow: boolean;
  animation: string;

  botName: string;
  botAvatarUrl: string | null;
  companyLogoUrl: string | null;
  headerBgColor: string | null;
  headerTextColor: string | null;
  showOnlineStatus: boolean;
  statusText: string;
  showCloseButton: boolean;

  welcomeTitle: string | null;
  welcomeDescription: string | null;
  suggestedQuestions: string | null; // newline-separated in the form
  startChatButtonText: string;

  autoOpenSeconds: number | null;
  autoOpenOnScroll: boolean;
  autoOpenOnExitIntent: boolean;
  minimizeAfterInactivitySeconds: number | null;
  rememberConversations: boolean;
  startMinimized: boolean;
  keepOpenAcrossPages: boolean;

  userBubbleColor: string | null;
  aiBubbleColor: string | null;
  messageTextColor: string | null;
  showTimestamps: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  aiThinkingAnimation: boolean;

  aiName: string;
  aiPersonality: string | null;
  responseLength: string;
  emojiUsage: string;
  tone: string;
  showAiDisclaimer: boolean;

  askVisitorName: boolean;
  askVisitorEmail: boolean;
  askVisitorPhone: boolean;
  requireContactFields: boolean;
  saveVisitorHistory: boolean;
  allowAnonymousChat: boolean;
}

export interface WidgetConfig {
  orgName: string;
  status: string;
  color: string | null;
  position: string;
  theme: string;
  widgetWidth: string;
  widgetHeight: string;
  borderRadius: string;
  font: string;
  showShadow: boolean;
  animation: string;
  botName: string;
  botAvatarUrl: string | null;
  companyLogoUrl: string | null;
  headerBgColor: string | null;
  headerTextColor: string | null;
  showOnlineStatus: boolean;
  statusText: string;
  showCloseButton: boolean;
  greeting: string | null;
  welcomeTitle: string | null;
  welcomeDescription: string | null;
  suggestedQuestions: string[];
  startChatButtonText: string;
  autoOpenSeconds: number | null;
  autoOpenOnScroll: boolean;
  autoOpenOnExitIntent: boolean;
  minimizeAfterInactivitySeconds: number | null;
  rememberConversations: boolean;
  startMinimized: boolean;
  keepOpenAcrossPages: boolean;
  userBubbleColor: string | null;
  aiBubbleColor: string | null;
  messageTextColor: string | null;
  showTimestamps: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  aiThinkingAnimation: boolean;
  aiName: string;
  showAiDisclaimer: boolean;
  askVisitorName: boolean;
  askVisitorEmail: boolean;
  askVisitorPhone: boolean;
  requireContactFields: boolean;
  allowAnonymousChat: boolean;
}

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  settings: OrganizationSettings;
}


// frontend/types/index.ts — add these
export interface WidgetSession {
  chatId: string;
  visitorId: string;
  createdAt: string;
  messageCount: number;
  lastMessage: string | null;
  lastSender: string | null;
}

export interface WidgetSessionDetail {
  chatId: string;
  visitorId: string;
  createdAt: string;
  messages: { sender: string; content: string; createdAt: string }[];
}


// frontend/types/index.ts — add
export interface TeamMember {
  id: string;
  email: string | null;
  role: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  inviteUrl?: string;
}

export interface InvitePreview {
  valid: boolean;
  orgName?: string;
  role?: string;
  email?: string;
  reason?: string;
}


// frontend/types/index.ts — dashboard
export interface DashboardKpis {
  totalConversations: number;
  totalVisitors: number;
  aiResponses: number;
  knowledgeChunks: number;
  teamMembers: number;
  pendingInvitations: number;
  facts: number;
}

export interface DashboardRecentConversation {
  chatId: string;
  visitorId: string;
  lastMessage: string | null;
  lastSender: string | null;
  createdAt: string;
}

export interface DashboardRecentSource {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

export interface DashboardWidget {
  status: string;
  color: string | null;
  greeting: string | null;
  position: string;
  allowedDomains: string | null;
}

export interface DashboardSummary {
  orgName: string;
  kpis: DashboardKpis;
  sourcesByType: Record<string, number>;
  dailyConversations: { date: string; conversations: number }[];
  lastKnowledgeUpdate: string | null;
  recentConversations: DashboardRecentConversation[];
  recentSources: DashboardRecentSource[];
  widget: DashboardWidget;
}