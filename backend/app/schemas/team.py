# backend/app/schemas/team.py
from datetime import datetime
from pydantic import BaseModel, EmailStr


class InviteCreate(BaseModel):
    email: EmailStr
    role: str  # 'admin' | 'agent' | 'viewer'


class InvitationOut(BaseModel):
    id: str
    email: str
    role: str
    status: str
    createdAt: datetime
    expiresAt: datetime
    inviteUrl: str | None = None  # only populated right after creation


class TeamMemberOut(BaseModel):
    id: str
    email: str | None
    role: str
    createdAt: datetime


class InvitePreviewOut(BaseModel):
    valid: bool
    orgName: str | None = None
    role: str | None = None
    email: str | None = None
    reason: str | None = None  # why invalid, if valid=False


class RoleUpdate(BaseModel):
    role: str


class SyncProfileRequest(BaseModel):
    email: EmailStr