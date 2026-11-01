from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database
from app.models import Issue, IssueAudit, EmailThread, EmailMessage
from app.schemas.issue import IssueResponse, IssueListResponse, IssueUpdate

router = APIRouter()

@router.get("", response_model=IssueListResponse)
async def list_issues(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    application: Optional[str] = Query(None),
    resolution_team: Optional[str] = Query(None),
    needs_review: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("issue_date"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_database)
):
    query = select(Issue).options(selectinload(Issue.audits))
    count_query = select(func.count(Issue.id))

    filters = []
    if search:
        s_term = f"%{search}%"
        filters.append(
            or_(
                Issue.user_sr_no.ilike(s_term),
                Issue.issue_raised_by.ilike(s_term),
                Issue.issue_details.ilike(s_term),
                Issue.type_of_issue.ilike(s_term),
                Issue.resolved_by.ilike(s_term)
            )
        )
    if start_date:
        filters.append(Issue.issue_date >= start_date)
    if end_date:
        filters.append(Issue.issue_date <= end_date)
    if status:
        filters.append(Issue.resolution_status == status)
    if category:
        filters.append(Issue.type_of_issue == category)
    if application:
        filters.append(Issue.application_name == application)
    if resolution_team:
        filters.append(Issue.resolution_by == resolution_team)
    if needs_review is not None:
        filters.append(Issue.needs_review == needs_review)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total = (await db.execute(count_query)).scalar() or 0

    # Sorting
    sort_col = getattr(Issue, sort_by, Issue.issue_date)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_col.desc(), Issue.created_at.desc())
    else:
        query = query.order_by(sort_col.asc(), Issue.created_at.asc())

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    res = await db.execute(query)
    items = [IssueResponse.model_validate(iss) for iss in res.scalars().all()]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return IssueListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_database)
):
    query = select(Issue).options(selectinload(Issue.audits)).where(Issue.id == issue_id)
    res = await db.execute(query)
    issue = res.scalars().first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return IssueResponse.model_validate(issue)

@router.get("/{issue_id}/thread")
async def get_issue_email_thread(
    issue_id: str,
    db: AsyncSession = Depends(get_database)
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    if not issue.thread_id:
        return {"thread": None, "messages": []}

    th_res = await db.execute(
        select(EmailThread).options(selectinload(EmailThread.messages)).where(EmailThread.id == issue.thread_id)
    )
    thread = th_res.scalars().first()
    if not thread:
        return {"thread": None, "messages": []}

    sorted_msgs = sorted(thread.messages, key=lambda m: m.sent_at)
    return {
        "thread": {
            "id": thread.id,
            "provider_thread_id": thread.provider_thread_id,
            "subject": thread.subject,
            "snippet": thread.snippet,
            "message_count": thread.message_count
        },
        "messages": [
            {
                "id": m.id,
                "provider_message_id": m.provider_message_id,
                "sender": m.sender,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "subject": m.subject,
                "body_text": m.body_text,
                "is_original_issue": m.is_original_issue
            }
            for m in sorted_msgs
        ]
    }

@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: str,
    payload: IssueUpdate,
    db: AsyncSession = Depends(get_database)
):
    query = select(Issue).options(selectinload(Issue.audits)).where(Issue.id == issue_id)
    res = await db.execute(query)
    issue = res.scalars().first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    changes = {}
    update_data = payload.model_dump(exclude_unset=True, exclude={"audit_reason"})

    for field, new_val in update_data.items():
        old_val = getattr(issue, field)
        if old_val != new_val:
            changes[field] = {
                "old": str(old_val) if old_val is not None else None,
                "new": str(new_val) if new_val is not None else None
            }
            setattr(issue, field, new_val)

    if changes:
        audit = IssueAudit(
            issue_id=issue.id,
            changed_by="User",
            changes=changes,
            reason=payload.audit_reason or "Manual correction"
        )
        db.add(audit)
        issue.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(issue)

    return IssueResponse.model_validate(issue)
