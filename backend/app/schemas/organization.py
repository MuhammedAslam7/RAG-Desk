from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OrganizationSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    websiteUrl: str | None
    fallbackEmail: str | None
    language: str
    allowedDomains: str | None
    widgetGreeting: str | None
    widgetColor: str | None
    widgetPosition: str


class OrganizationSettingsUpdate(BaseModel):
    websiteUrl: str | None = None
    fallbackEmail: str | None = None
    language: str | None = None
    allowedDomains: str | None = None
    widgetGreeting: str | None = None
    widgetColor: str | None = None
    widgetPosition: str | None = None


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    status: str
    createdAt: datetime
    settings: OrganizationSettingsOut