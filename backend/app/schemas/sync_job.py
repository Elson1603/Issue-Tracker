from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.issue import IssueResponse

class SyncJobCreateRequest(BaseModel):
    provider: str = "gmail"  # "gmail" or "microsoft365"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    filter_by: str = "issue_date"  # "issue_date" or "activity_date"
    folder_filter: Optional[str] = "INBOX"
    subject_filter: Optional[str] = None
    max_emails: Optional[int] = 100

class EmailPreviewResponse(BaseModel):
    provider: str
    start_date: Optional[date]
    end_date: Optional[date]
    total_emails_matched: int
    sample_subjects: List[str]

class SyncJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    provider: str
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    filter_by: str
    total_found: int
    processed_count: int
    skipped_count: int
    failed_count: int
    newly_tracked_count: int
    error_message: Optional[str] = None
    log_events: List[Dict[str, Any]] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    extracted_issues: List[IssueResponse] = []

class SyncJobListResponse(BaseModel):
    total: int
    items: List[SyncJobResponse]
