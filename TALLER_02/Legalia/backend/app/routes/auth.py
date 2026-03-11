from flask import Blueprint, jsonify, request, g
from argon2.exceptions import VerifyMismatchError, VerificationError

from ..config import Config
from ..database import get_db
from ..security.jwt_handler import generate_token, get_bearer_token, verify_token, auth_required

from ..security.passwords import verify_password
from ..security.rbac import get_permissions_for_user
from ..utils.uuid import uuid_bytes_to_str, uuid_str_to_bytes
from ..utils.validation import sanitize_text, validate_username


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = sanitize_text(data.get("username"))
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "invalid credentials"}), 401
    username_error = validate_username(username)
    if username_error:
        return jsonify({"error": "invalid credentials"}), 401

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.password_hash, u.role_id, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.username = %s AND u.deleted_at IS NULL
            """,
            (username,),
        )
        user = cur.fetchone()

    if not user:
        return jsonify({"error": "invalid credentials"}), 401
    try:
        if not verify_password(user["password_hash"], password):
            return jsonify({"error": "invalid credentials"}), 401
    except (VerifyMismatchError, VerificationError):
        return jsonify({"error": "invalid credentials"}), 401

    user_id = uuid_bytes_to_str(user["id"])
    role_id = uuid_bytes_to_str(user["role_id"])
    perms = get_permissions_for_user(user_id)
    access_token = generate_token(user_id, role_id, "access", perms)
    refresh_token = generate_token(user_id, role_id, "refresh")

    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 60 * 60 * Config.JWT_ACCESS_TTL_HOURS,
            "user": {
                "id": user_id,
                "role_id": role_id,
                "role": user.get("role_name"),
                "username": username,
            },
        }
    )


@auth_bp.route("/api/refresh", methods=["POST"])
def refresh():
    data = request.get_json(silent=True) or {}
    token = data.get("refresh_token") or get_bearer_token()
    if not token:
        return jsonify({"error": "missing token"}), 401

    try:
        payload = verify_token(token, "refresh")
    except Exception:
        return jsonify({"error": "invalid token"}), 401

    user_id = payload.get("sub")
    role_id = payload.get("role_id")
    perms = get_permissions_for_user(user_id)
    access_token = generate_token(user_id, role_id, "access", perms)

    return jsonify({"access_token": access_token, "token_type": "Bearer"})


@auth_bp.route("/api/me", methods=["GET"])
@auth_required
def me():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.username, u.role_id, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = %s AND u.deleted_at IS NULL
            """,
            (uuid_str_to_bytes(g.user_id),),
        )
        user = cur.fetchone()

    if not user:
        return jsonify({"error": "not found"}), 404

    return jsonify(
        {
            "user": {
                "id": uuid_bytes_to_str(user["id"]),
                "role_id": uuid_bytes_to_str(user["role_id"]),
                "role": user.get("role_name"),
                "username": user.get("username"),
            }
        }
    )
