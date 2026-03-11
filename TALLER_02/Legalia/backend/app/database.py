import pymysql
from flask import g

from .config import Config
from .utils.uuid import uuid_str_to_bytes


def get_db():
    if "db" not in g:
        g.db = pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASS,
            database=Config.DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
        )
    return g.db


def close_db(_exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def set_session_context(user_id, ip_addr):
    if not user_id:
        return
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SET @app_user_id = %s", (uuid_str_to_bytes(user_id),))
        cur.execute("SET @app_user_ip = %s", (ip_addr,))
