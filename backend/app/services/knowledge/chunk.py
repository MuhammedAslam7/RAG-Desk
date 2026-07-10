def chunk_text(text: str, size: int = 1000, overlap: int = 150) -> list[str]:
    """Simple word-window chunker with overlap."""

    text = " ".join(text.split())

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks