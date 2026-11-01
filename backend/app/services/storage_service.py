import os
import shutil
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or settings.REPORT_STORAGE_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def get_file_path(self, file_name: str) -> str:
        # Prevent directory traversal attacks
        safe_name = os.path.basename(file_name)
        return os.path.join(self.base_dir, safe_name)

    def exists(self, file_name: str) -> bool:
        path = self.get_file_path(file_name)
        return os.path.exists(path)

    def delete_report_file(self, file_name: str) -> bool:
        """
        Delete only the physical report artifact without affecting database records.
        """
        path = self.get_file_path(file_name)
        if os.path.exists(path):
            try:
                os.remove(path)
                logger.info(f"Successfully deleted report file: {path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete report file {path}: {e}")
                return False
        return True

storage_service = StorageService()
