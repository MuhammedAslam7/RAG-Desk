from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OrganizationSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    websiteUrl: str | None
    fallbackEmail: str | None
    language: str
    allowedDomains: str | None
    widgetGreeting: str | None
    widgetColor: str | None
    widgetPosition: str

    theme: str
    widgetWidth: str
    widgetHeight: str
    borderRadius: str
    font: str
    showShadow: bool
    animation: str

    botName: str
    botAvatarUrl: str | None
    companyLogoUrl: str | None
    headerBgColor: str | None
    headerTextColor: str | None
    showOnlineStatus: bool
    statusText: str
    showCloseButton: bool

    welcomeTitle: str | None
    welcomeDescription: str | None
    suggestedQuestions: str | None
    startChatButtonText: str

    autoOpenSeconds: int | None
    autoOpenOnScroll: bool
    autoOpenOnExitIntent: bool
    minimizeAfterInactivitySeconds: int | None
    rememberConversations: bool
    startMinimized: bool
    keepOpenAcrossPages: bool

    userBubbleColor: str | None
    aiBubbleColor: str | None
    messageTextColor: str | None
    showTimestamps: bool
    showReadReceipts: bool
    showTypingIndicator: bool
    aiThinkingAnimation: bool

    aiName: str
    aiPersonality: str | None
    responseLength: str
    emojiUsage: str
    tone: str
    showAiDisclaimer: bool

    askVisitorName: bool
    askVisitorEmail: bool
    askVisitorPhone: bool
    requireContactFields: bool
    saveVisitorHistory: bool
    allowAnonymousChat: bool


class OrganizationSettingsUpdate(BaseModel):
    websiteUrl: str | None = None
    fallbackEmail: str | None = None
    language: str | None = None
    allowedDomains: str | None = None
    widgetGreeting: str | None = None
    widgetColor: str | None = None
    widgetPosition: str | None = None

    theme: str | None = None
    widgetWidth: str | None = None
    widgetHeight: str | None = None
    borderRadius: str | None = None
    font: str | None = None
    showShadow: bool | None = None
    animation: str | None = None

    botName: str | None = None
    botAvatarUrl: str | None = None
    companyLogoUrl: str | None = None
    headerBgColor: str | None = None
    headerTextColor: str | None = None
    showOnlineStatus: bool | None = None
    statusText: str | None = None
    showCloseButton: bool | None = None

    welcomeTitle: str | None = None
    welcomeDescription: str | None = None
    suggestedQuestions: str | None = None
    startChatButtonText: str | None = None

    autoOpenSeconds: int | None = None
    autoOpenOnScroll: bool | None = None
    autoOpenOnExitIntent: bool | None = None
    minimizeAfterInactivitySeconds: int | None = None
    rememberConversations: bool | None = None
    startMinimized: bool | None = None
    keepOpenAcrossPages: bool | None = None

    userBubbleColor: str | None = None
    aiBubbleColor: str | None = None
    messageTextColor: str | None = None
    showTimestamps: bool | None = None
    showReadReceipts: bool | None = None
    showTypingIndicator: bool | None = None
    aiThinkingAnimation: bool | None = None

    aiName: str | None = None
    aiPersonality: str | None = None
    responseLength: str | None = None
    emojiUsage: str | None = None
    tone: str | None = None
    showAiDisclaimer: bool | None = None

    askVisitorName: bool | None = None
    askVisitorEmail: bool | None = None
    askVisitorPhone: bool | None = None
    requireContactFields: bool | None = None
    saveVisitorHistory: bool | None = None
    allowAnonymousChat: bool | None = None


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    status: str
    logoUrl: str | None
    websiteUrl: str | None
    industry: str | None
    contactEmail: str | None
    phone: str | None
    country: str | None
    timezone: str | None
    language: str
    createdAt: datetime
    settings: OrganizationSettingsOut

class WidgetConfigOut(BaseModel):
    orgName: str
    status: str

    # appearance
    color: str | None
    position: str
    theme: str
    widgetWidth: str
    widgetHeight: str
    borderRadius: str
    font: str
    showShadow: bool
    animation: str

    # header
    botName: str
    botAvatarUrl: str | None
    companyLogoUrl: str | None
    headerBgColor: str | None
    headerTextColor: str | None
    showOnlineStatus: bool
    statusText: str
    showCloseButton: bool

    # welcome screen
    greeting: str | None
    welcomeTitle: str | None
    welcomeDescription: str | None
    suggestedQuestions: list[str]
    startChatButtonText: str

    # behavior
    autoOpenSeconds: int | None
    autoOpenOnScroll: bool
    autoOpenOnExitIntent: bool
    minimizeAfterInactivitySeconds: int | None
    rememberConversations: bool
    startMinimized: bool
    keepOpenAcrossPages: bool

    # messages
    userBubbleColor: str | None
    aiBubbleColor: str | None
    messageTextColor: str | None
    showTimestamps: bool
    showReadReceipts: bool
    showTypingIndicator: bool
    aiThinkingAnimation: bool

    # ai behavior (display-relevant only)
    aiName: str
    showAiDisclaimer: bool

    # conversation settings
    askVisitorName: bool
    askVisitorEmail: bool
    askVisitorPhone: bool
    requireContactFields: bool
    allowAnonymousChat: bool