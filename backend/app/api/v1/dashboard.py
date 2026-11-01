from datetime import date, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database
from app.models import Issue, SavedReport, SyncJob
from app.schemas.dashboard import DashboardSummaryResponse, DashboardTrendsResponse, CategoryBreakdownResponse, TrendDataPoint
from app.schemas.report import ReportResponse
from app.schemas.sync_job import SyncJobResponse

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_database)
):
    # Total issues all-time
    total_q = await db.execute(select(func.count(Issue.id)))
    total_issues = total_q.scalar() or 0

    # Build period filter
    filters = []
    if start_date:
        filters.append(Issue.issue_date >= start_date)
    if end_date:
        filters.append(Issue.issue_date <= end_date)

    period_q = select(func.count(Issue.id))
    if filters:
        period_q = period_q.where(and_(*filters))
    period_res = await db.execute(period_q)
    period_issues = period_res.scalar() or 0

    # Resolved in period
    res_q = select(func.count(Issue.id)).where(Issue.resolution_status == "resolved")
    if filters:
        res_q = res_q.where(and_(*filters))
    res_count = (await db.execute(res_q)).scalar() or 0

    # Open in period
    open_q = select(func.count(Issue.id)).where(Issue.resolution_status.in_(["open", "in_progress", "pending_confirmation"]))
    if filters:
        open_q = open_q.where(and_(*filters))
    open_count = (await db.execute(open_q)).scalar() or 0

    # Review required
    rev_q = select(func.count(Issue.id)).where(Issue.needs_review == True)
    if filters:
        rev_q = rev_q.where(and_(*filters))
    rev_count = (await db.execute(rev_q)).scalar() or 0

    # Saved reports total
    rep_q = await db.execute(select(func.count(SavedReport.id)))
    total_reports = rep_q.scalar() or 0

    # Running sync jobs
    job_q = await db.execute(select(func.count(SyncJob.id)).where(SyncJob.status == "running"))
    sync_jobs_running = job_q.scalar() or 0

    # Recent reports (5)
    recent_reps_q = await db.execute(
        select(SavedReport).order_by(SavedReport.created_at.desc()).limit(5)
    )
    recent_reports = [ReportResponse.model_validate(r) for r in recent_reps_q.scalars().all()]

    # Recent sync jobs (5)
    recent_jobs_q = await db.execute(
        select(SyncJob).order_by(SyncJob.created_at.desc()).limit(5)
    )
    recent_sync_jobs = [SyncJobResponse.model_validate(j) for j in recent_jobs_q.scalars().all()]

    # Category counts
    cat_q = select(Issue.type_of_issue, func.count(Issue.id)).group_by(Issue.type_of_issue)
    if filters:
        cat_q = cat_q.where(and_(*filters))
    cat_res = await db.execute(cat_q)
    category_counts = {row[0]: row[1] for row in cat_res.all()}

    # Status counts
    stat_q = select(Issue.resolution_status, func.count(Issue.id)).group_by(Issue.resolution_status)
    if filters:
        stat_q = stat_q.where(and_(*filters))
    stat_res = await db.execute(stat_q)
    status_counts = {row[0]: row[1] for row in stat_res.all()}

    return DashboardSummaryResponse(
        total_issues=total_issues,
        period_issues=period_issues,
        resolved_issues=res_count,
        open_issues=open_count,
        review_required_issues=rev_count,
        total_reports=total_reports,
        sync_jobs_running=sync_jobs_running,
        recent_reports=recent_reports,
        recent_sync_jobs=recent_sync_jobs,
        category_counts=category_counts,
        status_counts=status_counts
    )

@router.get("/trends", response_model=DashboardTrendsResponse)
async def get_dashboard_trends(
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_database)
):
    end_d = date.today()
    start_d = end_d - timedelta(days=days)

    q = select(
        Issue.issue_date,
        func.count(Issue.id).label("total"),
        func.count(func.nullif(Issue.resolution_status != "resolved", True)).label("resolved"),
        func.count(func.nullif(Issue.resolution_status == "resolved", True)).label("open")
    ).where(Issue.issue_date >= start_d).group_by(Issue.issue_date).order_by(Issue.issue_date.asc())

    res = await db.execute(q)
    rows = res.all()

    trends = [
        TrendDataPoint(
            date=str(row[0]),
            total=row[1],
            resolved=row[2],
            open=row[3]
        )
        for row in rows
    ]

    return DashboardTrendsResponse(trends=trends)

@router.get("/category-breakdown", response_model=CategoryBreakdownResponse)
async def get_category_breakdown(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_database)
):
    filters = []
    if start_date:
        filters.append(Issue.issue_date >= start_date)
    if end_date:
        filters.append(Issue.issue_date <= end_date)

    q = select(Issue.type_of_issue, func.count(Issue.id)).group_by(Issue.type_of_issue)
    if filters:
        q = q.where(and_(*filters))
    res = await db.execute(q)
    categories = {row[0]: row[1] for row in res.all()}

    return CategoryBreakdownResponse(categories=categories)
