from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, async_session_factory
from app.api.v1.router import api_router
from app.seed import seed_initial_issues

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables created and seed initial dataset if empty
    await init_db()
    async with async_session_factory() as session:
        await seed_initial_issues(session, settings.TEMPLATE_EXCEL_PATH)
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise production API for IGA Email Issue Tracker with Fireworks AI extraction and exact Excel template export.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "api_v1": "/api/v1"
    }
