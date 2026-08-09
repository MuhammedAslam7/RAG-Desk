"""Standalone sanity tests for the hybrid RAG pipeline.

Run from backend/:  python test_rag.py
No database or API keys required — semantic chunking is exercised with a
deterministic fake embedding function.
"""

import re
import sys
import zlib
from datetime import datetime, timezone

from app.core.config import settings
from app.services.ai.embeddings import _retry_delay_from
from app.services.knowledge.bm25 import BM25Index, tokenize
from app.services.knowledge.chunk import (
    _add_vecs,
    _cosine,
    _normalize,
    _split_sections,
    _split_threshold,
    chunk_document,
)
from app.services.rag.prompt import _trim_parent
from app.services.rag.retrieval import (
    RankedChunk,
    _finalize,
    _rrf_fusion,
)

FAILURES = []


def check(name: str, cond: bool, detail: str = ""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        FAILURES.append(name)


_STOP = {
    "the", "and", "are", "for", "a", "an", "is", "to", "of", "in", "on",
    "at", "with", "your", "you", "their", "need", "keeps", "home", "it",
    "this", "that", "be", "has", "have", "from", "by", "as", "or", "not",
}


async def fake_embed(texts: list[str]) -> list[list[float]]:
    """Deterministic content-word vectors: same topic -> high cosine, different
    topics -> low cosine (mirrors what real embedding models do). Uses CRC32 so
    results are stable across runs and collision-free enough to separate topics."""
    out = []
    for t in texts:
        v = [0.0] * 256
        for tok in re.findall(r"[a-z0-9]+", t.lower()):
            if len(tok) < 4 or tok in _STOP:
                continue
            v[zlib.crc32(tok.encode()) % 256] += 1.0
        out.append(v)
    return out


def test_section_splitting():
    doc = (
        "# Getting Started\n"
        "Welcome to the product. This is the intro paragraph.\n"
        "\n"
        "## Installation\n"
        "Run pip install. Then start the server.\n"
        "\n"
        "```python\n"
        "def hello():\n"
        "    # this is not a heading\n"
        "    return 'hi'\n"
        "```\n"
        "\n"
        "## Pricing\n"
        "| Plan | Price |\n"
        "|------|-------|\n"
        "| Free | $0    |\n"
        "| Pro  | $20   |\n"
        "\n"
        "Contact us for details.\n"
    )
    sections = _split_sections(doc)
    texts = [s for _, s in sections]
    headings = [h for h, _ in sections]

    check("4 sections produced", len(sections) == 4, f"got {len(sections)}")
    check("heading path kept", "Getting Started > Installation" in headings or "Installation" in headings)
    check("code fence atomic", any(t.startswith("```python") and "return 'hi'" in t for t in texts))
    check("table kept together", any("| Free | $0" in t and "| Pro" in t for t in texts))
    check("comment inside code fence not treated as heading",
          all(not h.endswith("this is not a heading") for h in headings))


def test_semantic_chunking():
    dog = (
        "Dogs are loyal pets. Train your dog with treats. "
        "Dogs need daily walks and exercise. "
        "Grooming a dog keeps its coat healthy.\n"
    ) * 4
    cat = (
        "Cats are independent pets. Feed your cat quality food. "
        "Cats need a litter box at home. "
        "Brush a cat to reduce shedding.\n"
    ) * 4
    doc = "# Animals\n" + dog + cat

    import asyncio
    chunks = asyncio.run(chunk_document(doc, embed_fn=fake_embed))

    check("semantic chunking splits topics", len(chunks) >= 2, f"got {len(chunks)} chunk(s)")
    check("no chunk mixes topics",
          all(not ("dogs" in c.content.lower() and "cats" in c.content.lower()) for c in chunks))
    check("child chunks respect max size",
          all(len(c.content) <= settings.CHUNK_MAX for c in chunks))
    check("parent contains full section",
          all(c.parent_content == chunks[0].parent_content for c in chunks) and len(chunks[0].parent_content) > len(chunks[0].content))
    check("heading attached", all(c.heading == "Animals" for c in chunks))
    check("micro embeddings reused on every semantic chunk",
          all(c.embedding is not None and len(c.embedding) == 256 for c in chunks))
    check("chunk embeddings are unit vectors",
          all(abs(sum(x * x for x in c.embedding) - 1.0) < 1e-6 for c in chunks))


def test_plain_chunking_fallback():
    import asyncio
    text = ("This is a fairly long plain document. " * 60)
    chunks = asyncio.run(chunk_document(text, embed_fn=None))
    check("plain chunks exist", len(chunks) > 1, f"got {len(chunks)}")
    check("plain chunks within max", all(len(c.content) <= settings.CHUNK_MAX for c in chunks))
    check("parents set for plain chunks", all(c.parent_content == chunks[0].parent_content for c in chunks))


def test_bm25():
    corpus = [
        "the cat sat on the mat",
        "dogs love to run outside",
        "cat food for kittens and cats",
        "refund policy for damaged orders",
    ]
    index = BM25Index(corpus)
    hits = index.score_documents(tokenize("cat"), top_k=10)
    top = corpus[hits[0][0]]
    check("BM25 ranks cat docs first", "cat" in top, f"top: {top!r}")
    top_2 = [corpus[i] for i, _ in hits[:2]]
    check("BM25 top-2 are relevant", all("cat" in t for t in top_2), f"{top_2!r}")

    hits2 = index.score_documents(tokenize("refund order"), top_k=10)
    check("BM25 finds exact terms", hits2 and "refund" in corpus[hits2[0][0]])

    check("tokenizer keeps error codes", tokenize("ERR_500 raised on x86-64") == ["err_500", "raised", "on", "x86-64"])


def test_rrf():
    vector = [
        {"id": "a", "distance": 0.1},
        {"id": "b", "distance": 0.2},
        {"id": "c", "distance": 0.3},
    ]
    bm25 = [(0, {"id": "b"}, 5.0), (1, {"id": "d"}, 4.0), (2, {"id": "a"}, 3.0)]
    fused = _rrf_fusion(vector, bm25, k=60)
    order = [cid for cid, _ in fused]
    check("RRF puts b first", order[0] == "b", f"{order}")
    check("RRF contains both sources", set(order[:3]) == {"a", "b", "d"}, f"{order}")


def test_finalize_dedupes_parents():
    now = datetime.now(timezone.utc)
    parent = "P" * 100
    chunks = [
        RankedChunk(content="child A", createdAt=now, sourceTitle="s", distance=0.1,
                    parentContent=parent, rerankScore=0.9),
        RankedChunk(content="child B", createdAt=now, sourceTitle="s", distance=0.2,
                    parentContent=parent, rerankScore=0.8),
        RankedChunk(content="child C", createdAt=now, sourceTitle="s", distance=0.3,
                    parentContent="other parent", rerankScore=0.7),
    ]
    out = _finalize(chunks, top_k=3)
    check("sibling chunks deduped by parent", len(out) == 2, f"got {len(out)}")
    check("best child kept", out[0].content == "child A", out[0].content)


def test_ingest_embedding_assembly():
    """Replicates ingest.py's embedding lookup: Chunk is an unfrozen dataclass
    (unhashable), so embeddings must be keyed by id() rather than by object."""
    import asyncio

    async def run():
        # Plain chunking (no embed_fn): every chunk needs an embedding, exactly
        # like small sections do at ingest time.
        text = "This is a fairly long plain document. " * 60
        chunks = await chunk_document(text, embed_fn=None)
        try:
            hash(chunks[0])
            unhashable = False
        except TypeError:
            unhashable = True
        check("Chunk is unhashable (why id() keys are used)", unhashable)
        to_embed = [c for c in chunks if c.embedding is None]
        check("plain chunks all need embedding", len(to_embed) == len(chunks) > 0)
        embedded = await fake_embed([c.content for c in to_embed])
        embedding_by_chunk = {id(c): e for c, e in zip(to_embed, embedded)}
        assembled = [
            c.embedding if c.embedding is not None else embedding_by_chunk[id(c)]
            for c in chunks
        ]
        check("every chunk resolves an embedding", len(assembled) == len(chunks) and all(e for e in assembled))

    asyncio.run(run())


def test_embedding_reuse_math():
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    avg = _normalize(_add_vecs(a, b))
    check("averaged embedding is unit length", abs(sum(x * x for x in avg) - 1.0) < 1e-9)
    check("averaged embedding points diagonally", avg[0] > 0.6 and avg[1] > 0.6)


def test_retry_delay_parsing():
    class E(Exception):
        pass
    d = _retry_delay_from(E("Quota exceeded ... RetryInfo: retryDelay': '23.39s'"))
    check("retryDelay parsed from error text", abs(d - 23.39) < 0.01, f"got {d}")
    check("missing retryDelay -> 0", _retry_delay_from(E("plain error")) == 0.0)


def test_trim_parent():
    parent = "A" * 300 + " MATCHHERE " + "B" * 300
    out = _trim_parent(parent, "MATCHHERE", cap=200)
    check("trimmed parent contains child", "MATCHHERE" in out)
    check("trimmed parent within cap", len(out) <= 200, f"{len(out)}")


def test_cosine():
    check("cosine of identical vectors is 1", abs(_cosine([1, 2], [1, 2]) - 1.0) < 1e-9)
    check("cosine of orthogonal vectors is 0", abs(_cosine([1, 0], [0, 1])) < 1e-9)


def test_threshold():
    sims = [0.9, 0.88, 0.95, 0.3, 0.92, 0.87, 0.91]
    t = _split_threshold(sims)
    check("threshold is capped at absolute", t <= settings.SEMANTIC_SPLIT_THRESHOLD, f"{t}")


def main():
    print("=== hybrid RAG sanity tests ===\n")
    test_cosine()
    test_threshold()
    test_section_splitting()
    test_semantic_chunking()
    test_plain_chunking_fallback()
    test_bm25()
    test_rrf()
    test_finalize_dedupes_parents()
    test_ingest_embedding_assembly()
    test_embedding_reuse_math()
    test_retry_delay_parsing()
    test_trim_parent()
    print()
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S): {FAILURES}")
        sys.exit(1)
    print("ALL TESTS PASSED")


if __name__ == "__main__":
    main()
