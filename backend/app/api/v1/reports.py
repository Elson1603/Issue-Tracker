import os
import uuid
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database
from app.models import SavedReport, ReportIssue, Issue
from app.schemas.report import (
    ReportCreateRequest, ReportResponse, ReportDetailResponse, ReportListResponse
)
from app.services.excel_service import excel_service
from app.services.storage_service import storage_service

router = APIRouter()

@router.post("", response_model=ReportResponse)
async def create_saved_report(
    payload: ReportCreateRequest,
    db: AsyncSession = Depends(get_database)
):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date")

    # Query issues matching date filter
    filters = [
        Issue.issue_date >= payload.start_date,
        Issue.issue_date <= payload.end_date
    ]

    iss_q = await db.execute(
        select(Issue).where(and_(*filters)).order_by(Issue.issue_date.asc(), Issue.time_received.asc())
    )
    issues = iss_q.scalars().all()

    if not issues:
        raise HTTPException(
            status_code=404,
            detail=f"No issues found for the period {payload.start_date} to {payload.end_date}. Fetch emails or select another date."
        )

    # Prepare issue dicts for Excel template and snapshot
    issue_dicts = []
    resolved_count = 0
    open_count = 0
    review_count = 0

    for iss in issues:
        if iss.resolution_status == "resolved":
            resolved_count += 1
        else:
            open_count += 1
        if iss.needs_review:
            review_count += 1

        d = {
            "id": iss.id,
            "issue_date": iss.issue_date,
            "user_sr_no": iss.user_sr_no,
            "issue_raised_by": iss.issue_raised_by,
            "application_name": iss.application_name or "eFEAP Access",
            "type_of_issue": iss.type_of_issue,
            "issue_details": iss.issue_details,
            "resolution": iss.resolution,
            "time_received": iss.time_received,
            "time_resolved": iss.time_resolved,
            "resolution_by": iss.resolution_by or "IGA",
            "socurce": iss.socurce or "Email",
            "resolved_by": iss.resolved_by,
            "resolution_status": iss.resolution_status,
            "resolution_evidence": iss.resolution_evidence,
            "needs_review": iss.needs_review,
            "review_reason": iss.review_reason
        }
        issue_dicts.append(d)

    report_id = str(uuid.uuid4())
    default_name = f"IGA Issue Tracker ({payload.start_date.strftime('%d-%b-%Y')})" if payload.start_date == payload.end_date else f"IGA Issue Tracker ({payload.start_date} to {payload.end_date})"
    report_name = payload.name or default_name

    # Generate physical Excel workbook
    excel_result = excel_service.generate_report(
        issues=issue_dicts,
        start_date=payload.start_date,
        end_date=payload.end_date,
        report_id=report_id,
        report_name=report_name
    )

    # Save report metadata to PostgreSQL
    report = SavedReport(
        id=report_id,
        name=report_name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        date_filter_type=payload.date_filter_type,
        total_issues=len(issues),
        resolved_count=resolved_count,
        open_count=open_count,
        review_required_count=review_count,
        category_counts=excel_result["category_counts"],
        file_storage_path=excel_result["file_path"],
        file_name=excel_result["file_name"],
        file_size_bytes=excel_result["file_size"],
        status="ready",
        created_by="Analyst"
    )
    db.add(report)
    await db.flush()

    # Create immutable snapshots for historical report consistency
    for iss_dict in issue_dicts:
        # Convert non-serializable fields to strings for JSON snapshot
        snap = dict(iss_dict)
        snap["issue_date"] = str(snap["issue_date"])
        if snap.get("time_received"):
            snap["time_received"] = str(snap["time_received"])
        if snap.get("time_resolved"):
            snap["time_resolved"] = str(snap["time_resolved"])

        ri = ReportIssue(
            report_id=report.id,
            issue_id=iss_dict["id"],
            issue_snapshot=snap
        )
        db.add(ri)

    await db.commit()
    await db.refresh(report)

    return ReportResponse.model_validate(report)

