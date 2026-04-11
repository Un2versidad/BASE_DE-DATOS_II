from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

@dataclass
class Expediente:
    id: bytes
    aseguradora_id: Optional[bytes]
    juzgado_id: Optional[bytes]
    abogado: str
    estado: str
    fecha: date
    version: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
