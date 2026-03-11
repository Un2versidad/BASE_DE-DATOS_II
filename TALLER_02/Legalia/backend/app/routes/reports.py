from flask import Blueprint, jsonify

from ..database import get_db
from ..security.jwt_handler import auth_required
from ..security.rbac import require_permission


reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/api/reports/summary", methods=["GET"])
@auth_required
@require_permission("report.read")
def report_summary():
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT estado, COUNT(*) AS total
            FROM expedientes
            WHERE deleted_at IS NULL
            GROUP BY estado
            """
        )
        by_estado = cur.fetchall()

        cur.execute(
            """
            SELECT a.nombre, COUNT(*) AS total
            FROM expedientes e
            JOIN aseguradoras a ON e.aseguradora_id = a.id
            WHERE e.deleted_at IS NULL
            GROUP BY a.nombre
            ORDER BY total DESC
            LIMIT 5
            """
        )
        top_aseguradoras = cur.fetchall()

        cur.execute(
            """
            SELECT j.nombre, COUNT(*) AS total
            FROM expedientes e
            JOIN juzgados j ON e.juzgado_id = j.id
            WHERE e.deleted_at IS NULL
            GROUP BY j.nombre
            ORDER BY total DESC
            LIMIT 5
            """
        )
        top_juzgados = cur.fetchall()

    return jsonify(
        {
            "by_estado": by_estado,
            "top_aseguradoras": top_aseguradoras,
            "top_juzgados": top_juzgados,
        }
    )
