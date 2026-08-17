from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_support"
    FIRECRAWL_API_KEY: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # ---- Custom auth (JWT access + refresh tokens in httpOnly cookies) ----
    JWT_SECRET: str = "change-me-to-a-long-random-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 30
    # Cookies
    COOKIE_SECURE: bool = False       # set True behind HTTPS in production
    COOKIE_DOMAIN: str | None = None  # e.g. ".ragdesk.com" to share across subdomains

    # ---- Brevo (transactional email) ----
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "no-reply@ragdesk.app"
    BREVO_SENDER_NAME: str = "RAG Desk"

    # Chat/generation config — local Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    CHAT_MODEL: str = "gemma3"

    # Embedding config — local Qwen3 via sentence-transformers
    EMBED_MODEL: str = "Qwen/Qwen3-Embedding-0.6B"
    EMBED_DIM: int = 768
    EMBED_DEVICE: str = "cpu"
    EMBED_BATCH_SIZE: int = 32

    # ---- Chunking config (structure-aware + semantic + parent-child) ----
    CHUNK_MIN: int = 400          # smallest sensible child chunk
    CHUNK_TARGET: int = 800       # preferred child-chunk size (chars)
    CHUNK_MAX: int = 1200         # hard cap before forced word-boundary split
    CHUNK_OVERLAP: bool = True    # carry one sentence between plain-mode chunks
    SEMANTIC_SPLIT_THRESHOLD: float = 0.78   # absolute min cosine sim between micro-units to stay together
    SEMANTIC_SPLIT_PERCENTILE: float = 0.30  # split where sim falls below this percentile of adjacent sims
    PARENT_MAX_CHARS: int = 2500  # cap on parent section text sent to the LLM

    # ---- Embedding safety ----
    SEMANTIC_CHUNKING: bool = True      # set False to skip micro-unit embeddings entirely
    EMBED_CACHE_MAX: int = 2000         # LRU dedupe cache for identical texts

    # ---- Retrieval config (hybrid vector + BM25, then cross-encoder rerank) ----
    VECTOR_CANDIDATES: int = 20
    BM25_CANDIDATES: int = 20
    FUSION_CANDIDATES: int = 12
    RRF_K: int = 60
    RERANK_TOP_K: int = 5
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"


settings = Settings()