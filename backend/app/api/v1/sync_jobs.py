import asyncio
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database
from app.database import async_session_factory
from app.models import SyncJob, Issue
from app.schemas.sync_job import SyncJobCreateRequest, SyncJobResponse, SyncJobListResponse, EmailPreviewResponse
from app.schemas.issue import IssueResponse
from app.services.sync_service import sync_service
from app.services.email_provider import GmailAdapter, MS365Adapter

router = APIRouter()

async def run_sync_in_background(job_id: str):
    async with async_session_factory() as session:
        try:
            await sync_service.execute_sync_job(session, job_id)
        except Exception as e:
            pass

@router.post("/preview", response_model=EmailPreviewResponse)
async def preview_sync_emails(
    payload: SyncJobCreateRequest,
    db: AsyncSession = Depends(get_database)
):
    adapter = sync_service._get_provider_adapter(payload.provider)
    preview = await adapter.preview_emails(
        start_date=payload.start_date,
        end_date=payload.end_date,
        folder_filter=payload.folder_filter,
        subject_filter=payload.subject_filter
    )
    return EmailPreviewResponse(**preview)

@router.post("", response_model=SyncJobResponse)
async def create_sync_job(
    payload: SyncJobCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database)
):
    # Check if a job with the same parameters is already running
    running_q = await db.execute(
        select(SyncJob).where(
            and_(
                SyncJob.provider == payload.provider,
                SyncJob.status.in_(["pending", "running"]),
                SyncJob.start_date == payload.start_date,
                SyncJob.end_date == payload.end_date
            )
        )
    )
    existing_running = running_q.scalars().first()
    if existing_running:
        raise HTTPException(
            status_code=409,
            detail=f"A sync job ({existing_running.id}) for these parameters is already {existing_running.status}."
        )

    job = SyncJob(
        provider=payload.provider,
        status="pending",
        start_date=payload.start_date or date.today(),
        end_date=payload.end_date or date.today(),
        filter_by=payload.filter_by,
        log_events=[{
            "timestamp": datetime.utcnow().isoformat(),
            "level": "INFO",
            "message": f"Sync job created for {payload.provider} (range: {payload.start_date} to {payload.end_date})"
        }]
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Launch background task
    background_tasks.add_task(run_sync_in_background, job.id)

    return SyncJobResponse.model_validate(job)

@router.get("/{job_id}", response_model=SyncJobResponse)
async def get_sync_job(
    job_id: str,
    db: AsyncSession = Depends(get_database)
):
    job = await db.get(SyncJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    
    # Load newly extracted issues in this date range if job completed
    extracted_issues = []
    if job.start_date and job.end_date:
        iss_q = await db.execute(
            select(Issue).where(
                and_(
                    Issue.issue_date >= job.start_date,
                    Issue.issue_date <= job.end_date
                )
            ).order_by(Issue.created_at.desc()).limit(20)
        )
        extracted_issues = [IssueResponse.model_validate(i) for i in iss_q.scalars().all()]

    res = SyncJobResponse.model_validate(job)
    res.extracted_issues = extracted_issues
    return res

@router.post("/{job_id}/retry", response_model=SyncJobResponse)
async def retry_sync_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database)
):
    job = await db.get(SyncJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    
    if job.status == "running":
        raise HTTPException(status_code=400, detail="Cannot retry a job that is currently running")

    job.status = "pending"
    job.failed_count = 0
    job.error_message = None
    job.log_events.append({
        "timestamp": datetime.utcnow().isoformat(),
        "level": "INFO",
        "message": f"Manual retry initiated for job {job_id}"
    })
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(run_sync_in_background, job.id)
    return SyncJobResponse.model_validate(job)

@router.get("", response_model=SyncJobListResponse)
async def list_sync_jobs(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_database)
):
    res = await db.execute(
        select(SyncJob).order_by(SyncJob.created_at.desc()).limit(limit)
    )
    jobs = [SyncJobResponse.model_validate(j) for j in res.scalars().all()]
    return SyncJobListResponse(total=len(jobs), items=jobs)
