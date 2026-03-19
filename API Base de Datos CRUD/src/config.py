import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    ENV = os.getenv("FLASK_ENV", os.getenv("NODE_ENV", "development"))
    DEBUG = ENV == "development"
    PORT = int(os.getenv("PORT", "3000"))

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "proveedores_db")
    DB_POOL_LIMIT = int(os.getenv("DB_POOL_LIMIT", "10"))

    JWT_SECRET = os.getenv("JWT_SECRET", "supersecreto_cambiar")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "120"))

    API_USER = os.getenv("API_USER", "admin")
    API_PASSWORD = os.getenv("API_PASSWORD", "123456")