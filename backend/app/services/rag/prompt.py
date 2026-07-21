from app.services.rag.retrieval import RankedChunk


def _fmt_date(d) -> str:
    return d.strftime("%b %d, %Y")


_LENGTH_INSTRUCTIONS = {
    "short": "Keep answers brief — 1-2 sentences whenever possible.",
    "medium": "Keep answers concise but complete — a short paragraph at most.",
    "detailed": "Give thorough, well-explained answers with relevant detail.",
}

_TONE_INSTRUCTIONS = {
    "professional": "Use a professional, polished tone.",
    "friendly": "Use a warm, friendly, approachable tone.",
    "casual": "Use a relaxed, casual, conversational tone.",
}

_EMOJI_INSTRUCTIONS = {
    "none": "Do not use emoji.",
    "moderate": "Use emoji sparingly, only where it feels natural.",
    "frequent": "Feel free to use emoji often to keep things lively.",
}


def build_system_prompt(
    chunks: list[RankedChunk],
    facts: list[dict],
    ai_settings: dict | None = None,
) -> str:
    ai_settings = ai_settings or {}
    name = ai_settings.get("aiName") or "AI Assistant"
    personality = ai_settings.get("aiPersonality")
    length = _LENGTH_INSTRUCTIONS.get(ai_settings.get("responseLength", "medium"), _LENGTH_INSTRUCTIONS["medium"])
    tone = _TONE_INSTRUCTIONS.get(ai_settings.get("tone", "friendly"), _TONE_INSTRUCTIONS["friendly"])
    emoji = _EMOJI_INSTRUCTIONS.get(ai_settings.get("emojiUsage", "moderate"), _EMOJI_INSTRUCTIONS["moderate"])
    language = ai_settings.get("language")
    disclaimer = ai_settings.get("showAiDisclaimer", True)

    persona_lines = [
        f'You are "{name}", a customer support agent.',
        tone,
        length,
        emoji,
    ]
    if personality:
        persona_lines.append(f"Personality notes: {personality.strip()}")
    if language and language != "en":
        persona_lines.append(f"Always respond in this language code: {language}.")
    if disclaimer:
        persona_lines.append(
            "If a visitor asks whether you are a human, be honest that you are an AI assistant."
        )

    persona = "\n".join(persona_lines)

    facts_block = ""
    if facts:
        lines = "\n".join(f"- {f['subject']}: {f['value']}" for f in facts)
        facts_block = (
            "VERIFIED CURRENT FACTS (always trust these over the knowledge base "
            "excerpts below if they conflict):\n" + lines + "\n\n"
        )

    if chunks or facts:
        kb = "\n\n".join(
            f'[{i + 1}] (added {_fmt_date(c.createdAt)}, source: "{c.sourceTitle}")\n'
            f"{c.content}"
            for i, c in enumerate(chunks)
        )
        return (
            persona + "\n\n"
            'Answer using the information below. If the answer is not there, say '
            '"I don\'t have information about that in my knowledge base."\n\n'
            + facts_block
            + "Each knowledge base entry shows when it was added. If entries conflict, "
            "ALWAYS trust the VERIFIED CURRENT FACTS first, then the more recently "
            "added entry. Never mention outdated or conflicting information.\n\n"
            "KNOWLEDGE BASE:\n" + kb
        )

    return (
        persona + "\n\n"
        "No knowledge base has been uploaded yet. Let the user know they should "
        "upload a document first."
    )