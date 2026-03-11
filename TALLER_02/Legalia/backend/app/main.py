from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from flasgger import Swagger
from dotenv import load_dotenv

from .bootstrap import bootstrap
from .config import Config
from .database import close_db
from .routes.admin import admin_bp
from .routes.agenda import agenda_bp
from .routes.auth import auth_bp
from .routes.expedientes import exp_bp
from .routes.reports import reports_bp


def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False

    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})
    csp = None
    if Config.CSP_ENABLED:
        csp = {
            "default-src": ["'self'"],
            "img-src": ["'self'", "data:"],
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
            ],
            "script-src": [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
            ],
            "font-src": ["'self'", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        }
    Talisman(app, force_https=Config.FORCE_HTTPS, content_security_policy=csp)
    Limiter(get_remote_address, app=app, default_limits=[Config.RATE_LIMIT_DEFAULT])
    Swagger(
        app,
        template={
            "info": {
                "title": "Legalia API",
                "version": "1.0.0",
            },
        },
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(exp_bp)
    app.register_blueprint(agenda_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reports_bp)

    app.teardown_appcontext(close_db)

    if Config.AUTO_BOOTSTRAP:
        with app.app_context():
            bootstrap()

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "app": Config.APP_NAME})

    @app.route("/", methods=["GET"])
    def root():
        return jsonify(
            {
                "message": "Legalia API",
                "docs": "/apidocs",
                "health": "/api/health",
            }
        )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
