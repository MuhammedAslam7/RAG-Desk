import csv
import io


def parse_faq_csv(data: bytes) -> list[dict]:
    """Parse a CSV of Q/A rows into [{question, answer}]. Tolerant of header names."""
    text = data.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    pairs: list[dict] = []
    for row in reader:
        low = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        question = low.get("question") or low.get("q") or low.get("prompt") or ""
        answer = low.get("answer") or low.get("a") or low.get("response") or ""
        if question and answer:
            pairs.append({"question": question, "answer": answer})
    return pairs