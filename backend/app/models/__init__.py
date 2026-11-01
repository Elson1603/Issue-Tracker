import uuid
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, Date, Time as SQLTime, 
    DateTime, ForeignKey, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="analyst")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmailProviderConfig(Base):
    __tablename__ = "email_provider_configs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)  # 'gmail' or 'microsoft365'
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    mailbox_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_secret: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    folder_filter: Mapped[Optional[str]] = mapped_column(String(100), default="INBOX")
    subject_filter: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sync_checkpoint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    settings_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SyncJob(Base):
    __tablename__ = "sync_jobs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)  # pending, running, completed, failed, partially_completed
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    filter_by: Mapped[str] = mapped_column(String(50), default="issue_date")  # 'issue_date' or 'activity_date'
    total_found: Mapped[int] = mapped_column(Integer, default=0)
    processed_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    newly_tracked_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    log_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class EmailThread(Base):
    __tablename__ = "email_threads"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    provider: Mapped[str] = mapped_column(String(50), default="email")
    provider_thread_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=1)
    first_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages: Mapped[List["EmailMessage"]] = relationship("EmailMessage", back_populates="thread", cascade="all, delete-orphan")
    issues: Mapped[List["Issue"]] = relationship("Issue", back_populates="thread")

    __table_args__ = (
        UniqueConstraint("provider", "provider_thread_id", name="uq_provider_thread"),
    )

class EmailMessage(Base):
    __tablename__ = "email_messages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    thread_id: Mapped[str] = mapped_column(String(36), ForeignKey("email_threads.id", ondelete="CASCADE"), index=True)
    provider_message_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    sender: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sender_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recipients: Mapped[List[str]] = mapped_column(JSON, default=list)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_headers: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    has_attachments: Mapped[bool] = mapped_column(Boolean, default=False)
    is_original_issue: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    thread: Mapped["EmailThread"] = relationship("EmailThread", back_populates="messages")

class Issue(Base):
    __tablename__ = "issues"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    thread_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("email_threads.id", ondelete="SET NULL"), nullable=True, index=True)
    source_message_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("email_messages.id", ondelete="SET NULL"), nullable=True)
    
    # Core Excel Template Fields
    issue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    user_sr_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    issue_raised_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    application_name: Mapped[Optional[str]] = mapped_column(String(255), default="eFEAP Access")
    type_of_issue: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    issue_details: Mapped[str] = mapped_column(Text, nullable=False)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_received: Mapped[Optional[SQLTime]] = mapped_column(SQLTime, nullable=True)
    time_resolved: Mapped[Optional[SQLTime]] = mapped_column(SQLTime, nullable=True)
    resolution_by: Mapped[Optional[str]] = mapped_column(String(100), default="IGA")
    socurce: Mapped[str] = mapped_column(String(50), default="Email")
    resolved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Tracking & Quality Fields
    resolution_status: Mapped[str] = mapped_column(String(50), default="open", index=True)  # open, in_progress, resolved, rejected, pending_confirmation
    resolution_evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    review_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extraction_status: Mapped[str] = mapped_column(String(50), default="completed")
    ai_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    thread: Mapped[Optional["EmailThread"]] = relationship("EmailThread", back_populates="issues")
    audits: Mapped[List["IssueAudit"]] = relationship("IssueAudit", back_populates="issue", cascade="all, delete-orphan")
    report_associations: Mapped[List["ReportIssue"]] = relationship("ReportIssue", back_populates="issue")

    __table_args__ = (
        Index("idx_issues_date_type", "issue_date", "type_of_issue"),
        Index("idx_issues_status", "resolution_status"),
    )

class IssueAudit(Base):
    __tablename__ = "issue_audits"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    issue_id: Mapped[str] = mapped_column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), index=True)
    changed_by: Mapped[str] = mapped_column(String(100), default="system")
    changes: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    issue: Mapped["Issue"] = relationship("Issue", back_populates="audits")

class SavedReport(Base):
    __tablename__ = "saved_reports"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    date_filter_type: Mapped[str] = mapped_column(String(50), default="issue_date")
    total_issues: Mapped[int] = mapped_column(Integer, default=0)
    resolved_count: Mapped[int] = mapped_column(Integer, default=0)
    open_count: Mapped[int] = mapped_column(Integer, default=0)
    review_required_count: Mapped[int] = mapped_column(Integer, default=0)
    category_counts: Mapped[Dict[str, int]] = mapped_column(JSON, default=dict)
    file_storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="ready")
    created_by: Mapped[str] = mapped_column(String(100), default="User")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    report_issues: Mapped[List["ReportIssue"]] = relationship("ReportIssue", back_populates="report", cascade="all, delete-orphan")

class ReportIssue(Base):
    __tablename__ = "report_issues"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    report_id: Mapped[str] = mapped_column(String(36), ForeignKey("saved_reports.id", ondelete="CASCADE"), index=True)
    issue_id: Mapped[str] = mapped_column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), index=True)
    issue_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    report: Mapped["SavedReport"] = relationship("SavedReport", back_populates="report_issues")
    issue: Mapped["Issue"] = relationship("Issue", back_populates="report_associations")

    __table_args__ = (
        UniqueConstraint("report_id", "issue_id", name="uq_report_issue"),
    )
