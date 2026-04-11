from flask import Blueprint, jsonify, request

from ..database import get_db
from ..schemas.user_schema import validate_user_payload
from ..security.jwt_handler import auth_required
from ..security.passwords import hash_password
from ..security.rbac import require_permission
from ..utils.audit import create_audit
from ..utils.serialization import dict_to_jsonable
from ..utils.uuid import uuid7_bytes, uuid_str_to_bytes, uuid_bytes_to_str
from ..utils.validation import sanitize_text, validate_name


admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/api/users", methods=["GET"])
@auth_required
@require_permission("user.manage")
def list_users():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.username, u.role_id, r.name AS role, u.created_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.deleted_at IS NULL
            ORDER BY u.created_at DESC
            """
        )
        rows = cur.fetchall()
    return jsonify([dict_to_jsonable(row) for row in rows])


@admin_bp.route("/api/users", methods=["POST"])
@auth_required
@require_permission("user.manage")
def create_user():
    data = request.get_json(silent=True) or {}
    errors, cleaned = validate_user_payload(data)
    if errors:
        return jsonify({"errors": errors}), 400

    user_id = uuid7_bytes()
    password_hash = hash_password(cleaned["password"])
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (id, username, password_hash, role_id)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_id,
                cleaned["username"],
                password_hash,
                uuid_str_to_bytes(cleaned["role_id"]),
            ),
        )

    create_audit(
        "CREATE",
        "users",
        user_id,
        {"username": cleaned["username"], "role_id": cleaned["role_id"]},
    )
    return jsonify({"status": "created", "id": uuid_bytes_to_str(user_id)}), 201


@admin_bp.route("/api/roles", methods=["GET"])
@auth_required
@require_permission("user.manage")
def list_roles():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT id, name FROM roles ORDER BY name ASC")
        rows = cur.fetchall()
    return jsonify([dict_to_jsonable(row) for row in rows])


@admin_bp.route("/api/permissions", methods=["GET"])
@auth_required
@require_permission("user.manage")
def list_permissions():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT id, name FROM permissions ORDER BY name ASC")
        rows = cur.fetchall()
    return jsonify([dict_to_jsonable(row) for row in rows])


@admin_bp.route("/api/aseguradoras", methods=["GET"])
@auth_required
@require_permission("catalog.manage")
def list_aseguradoras():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT id, nombre, created_at
            FROM aseguradoras
            WHERE deleted_at IS NULL
            ORDER BY nombre ASC
            """
        )
        rows = cur.fetchall()
    return jsonify([dict_to_jsonable(row) for row in rows])


@admin_bp.route("/api/aseguradoras", methods=["POST"])
@auth_required
@require_permission("catalog.manage")
def create_aseguradora():
    data = request.get_json(silent=True) or {}
    nombre = sanitize_text(data.get("nombre"))
    name_error = validate_name(nombre, field="nombre", min_len=2, max_len=100)
    if name_error:
        return jsonify({"error": name_error}), 400

    aseguradora_id = uuid7_bytes()
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO aseguradoras (id, nombre) VALUES (%s, %s)",
            (aseguradora_id, nombre),
        )

    create_audit("CREATE", "aseguradoras", aseguradora_id, {"nombre": nombre})
    return jsonify({"status": "created", "id": uuid_bytes_to_str(aseguradora_id)}), 201


@admin_bp.route("/api/aseguradoras/<aseguradora_id>", methods=["PUT"])
@auth_required
@require_permission("catalog.manage")
def update_aseguradora(aseguradora_id):
    data = request.get_json(silent=True) or {}
    nombre = sanitize_text(data.get("nombre"))
    name_error = validate_name(nombre, field="nombre", min_len=2, max_len=100)
    if name_error:
        return jsonify({"error": name_error}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            UPDATE aseguradoras
            SET nombre = %s
            WHERE id = %s AND deleted_at IS NULL
            """,
            (nombre, uuid_str_to_bytes(aseguradora_id)),
        )

    create_audit("UPDATE", "aseguradoras", aseguradora_id, {"nombre": nombre})
    return jsonify({"status": "updated"})


@admin_bp.route("/api/aseguradoras/<aseguradora_id>", methods=["DELETE"])
@auth_required
@require_permission("catalog.manage")
def delete_aseguradora(aseguradora_id):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            UPDATE aseguradoras
            SET deleted_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            """,
            (uuid_str_to_bytes(aseguradora_id),),
        )
    create_audit("DELETE", "aseguradoras", aseguradora_id, {"deleted": True})
    return jsonify({"status": "deleted"})


@admin_bp.route("/api/juzgados", methods=["GET"])
@auth_required
@require_permission("catalog.manage")
def list_juzgados():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT id, nombre, created_at
            FROM juzgados
            WHERE deleted_at IS NULL
            ORDER BY nombre ASC
            """
        )
        rows = cur.fetchall()
    return jsonify([dict_to_jsonable(row) for row in rows])


@admin_bp.route("/api/juzgados", methods=["POST"])
@auth_required
@require_permission("catalog.manage")
def create_juzgado():
    data = request.get_json(silent=True) or {}
    nombre = sanitize_text(data.get("nombre"))
    name_error = validate_name(nombre, field="nombre", min_len=2, max_len=100)
    if name_error:
        return jsonify({"error": name_error}), 400

    juzgado_id = uuid7_bytes()
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO juzgados (id, nombre) VALUES (%s, %s)",
            (juzgado_id, nombre),
        )

    create_audit("CREATE", "juzgados", juzgado_id, {"nombre": nombre})
    return jsonify({"status": "created", "id": uuid_bytes_to_str(juzgado_id)}), 201


@admin_bp.route("/api/juzgados/<juzgado_id>", methods=["PUT"])
@auth_required
@require_permission("catalog.manage")
def update_juzgado(juzgado_id):
    data = request.get_json(silent=True) or {}
    nombre = sanitize_text(data.get("nombre"))
    name_error = validate_name(nombre, field="nombre", min_len=2, max_len=100)
    if name_error:
        return jsonify({"error": name_error}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            UPDATE juzgados
            SET nombre = %s
            WHERE id = %s AND deleted_at IS NULL
            """,
            (nombre, uuid_str_to_bytes(juzgado_id)),
        )

    create_audit("UPDATE", "juzgados", juzgado_id, {"nombre": nombre})
    return jsonify({"status": "updated"})


@admin_bp.route("/api/juzgados/<juzgado_id>", methods=["DELETE"])
@auth_required
@require_permission("catalog.manage")
def delete_juzgado(juzgado_id):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            UPDATE juzgados
            SET deleted_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            """,
            (uuid_str_to_bytes(juzgado_id),),
        )
    create_audit("DELETE", "juzgados", juzgado_id, {"deleted": True})
    return jsonify({"status": "deleted"})
