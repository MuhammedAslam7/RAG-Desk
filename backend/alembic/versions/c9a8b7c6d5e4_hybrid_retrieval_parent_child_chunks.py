"""hybrid retrieval — parent-child chunk columns

Revision ID: c9a8b7c6d5e4
Revises: f3b4c5d6e7f8
Create Date: 2026-08-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c9a8b7c6d5e4"
down_revision: Union[str, Sequence[str], None] = "f3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add parent-child chunking metadata. Existing rows keep NULL parent and
    fall back to their own content at retrieval time."""
    op.add_column(
        "KnowledgeChunk",
        sa.Column("parent_content", sa.Text(), nullable=True),
    )
    op.add_column(
        "KnowledgeChunk",
        sa.Column("heading", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("KnowledgeChunk", "heading")
    op.drop_column("KnowledgeChunk", "parent_content")
