"""onboarding profile fields

Revision ID: e5f6a7b8c9d0
Revises: d8e9f0a1b2c3
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d8e9f0a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    o = "Organization"
    op.add_column(o, sa.Column("brandName", sa.String(), nullable=True))
    op.add_column(o, sa.Column("teamSize", sa.String(), nullable=True))
    op.add_column(o, sa.Column("primaryUseCase", sa.String(), nullable=True))
    op.add_column(o, sa.Column("supportChannels", sa.Text(), nullable=True))


def downgrade() -> None:
    o = "Organization"
    for col in ["supportChannels", "primaryUseCase", "teamSize", "brandName"]:
        op.drop_column(o, col)
