"""human handoff — live agent takeover

Revision ID: f3b4c5d6e7f8
Revises: d4e5f6a7b8c9
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "Chat",
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="ai_active",
        ),
    )
    op.alter_column("Chat", "status", server_default=None)

    op.add_column(
        "Chat",
        sa.Column("assignedAgentId", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_chat_assigned_agent",
        "Chat",
        "User",
        ["assignedAgentId"],
        ["id"],
    )

    op.add_column(
        "Chat",
        sa.Column("escalatedAt", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "Chat",
        sa.Column("resolvedAt", sa.DateTime(), nullable=True),
    )

    op.create_index(
        "ix_chat_status_org",
        "Chat",
        ["organizationId", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_status_org", table_name="Chat")
    op.drop_column("Chat", "resolvedAt")
    op.drop_column("Chat", "escalatedAt")
    op.drop_constraint("fk_chat_assigned_agent", "Chat", type_="foreignkey")
    op.drop_column("Chat", "assignedAgentId")
    op.drop_column("Chat", "status")