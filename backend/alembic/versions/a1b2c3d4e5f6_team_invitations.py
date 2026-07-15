# backend/alembic/versions/a1b2c3d4e5f6_team_invitations.py
"""team invitations

Revision ID: a1b2c3d4e5f6
Revises: f2a1c9d84e01
Create Date: 2026-07-15 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f2a1c9d84e01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("User", sa.Column("email", sa.String(), nullable=True))

    op.create_table(
        "Invitation",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organizationId", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("invitedByUserId", sa.String(), nullable=False),
        sa.Column("expiresAt", sa.DateTime(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organizationId"], ["Organization.id"]),
        sa.ForeignKeyConstraint(["invitedByUserId"], ["User.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_invitation_org_status", "Invitation", ["organizationId", "status"])


def downgrade() -> None:
    op.drop_index("ix_invitation_org_status", table_name="Invitation")
    op.drop_table("Invitation")
    op.drop_column("User", "email")