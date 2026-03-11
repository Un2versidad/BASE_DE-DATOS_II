import json

from flask import g, request

from .serialization import dict_to_jsonable
from .uuid import uuid7_bytes, uuid_str_to_bytes
from ..database import get_db


def create_audit(action, table_name, record_id, changes):
    db = get_db()
    audit_id = uuid7_bytes()
    user_id = uuid_str_to_bytes(g.get("user_id"))
    record_id = uuid_str_to_bytes(record_id)
    ip_addr = request.remote_addr
    payload = json.dumps(changes, default=str)

    with db.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_log (id, user_id, action, table_name, record_id, changes, ip)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (audit_id, user_id, action, table_name, record_id, payload, ip_addr),
        )


def snapshot_row(row):
    return dict_to_jsonable(row)
