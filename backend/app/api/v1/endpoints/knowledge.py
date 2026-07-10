from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import User
from app.repositories import knowledge_repo
from app.schemas.knowledge import (
    CrawlIngest,
    FaqIngest,
    KnowledgeSourceOut,
    TextIngest,
)
from app.services.knowledge.ingest import ingest_document
from app.services.knowledge.parsers.crawl import crawl_site
from app.services.knowledge.parsers.csv_parser import parse_csv
from app.services.knowledge.parsers.docx import parse_docx
from app.services.knowledge.parsers.pdf import parse_pdf

router = APIRouter()


@router.get("/list", response_model=list[KnowledgeSourceOut])
async def list_sources(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    return await knowledge_repo.list_sources(db, user.organizationId)


@router.post("/text")
async def add_text(
    body: TextIngest,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    src = await ingest_document(
        db,
        org_id=user.organizationId,
        title=body.title,
        text=body.content,
        source_type="text",
    )
    return {"id": src.id}


@router.post("/faq")
async def add_faq(
    body: FaqIngest,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    text = f"Q: {body.question}\nA: {body.answer}"

    src = await ingest_document(
        db,
        org_id=user.organizationId,
        title=body.question[:80],
        text=text,
        source_type="faq",
    )

    return {"id": src.id}


@router.post("/crawl")
async def add_crawl(
    body: CrawlIngest,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    pages = crawl_site(body.url, body.limit)

    ids = []

    for page in pages:
        src = await ingest_document(
            db,
            org_id=user.organizationId,
            title=page["title"],
            text=page["markdown"],
            source_type="crawl",
        )
        ids.append(src.id)

    return {"sources": ids}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    title: str = Form(None),
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    name = (file.filename or "").lower()

    if name.endswith(".pdf"):
        text, stype = parse_pdf(data), "pdf"
    elif name.endswith(".docx"):
        text, stype = parse_docx(data), "docx"
    elif name.endswith(".csv"):
        text, stype = parse_csv(data), "csv"
    elif name.endswith(".txt"):
        text, stype = data.decode("utf-8", errors="ignore"), "text"
    else:
        raise HTTPException(400, "Unsupported file type")

    src = await ingest_document(
        db,
        org_id=user.organizationId,
        title=title or file.filename,
        text=text,
        source_type=stype,
    )

    return {"id": src.id}


@router.delete("/delete")
async def delete_source(
    id: str = Query(...),
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    src = await knowledge_repo.get_source_for_org(
        db,
        id,
        user.organizationId,
    )

    if src is None:
        raise HTTPException(404, "Source not found")

    await knowledge_repo.delete_source(db, src)

    return {"success": True}