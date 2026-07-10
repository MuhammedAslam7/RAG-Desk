from datetime import datetime
from pydantic import BaseModel


class TextIngest(BaseModel):
    title: str
    content: str


class FaqIngest(BaseModel):
    question: str
    answer: str


class CrawlIngest(BaseModel):
    url: str
    limit: int = 10


class KnowledgeSourceOut(BaseModel):
    id: str
    title: str
    type: str
    chunkCount: int
    createdAt: datetime