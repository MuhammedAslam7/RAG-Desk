"""add public widget token

Revision ID: f5a6b7c8d9e0
Revises: e5f6a7b8c9d0
Create Date: 2026-08-12 00:00:00.000000

"""
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    o = "Organization"
    op.add_column(o, sa.Column("widgetToken", sa.String(), nullable=True))

    # Backfill existing orgs with unique, unguessable tokens.
    conn = op.get_bind()
    rows = conn.execute(sa.text(f'SELECT id FROM "{o}"')).fetchall()
    for (org_id,) in rows:
        conn.execute(
            sa.text(f'UPDATE "{o}" SET "widgetToken" = :t WHERE id = :id'),
            {"t": secrets.token_urlsafe(24), "id": org_id},
        )

    op.alter_column(o, "widgetToken", nullable=False)
    op.create_index("ix_Organization_widgetToken", o, ["widgetToken"], unique=True)


def downgrade() -> None:
    o = "Organization"
    op.drop_index("ix_Organization_widgetToken", table_name=o)
    op.drop_column(o, "widgetToken")
