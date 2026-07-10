import csv
import io


def parse_csv(data: bytes) -> str:
    text = data.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(text))
    return "\n".join(", ".join(row) for row in reader)