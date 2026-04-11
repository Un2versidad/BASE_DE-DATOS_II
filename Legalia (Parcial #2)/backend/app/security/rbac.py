from functools import wraps

from flask import g, jsonify

from ..database import get_db
from ..utils.uuid import uuid_str_to_bytes


def get_permissions_for_user(user_id):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT p.name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            JOIN role_permissions rp ON rp.role_id = r.id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE u.id = %s AND u.deleted_at IS NULL
            """,
            (uuid_str_to_bytes(user_id),),
        )
        rows = cur.fetchall()
    return [row["name"] for row in rows]


def require_permission(permission):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not g.get("user_id"):
                return jsonify({"error": "unauthorized"}), 401
            permissions = g.get("permissions")
            if permissions is None:
                permissions = get_permissions_for_user(g.user_id)
                g.permissions = permissions
            if permission not in permissions:
                permissions = get_permissions_for_user(g.user_id)
                g.permissions = permissions
                if permission not in permissions:
                    return jsonify({"error": "forbidden"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
