from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class AuditLog:
    id: bytes
    user_id: Optional[bytes]
    action: str
    table_name: str
    record_id: bytes
    changes: str
    ip: Optional[str] = None
    created_at: Optional[datetime] = None
