import ssl
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import AsyncGenerator, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

class Base(DeclarativeBase):
    pass

def sanitize_database_url_and_args(raw_url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Normalizes PostgreSQL URLs for asyncpg and properly separates
    query parameters like 'sslmode' into asyncpg-compatible connect_args.
    """
    connect_args: Dict[str, Any] = {}
    db_url = raw_url

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "asyncpg" in db_url:
        parsed = urlparse(db_url)
        params = parse_qs(parsed.query)

        # Check for SSL requirement in Neon URL
        ssl_required = False
        if "sslmode" in params:
            val = params.pop("sslmode")[0].lower()
            if val in ["require", "verify-ca", "verify-full"]:
                ssl_required = True
        if "ssl" in params:
            val = params.pop("ssl")[0].lower()
            if val in ["require", "true", "1"]:
                ssl_required = True
        
        # asyncpg does not accept channel_binding in URL query
        if "channel_binding" in params:
            params.pop("channel_binding")

        if ssl_required:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ctx

        # Reconstruct clean URL without unsupported query parameters
        new_query = urlencode([(k, v[0]) for k, v in params.items()])
        clean_url = urlunparse((
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment
        ))
        return clean_url, connect_args

    elif "sqlite" in db_url:
        connect_args["check_same_thread"] = False
        return db_url, connect_args

    return db_url, connect_args

clean_db_url, connect_args = sanitize_database_url_and_args(settings.DATABASE_URL)

engine = create_async_engine(
    clean_db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
