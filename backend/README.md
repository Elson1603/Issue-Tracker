# IGA Email Issue Tracker — Backend Service

FastAPI-powered backend service for the **IGA Email Issue Tracker**. Handles support email fetching, structured issue extraction via **Fireworks AI**, database persistence with **Neon PostgreSQL**, and Excel report generation matching the original reference template.

---

## 1. Prerequisites

- **Python 3.10+** (Tested on Python 3.12)
- **pip** package manager
- (Optional for Production) **Neon PostgreSQL** account & pooled connection string
- (Optional for AI) **Fireworks AI** API Key

---

## 2. Setup & Installation

### Step 1: Open Terminal in the `backend` Directory
```bash
cd backend
```

### Step 2: (Recommended) Create & Activate a Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Step 3: Install Required Dependencies
Install the exact requirements using `requirements.txt`:
```bash
pip install -r requirements.txt
```

---

## 3. Environment Variables Configuration (`.env`)

In the `backend` folder (or root project folder), create a `.env` file from `.env.example`:

```bash
cp ../.env.example .env
```

### Key Environment Variables

```env
# ----------------------------------------------------
# Database Configuration
# ----------------------------------------------------
# For Local Development (SQLite fallback):
DATABASE_URL=sqlite+aiosqlite:///./iga_tracker.db

# For Production (Neon PostgreSQL Pooled Connection):
# DATABASE_URL=postgresql+asyncpg://neondb_owner:<PASSWORD>@<ENDPOINT>-pooler.us-east-2.aws.neon.tech/neondb?ssl=require

# ----------------------------------------------------
# Fireworks AI Extraction
# ----------------------------------------------------
FIREWORKS_API_KEY=your_fireworks_api_key_here
FIREWORKS_MODEL=accounts/fireworks/models/qwen2p5-72b-instruct
FIREWORKS_BASE_URL=https://api.fireworks.ai/inference/v1

# ----------------------------------------------------
# Email Provider (Gmail / MS365)
# ----------------------------------------------------
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:5173/settings
GMAIL_USER_EMAIL=iga_support@licindia.com

MS365_CLIENT_ID=
MS365_CLIENT_SECRET=
MS365_TENANT_ID=common
MS365_REDIRECT_URI=http://localhost:5173/settings
MS365_USER_EMAIL=iga_support@licindia.com

# ----------------------------------------------------
# Storage and Timezone
# ----------------------------------------------------
APP_TIMEZONE=Asia/Kolkata
REPORT_STORAGE_DIR=storage/reports
TEMPLATE_EXCEL_PATH=templates/template.xlsx
```

---

## 4. Database Migrations

This backend uses **Alembic** to manage database schema migrations.

### Apply Latest Migrations
Run this command from inside the `backend/` directory:
```bash
python -m alembic upgrade head
```

> **Note**: On initial startup, the backend automatically validates the schema and seeds the initial reference dataset from `templates/template.xlsx` if empty.

---

## 5. Starting the Backend Server

Start the Uvicorn development server:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will start at:
- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Alternative Docs**: `http://localhost:8000/redoc`
- **Health Check Endpoint**: `http://localhost:8000/api/v1/health`

---

## 6. Running Automated Tests

To run the complete automated test suite (including Fireworks extraction rules, Excel generation verification, and API endpoint lifecycles):

```bash
python -m pytest tests/ -v
```

All 14 unit and integration tests should pass:
- eFEAP Access issue extraction
- "Not mapped to location" -> Transfer In classification
- Confirmed resolution vs. Workaround/instruction handling
- Conversation timeline parsing
- Missing SR numbers triggering Human Review queue
- Single-day and multi-day Excel report generation and summary count recalculation
- Report download and safe report deletion (underlying database issues are preserved)
- Model evaluation benchmark suite

---

## 7. Backend Directory Structure

```text
backend/
├── alembic_migrations/       # Alembic migration scripts and versions
├── app/
│   ├── api/
│   │   ├── deps.py           # Dependency injection (Database session generator)
│   │   └── v1/               # API route handlers
│   │       ├── dashboard.py  # Dashboard metrics & trend calculations
│   │       ├── issues.py     # Issue search, filtering, and audit trail
│   │       ├── reports.py    # Report creation, Excel generator, download, deletion
│   │       ├── review_queue.py# Quality verification queue
│   │       ├── settings.py   # AI provider and OAuth settings
│   │       ├── sync_jobs.py  # Background email sync jobs
│   │       └── router.py     # Top-level API v1 router
│   ├── config.py             # Pydantic BaseSettings environment loader
│   ├── database.py           # SQLAlchemy 2.0 Async Engine & Session maker
│   ├── main.py               # FastAPI application entrypoint & lifespan hooks
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response validation schemas
│   ├── seed.py               # Template reference dataset seeder
│   └── services/
│       ├── email_provider.py # Gmail & MS365 OAuth adapters
│       ├── evaluator.py      # Reference model evaluation benchmark
│       ├── excel_service.py  # openpyxl template generator & validator
│       ├── fireworks_extractor.py # AI extraction & deterministic parser
│       └── storage_service.py # Report file storage manager
├── storage/
│   └── reports/              # Generated downloadable .xlsx files
├── templates/
│   └── template.xlsx         # Reference Excel workbook template
├── tests/                    # Pytest test suite
├── alembic.ini               # Alembic configuration file
├── requirements.txt          # Python dependencies
└── README.md                 # This documentation file
```

