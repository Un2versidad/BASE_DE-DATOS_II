import datetime
import time

from .config import Config
from .database import get_db
from .security.passwords import hash_password
from .utils.uuid import uuid7_bytes


DEFAULT_PERMISSIONS = [
    "expediente.read",
    "expediente.create",
    "expediente.update",
    "expediente.delete",
    "agenda.read",
    "report.read",
    "user.manage",
    "catalog.manage",
]


DEFAULT_ROLES = {
    "admin": DEFAULT_PERMISSIONS,
    "abogado": [
        "expediente.read",
        "expediente.create",
        "expediente.update",
        "agenda.read",
        "report.read",
    ],
    "secretaria": [
        "expediente.read",
        "agenda.read",
        "report.read",
        "catalog.manage",
    ],
    "viewer": ["expediente.read", "agenda.read", "report.read"],
}


def bootstrap():
    db = None
    for _ in range(10):
        try:
            db = get_db()
            break
        except Exception:
            time.sleep(2)
    if db is None:
        return
    role_ids = {}
    permission_ids = {}

    try:
        with db.cursor() as cur:
            for perm in DEFAULT_PERMISSIONS:
                cur.execute("SELECT id FROM permissions WHERE name = %s", (perm,))
                row = cur.fetchone()
                if row:
                    permission_ids[perm] = row["id"]
                    continue
                perm_id = uuid7_bytes()
                cur.execute(
                    "INSERT INTO permissions (id, name) VALUES (%s, %s)",
                    (perm_id, perm),
                )
                permission_ids[perm] = perm_id

            for role, perms in DEFAULT_ROLES.items():
                cur.execute("SELECT id FROM roles WHERE name = %s", (role,))
                row = cur.fetchone()
                if row:
                    role_ids[role] = row["id"]
                else:
                    role_id = uuid7_bytes()
                    cur.execute(
                        "INSERT INTO roles (id, name) VALUES (%s, %s)",
                        (role_id, role),
                    )
                    role_ids[role] = role_id

                for perm in perms:
                    cur.execute(
                        """
                        SELECT 1 FROM role_permissions
                        WHERE role_id = %s AND permission_id = %s
                        """,
                        (role_ids[role], permission_ids[perm]),
                    )
                    if cur.fetchone():
                        continue
                    cur.execute(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES (%s, %s)",
                        (role_ids[role], permission_ids[perm]),
                    )

            cur.execute(
                "SELECT id FROM users WHERE username = %s",
                (Config.ADMIN_USERNAME,),
            )
            if not cur.fetchone():
                user_id = uuid7_bytes()
                password_hash = hash_password(Config.ADMIN_PASSWORD)
                cur.execute(
                    """
                    INSERT INTO users (id, username, password_hash, role_id)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user_id, Config.ADMIN_USERNAME, password_hash, role_ids["admin"]),
                )

            cur.execute(
                "SELECT COUNT(*) AS total FROM aseguradoras WHERE deleted_at IS NULL"
            )
            aseguradora_count = cur.fetchone()["total"]
            aseguradora_ids = []
            if aseguradora_count == 0:
                for nombre in [
                    "ASSA",
                    "ANCON",
                    "CONANCE",
                    "PARTICULAR",
                    "INTEROCEANICA",
                ]:
                    aseguradora_id = uuid7_bytes()
                    cur.execute(
                        "INSERT INTO aseguradoras (id, nombre) VALUES (%s, %s)",
                        (aseguradora_id, nombre),
                    )
                    aseguradora_ids.append(aseguradora_id)
            else:
                cur.execute(
                    "SELECT id FROM aseguradoras WHERE deleted_at IS NULL ORDER BY created_at"
                )
                aseguradora_ids = [row["id"] for row in cur.fetchall()]

            cur.execute("SELECT COUNT(*) AS total FROM juzgados WHERE deleted_at IS NULL")
            juzgado_count = cur.fetchone()["total"]
            juzgado_ids = []
            if juzgado_count == 0:
                for nombre in [
                    "JUZGADO 5TO (PEDREGAL)",
                    "JUZGADO 4TO (PEDREGAL)",
                    "JUZGADO 1RO (PEDREGAL)",
                    "JUZGADO 3RO (PEDREGAL)",
                    "ALCALDIA DE PANAMA",
                    "CHITRE",
                ]:
                    juzgado_id = uuid7_bytes()
                    cur.execute(
                        "INSERT INTO juzgados (id, nombre) VALUES (%s, %s)",
                        (juzgado_id, nombre),
                    )
                    juzgado_ids.append(juzgado_id)
            else:
                cur.execute("SELECT id FROM juzgados WHERE deleted_at IS NULL ORDER BY created_at")
                juzgado_ids = [row["id"] for row in cur.fetchall()]

            cur.execute(
                "SELECT COUNT(*) AS total FROM expedientes WHERE deleted_at IS NULL"
            )
            expediente_count = cur.fetchone()["total"]
            if expediente_count == 0 and aseguradora_ids and juzgado_ids:
                today = datetime.date.today().isoformat()
                samples = [
                    ("Anthony Trejos", "Pendiente"),
                    ("Luis Molina", "En curso"),
                    ("Katherine Kent", "Cerrado"),
                ]
                for index, (abogado, estado) in enumerate(samples):
                    cur.execute(
                        """
                        INSERT INTO expedientes
                        (id, aseguradora_id, juzgado_id, abogado, estado, fecha)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            uuid7_bytes(),
                            aseguradora_ids[index % len(aseguradora_ids)],
                            juzgado_ids[index % len(juzgado_ids)],
                            abogado,
                            estado,
                            today,
                        ),
                    )
    except Exception:
        return
