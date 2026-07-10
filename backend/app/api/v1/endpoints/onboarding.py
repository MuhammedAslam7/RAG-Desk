import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Organization, User

router = APIRouter()


class OnboardRequest(BaseModel):
    org_name: str


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
    """Frontend calls this after login to decide: dashboard or onboarding?"""
    return {"hasOrg": user.organizationId is not None, "role": user.role}


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

    slug = await unique_slug(db, slugify(body.org_name))
    org = Organization(name=body.org_name.strip(), slug=slug)
    db.add(org)
    await db.flush()

    user.organizationId = org.id
    user.role = "owner"
    await db.commit()
    return {"id": org.id, "slug": org.slug, "name": org.name}