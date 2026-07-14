"""split organization settings into own table

Revision ID: de34bb70f63b
Revises: a009078853b5
Create Date: 2026-07-14 11:39:25.654898

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "de34bb70f63b"
down_revision: Union[str, Sequence[str], None] = "a009078853b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "OrganizationSettings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organizationId", sa.String(), nullable=False),
        sa.Column("websiteUrl", sa.String(), nullable=True),
        sa.Column("fallbackEmail", sa.String(), nullable=True),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("allowedDomains", sa.Text(), nullable=True),
        sa.Column("widgetGreeting", sa.Text(), nullable=True),
        sa.Column("widgetColor", sa.String(), nullable=True),
        sa.Column("widgetPosition", sa.String(), nullable=False),
        sa.Column("onboardedAt", sa.DateTime(), nullable=True),
        sa.Column(
            "updatedAt",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organizationId"],
            ["Organization.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organizationId"),
    )

    op.add_column(
        "Organization",
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="active",
        ),
    )

    # Remove the default after existing rows have been populated
    op.alter_column(
        "Organization",
        "status",
        server_default=None,
    )

    op.drop_column("Organization", "widgetGreeting")
    op.drop_column("Organization", "widgetColor")
    op.drop_column("Organization", "allowedDomains")


def downgrade() -> None:
    """Downgrade schema."""

    op.add_column(
        "Organization",
        sa.Column("allowedDomains", sa.Text(), nullable=True),
    )

    op.add_column(
        "Organization",
        sa.Column("widgetColor", sa.String(), nullable=True),
    )

    op.add_column(
        "Organization",
        sa.Column("widgetGreeting", sa.Text(), nullable=True),
    )

    op.drop_column("Organization", "status")

    op.drop_table("OrganizationSettings")