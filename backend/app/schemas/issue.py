from datetime import date, time as time_type, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class IssueBase(BaseModel):
    issue_date: date
    user_sr_no: Optional[str] = None
    issue_raised_by: Optional[str] = None
    application_name: Optional[str] = "eFEAP Access"
    type_of_issue: str
    issue_details: str
    resolution: Optional[str] = None
    time_received: Optional[time_type] = None
    time_resolved: Optional[time_type] = None
    resolution_by: Optional[str] = "IGA"
    socurce: str = "Email"
    resolved_by: Optional[str] = None
    resolution_status: str = "open"
    resolution_evidence: Optional[str] = None
    confidence: float = 1.0
    needs_review: bool = False
    review_reason: Optional[str] = None
    extraction_status: str = "completed"
    ai_model: Optional[str] = None

class IssueCreate(IssueBase):
    thread_id: Optional[str] = None
    source_message_id: Optional[str] = None

class IssueUpdate(BaseModel):
    issue_date: Optional[date] = None
    user_sr_no: Optional[str] = None
    issue_raised_by: Optional[str] = None
    application_name: Optional[str] = None
    type_of_issue: Optional[str] = None
    issue_details: Optional[str] = None
    resolution: Optional[str] = None
    time_received: Optional[time_type] = None
    time_resolved: Optional[time_type] = None
    resolution_by: Optional[str] = None
    socurce: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_status: Optional[str] = None
    resolution_evidence: Optional[str] = None
    needs_review: Optional[bool] = None
    review_reason: Optional[str] = None
    audit_reason: Optional[str] = "Manual update via web interface"

class IssueAuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    issue_id: str
    changed_by: str
    changes: Dict[str, Any]
    reason: Optional[str] = None
    created_at: datetime

class IssueResponse(IssueBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    thread_id: Optional[str] = None
    source_message_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    audits: List[IssueAuditResponse] = []

class IssueListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[IssueResponse]
