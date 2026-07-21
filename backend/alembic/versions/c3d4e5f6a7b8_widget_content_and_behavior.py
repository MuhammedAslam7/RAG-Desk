"""widget header, welcome screen, behavior, messages, ai behavior, conversation settings

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-07-21 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    s = "OrganizationSettings"

    # --- Header ---
    op.add_column(s, sa.Column("botName", sa.String(), nullable=False, server_default="Support AI"))
    op.add_column(s, sa.Column("botAvatarUrl", sa.Text(), nullable=True))
    op.add_column(s, sa.Column("companyLogoUrl", sa.Text(), nullable=True))
    op.add_column(s, sa.Column("headerBgColor", sa.String(), nullable=True))
    op.add_column(s, sa.Column("headerTextColor", sa.String(), nullable=True))
    op.add_column(s, sa.Column("showOnlineStatus", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(s, sa.Column("statusText", sa.String(), nullable=False, server_default="instant"))
    op.add_column(s, sa.Column("showCloseButton", sa.Boolean(), nullable=False, server_default=sa.true()))

    # --- Welcome screen ---
    op.add_column(s, sa.Column("welcomeTitle", sa.Text(), nullable=True))
    op.add_column(s, sa.Column("welcomeDescription", sa.Text(), nullable=True))
    op.add_column(s, sa.Column("suggestedQuestions", sa.Text(), nullable=True))  # newline-separated
    op.add_column(s, sa.Column("startChatButtonText", sa.String(), nullable=False, server_default="Start Chat"))

    # --- Chat behavior ---
    op.add_column(s, sa.Column("autoOpenSeconds", sa.Integer(), nullable=True))
    op.add_column(s, sa.Column("autoOpenOnScroll", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("autoOpenOnExitIntent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("minimizeAfterInactivitySeconds", sa.Integer(), nullable=True))
    op.add_column(s, sa.Column("rememberConversations", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(s, sa.Column("startMinimized", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(s, sa.Column("keepOpenAcrossPages", sa.Boolean(), nullable=False, server_default=sa.false()))

    # --- Messages ---
    op.add_column(s, sa.Column("userBubbleColor", sa.String(), nullable=True))
    op.add_column(s, sa.Column("aiBubbleColor", sa.String(), nullable=True))
    op.add_column(s, sa.Column("messageTextColor", sa.String(), nullable=True))
    op.add_column(s, sa.Column("showTimestamps", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("showReadReceipts", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("showTypingIndicator", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(s, sa.Column("aiThinkingAnimation", sa.Boolean(), nullable=False, server_default=sa.true()))

    # --- AI behavior ---
    op.add_column(s, sa.Column("aiName", sa.String(), nullable=False, server_default="AI Assistant"))
    op.add_column(s, sa.Column("aiPersonality", sa.Text(), nullable=True))
    op.add_column(s, sa.Column("responseLength", sa.String(), nullable=False, server_default="medium"))
    op.add_column(s, sa.Column("emojiUsage", sa.String(), nullable=False, server_default="moderate"))
    op.add_column(s, sa.Column("tone", sa.String(), nullable=False, server_default="friendly"))
    op.add_column(s, sa.Column("showAiDisclaimer", sa.Boolean(), nullable=False, server_default=sa.true()))

    # --- Conversation settings ---
    op.add_column(s, sa.Column("askVisitorName", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("askVisitorEmail", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("askVisitorPhone", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("requireContactFields", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(s, sa.Column("saveVisitorHistory", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column(s, sa.Column("allowAnonymousChat", sa.Boolean(), nullable=False, server_default=sa.true()))

    for col in [
        "botName", "showOnlineStatus", "statusText", "showCloseButton",
        "startChatButtonText", "autoOpenOnScroll", "autoOpenOnExitIntent",
        "rememberConversations", "startMinimized", "keepOpenAcrossPages",
        "showTimestamps", "showReadReceipts", "showTypingIndicator", "aiThinkingAnimation",
        "aiName", "responseLength", "emojiUsage", "tone", "showAiDisclaimer",
        "askVisitorName", "askVisitorEmail", "askVisitorPhone", "requireContactFields",
        "saveVisitorHistory", "allowAnonymousChat",
    ]:
        op.alter_column(s, col, server_default=None)

    # --- Chat: pre-chat contact capture ---
    op.add_column("Chat", sa.Column("visitorName", sa.String(), nullable=True))
    op.add_column("Chat", sa.Column("visitorEmail", sa.String(), nullable=True))
    op.add_column("Chat", sa.Column("visitorPhone", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("Chat", "visitorPhone")
    op.drop_column("Chat", "visitorEmail")
    op.drop_column("Chat", "visitorName")

    s = "OrganizationSettings"
    for col in [
        "allowAnonymousChat", "saveVisitorHistory", "requireContactFields",
        "askVisitorPhone", "askVisitorEmail", "askVisitorName",
        "showAiDisclaimer", "tone", "emojiUsage", "responseLength", "aiPersonality", "aiName",
        "aiThinkingAnimation", "showTypingIndicator", "showReadReceipts", "showTimestamps",
        "messageTextColor", "aiBubbleColor", "userBubbleColor",
        "keepOpenAcrossPages", "startMinimized", "rememberConversations",
        "minimizeAfterInactivitySeconds", "autoOpenOnExitIntent", "autoOpenOnScroll", "autoOpenSeconds",
        "startChatButtonText", "suggestedQuestions", "welcomeDescription", "welcomeTitle",
        "showCloseButton", "statusText", "showOnlineStatus", "headerTextColor", "headerBgColor",
        "companyLogoUrl", "botAvatarUrl", "botName",
    ]:
        op.drop_column(s, col)