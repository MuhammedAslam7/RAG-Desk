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

    # ---- Chunking config (structure-aware + semantic + parent-child) ----
    CHUNK_MIN: int = 400          # smallest sensible child chunk
    CHUNK_TARGET: int = 800       # preferred child-chunk size (chars)
    CHUNK_MAX: int = 1200         # hard cap before forced word-boundary split
    CHUNK_OVERLAP: bool = True    # carry one sentence between plain-mode chunks
    SEMANTIC_SPLIT_THRESHOLD: float = 0.78   # absolute min cosine sim between micro-units to stay together
    SEMANTIC_SPLIT_PERCENTILE: float = 0.30  # split where sim falls below this percentile of adjacent sims
    PARENT_MAX_CHARS: int = 2500  # cap on parent section text sent to the LLM

    # ---- Embedding API safety (Gemini free tier allows ~100 req/min) ----
    # Note: the pace limiter is per-process, so keep a single uvicorn worker
    # (as in docker-compose) or set EMBED_RATE_PER_MIN = 100 // num_workers.
    SEMANTIC_CHUNKING: bool = True      # set False to skip micro-unit embeddings entirely
    EMBED_RATE_PER_MIN: int = 80        # pace embeddings under the free-tier quota (100/min)
    EMBED_MAX_CONCURRENCY: int = 8      # parallel embedding requests
    EMBED_RETRY_MAX: int = 5            # retries on 429/5xx before giving up
    EMBED_CACHE_MAX: int = 2000         # LRU dedupe cache for identical texts

    # ---- Retrieval config (hybrid vector + BM25, then cross-encoder rerank) ----
    VECTOR_CANDIDATES: int = 20
    BM25_CANDIDATES: int = 20
    FUSION_CANDIDATES: int = 12
    RRF_K: int = 60
    RERANK_TOP_K: int = 5
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"


settings = Settings()