import openpyxl
import logging
from datetime import datetime, date, time
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Issue
from app.config import settings

logger = logging.getLogger(__name__)

async def seed_initial_issues(db: AsyncSession, template_path: str):
    """
    Seeds initial reference issues from the reference workbook if they haven't been seeded yet.
    """
    chk = await db.execute(select(Issue).where(Issue.ai_model == "reference_dataset"))
    if chk.scalars().first():
        return

    try:
        wb = openpyxl.load_workbook(template_path)
        tracker_sheet = None
        for name in wb.sheetnames:
            if "Issue Tracker" in name:
                tracker_sheet = wb[name]
                break

        if not tracker_sheet:
            return

        seeded = 0
        for row in tracker_sheet.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:
                continue
            
            # Row mapping:
            # 0: Date
            # 1: User SR No
            # 2: Issue Raised by
            # 3: Application Name/Form Name
            # 4: Type of Issue
            # 5: Issue Details
            # 6: Resolution
            # 7: Time Received
            # 8: Time Resolved
            # 9: Resolution by
            # 10: Socurce
            # 11: Resolved By
            raw_date = row[0]
            if isinstance(raw_date, datetime):
                iss_date = raw_date.date()
            elif isinstance(raw_date, str):
                try:
                    iss_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
                except Exception:
                    iss_date = date(2026, 9, 15)
            else:
                iss_date = date(2026, 9, 15)

            raw_t_rec = row[7] if len(row) > 7 else None
            t_rec = None
            if isinstance(raw_t_rec, time):
                t_rec = raw_t_rec
            elif isinstance(raw_t_rec, datetime):
                t_rec = raw_t_rec.time()
            elif isinstance(raw_t_rec, str):
                try:
                    t_rec = datetime.strptime(raw_t_rec, "%H:%M:%S").time()
                except Exception:
                    pass

            raw_t_res = row[8] if len(row) > 8 else None
            t_res = None
            if isinstance(raw_t_res, time):
                t_res = raw_t_res
            elif isinstance(raw_t_res, datetime):
                t_res = raw_t_res.time()
            elif isinstance(raw_t_res, str):
                try:
                    t_res = datetime.strptime(raw_t_res, "%H:%M:%S").time()
                except Exception:
                    pass

            resolution_str = str(row[6]) if row[6] else None
            is_resolved = bool(resolution_str and resolution_str.lower() != "none")

            issue = Issue(
                issue_date=iss_date,
                user_sr_no=str(row[1]) if row[1] is not None else None,
                issue_raised_by=str(row[2]) if row[2] else None,
                application_name=str(row[3]) if row[3] else "eFEAP Access",
                type_of_issue=str(row[4]) if row[4] else "eFeap Login Issue",
                issue_details=str(row[5]) if row[5] else "No details provided",
                resolution=resolution_str,
                time_received=t_rec,
                time_resolved=t_res,
                resolution_by=str(row[9]) if row[9] else "IGA",
                socurce=str(row[10]) if row[10] else "Email",
                resolved_by=str(row[11]) if row[11] else None,
                resolution_status="resolved" if is_resolved else "open",
                confidence=1.0,
                needs_review=False,
                extraction_status="completed",
                ai_model="reference_dataset"
            )
            db.add(issue)
            seeded += 1

        await db.commit()
        logger.info(f"Seeded {seeded} initial reference issues from template into database.")
    except Exception as e:
        logger.error(f"Error seeding initial issues: {e}")
