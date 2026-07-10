from app.services.rag.retrieval import RankedChunk


def _fmt_date(d) -> str:
    return d.strftime("%b %d, %Y")


def build_system_prompt(chunks: list[RankedChunk], facts: list[dict]) -> str:
    facts_block = ""

    if facts:
        lines = "\n".join(
            f"- {f['subject']}: {f['value']}"
            for f in facts
        )

        facts_block = (
            "VERIFIED CURRENT FACTS (always trust these over the knowledge base "
            "excerpts below if they conflict):\n"
            + lines
            + "\n\n"
        )

    if chunks or facts:
        kb = "\n\n".join(
            f'[{i + 1}] (added {_fmt_date(c.createdAt)}, source: "{c.sourceTitle}")\n'
            f"{c.content}"
            for i, c in enumerate(chunks)
        )

        return (
            "You are a helpful customer support agent. Answer using the information "
            'below. If the answer is not there, say "I don\'t have information about '
            'that in my knowledge base."\n\n'
            + facts_block
            + "Each knowledge base entry shows when it was added. If entries conflict, "
            "ALWAYS trust the VERIFIED CURRENT FACTS first, then the more recently "
            "added entry. Never mention outdated or conflicting information.\n\n"
            "KNOWLEDGE BASE:\n"
            + kb
        )

    return (
        "You are a helpful customer support agent. No knowledge base has been "
        "uploaded yet. Let the user know they should upload a document first."
    )