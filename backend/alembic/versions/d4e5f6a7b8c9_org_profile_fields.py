# backend/alembic/versions/d4e5f6a7b8c9_org_profile_fields.py
"""organization profile fields

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-24 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    o = "Organization"
    op.add_column(o, sa.Column("logoUrl", sa.Text(), nullable=True))
    op.add_column(o, sa.Column("websiteUrl", sa.String(), nullable=True))
    op.add_column(o, sa.Column("industry", sa.String(), nullable=True))
    op.add_column(o, sa.Column("contactEmail", sa.String(), nullable=True))
    op.add_column(o, sa.Column("phone", sa.String(), nullable=True))
    op.add_column(o, sa.Column("country", sa.String(), nullable=True))
    op.add_column(o, sa.Column("timezone", sa.String(), nullable=True))
    op.add_column(o, sa.Column("language", sa.String(), nullable=False, server_default="en"))

    op.alter_column(o, "language", server_default=None)


def downgrade() -> None:
    o = "Organization"
    for col in ["language", "timezone", "country", "phone", "contactEmail", "industry", "websiteUrl", "logoUrl"]:
        op.drop_column(o, col)