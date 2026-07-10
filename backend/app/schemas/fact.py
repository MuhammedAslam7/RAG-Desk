from datetime import datetime
from pydantic import BaseModel


class FactCreate(BaseModel):
    subject: str
    value: str


class FactUpdate(BaseModel):
    id: str
    value: str


class FactOut(BaseModel):
    id: str
    subject: str
    value: str
    createdAt: datetime