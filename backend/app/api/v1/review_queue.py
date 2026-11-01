from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database
from app.models import Issue
from app.schemas.issue import IssueResponse, IssueListResponse

router = APIRouter()

@router.get("", response_model=IssueListResponse)
async def get_review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_database)
):
    query = select(Issue).options(selectinload(Issue.audits)).where(Issue.needs_review == True)
    count_query = select(func.count(Issue.id)).where(Issue.needs_review == True)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Issue.created_at.desc())
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
