from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import Organization, OrganizationSettings, User
from app.models.organization import generate_widget_token
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
        settings = OrganizationSettings(organizationId=org_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("", response_model=OrganizationOut)
async def get_org(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, user.organizationId)
    settings = await _get_settings(db, user.organizationId)
    return OrganizationOut(
    id=org.id, name=org.name, slug=org.slug, widgetToken=org.widgetToken,
    status=org.status, logoUrl=org.logoUrl, brandName=org.brandName, websiteUrl=org.websiteUrl,
    industry=org.industry, teamSize=org.teamSize,
    primaryUseCase=org.primaryUseCase, supportChannels=org.supportChannels,
    contactEmail=org.contactEmail, phone=org.phone, country=org.country,
    timezone=org.timezone, language=org.language,
    createdAt=org.createdAt, settings=settings,
)


@router.post("/rotate-widget-token")
async def rotate_widget_token(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    """Rotate the org's public widget token.

    Invalidates every embed snippet currently in the wild — used if a token
    leaks or as routine hygiene, exactly like Intercom/Crisp token rotation.
    """
    org = await db.get(Organization, user.organizationId)
    org.widgetToken = generate_widget_token()
    await db.commit()
    await db.refresh(org)
    return {"widgetToken": org.widgetToken}


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