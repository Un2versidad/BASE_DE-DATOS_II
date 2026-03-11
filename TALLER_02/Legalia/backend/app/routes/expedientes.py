from flask import Blueprint, jsonify, request

from ..database import get_db
from ..schemas.expediente_schema import validate_expediente_payload
from ..security.jwt_handler import auth_required
from ..security.rbac import require_permission
from ..utils.serialization import dict_to_jsonable
from ..utils.uuid import uuid7_bytes, uuid_str_to_bytes, uuid_bytes_to_str


exp_bp = Blueprint("expedientes", __name__)


@exp_bp.route("/api/expedientes", methods=["GET"])
@auth_required
@require_permission("expediente.read")
def list_expedientes():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT e.*, a.nombre AS aseguradora, j.nombre AS juzgado
            FROM expedientes e
            LEFT JOIN aseguradoras a ON e.aseguradora_id = a.id
            LEFT JOIN juzgados j ON e.juzgado_id = j.id
            WHERE e.deleted_at IS NULL
            ORDER BY e.created_at DESC
            """
        )
        rows = cur.fetchall()

    result = [dict_to_jsonable(row) for row in rows]
    return jsonify(result)


@exp_bp.route("/api/expedientes", methods=["POST"])
@auth_required
@require_permission("expediente.create")
def create_expediente():
    data = request.get_json(silent=True) or {}
    errors, cleaned = validate_expediente_payload(data)
    if errors:
        return jsonify({"errors": errors}), 400

    expediente_id = uuid7_bytes()
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            INSERT INTO expedientes
            (id, aseguradora_id, juzgado_id, abogado, estado, fecha)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                expediente_id,
                uuid_str_to_bytes(cleaned["aseguradora_id"]),
                uuid_str_to_bytes(cleaned["juzgado_id"]),
                cleaned["abogado"],
                cleaned["estado"],
                cleaned["fecha"],
            ),
        )

    return jsonify({"status": "created", "id": uuid_bytes_to_str(expediente_id)}), 201


@exp_bp.route("/api/expedientes/<expediente_id>", methods=["PUT"])
@auth_required
@require_permission("expediente.update")
def update_expediente(expediente_id):
    data = request.get_json(silent=True) or {}
    errors, cleaned = validate_expediente_payload(data)
    if errors:
        return jsonify({"errors": errors}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM expedientes
            WHERE id = %s AND deleted_at IS NULL
            """,
            (uuid_str_to_bytes(expediente_id),),
        )
        current = cur.fetchone()

    if not current:
        return jsonify({"error": "not found"}), 404

    with db.cursor() as cur:
        cur.execute(
            """
            UPDATE expedientes
            SET aseguradora_id = %s,
                juzgado_id = %s,
                abogado = %s,
                estado = %s,
                fecha = %s
            WHERE id = %s AND deleted_at IS NULL
            """,
            (
                uuid_str_to_bytes(cleaned["aseguradora_id"]),
                uuid_str_to_bytes(cleaned["juzgado_id"]),
                cleaned["abogado"],
                cleaned["estado"],
                cleaned["fecha"],
                uuid_str_to_bytes(expediente_id),
            ),
        )

    return jsonify({"status": "updated"})


@exp_bp.route("/api/expedientes/<expediente_id>", methods=["DELETE"])
@auth_required
@require_permission("expediente.delete")
def delete_expediente(expediente_id):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            UPDATE expedientes
            SET deleted_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            """,
            (uuid_str_to_bytes(expediente_id),),
        )

    return jsonify({"status": "deleted"})
