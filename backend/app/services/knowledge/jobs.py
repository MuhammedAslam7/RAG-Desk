"""In-memory registry of background ingestion jobs with progress.

Uploads and crawls are now processed in FastAPI background tasks: the endpoint
creates a job, a background task updates its progress, and the frontend polls
``GET /api/v1/knowledge/jobs/{id}`` to render a progress bar.

The backend runs a single uvicorn worker (see app/services/realtime.py), so a
plain in-memory dict is a correct store. Jobs are pruned after ``_TTL_SECONDS``
so the dict never grows unbounded.
"""

import time
import uuid

_TTL_SECONDS = 3600  # jobs are short-lived; drop them after an hour
_MAX_JOBS = 500


class JobCancelledError(Exception):
    """Raised inside a background job when the user cancels it; the runner
    treats this as a normal stop instead of a failure."""


class KnowledgeJob:
    __slots__ = (
        "id",
        "kind",
        "status",
        "stage",
        "progress",
        "message",
        "error",
        "indeterminate",
        "firecrawl_id",
        "created_at",
        "updated_at",
    )

    def __init__(self, kind: str) -> None:
        self.id = uuid.uuid4().hex
        self.kind = kind
        self.status = "running"
        self.stage = "starting"
        self.progress = 0
        self.message = "Starting…"
        self.error: str | None = None
        self.indeterminate = False
        self.firecrawl_id: str | None = None
        self.created_at = time.time()
        self.updated_at = time.time()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "stage": self.stage,
            "progress": self.progress,
            "message": self.message,
            "error": self.error,
            "indeterminate": self.indeterminate,
        }


_jobs: dict[str, KnowledgeJob] = {}


def create_job(kind: str) -> KnowledgeJob:
    """Create and register a new job, pruning stale/overflowing entries."""
    now = time.time()
    for jid in [jid for jid, j in _jobs.items() if now - j.updated_at > _TTL_SECONDS]:
        _jobs.pop(jid, None)
    job = KnowledgeJob(kind)
    _jobs[job.id] = job
    if len(_jobs) > _MAX_JOBS:  # dict preserves insertion order → drop oldest
        for jid in list(_jobs)[: len(_jobs) - _MAX_JOBS]:
            _jobs.pop(jid, None)
    return job


def get_job(job_id: str) -> KnowledgeJob | None:
    return _jobs.get(job_id)


def set_job_progress(
    job: KnowledgeJob,
    stage: str,
    progress: int,
    message: str,
    indeterminate: bool = False,
) -> None:
    job.stage = stage
    job.progress = max(0, min(100, progress))
    job.message = message
    job.indeterminate = indeterminate
    job.updated_at = time.time()


def complete_job(job: KnowledgeJob, message: str) -> None:
    job.status = "completed"
    job.stage = "done"
    job.progress = 100
    job.message = message
    job.updated_at = time.time()


def fail_job(job: KnowledgeJob, error: str) -> None:
    job.status = "failed"
    job.stage = "failed"
    job.error = error
    job.message = error
    job.updated_at = time.time()


def cancel_job(job: KnowledgeJob) -> None:
    job.status = "cancelled"
    job.stage = "cancelled"
    job.message = "Cancelled"
    job.updated_at = time.time()
