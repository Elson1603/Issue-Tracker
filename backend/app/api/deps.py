from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

async def get_database() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session
