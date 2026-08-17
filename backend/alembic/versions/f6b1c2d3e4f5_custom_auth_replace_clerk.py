"""custom auth: replace clerk with email/password JWT sessions

Revision ID: f6b1c2d3e4f5
Revises: f5a6b7c8d9e0
Create Date: 2026-08-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace the Clerk auth model with our own.

    - User: drop clerkId, add password/verification/reset columns, unique email.
    - New RefreshToken table for revocable sessions.
    """
    # Drop the clerkId unique constraint, then the column itself.
    op.drop_constraint("User_clerkId_key", "User", type_="unique")
    op.drop_column("User", "clerkId")

    # Custom auth columns.
    op.add_column("User", sa.Column("name", sa.String(), nullable=True))
    op.add_column("User", sa.Column("passwordHash", sa.String(), nullable=True))
    op.add_column(
        "User",
        sa.Column("emailVerified", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("User", sa.Column("emailVerifyToken", sa.String(), nullable=True))
    op.add_column("User", sa.Column("emailVerifyExpiresAt", sa.DateTime(), nullable=True))
    op.add_column("User", sa.Column("passwordResetToken", sa.String(), nullable=True))
    op.add_column("User", sa.Column("passwordResetExpiresAt", sa.DateTime(), nullable=True))

    # Emails must be unique going forward. Legacy Clerk-synced rows can contain
    # duplicates — null out every duplicate except the most recently created row
    # (those accounts can't sign in anyway; they have no password set).
    op.execute(
        """
        UPDATE "User" u SET "email" = NULL
        WHERE u.id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY lower("email") ORDER BY "createdAt" DESC
                ) AS rn
                FROM "User"
                WHERE "email" IS NOT NULL
            ) t
            WHERE rn > 1
        )
        """
    )
    op.create_unique_constraint("User_email_key", "User", ["email"])

    op.create_table(
        "RefreshToken",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("userId", sa.String(), nullable=False),
        sa.Column("tokenHash", sa.String(), nullable=False),
        sa.Column("expiresAt", sa.DateTime(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("revokedAt", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["userId"], ["User.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tokenHash"),
    )


def downgrade() -> None:
    """Restore the Clerk model (best-effort; data in auth columns is dropped)."""
    op.drop_table("RefreshToken")
    op.drop_constraint("User_email_key", "User", type_="unique")
    op.drop_column("User", "passwordResetExpiresAt")
    op.drop_column("User", "passwordResetToken")
    op.drop_column("User", "emailVerifyExpiresAt")
    op.drop_column("User", "emailVerifyToken")
    op.drop_column("User", "emailVerified")
    op.drop_column("User", "passwordHash")
    op.drop_column("User", "name")
    op.add_column("User", sa.Column("clerkId", sa.String(), nullable=False))
    op.create_unique_constraint("User_clerkId_key", "User", ["clerkId"])
