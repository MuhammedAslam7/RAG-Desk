"""widget appearance settings

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-07-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("OrganizationSettings", sa.Column("theme", sa.String(), nullable=False, server_default="auto"))
    op.add_column("OrganizationSettings", sa.Column("widgetWidth", sa.String(), nullable=False, server_default="medium"))
    op.add_column("OrganizationSettings", sa.Column("widgetHeight", sa.String(), nullable=False, server_default="medium"))
    op.add_column("OrganizationSettings", sa.Column("borderRadius", sa.String(), nullable=False, server_default="rounded"))
    op.add_column("OrganizationSettings", sa.Column("font", sa.String(), nullable=False, server_default="inter"))
    op.add_column("OrganizationSettings", sa.Column("showShadow", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("OrganizationSettings", sa.Column("animation", sa.String(), nullable=False, server_default="slide"))

    # drop defaults after backfill, matching the pattern used for `status`/`source` above
    for col in ["theme", "widgetWidth", "widgetHeight", "borderRadius", "font", "showShadow", "animation"]:
        op.alter_column("OrganizationSettings", col, server_default=None)


def downgrade() -> None:
    for col in ["animation", "showShadow", "font", "borderRadius", "widgetHeight", "widgetWidth", "theme"]:
        op.drop_column("OrganizationSettings", col)