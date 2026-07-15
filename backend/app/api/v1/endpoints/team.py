# backend/app/api/v1/endpoints/team.py
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org, require_role, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import User
from app.repositories import invitation_repo, user_repo
from app.schemas.team import (
    InviteCreate, InvitationOut, TeamMemberOut, InvitePreviewOut, RoleUpdate,
)

router = APIRouter()

INVITABLE_ROLES = {"admin", "agent", "viewer"}
# Who can invite which roles.
ROLE_INVITE_PERMISSIONS = {
    "owner": {"admin", "agent", "viewer"},
    "admin": {"agent", "viewer"},
}


def _frontend_invite_url(token: str) -> str:
    return f"{settings.FRONTEND_ORIGIN}/invite/{token}"


@router.get("/members", response_model=list[TeamMemberOut])
async def list_members(
    user: User = Depends(require_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    members = await user_repo.list_org_members(db, user.organizationId)
    return [
        TeamMemberOut(id=m.id, email=m.email, role=m.role, createdAt=m.createdAt)
        for m in members
    ]


@router.get("/invitations", response_model=list[InvitationOut])
async def list_invitations(
    user: User = Depends(require_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    invites = await invitation_repo.list_pending_for_org(db, user.organizationId)
    return [
        InvitationOut(
            id=i.id, email=i.email, role=i.role, status=i.status,
            createdAt=i.createdAt, expiresAt=i.expiresAt,
        )
        for i in invites
    ]


@router.post("/invitations", response_model=InvitationOut)
async def create_invite(
    body: InviteCreate,
    user: User = Depends(require_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    if body.role not in INVITABLE_ROLES:
        raise HTTPException(400, "Invalid role")
    allowed = ROLE_INVITE_PERMISSIONS.get(user.role, set())
    if body.role not in allowed:
        raise HTTPException(403, f"You can't invite the '{body.role}' role")

    invite = await invitation_repo.create_invitation(
        db, org_id=user.organizationId, email=body.email, role=body.role,
        invited_by=user.id,
    )
    return InvitationOut(
        id=invite.id, email=invite.email, role=invite.role, status=invite.status,
        createdAt=invite.createdAt, expiresAt=invite.expiresAt,
        inviteUrl=_frontend_invite_url(invite.token),
    )


@router.delete("/invitations/{invite_id}")
async def revoke_invite(
    invite_id: str,
    user: User = Depends(require_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    invite = await invitation_repo.get_for_org(db, invite_id, user.organizationId)
    if invite is None:
        raise HTTPException(404, "Invitation not found")
    await invitation_repo.revoke(db, invite)
    return {"success": True}


@router.patch("/members/{member_id}")
async def update_member_role(
    member_id: str,
    body: RoleUpdate,
    user: User = Depends(require_role("owner")),  # only owner changes roles
    db: AsyncSession = Depends(get_db),
):
    if body.role not in {"owner", "admin", "agent", "viewer"}:
        raise HTTPException(400, "Invalid role")
    member = await user_repo.get_in_org(db, member_id, user.organizationId)
    if member is None:
        raise HTTPException(404, "Member not found")
    if member.role == "owner":
        raise HTTPException(400, "Ownership can't be changed here")
    member.role = body.role
    await db.commit()
    return {"success": True}


@router.delete("/members/{member_id}")
async def remove_member(
    member_id: str,
    user: User = Depends(require_role("owner")),  # only owner removes members
    db: AsyncSession = Depends(get_db),
):
    member = await user_repo.get_in_org(db, member_id, user.organizationId)
    if member is None:
        raise HTTPException(404, "Member not found")
    if member.role == "owner":
        raise HTTPException(400, "The owner can't be removed")
    if member.id == user.id:
        raise HTTPException(400, "You can't remove yourself")
    member.organizationId = None
    member.role = "owner"  # reset to a harmless default now they're orgless
    await db.commit()
    return {"success": True}


# ---- Public-ish invite acceptance flow (auth required, but no org membership needed yet) ----

@router.get("/invitations/preview/{token}", response_model=InvitePreviewOut)
async def preview_invite(token: str, db: AsyncSession = Depends(get_db)):
    invite = await invitation_repo.get_by_token(db, token)
    if invite is None:
        return InvitePreviewOut(valid=False, reason="This invite link is invalid.")
    if invite.status != "pending":
        return InvitePreviewOut(valid=False, reason="This invite has already been used or revoked.")
    if invite.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return InvitePreviewOut(valid=False, reason="This invite has expired.")

    from app.models import Organization
    org = await db.get(Organization, invite.organizationId)
    return InvitePreviewOut(
        valid=True, orgName=org.name if org else None, role=invite.role, email=invite.email,
    )


@router.post("/invitations/{token}/accept")
async def accept_invite(
    token: str,
    user: User = Depends(get_current_user),  # not require_org — they don't have one yet
    db: AsyncSession = Depends(get_db),
):
    invite = await invitation_repo.get_by_token(db, token)
    if invite is None or invite.status != "pending":
        raise HTTPException(400, "This invite is no longer valid")
    if invite.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "This invite has expired")
    if user.organizationId is not None:
        raise HTTPException(409, "You already belong to an organization")
    if not user.email or user.email.lower() != invite.email.lower():
        raise HTTPException(
            403,
            "This invite was sent to a different email address. "
            "Please sign in with that email to accept it.",
        )

    user.organizationId = invite.organizationId
    user.role = invite.role
    await invitation_repo.mark_accepted(db, invite)
    await db.commit()
    return {"success": True, "organizationId": invite.organizationId}