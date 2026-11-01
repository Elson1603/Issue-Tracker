from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database
from app.config import settings
from app.models import EmailProviderConfig
from app.schemas.provider import ProviderConfigResponse, ProviderConnectRequest, ProviderOAuthStatus
from app.services.sync_service import sync_service
from app.services.evaluator import model_evaluator
from app.services.fireworks_extractor import fireworks_extractor

router = APIRouter()

@router.get("/email-provider/auth-url")
async def get_provider_auth_url(
    provider: str = "gmail",
    db: AsyncSession = Depends(get_database)
):
    res = await db.execute(
        select(EmailProviderConfig).where(EmailProviderConfig.provider == provider)
    )
    cfg = res.scalars().first()
    adapter = sync_service._get_provider_adapter(provider, cfg)
    redirect_uri = settings.GMAIL_REDIRECT_URI if provider == "gmail" else settings.MS365_REDIRECT_URI
    url = adapter.build_auth_url(redirect_uri=redirect_uri, state=provider)
    return {
        "provider": provider,
        "auth_url": url,
        "redirect_uri": redirect_uri
    }

@router.get("/email-provider", response_model=Dict[str, ProviderConfigResponse])
async def get_email_provider_settings(
    db: AsyncSession = Depends(get_database)
):
    configs = {}
    for prov in ["gmail", "microsoft365"]:
        res = await db.execute(
            select(EmailProviderConfig).where(EmailProviderConfig.provider == prov)
        )
        cfg = res.scalars().first()
        
        has_creds = False
        if cfg and cfg.refresh_token:
            has_creds = True
        elif prov == "gmail" and settings.GMAIL_CLIENT_ID and settings.GMAIL_REFRESH_TOKEN:
            has_creds = True
        elif prov == "microsoft365" and settings.MS365_CLIENT_ID and settings.MS365_REFRESH_TOKEN:
            has_creds = True

        configs[prov] = ProviderConfigResponse(
            provider=prov,
            is_active=cfg.is_active if cfg else True,
            mailbox_email=cfg.mailbox_email if cfg else (settings.GMAIL_USER_EMAIL if prov == "gmail" else settings.MS365_USER_EMAIL),
            has_credentials=has_creds,
            folder_filter=cfg.folder_filter if cfg else "INBOX",
            subject_filter=cfg.subject_filter if cfg else None,
            last_synced_at=cfg.last_synced_at if cfg else None,
            sync_checkpoint=cfg.sync_checkpoint if cfg else None
        )
    return configs

@router.post("/email-provider/connect")
async def connect_email_provider(
    payload: ProviderConnectRequest,
    db: AsyncSession = Depends(get_database)
):
    res = await db.execute(
        select(EmailProviderConfig).where(EmailProviderConfig.provider == payload.provider)
    )
    cfg = res.scalars().first()
    if not cfg:
        cfg = EmailProviderConfig(provider=payload.provider)
        db.add(cfg)

    adapter = sync_service._get_provider_adapter(payload.provider, cfg)

    # If auth_code is provided, exchange for tokens
    if payload.auth_code and payload.redirect_uri:
        token_data = await adapter.exchange_code(payload.auth_code, payload.redirect_uri)
        cfg.access_token = token_data.get("access_token")
        if token_data.get("refresh_token"):
            cfg.refresh_token = token_data.get("refresh_token")
        cfg.is_active = True

    if payload.client_id:
        cfg.client_id = payload.client_id
    if payload.client_secret:
        cfg.client_secret = payload.client_secret
    if payload.tenant_id:
        cfg.tenant_id = payload.tenant_id
    if payload.mailbox_email:
        cfg.mailbox_email = payload.mailbox_email
    if payload.folder_filter:
        cfg.folder_filter = payload.folder_filter
    if payload.subject_filter is not None:
        cfg.subject_filter = payload.subject_filter

    cfg.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(cfg)

    return {
        "success": True,
        "provider": payload.provider,
        "is_active": cfg.is_active,
        "mailbox_email": cfg.mailbox_email,
        "has_credentials": bool(cfg.refresh_token or (payload.provider == "gmail" and settings.GMAIL_REFRESH_TOKEN))
    }

@router.get("/ai-provider")
async def get_ai_provider_settings():
    return {
        "provider": "Fireworks AI",
        "model": fireworks_extractor.model,
        "base_url": fireworks_extractor.base_url,
        "has_api_key": bool(fireworks_extractor.api_key),
        "temperature": settings.FIREWORKS_TEMPERATURE,
        "structured_json_mode": True
    }

@router.post("/ai-provider")
async def update_ai_provider_settings(
    model: Optional[str] = Body(None),
    api_key: Optional[str] = Body(None)
):
    if model:
        fireworks_extractor.model = model
    if api_key is not None:
        fireworks_extractor.api_key = api_key
    return {
        "success": True,
        "model": fireworks_extractor.model,
        "has_api_key": bool(fireworks_extractor.api_key)
    }

@router.get("/evaluate")
async def run_model_evaluation():
    """
    Executes the model evaluation suite on authentic PDF conversations (Examples 1, 2, 3)
    and reports accuracy.
    """
    results = await model_evaluator.run_evaluation()
    return results
