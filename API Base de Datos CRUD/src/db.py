from mysql.connector import pooling
from src.config import Config

pool = None


def get_pool():
    global pool
    if pool is None:
        pool = pooling.MySQLConnectionPool(
            pool_name="proveedores_pool",
            pool_size=Config.DB_POOL_LIMIT,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
        )
    return pool


def get_connection():
    return get_pool().get_connection()
