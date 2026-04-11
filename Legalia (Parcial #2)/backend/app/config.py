import os


class Config:
    APP_NAME = os.getenv("APP_NAME", "Legalia")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "app")
    DB_PASS = os.getenv("DB_PASS", "strongpassword")
    DB_NAME = os.getenv("DB_NAME", "expedientes")

    JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
    JWT_ISSUER = os.getenv("JWT_ISSUER", "legalia")
    JWT_ACCESS_TTL_HOURS = int(os.getenv("JWT_ACCESS_TTL_HOURS", "8"))
    JWT_REFRESH_TTL_DAYS = int(os.getenv("JWT_REFRESH_TTL_DAYS", "7"))

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:8080").split(",")
        if origin.strip()
    ]
    FORCE_HTTPS = os.getenv("FORCE_HTTPS", "0") == "1"
    RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "100 per minute")
    CSP_ENABLED = os.getenv("CSP_ENABLED", "1") == "1"

    AUTO_BOOTSTRAP = os.getenv("AUTO_BOOTSTRAP", "1") == "1"
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
