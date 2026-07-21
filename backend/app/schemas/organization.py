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

    theme: str
    widgetWidth: str
    widgetHeight: str
    borderRadius: str
    font: str
    showShadow: bool
    animation: str


class OrganizationSettingsUpdate(BaseModel):
    websiteUrl: str | None = None
    fallbackEmail: str | None = None
    language: str | None = None
    allowedDomains: str | None = None
    widgetGreeting: str | None = None
    widgetColor: str | None = None
    widgetPosition: str | None = None

    theme: str | None = None
    widgetWidth: str | None = None
    widgetHeight: str | None = None
    borderRadius: str | None = None
    font: str | None = None
    showShadow: bool | None = None
    animation: str | None = None


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    status: str
    createdAt: datetime
    settings: OrganizationSettingsOut


class WidgetConfigOut(BaseModel):
    orgName: str
    status: str
    greeting: str | None
    color: str | None
    position: str

    theme: str
    widgetWidth: str
    widgetHeight: str
    borderRadius: str
    font: str
    showShadow: bool
    animation: str