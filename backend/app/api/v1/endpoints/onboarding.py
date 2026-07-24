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
    website_url: str | None = None
    industry: str | None = None
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
    if not body.contact_email.strip():
        raise HTTPException(400, "Primary contact email is required")
    if not body.country.strip():
        raise HTTPException(400, "Country/Region is required")

    slug = await unique_slug(db, slugify(body.org_name))
    org = Organization(
        name=body.org_name.strip(),
        slug=slug,
        logoUrl=body.logo_url,
        websiteUrl=body.website_url,
        industry=body.industry,
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