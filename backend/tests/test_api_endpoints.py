import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, async_session_factory
from app.seed import seed_initial_issues
from app.config import settings

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()
    async with async_session_factory() as session:
        await seed_initial_issues(session, settings.TEMPLATE_EXCEL_PATH)

@pytest.mark.asyncio
async def test_health_check_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_dashboard_summary_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/dashboard/summary")
        assert res.status_code == 200
        data = res.json()
        assert "total_issues" in data
        assert "resolved_issues" in data
        assert "category_counts" in data

@pytest.mark.asyncio
async def test_list_issues_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/issues?page=1&page_size=10")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data

@pytest.mark.asyncio
async def test_sync_job_and_report_lifecycle_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Preview
        prev_res = await ac.post("/api/v1/sync-jobs/preview", json={
            "provider": "gmail",
            "start_date": "2026-10-09",
            "end_date": "2026-10-09"
        })
        assert prev_res.status_code == 200
        assert prev_res.json()["total_emails_matched"] >= 1

        # 2. Create and run sync job
        sync_res = await ac.post("/api/v1/sync-jobs", json={
            "provider": "gmail",
            "start_date": "2026-10-09",
            "end_date": "2026-10-09"
        })
        assert sync_res.status_code in [200, 409] # 200 or 409 if already registered
        
        # 3. Create Report
        rep_res = await ac.post("/api/v1/reports", json={
            "name": "Integration Test Report 15 Sep",
            "start_date": "2026-09-15",
            "end_date": "2026-09-15"
        })
        assert rep_res.status_code == 200
        rep_data = rep_res.json()
        report_id = rep_data["id"]
        assert rep_data["total_issues"] > 0

        # 4. Drill-Down Detail
        detail_res = await ac.get(f"/api/v1/reports/{report_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert len(detail_data["issues"]) == rep_data["total_issues"]

        # 5. Download Workbook
        dl_res = await ac.get(f"/api/v1/reports/{report_id}/download")
        assert dl_res.status_code == 200
        assert "spreadsheetml" in dl_res.headers.get("content-type", "")

        # 6. Delete Report and verify issues remain intact
        del_res = await ac.delete(f"/api/v1/reports/{report_id}")
        assert del_res.status_code == 200
        
        # Verify report is gone
        gone_res = await ac.get(f"/api/v1/reports/{report_id}")
        assert gone_res.status_code == 404

        # Verify underlying issues still exist
        issues_res = await ac.get("/api/v1/issues?start_date=2026-09-15&end_date=2026-09-15")
        assert issues_res.status_code == 200
        assert issues_res.json()["total"] > 0
