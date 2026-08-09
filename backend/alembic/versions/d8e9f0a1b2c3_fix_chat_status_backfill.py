"""fix chat status backfill — ai_active → active

The human-handoff migration (f3b4c5d6e7f8) added the Chat.status column with a
server_default of "ai_active". The application only ever treats "active" as the
AI-on state — every other value (escalated, human_active, resolved, and this
legacy "ai_active") makes the widget return an empty passthrough stream, so
pre-existing chats stopped getting AI replies. Normalize legacy rows to
"active".

Revision ID: d8e9f0a1b2c3
Revises: c9a8b7c6d5e4
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d8e9f0a1b2c3"
down_revision: Union[str, Sequence[str], None] = "c9a8b7c6d5e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE \"Chat\" SET status = 'active' WHERE status = 'ai_active'")


def downgrade() -> None:
    # We can't tell which rows were originally 'ai_active' vs. genuinely
    # escalated/resolved, so the downgrade is a no-op.
    pass
