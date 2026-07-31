from pydantic_settings import BaseSettings, SettingsConfigDict


# class Settings(BaseSettings):
#     model_config = SettingsConfigDict(env_file=".env", extra="ignore")

#     DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_support"
#     GOOGLE_GENERATIVE_AI_API_KEY: str = ""
#     CLERK_JWKS_URL: str = ""
#     FIRECRAWL_API_KEY: str = ""
#     FRONTEND_ORIGIN: str = "http://localhost:3000"
#     # CLERK_ISSUER: str = ""    

#     # Embedding config - must match what stored the vectors
#     EMBED_MODEL: str = "gemini-embedding-001"
#     EMBED_DIM: int = 768
#     CHAT_MODEL: str = "gemini-2.5-flash"


# settings = Settings()

#After addin the gamma3
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_support"
    GOOGLE_GENERATIVE_AI_API_KEY: str = ""   # still used for embeddings
    CLERK_JWKS_URL: str = ""
    FIRECRAWL_API_KEY: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Embedding config — unchanged, still Gemini
    EMBED_MODEL: str = "gemini-embedding-001"
    EMBED_DIM: int = 768

    # Chat/generation config — now local Ollama instead of Gemini
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    CHAT_MODEL: str = "gemma3"


settings = Settings()