@router.get("", response_model=ReportListResponse)
async def list_saved_reports(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_database)
):
    query = select(SavedReport)
    count_query = select(func.count(SavedReport.id))

    filters = []
    if search:
        filters.append(SavedReport.name.ilike(f"%{search}%"))
    if start_date:
        filters.append(SavedReport.start_date >= start_date)
    if end_date:
        filters.append(SavedReport.end_date <= end_date)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total = (await db.execute(count_query)).scalar() or 0

    sort_col = getattr(SavedReport, sort_by, SavedReport.created_at)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    res = await db.execute(query)
    items = [ReportResponse.model_validate(r) for r in res.scalars().all()]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return ReportListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/{report_id}", response_model=ReportDetailResponse)
async def get_report_detail(
    report_id: str,
    db: AsyncSession = Depends(get_database)
):
    report = await db.get(SavedReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found")

    # Load associated issue snapshots to preserve historical fidelity
    ri_q = await db.execute(
        select(ReportIssue).where(ReportIssue.report_id == report_id).order_by(ReportIssue.created_at.asc())
    )
    report_issues = ri_q.scalars().all()

    issues_list = []
    app_breakdown: Dict[str, int] = {}
    team_breakdown: Dict[str, int] = {}
    daily_breakdown: Dict[str, int] = {}

    for ri in report_issues:
        snap = ri.issue_snapshot
        issues_list.append(snap)
        
        # Breakdown calculations
        app_name = snap.get("application_name", "eFEAP Access")
        app_breakdown[app_name] = app_breakdown.get(app_name, 0) + 1

        team = snap.get("resolution_by", "IGA")
        team_breakdown[team] = team_breakdown.get(team, 0) + 1

        d_str = str(snap.get("issue_date", ""))
        if d_str:
            daily_breakdown[d_str] = daily_breakdown.get(d_str, 0) + 1

    detail_res = ReportDetailResponse.model_validate(report)
    detail_res.issues = issues_list
    detail_res.application_breakdown = app_breakdown
    detail_res.team_breakdown = team_breakdown
    detail_res.daily_breakdown = daily_breakdown

    return detail_res

@router.get("/{report_id}/issues")
async def get_report_issues(
    report_id: str,
    db: AsyncSession = Depends(get_database)
):
    report = await db.get(SavedReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found")

    ri_q = await db.execute(
        select(ReportIssue).where(ReportIssue.report_id == report_id)
    )
    items = [ri.issue_snapshot for ri in ri_q.scalars().all()]
    return {"report_id": report_id, "total": len(items), "issues": items}

@router.get("/{report_id}/download")
async def download_report_file(
    report_id: str,
    db: AsyncSession = Depends(get_database)
):
    report = await db.get(SavedReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found")

    file_path = report.file_storage_path
    
    # Check if physical file exists; if not, safely regenerate from immutable snapshot
    if not os.path.exists(file_path):
        ri_q = await db.execute(
            select(ReportIssue).where(ReportIssue.report_id == report_id)
        )
        snapshots = [ri.issue_snapshot for ri in ri_q.scalars().all()]
        if snapshots:
            regen_res = excel_service.generate_report(
                issues=snapshots,
                start_date=report.start_date,
                end_date=report.end_date,
                report_id=report.id,
                report_name=report.name
            )
            file_path = regen_res["file_path"]
            report.file_storage_path = file_path
            await db.commit()
        else:
            raise HTTPException(status_code=404, detail="Report artifact is missing and cannot be regenerated")

    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=report.file_name
    )

@router.delete("/{report_id}")
async def delete_saved_report(
    report_id: str,
    db: AsyncSession = Depends(get_database)
):
    report = await db.get(SavedReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found")

    # Delete physical file from storage
    if report.file_name:
        storage_service.delete_report_file(report.file_name)

    # Delete report from database (ReportIssue will cascade, underlying issues remain safe!)
    await db.delete(report)
    await db.commit()

    return {
        "success": True,
        "message": f"Report '{report.name}' ({report_id}) deleted successfully. Associated issues remain intact."
    }
