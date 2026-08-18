import asyncio

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import AsyncSessionLocal, get_db
from app.models import User
from app.repositories import knowledge_repo
from app.schemas.knowledge import (
    CrawlIngest,
    FaqIngest,
    KnowledgeSourceListOut,
    TextIngest,
)
from app.services.knowledge.bm25 import bump_bm25_version
from app.services.knowledge.ingest import ingest_document
from app.services.knowledge.jobs import (
    JobCancelledError,
    cancel_job,
    complete_job,
    create_job,
    fail_job,
    get_job,
    set_job_progress,
)
from app.services.knowledge.parsers.crawl import (
    cancel_firecrawl_crawl,
    crawl_site_async,
)
from app.services.knowledge.parsers.csv_faq import parse_faq_csv
from app.services.knowledge.parsers.csv_parser import parse_csv
from app.services.knowledge.parsers.docx import parse_docx
from app.services.knowledge.parsers.pdf import parse_pdf

router = APIRouter()


# ---------------------------------------------------------------------------
# Background ingestion jobs (upload + crawl). Each job records progress in an
# in-memory store (app/services/knowledge/jobs.py); the frontend polls
# GET /jobs/{id} while the work runs and renders a progress bar.
# ---------------------------------------------------------------------------

async def _run_upload_job(
    job_id: str, data: bytes, filename: str, title: str | None, org_id: str,
    added_by_id: str | None = None,
) -> None:
    job = get_job(job_id)
    if job is None or job.status == "cancelled":
        return

    def report(stage: str, pct: int, msg: str, indeterminate: bool = False) -> None:
        if job.status == "cancelled":
            raise JobCancelledError()
        set_job_progress(job, stage, pct, msg, indeterminate=indeterminate)

    try:
        name = (filename or "").lower()
        set_job_progress(job, "parsing", 5, "Reading your file…")
        if name.endswith(".pdf"):
            text, stype = await asyncio.to_thread(parse_pdf, data), "pdf"
        elif name.endswith(".docx"):
            text, stype = await asyncio.to_thread(parse_docx, data), "docx"
        elif name.endswith(".csv"):
            text, stype = await asyncio.to_thread(parse_csv, data), "csv"
        elif name.endswith((".txt", ".md", ".markdown")):
            text, stype = data.decode("utf-8", errors="ignore"), "text"
        else:
            fail_job(job, "Unsupported file type")
            return
        async with AsyncSessionLocal() as db:
            await ingest_document(
                db,
                org_id=org_id,
                title=title or filename,
                text=text,
                source_type=stype,
                added_by_id=added_by_id,
                on_progress=report,
            )
        complete_job(job, "Upload complete")
    except JobCancelledError:
        pass  # status already set to cancelled by the cancel endpoint
    except Exception as e:  # noqa: BLE001
        print("[knowledge] upload job failed:", repr(e))
        fail_job(job, f"Upload failed: {e}")


async def _run_crawl_job(
    job_id: str, url: str, limit: int, org_id: str, added_by_id: str | None = None
) -> None:
    job = get_job(job_id)
    if job is None or job.status == "cancelled":
        return

    def report(stage: str, pct: int, msg: str, indeterminate: bool = False) -> None:
        if job.status == "cancelled":
            raise JobCancelledError()
        set_job_progress(job, stage, pct, msg, indeterminate=indeterminate)

    try:
        set_job_progress(job, "crawling", 3, "Starting crawl…")
        pages = await crawl_site_async(
            url,
            limit,
            on_progress=lambda done, total: report(
                "crawling",
                5 + int(40 * done / max(total, 1)) if total else 5,
                f"Fetched {done} of {total} pages" if total else "Discovering pages…",
                total <= 0,
            ),
            on_started=lambda fc_id: setattr(job, "firecrawl_id", fc_id),
            should_cancel=lambda: job.status == "cancelled",
        )
        if not pages:
            fail_job(job, "No pages found on the site")
            return
        total = len(pages)
        async with AsyncSessionLocal() as db:
            for i, page in enumerate(pages):
                report("ingesting", 45 + int(50 * i / total), f"Processing page {i + 1} of {total}…")
                await ingest_document(
                    db,
                    org_id=org_id,
                    title=page["title"] or url,
                    text=page["markdown"],
                    source_type="crawl",
                    added_by_id=added_by_id,
                    on_progress=report,
                )
        complete_job(job, f"Crawl complete — {total} pages ready")
    except JobCancelledError:
        pass  # status already set to cancelled by the cancel endpoint
    except Exception as e:  # noqa: BLE001
        print("[knowledge] crawl job failed:", repr(e))
        fail_job(job, f"Crawl failed: {e}")


