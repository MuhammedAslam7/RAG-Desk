# backend/app/repositories/invitation_repo.py
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Invitation

INVITE_TTL_DAYS = 7


async def create_invitation(
    db: AsyncSession, *, org_id: str, email: str, role: str, invited_by: str
) -> Invitation:
    token = secrets.token_urlsafe(32)
    invite = Invitation(
        organizationId=org_id,
        email=email.lower().strip(),
        role=role,
        token=token,
        invitedByUserId=invited_by,
        expiresAt=datetime.now(timezone.utc) + timedelta(days=INVITE_TTL_DAYS),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


async def get_by_token(db: AsyncSession, token: str) -> Invitation | None:
    return (
        await db.execute(select(Invitation).where(Invitation.token == token))
    ).scalars().first()


async def list_pending_for_org(db: AsyncSession, org_id: str) -> list[Invitation]:
    return list(
        (
            await db.execute(
                select(Invitation)
                .where(Invitation.organizationId == org_id, Invitation.status == "pending")
                .order_by(Invitation.createdAt.desc())
            )
        ).scalars().all()
    )


async def get_for_org(db: AsyncSession, invite_id: str, org_id: str) -> Invitation | None:
    return (
        await db.execute(
            select(Invitation).where(
                Invitation.id == invite_id, Invitation.organizationId == org_id
            )
        )
    ).scalars().first()


async def revoke(db: AsyncSession, invite: Invitation) -> None:
    invite.status = "revoked"
    await db.commit()


async def mark_accepted(db: AsyncSession, invite: Invitation) -> None:
    invite.status = "accepted"
    await db.commit()