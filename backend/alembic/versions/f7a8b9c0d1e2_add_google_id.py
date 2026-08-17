"""add googleId for Sign in with Google

Revision ID: f7a8b9c0d1e2
Revises: f6b1c2d3e4f5
Create Date: 2026-08-17 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "f6b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the Google account id (unique) so users can sign in with Google."""
    op.add_column("User", sa.Column("googleId", sa.String(), nullable=True))
    op.create_unique_constraint("User_googleId_key", "User", ["googleId"])


def downgrade() -> None:
    op.drop_constraint("User_googleId_key", "User", type_="unique")
    op.drop_column("User", "googleId")
