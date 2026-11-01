from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class ProviderConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    provider: str
    is_active: bool
    mailbox_email: Optional[str] = None
    has_credentials: bool
    folder_filter: Optional[str] = "INBOX"
    subject_filter: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    sync_checkpoint: Optional[str] = None

class ProviderConnectRequest(BaseModel):
    provider: str  # "gmail" or "microsoft365"
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    tenant_id: Optional[str] = None  # MS365 only
    auth_code: Optional[str] = None
    redirect_uri: Optional[str] = None
    mailbox_email: Optional[str] = None
    folder_filter: Optional[str] = "INBOX"
    subject_filter: Optional[str] = None

class ProviderOAuthStatus(BaseModel):
    provider: str
    connected: bool
    mailbox_email: Optional[str] = None
    auth_url: Optional[str] = None
