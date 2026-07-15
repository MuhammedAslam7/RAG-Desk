# backend/alembic/versions/f2a1c9d84e01_widget_chat_support.py
"""widget chat support

Revision ID: f2a1c9d84e01
Revises: de34bb70f63b
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f2a1c9d84e01"
down_revision: Union[str, Sequence[str], None] = "de34bb70f63b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("Chat", "userId", existing_type=sa.String(), nullable=True)

    op.add_column("Chat", sa.Column("visitorId", sa.String(), nullable=True))
    op.add_column(
        "Chat",
        sa.Column("source", sa.String(), nullable=False, server_default="dashboard"),
    )
    # drop the default after backfilling existing rows
    op.alter_column("Chat", "source", server_default=None)

    op.create_index(
        "ix_chat_org_visitor", "Chat", ["organizationId", "visitorId"]
    )


def downgrade() -> None:
    op.drop_index("ix_chat_org_visitor", table_name="Chat")
    op.drop_column("Chat", "source")
    op.drop_column("Chat", "visitorId")
    op.alter_column("Chat", "userId", existing_type=sa.String(), nullable=False)