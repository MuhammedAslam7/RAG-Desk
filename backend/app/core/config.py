from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_support"
    GOOGLE_GENERATIVE_AI_API_KEY: str = ""
    CLERK_JWKS_URL: str = ""
    FIRECRAWL_API_KEY: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Embedding config - must match what stored the vectors
    EMBED_MODEL: str = "gemini-embedding-001"
    EMBED_DIM: int = 768
    CHAT_MODEL: str = "gemini-2.5-flash"


settings = Settings()