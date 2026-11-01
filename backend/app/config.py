import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "IGA Email Issue Tracker"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./iga_tracker.db",
        description="Neon PostgreSQL or local connection string"
    )
    
    # Fireworks AI
    FIREWORKS_API_KEY: Optional[str] = None
    FIREWORKS_MODEL: str = "accounts/fireworks/models/qwen2p5-72b-instruct"
    FIREWORKS_BASE_URL: str = "https://api.fireworks.ai/inference/v1"
    FIREWORKS_TEMPERATURE: float = 0.1
    FIREWORKS_MAX_TOKENS: int = 2048
    
    # Timezone
    APP_TIMEZONE: str = "Asia/Kolkata"
    
    # Storage & Templates
    REPORT_STORAGE_DIR: str = str(BASE_DIR / "storage" / "reports")
    TEMPLATE_EXCEL_PATH: str = str(BASE_DIR / "templates" / "template.xlsx")
    
    # Security
    SECRET_KEY: str = "iga-tracker-super-secret-key-production-ready-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    
    # Gmail OAuth
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REDIRECT_URI: str = "http://localhost:5173/settings"
    GMAIL_REFRESH_TOKEN: Optional[str] = None
    GMAIL_USER_EMAIL: Optional[str] = None
    
    # MS365 OAuth
    MS365_CLIENT_ID: Optional[str] = None
    MS365_CLIENT_SECRET: Optional[str] = None
    MS365_TENANT_ID: Optional[str] = None
    MS365_REDIRECT_URI: str = "http://localhost:5173/settings"
    MS365_REFRESH_TOKEN: Optional[str] = None
    MS365_USER_EMAIL: Optional[str] = None
    
    model_config = {
        "env_file": [
            str(BASE_DIR / ".env"),
            str(BASE_DIR.parent / ".env")
        ],
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.REPORT_STORAGE_DIR, exist_ok=True)
os.makedirs(Path(settings.TEMPLATE_EXCEL_PATH).parent, exist_ok=True)
