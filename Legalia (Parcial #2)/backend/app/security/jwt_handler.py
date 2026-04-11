import datetime
from functools import wraps

import jwt
from flask import g, jsonify, request

from ..config import Config
from ..database import set_session_context


def generate_token(user_id, role_id, token_type="access", perms=None):
    now = datetime.datetime.utcnow()
    if token_type == "access":
        exp = now + datetime.timedelta(hours=Config.JWT_ACCESS_TTL_HOURS)
    else:
        exp = now + datetime.timedelta(days=Config.JWT_REFRESH_TTL_DAYS)

    payload = {
        "sub": user_id,
        "role_id": role_id,
        "typ": token_type,
        "iss": Config.JWT_ISSUER,
        "iat": now,
        "exp": exp,
    }
    if perms:
        payload["perms"] = perms

    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def verify_token(token, expected_type="access"):
    payload = jwt.decode(
        token,
        Config.JWT_SECRET,
        algorithms=["HS256"],
        issuer=Config.JWT_ISSUER,
    )
    if payload.get("typ") != expected_type:
        raise jwt.InvalidTokenError("invalid token type")
    return payload


def get_bearer_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return auth.split(" ", 1)[1].strip()


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({"error": "missing token"}), 401
        try:
            payload = verify_token(token, "access")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid token"}), 401

        g.user_id = payload.get("sub")
        g.role_id = payload.get("role_id")
        g.permissions = payload.get("perms")
        set_session_context(g.user_id, request.remote_addr)
        return fn(*args, **kwargs)

    return wrapper
