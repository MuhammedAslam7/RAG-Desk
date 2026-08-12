import os
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Organization, OrganizationSettings, User
from app.schemas.team import SyncProfileRequest
from app.repositories import user_repo

router = APIRouter()

UPLOAD_DIR = "app/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class OnboardRequest(BaseModel):
    org_name: str
    logo_url: str | None = None
    brand_name: str | None = None
    website_url: str | None = None
    industry: str | None = None
    team_size: str | None = None
    primary_use_case: str | None = None
    support_channels: list[str] = []
    contact_email: str
    phone: str | None = None
    country: str
    timezone: str | None = None
    language: str = "en"


def slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return base or "org"


async def unique_slug(db: AsyncSession, base: str) -> str:
    slug, i = base, 1
    while (
        await db.execute(select(Organization).where(Organization.slug == slug))
    ).scalar_one_or_none() is not None:
        i += 1
        slug = f"{base}-{i}"
    return slug


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"hasOrg": user.organizationId is not None, "role": user.role}


@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in {"png", "jpg", "jpeg", "svg", "webp"}:
        raise HTTPException(400, "Unsupported image type")
    name = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"url": f"/static/uploads/{name}"}


@router.post("/onboard")
async def onboard(
    body: OnboardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.organizationId is not None:
        raise HTTPException(409, "You already belong to an organization")
    if not body.org_name.strip():
        raise HTTPException(400, "Organization name is required")
    if not body.website_url or not body.website_url.strip():
        raise HTTPException(400, "Website URL is required")
    if not body.industry or not body.industry.strip():
        raise HTTPException(400, "Industry is required")
    if not body.team_size or not body.team_size.strip():
        raise HTTPException(400, "Team size is required")
    if not body.primary_use_case or not body.primary_use_case.strip():
        raise HTTPException(400, "Primary use case is required")
    if not body.support_channels:
        raise HTTPException(400, "At least one support channel is required")
    if not body.contact_email.strip():
        raise HTTPException(400, "Primary contact email is required")
    if not body.country.strip():
        raise HTTPException(400, "Country/Region is required")

    slug = await unique_slug(db, slugify(body.org_name))
    channels = ",".join(body.support_channels) if body.support_channels else None
    org = Organization(
        name=body.org_name.strip(),
        slug=slug,
        logoUrl=body.logo_url,
        brandName=body.brand_name or body.org_name.strip(),
        websiteUrl=body.website_url,
        industry=body.industry,
        teamSize=body.team_size,
        primaryUseCase=body.primary_use_case,
        supportChannels=channels,
        contactEmail=body.contact_email.strip(),
        phone=body.phone,
        country=body.country,
        timezone=body.timezone,
        language=body.language,
    )
    db.add(org)
    await db.flush()

    # settings row still created for widget/AI config, unrelated to profile fields
    db.add(OrganizationSettings(organizationId=org.id))

    user.organizationId = org.id
    user.role = "owner"
    await db.commit()
    return {"id": org.id, "slug": org.slug, "name": org.name}


@router.post("/sync")
async def sync_profile(
    body: SyncProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await user_repo.update_email(db, user, body.email.lower().strip())
    return {"success": True}