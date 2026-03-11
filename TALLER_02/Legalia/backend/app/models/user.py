from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class User:
    id: bytes
    username: str
    password_hash: str
    role_id: Optional[bytes]
    created_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
