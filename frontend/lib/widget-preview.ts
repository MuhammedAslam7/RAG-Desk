// frontend/lib/widget-preview.ts
// Shared utilities for the live widget preview in Settings.

import type { OrganizationSettings, WidgetConfig } from "@/types";

/** Message type sent from the Settings form to the widget iframe to sync config in real time. */
export const PREVIEW_CONFIG_MESSAGE = "rag-desk-preview-config";

/**
 * Map a partial OrganizationSettings (the unsaved draft in the form)
 * to the WidgetConfig shape the widget iframe expects.
 *
 * Most fields share the same name between the two types.  This function
 * handles the few that differ:
 *
 * OrganizationSettings          WidgetConfig          Notes
 * ─────────────────────────────────────────────────────────────
 * widgetGreeting           →    greeting
 * widgetColor              →    color
 * widgetPosition           →    position
 * suggestedQuestions       →    suggestedQuestions   string (newline-delimited) → string[]
 * (no change needed for the rest — same field names)
 *
 * Fields that exist in OrganizationSettings but are *not* sent to the
 * widget (e.g. language, allowedDomains, aiPersonality, responseLength,
 * tone, emojiUsage, fallbackEmail, websiteUrl, saveVisitorHistory) are
 * intentionally excluded.
 */
export function mapSettingsToWidgetConfig(
  form: Partial<OrganizationSettings>
): Partial<WidgetConfig> {
  // suggestedQuestions is stored as a newline-separated string in settings
  // but is an array on WidgetConfig.
  const suggestedQuestions: string[] = (
    form.suggestedQuestions ?? ""
  )
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    // ── Appearance ──────────────────────────────────────────
    color: form.widgetColor ?? null,
    position: form.widgetPosition,
    theme: form.theme,
    widgetWidth: form.widgetWidth,
    widgetHeight: form.widgetHeight,
    borderRadius: form.borderRadius,
    font: form.font,
    showShadow: form.showShadow,
    animation: form.animation,

    // ── Header ───────────────────────────────────────────────
    botName: form.botName,
    botAvatarUrl: form.botAvatarUrl ?? null,
    companyLogoUrl: form.companyLogoUrl ?? null,
    headerBgColor: form.headerBgColor ?? null,
    headerTextColor: form.headerTextColor ?? null,
    showOnlineStatus: form.showOnlineStatus,
    statusText: form.statusText,
    showCloseButton: form.showCloseButton,

    // ── Welcome screen ──────────────────────────────────────
    greeting: form.widgetGreeting ?? null,
    welcomeTitle: form.welcomeTitle ?? null,
    welcomeDescription: form.welcomeDescription ?? null,
    suggestedQuestions,
    startChatButtonText: form.startChatButtonText,

    // ── Behavior (mostly inert in preview, sent for completeness) ─
    autoOpenSeconds: form.autoOpenSeconds ?? null,
    autoOpenOnScroll: form.autoOpenOnScroll,
    autoOpenOnExitIntent: form.autoOpenOnExitIntent,
    minimizeAfterInactivitySeconds:
      form.minimizeAfterInactivitySeconds ?? null,
    rememberConversations: form.rememberConversations,
    startMinimized: form.startMinimized,
    keepOpenAcrossPages: form.keepOpenAcrossPages,

    // ── Messages ─────────────────────────────────────────────
    userBubbleColor: form.userBubbleColor ?? null,
    aiBubbleColor: form.aiBubbleColor ?? null,
    messageTextColor: form.messageTextColor ?? null,
    showTimestamps: form.showTimestamps,
    showReadReceipts: form.showReadReceipts,
    showTypingIndicator: form.showTypingIndicator,
    aiThinkingAnimation: form.aiThinkingAnimation,

    // ── AI behavior (display-relevant only) ─────────────────
    aiName: form.aiName,
    showAiDisclaimer: form.showAiDisclaimer,

    // ── Conversation settings ───────────────────────────────
    askVisitorName: form.askVisitorName,
    askVisitorEmail: form.askVisitorEmail,
    askVisitorPhone: form.askVisitorPhone,
    requireContactFields: form.requireContactFields,
    allowAnonymousChat: form.allowAnonymousChat,
  };
}
