from datetime import date
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.report import ReportResponse
from app.schemas.sync_job import SyncJobResponse

class DashboardSummaryResponse(BaseModel):
    total_issues: int
    period_issues: int
    resolved_issues: int
    open_issues: int
    review_required_issues: int
    total_reports: int
    sync_jobs_running: int
    recent_reports: List[ReportResponse]
    recent_sync_jobs: List[SyncJobResponse]
    category_counts: Dict[str, int]
    status_counts: Dict[str, int]

class TrendDataPoint(BaseModel):
    date: str
    total: int
    resolved: int
    open: int

class DashboardTrendsResponse(BaseModel):
    trends: List[TrendDataPoint]

class CategoryBreakdownResponse(BaseModel):
    categories: Dict[str, int]
