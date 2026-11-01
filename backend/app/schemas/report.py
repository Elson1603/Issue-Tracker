from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.issue import IssueResponse

class ReportCreateRequest(BaseModel):
    name: Optional[str] = None
    start_date: date
    end_date: date
    date_filter_type: str = "issue_date"  # "issue_date" or "activity_date"

class ReportIssueSnapshot(BaseModel):
    id: str
    report_id: str
    issue_id: str
    issue_snapshot: Dict[str, Any]
    created_at: datetime

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    start_date: date
    end_date: date
    date_filter_type: str
    total_issues: int
    resolved_count: int
    open_count: int
    review_required_count: int
    category_counts: Dict[str, int]
    file_name: str
    file_size_bytes: int
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime

class ReportDetailResponse(ReportResponse):
    issues: List[Dict[str, Any]] = []
    application_breakdown: Dict[str, int] = {}
    team_breakdown: Dict[str, int] = {}
    daily_breakdown: Dict[str, int] = {}

class ReportListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[ReportResponse]
