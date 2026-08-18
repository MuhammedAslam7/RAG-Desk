"""create Notification table for org-wide real-time notifications

Revision ID: b4c5d6e7f8a9
Revises: a2b3c4d5e6f7
Create Date: 2026-08-18 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add per-user notifications so org members see knowledge adds in real time."""
    op.create_table(
        "Notification",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organizationId", sa.String(), nullable=False),
        sa.Column("userId", sa.String(), nullable=False),
        sa.Column("actorId", sa.String(), nullable=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("sourceId", sa.String(), nullable=True),
        sa.Column("read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organizationId"], ["Organization.id"], ),
        sa.ForeignKeyConstraint(["userId"], ["User.id"], ),
        sa.ForeignKeyConstraint(["actorId"], ["User.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("Notification")
