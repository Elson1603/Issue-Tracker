from fastapi import APIRouter
from app.api.v1 import dashboard, sync_jobs, issues, reports, review_queue, settings

api_router = APIRouter()

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "IGA Email Issue Tracker API",
        "version": "1.0.0"
    }

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(sync_jobs.router, prefix="/sync-jobs", tags=["Sync Jobs"])
api_router.include_router(issues.router, prefix="/issues", tags=["Issues"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(review_queue.router, prefix="/review-queue", tags=["Review Queue"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
