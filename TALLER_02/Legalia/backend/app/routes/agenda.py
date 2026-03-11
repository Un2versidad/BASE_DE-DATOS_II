import datetime

from flask import Blueprint, jsonify, request

from ..database import get_db
from ..security.jwt_handler import auth_required
from ..security.rbac import require_permission
from ..utils.serialization import dict_to_jsonable


agenda_bp = Blueprint("agenda", __name__)


@agenda_bp.route("/api/agenda", methods=["GET"])
@auth_required
@require_permission("agenda.read")
def agenda():
    date_str = request.args.get("date")
    if date_str:
        try:
            date_value = datetime.date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"error": "invalid date"}), 400
    else:
        date_value = datetime.date.today()

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT e.id, e.abogado, e.estado, e.fecha,
                   a.nombre AS aseguradora,
                   j.nombre AS juzgado
            FROM expedientes e
            LEFT JOIN aseguradoras a ON e.aseguradora_id = a.id
            LEFT JOIN juzgados j ON e.juzgado_id = j.id
            WHERE e.deleted_at IS NULL AND e.fecha = %s
            ORDER BY e.created_at ASC
            """,
            (date_value,),
        )
        rows = cur.fetchall()

        cur.execute(
            """
            SELECT estado, COUNT(*) AS total
            FROM expedientes
            WHERE deleted_at IS NULL AND fecha = %s
            GROUP BY estado
            """,
            (date_value,),
        )
        counts = cur.fetchall()

    counts_map = {"Pendiente": 0, "En curso": 0, "Cerrado": 0}
    for row in counts:
        counts_map[row["estado"]] = row["total"]

    return jsonify(
        {
            "date": date_value.isoformat(),
            "items": [dict_to_jsonable(row) for row in rows],
            "counts": counts_map,
        }
    )
