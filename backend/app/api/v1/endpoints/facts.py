from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import User
from app.repositories import fact_repo
from app.schemas.fact import FactCreate, FactOut, FactUpdate
from app.services.facts.service import upsert_facts

router = APIRouter()


@router.get("", response_model=list[FactOut])
async def list_facts(
    user: User = Depends(require_org), db: AsyncSession = Depends(get_db)
):
    facts = await fact_repo.list_active(db, user.organizationId)
    return [FactOut(id=f.id, subject=f.subject, value=f.value, createdAt=f.createdAt)
            for f in facts]


@router.post("")
async def create_fact(
    body: FactCreate,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    if not body.subject.strip() or not body.value.strip():
        raise HTTPException(400, "Subject and value are required")
    await upsert_facts(
        db, [{"subject": body.subject.lower().strip(), "value": body.value.strip()}],
        user.organizationId,
    )
    return {"success": True}


@router.patch("")
async def update_fact(
    body: FactUpdate,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    if not body.value.strip():
        raise HTTPException(400, "Missing value")
    fact = await fact_repo.get_for_org(db, body.id, user.organizationId)
    if fact is None:
        raise HTTPException(404, "Fact not found")
    await fact_repo.update_value(db, fact, body.value)
    return {"success": True}


@router.delete("")
async def delete_fact(
    id: str = Query(...),
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    fact = await fact_repo.get_for_org(db, id, user.organizationId)
    if fact is None:
        raise HTTPException(404, "Fact not found")
    await fact_repo.soft_delete(db, fact)
    return {"success": True}