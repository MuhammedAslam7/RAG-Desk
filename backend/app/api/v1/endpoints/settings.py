from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import Organization, OrganizationSettings, User
from app.schemas.organization import OrganizationOut, OrganizationSettingsUpdate

router = APIRouter()


async def _get_settings(db: AsyncSession, org_id: str) -> OrganizationSettings:
    settings = (
        await db.execute(
            select(OrganizationSettings).where(
                OrganizationSettings.organizationId == org_id
            )
        )
    ).scalars().first()
    if settings is None:
        raise HTTPException(404, "Settings not found")
    return settings


@router.get("", response_model=OrganizationOut)
async def get_org(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, user.organizationId)
    settings = await _get_settings(db, user.organizationId)
    return OrganizationOut(
        id=org.id, name=org.name, slug=org.slug, status=org.status,
        createdAt=org.createdAt, settings=settings,
    )


@router.patch("")
async def update_settings(
    body: OrganizationSettingsUpdate,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_settings(db, user.organizationId)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    await db.commit()
    return {"success": True}