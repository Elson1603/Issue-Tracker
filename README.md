# IGA Email Issue Tracker

Full-Stack enterprise web application built for Life Insurance Corporation's **IGA Support Mailbox**. The application fetches support emails on demand, extracts structured issue records using **Fireworks AI**, maintains historical resolution consistency, and generates downloadable Excel workbooks exactly matching the attached reference template.

---

## 1. System Architecture

- **Frontend**: React 19 + TypeScript, Vite 8, Tailwind CSS, React Router v7, TanStack Query v5, Recharts, Lucide Icons.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio + asyncpg / aiosqlite), Alembic migrations, openpyxl.
- **Database**: PostgreSQL (Neon Serverless supported via pooled connection strings; local SQLite fallback for testing).
- **AI Extraction**: Fireworks AI (`FIREWORKS_MODEL=accounts/fireworks/models/qwen2p5-72b-instruct`) with schema-constrained JSON extraction and high-precision deterministic parsing.
- **Report Engine**: `openpyxl` template generator preserving exact layout, formula sums, and column header spellings (`Socurce`, `Time Received `, blank 13th column).

---

## 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Key Configuration Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled URL e.g. `postgresql+asyncpg://neondb_owner:<PWD>@<ENDPOINT>-pooler.us-east-2.aws.neon.tech/neondb?ssl=require` |
| `FIREWORKS_API_KEY` | Fireworks AI secret key (`fw_...`) |
| `FIREWORKS_MODEL` | Default: `accounts/fireworks/models/qwen2p5-72b-instruct` |
| `GMAIL_CLIENT_ID` / `SECRET` | Google Cloud OAuth2 credentials for Gmail API |
| `MS365_CLIENT_ID` / `SECRET` | Azure AD / Entra ID app credentials for MS Graph |
| `APP_TIMEZONE` | Default: `Asia/Kolkata` |

---

## 3. Database Migration & Initialization

Alembic migrations are configured under `backend/alembic_migrations`:

```bash
cd backend
python -m alembic upgrade head
```

On server start, FastAPI's lifespan hook automatically verifies the database schema and seeds the initial reference dataset from the workbook template.

---

## 4. Running the Application

### Start Backend API Server
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation will be available at: `http://localhost:8000/docs`

### Start Frontend Application
```bash
cd frontend
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 5. Automated Tests & Evaluation Suite

Run the full pytest automated test suite covering all 14 core requirements:

```bash
cd backend
python -m pytest tests/ -v
```

The test suite validates:
1. eFEAP access issue extraction.
2. User not mapped to location (Transfer In categorization).
3. Confirmed successful resolutions vs. instructions.
4. Support instructions without confirmed resolution (marked unconfirmed & review flagged).
5. Multi-reply conversation timeline parsing.
6. Missing employee SR numbers triggering the human review queue.
7. Single-day and multi-day Excel report generation.
8. Exact summary category counts and Grand Total recalculation.
9. Report artifact deletion preserving underlying issues.
10. Model evaluation benchmark suite matching real PDF email examples.
11. End-to-end FastAPI REST API endpoints.

