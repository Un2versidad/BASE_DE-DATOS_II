from flask import Blueprint, jsonify

from ..database import get_db
from ..security.jwt_handler import auth_required
from ..security.rbac import require_permission


reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/api/reports/stats", methods=["GET"])
@auth_required
@require_permission("report.read")
def report_stats():
    db = get_db()
    with db.cursor() as cur:
        # Get statistics by estado using view
        cur.execute("SELECT * FROM v_estadisticas_por_estado")
        by_estado_rows = cur.fetchall()
        por_estado = {row["estado"]: row["total"] for row in by_estado_rows}

        # Get statistics by aseguradora
        cur.execute(
            """
            SELECT a.nombre, COUNT(*) AS total
            FROM expedientes e
            JOIN aseguradoras a ON e.aseguradora_id = a.id
            WHERE e.deleted_at IS NULL AND a.deleted_at IS NULL
            GROUP BY a.id, a.nombre
            ORDER BY total DESC
            """
        )
        por_aseguradora = [{"nombre": row["nombre"], "total": row["total"]} for row in cur.fetchall()]

        # Get statistics by juzgado
        cur.execute(
            """
            SELECT j.nombre, COUNT(*) AS total
            FROM expedientes e
            JOIN juzgados j ON e.juzgado_id = j.id
            WHERE e.deleted_at IS NULL AND j.deleted_at IS NULL
            GROUP BY j.id, j.nombre
            ORDER BY total DESC
            """
        )
        por_juzgado = [{"nombre": row["nombre"], "total": row["total"]} for row in cur.fetchall()]

    return jsonify({
        "por_estado": por_estado,
        "por_aseguradora": por_aseguradora,
        "por_juzgado": por_juzgado
    })


@reports_bp.route("/api/dashboard", methods=["GET"])
@auth_required
@require_permission("report.read")
def dashboard():
    db = get_db()
    with db.cursor() as cur:
        # Get today's expedientes from view
        cur.execute("SELECT * FROM v_agenda_diaria")
        agenda_rows = cur.fetchall()
        
        # Get counts by estado
        cur.execute("SELECT * FROM v_estadisticas_por_estado")
        estado_rows = cur.fetchall()
        counts_by_estado = {row["estado"]: row["total"] for row in estado_rows}
        
        # Get total expedientes
        cur.execute("SELECT COUNT(*) AS total FROM expedientes WHERE deleted_at IS NULL")
        total = cur.fetchone()["total"]
        
        # Get counts by aseguradora
        cur.execute(
            """
            SELECT a.nombre, COUNT(*) AS total
            FROM expedientes e
            JOIN aseguradoras a ON e.aseguradora_id = a.id
            WHERE e.deleted_at IS NULL AND a.deleted_at IS NULL
            GROUP BY a.id, a.nombre
            ORDER BY total DESC
            LIMIT 5
            """
        )
        top_aseguradoras = [{"nombre": row["nombre"], "total": row["total"]} for row in cur.fetchall()]
        
        # Get counts by juzgado
        cur.execute(
            """
            SELECT j.nombre, COUNT(*) AS total
            FROM expedientes e
            JOIN juzgados j ON e.juzgado_id = j.id
            WHERE e.deleted_at IS NULL AND j.deleted_at IS NULL
            GROUP BY j.id, j.nombre
            ORDER BY total DESC
            LIMIT 5
            """
        )
        top_juzgados = [{"nombre": row["nombre"], "total": row["total"]} for row in cur.fetchall()]

    return jsonify({
        "agenda_hoy": len(agenda_rows),
        "total_expedientes": total,
        "por_estado": counts_by_estado,
        "top_aseguradoras": top_aseguradoras,
        "top_juzgados": top_juzgados
    })


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
