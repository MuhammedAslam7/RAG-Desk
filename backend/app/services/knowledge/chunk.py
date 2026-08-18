"""Production-grade chunking pipeline.

Three layers, in order of processing:

1. Structure-aware splitting — markdown headings, numbered headings, fenced
   code blocks, tables and horizontal rules are respected. Code blocks and
   tables are treated as atomic units and never split mid-block. Each
   resulting piece becomes a *parent* section.
2. Embedding-based semantic chunking — long sections are split into sentence
   micro-units, each is embedded, and units are merged until the cosine
   similarity between adjacent units drops below a threshold (a topic shift).
   This produces chunks that respect meaning boundaries instead of character
   counts.
3. Parent-child metadata — every small *child* chunk carries ``parent_content``
   (the full section it came from) and ``heading`` (the heading path). At
   retrieval time we search the small chunks but feed the larger section to the
   LLM, so answers get full context.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
import math
import re

from app.core.config import settings


@dataclass
class Chunk:
    content: str
    parent_content: str
    heading: str = ""
    embedding: list[float] | None = field(default=None)  # set when a single micro-unit is reused


# ---------------------------------------------------------------------------
# Structure-aware section splitting
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_FENCE_RE = re.compile(r"^(`{3,}|~{3,})")
_HR_RE = re.compile(r"^\s*(?:[-*_]\s*){3,}$")
_TABLE_LINE_RE = re.compile(r"^\s*\|.*\|\s*$")
_NUMBERED_HEADING_RE = re.compile(r"^(\d+(?:\.\d+)*)\.?\s+([A-Z][A-Za-z0-9 &/,'\-]{2,80})$")


def _split_sections(text: str) -> list[tuple[str, str]]:
    """Split text into ``(heading_path, content)`` sections.

    Markdown headings (``# Title``) and numbered headings (``1. Title``,
    ``4.3 Title``) both open a new section (nested markdown headings extend
    the path). Fenced code blocks, consecutive table rows, and horizontal
    rules are kept atomic — headings inside code blocks are ignored.
    """
    lines = text.split("\n")
    sections: list[tuple[str, str]] = []
    heading = ""
    buffer: list[str] = []

    def flush() -> None:
        content = "\n".join(buffer).strip()
        if content:
            sections.append((heading, content))
        buffer.clear()

    i, n = 0, len(lines)
    while i < n:
        raw = lines[i]
        stripped = raw.strip()

        # --- fenced code block: consume as an atomic section ---
        if _FENCE_RE.match(stripped):
            flush()
            block = [raw]
            i += 1
            while i < n and not _FENCE_RE.match(lines[i].strip()):
                block.append(lines[i])
                i += 1
            if i < n:  # closing fence
                block.append(lines[i])
                i += 1
            sections.append((heading, "\n".join(block)))
            continue

        # --- markdown heading: new section ---
        m = _HEADING_RE.match(raw)
        if m:
            flush()
            level, title = len(m.group(1)), m.group(2).strip()
            if level == 1:
                heading = title
            elif heading:
                heading = f"{heading} > {title}"
            else:
                heading = title
            i += 1
            continue

        # --- numbered heading (e.g. "4.3 API Rate Limits"): new section ---
        nm = _NUMBERED_HEADING_RE.match(stripped)
        if nm:
            flush()
            number, title = nm.group(1), nm.group(2).strip()
            heading = f"{number} {title}"
            i += 1
            continue

        # --- horizontal rule: hard boundary ---
        if _HR_RE.match(raw):
            flush()
            i += 1
            continue

        buffer.append(raw)
        i += 1

    flush()
    return sections


def _is_table_row(line: str) -> bool:
    return bool(_TABLE_LINE_RE.match(line))


# ---------------------------------------------------------------------------
# Sentence / micro-unit building
# ---------------------------------------------------------------------------

_SENTENCE_END_RE = re.compile(r"(?<=[.!?…])\s+(?=[A-Z0-9\"'(\[«])")


def _split_sentences(text: str) -> list[str]:
    out = []
    for part in _SENTENCE_END_RE.split(text):
        p = part.strip()
        if p:
            out.append(p)
    return out or [text.strip()]


def _split_long(text: str) -> list[str]:
    """Split an over-long unit on word boundaries, keeping a small overlap."""
    words = text.split(" ")
    pieces: list[str] = []
    buf: list[str] = []
    size = 0
    for w in words:
        if buf and size + len(w) + 1 > settings.CHUNK_MAX:
            pieces.append(" ".join(buf))
            overlap: list[str] = []
            osize = 0
            for bw in reversed(buf):
                if osize + len(bw) + 1 > 120:
                    break
                overlap.insert(0, bw)
                osize += len(bw) + 1
            buf, size = list(overlap), osize
        buf.append(w)
        size += len(w) + 1
    if buf:
        pieces.append(" ".join(buf))
    return pieces


def _merge_table_rows(segments: list[str]) -> list[str]:
    """Join runs of consecutive table rows into a single atomic segment."""
    out: list[str] = []
    i, n = 0, len(segments)
    while i < n:
        if _is_table_row(segments[i]):
            block = [segments[i]]
            i += 1
            while i < n and _is_table_row(segments[i]):
                block.append(segments[i])
                i += 1
            out.append("\n".join(block))
        else:
            out.append(segments[i])
            i += 1
    return out


def _build_units(text: str, target: int, preserve_indent: bool = False) -> list[str]:
    """Group text into sentence-boundary units of roughly ``target`` chars.

    Consecutive table rows are kept as one atomic segment, and code blocks
    (``preserve_indent=True``) keep their indentation and are never
    sentence-split. Used by the no-embedding plain chunker, which packs to a
    fixed target size.
    """
    raw_segments: list[str] = []
    for raw in text.split("\n"):
        seg = raw.rstrip() if preserve_indent else raw.strip()
        if seg:
            raw_segments.append(seg)
    if not raw_segments:
        return []
    # keep table runs atomic BEFORE any sentence-splitting
    merged = raw_segments if preserve_indent else _merge_table_rows(raw_segments)
    segments: list[str] = []
    for seg in merged:
        if not preserve_indent and len(seg) > settings.CHUNK_MAX:
            segments.extend(_split_sentences(seg))
        else:
            segments.append(seg)

    units: list[str] = []
    buf: list[str] = []
    size = 0
    for seg in segments:
        if buf and size + len(seg) + 1 > target:
            units.append("\n".join(buf))
            buf, size = [], 0
        buf.append(seg)
        size += len(seg) + 1
    if buf:
        units.append("\n".join(buf))

    out: list[str] = []
    for u in units:
        if len(u) <= settings.CHUNK_MAX:
            out.append(u)
        else:
            out.extend(_split_long(u))
    return out


def _build_micro_units(text: str, preserve_indent: bool = False) -> list[str]:
    """Paragraph-aligned micro-units for semantic chunking.

    Each unit is a paragraph (blank-line separated); paragraphs longer than
    ``CHUNK_MAX`` are sentence-split. This keeps topic boundaries intact so
    embedding similarity between adjacent units reflects genuine topic shifts —
    the merge step below grows units back to the target size.
    """
    if preserve_indent:
        lines = [l.rstrip() for l in text.split("\n") if l.strip()]
        if not lines:
            return []
        # group consecutive code lines so a 200-line file isn't 200 micro-units
        units: list[str] = []
        buf: list[str] = []
        size = 0
        for line in lines:
            if buf and size + len(line) + 1 > settings.CHUNK_TARGET:
                units.append("\n".join(buf))
                buf, size = [], 0
            buf.append(line)
            size += len(line) + 1
        if buf:
            units.append("\n".join(buf))
        return units

    units: list[str] = []
    for para in re.split(r"\n\s*\n", text):
        segs = [p.strip() for p in para.split("\n") if p.strip()]
        if not segs:
            continue
        for seg in _merge_table_rows(segs):
            if len(seg) > settings.CHUNK_MAX:
                units.extend(_split_sentences(seg))
            else:
                units.append(seg)
    return units


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


def _split_threshold(sims: list[float]) -> float:
    """Adaptive topic-shift threshold: split where sim falls below the
    configured percentile of adjacent similarities, capped at the absolute
    threshold so we never split on tiny fluctuations."""
    if len(sims) >= 4:
        ordered = sorted(sims)
        idx = max(0, min(len(ordered) - 1, int(len(ordered) * settings.SEMANTIC_SPLIT_PERCENTILE)))
        return min(ordered[idx], settings.SEMANTIC_SPLIT_THRESHOLD)
    return settings.SEMANTIC_SPLIT_THRESHOLD


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def chunk_document(
    text: str,
    embed_fn=None,
    on_progress: Callable[[int, int], None] | None = None,
) -> list[Chunk]:
    """Chunk a document into parent-child chunks.

    ``embed_fn(texts: list[str]) -> list[list[float]]`` is optional; when given,
    long sections get embedding-based semantic splitting. If embedding fails we
    transparently fall back to sentence-boundary chunking. ``on_progress(done,
    total)`` is called after each section is processed.
    """
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return []

    sections = _split_sections(text)
    chunks: list[Chunk] = []
    total = len(sections)
    done = 0
    for heading, section in sections:
        if len(section) <= settings.CHUNK_TARGET:
            # Small sections are a single child that is also its own parent.
            chunks.append(Chunk(content=section, parent_content=section, heading=heading))
            continue
        is_code = section.lstrip().startswith(("```", "~~~"))
        if embed_fn is not None and settings.SEMANTIC_CHUNKING:
            chunks.extend(await _semantic_chunk_section(heading, section, embed_fn, preserve_indent=is_code))
        else:
            chunks.extend(_plain_chunk_section(heading, section, preserve_indent=is_code))
        done += 1
        if on_progress is not None:
            on_progress(done, total)
    return chunks


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def _add_vecs(a: list[float], b: list[float]) -> list[float]:
    return [x + y for x, y in zip(a, b)]


async def _semantic_chunk_section(
    heading: str,
    section: str,
    embed_fn,
    preserve_indent: bool = False,
) -> list[Chunk]:
    micros = _build_micro_units(section, preserve_indent=preserve_indent)
    if len(micros) <= 1:
        return [Chunk(content=section, parent_content=section, heading=heading)]

    try:
        embeddings = await embed_fn(micros)
    except Exception as e:  # noqa: BLE001
        print(f"[chunk] semantic embedding failed ({e!r}); using plain chunking")
        return _plain_chunk_section(heading, section, preserve_indent=preserve_indent)

    if len(embeddings) != len(micros):
        return _plain_chunk_section(heading, section, preserve_indent=preserve_indent)

    sims = [_cosine(embeddings[i], embeddings[i + 1]) for i in range(len(embeddings) - 1)]
    threshold = _split_threshold(sims)

    chunks: list[Chunk] = []
    current: list[str] = [micros[0]]
    # Running (unnormalized) sum of the micro embeddings in this chunk. Every
    # chunk reuses its micro embeddings — single micros keep their exact vector,
    # merged chunks use the normalized average — so no text is ever embedded
    # twice (this keeps ingest far below the embedding API's rate quota).
    current_sum = list(embeddings[0])
    for i in range(1, len(micros)):
        would_exceed = len("\n".join(current)) + len(micros[i]) + 1 > settings.CHUNK_MAX
        topic_shift = sims[i - 1] < threshold
        if would_exceed or topic_shift:
            chunks.append(_make_chunk(current, current_sum, heading, section))
            current, current_sum = [micros[i]], list(embeddings[i])
        else:
            current.append(micros[i])
            current_sum = _add_vecs(current_sum, embeddings[i])
    chunks.append(_make_chunk(current, current_sum, heading, section))
    return chunks


def _make_chunk(
    micros: list[str],
    embedding_sum: list[float] | None,
    heading: str,
    section: str,
) -> Chunk:
    return Chunk(
        content="\n".join(micros),
        parent_content=section,
        heading=heading,
        embedding=_normalize(embedding_sum) if embedding_sum is not None else None,
    )


def _plain_chunk_section(
    heading: str,
    section: str,
    preserve_indent: bool = False,
) -> list[Chunk]:
    """Sentence-boundary chunking with a one-sentence overlap (no embeddings)."""
    units = _build_units(section, target=settings.CHUNK_TARGET, preserve_indent=preserve_indent)
    chunks: list[Chunk] = []
    carried = None
    for unit in units:
        if settings.CHUNK_OVERLAP and carried and len(carried) + len(unit) + 1 <= settings.CHUNK_MAX:
            content = carried + "\n" + unit
            carried = None
        else:
            content = unit
            carried = None
            if not preserve_indent:
                last_sentences = _split_sentences(unit)
                if len(last_sentences) > 1:
                    carried = last_sentences[-1]
        chunks.append(Chunk(content=content, parent_content=section, heading=heading))
    return chunks