@router.get("/list", response_model=KnowledgeSourceListOut)
async def list_sources(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items = await knowledge_repo.list_sources(
        db, user.organizationId, limit=limit, offset=offset
    )
    total = await knowledge_repo.count_sources(db, user.organizationId)
    return KnowledgeSourceListOut(items=items, total=total)


@router.post("/text")
async def add_text(
    body: TextIngest,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    src = await ingest_document(
        db, org_id=user.organizationId, title=body.title,
        text=body.content, source_type="text", added_by_id=user.id,
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
        db, org_id=user.organizationId, title=body.question[:80],
        text=text, source_type="faq", added_by_id=user.id,
    )
    return {"id": src.id}


@router.post("/faq/csv")
async def import_faq_csv(
    file: UploadFile = File(...),
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    pairs = parse_faq_csv(data)
    if not pairs:
        raise HTTPException(400, "No question/answer rows found. Use 'question' and 'answer' columns.")
    ids = []
    for p in pairs:
        src = await ingest_document(
            db, org_id=user.organizationId, title=p["question"][:80],
            text=f"Q: {p['question']}\nA: {p['answer']}", source_type="faq",
            added_by_id=user.id,
        )
        ids.append(src.id)
    return {"imported": len(ids)}


@router.post("/crawl")
async def add_crawl(
    body: CrawlIngest,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_org),
):
    """Start a crawl as a background job; poll GET /jobs/{id} for progress."""
    job = create_job("crawl")
    background_tasks.add_task(
        _run_crawl_job, job.id, body.url, body.limit, user.organizationId, user.id
    )
    return {"jobId": job.id}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    title: str = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: User = Depends(require_org),
):
    """Start an upload as a background job; poll GET /jobs/{id} for progress."""
    name = (file.filename or "").lower()
    if not name.endswith((".pdf", ".docx", ".csv", ".txt", ".md", ".markdown")):
        raise HTTPException(400, "Unsupported file type")
    data = await file.read()
    job = create_job("upload")
    background_tasks.add_task(
        _run_upload_job, job.id, data, file.filename or "", title, user.organizationId,
        user.id,
    )
    return {"jobId": job.id}


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    user: User = Depends(require_org),
):
    """Current progress of a background ingestion job (upload / crawl)."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found or expired")
    return job.to_dict()


@router.post("/jobs/{job_id}/cancel")
async def cancel_job_status(
    job_id: str,
    user: User = Depends(require_org),
):
    """Cancel a running ingestion job; also stops the Firecrawl crawl if any."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found or expired")
    if job.status == "running":
        cancel_job(job)
        if job.firecrawl_id:
            await asyncio.to_thread(cancel_firecrawl_crawl, job.firecrawl_id)
    return job.to_dict()


@router.delete("/delete")
async def delete_source(
    id: str = Query(...),
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    src = await knowledge_repo.get_source_for_org(db, id, user.organizationId)
    if src is None:
        raise HTTPException(404, "Source not found")
    await knowledge_repo.delete_source(db, src)
    bump_bm25_version(user.organizationId)
    return {"success": True}