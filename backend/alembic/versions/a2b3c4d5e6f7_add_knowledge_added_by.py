"""track which user added each knowledge source

Revision ID: a2b3c4d5e6f7
Revises: f7a8b9c0d1e2
Create Date: 2026-08-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add addedById so the knowledge listing can show who added each source."""
    op.add_column(
        "KnowledgeSource",
        sa.Column("addedById", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "KnowledgeSource_addedById_fkey", "KnowledgeSource", "User",
        ["addedById"], ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("KnowledgeSource_addedById_fkey", "KnowledgeSource", type_="foreignkey")
    op.drop_column("KnowledgeSource", "addedById")
