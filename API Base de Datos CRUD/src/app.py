from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
import jwt
from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from jwt import ExpiredSignatureError, InvalidTokenError
from mysql.connector import Error
from src.config import Config
from src.db import get_connection

VALID_STATES = {"ACTIVO", "INACTIVO"}

def serialize_proveedor(row):
    serialized = dict(row)
    for key in ("created_at", "updated_at"):
        value = serialized.get(key)
        if isinstance(value, datetime):
            serialized[key] = value.isoformat()
    return serialized

def validation_errors(payload):
    errors = []

    nombre = payload.get("nombre")
    ruc = payload.get("ruc")
    email = payload.get("email")
    estado = payload.get("estado")

    if not nombre or not isinstance(nombre, str):
        errors.append("El campo 'nombre' es obligatorio y debe ser texto.")

    if not ruc or not isinstance(ruc, str):
        errors.append("El campo 'ruc' es obligatorio y debe ser texto.")

    if email and ("@" not in email or "." not in email):
        errors.append("El campo 'email' debe tener un formato valido.")

    if estado and estado not in VALID_STATES:
        errors.append("El campo 'estado' solo permite ACTIVO o INACTIVO.")

    return errors

def generate_jwt(username):
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(minutes=Config.JWT_EXPIRES_MINUTES)
    payload = {
        "sub": username,
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)

def parse_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    return token or None

def jwt_required(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        token = parse_bearer_token()
        if not token:
            return (
                jsonify(
                    {
                        "error": "UNAUTHORIZED",
                        "message": "Debe enviar Authorization: Bearer <token>.",
                    }
                ),
                401,
            )

        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET,
                algorithms=[Config.JWT_ALGORITHM],
            )
            g.jwt_payload = payload
            return handler(*args, **kwargs)
        except ExpiredSignatureError:
            return jsonify({"error": "UNAUTHORIZED", "message": "Token expirado."}), 401
        except InvalidTokenError:
            return jsonify({"error": "UNAUTHORIZED", "message": "Token invalido."}), 401

    return wrapper

def create_app():
    app = Flask(__name__)
    CORS(app)
    docs_dir = Path(__file__).resolve().parent / "docs"

    @app.get("/")
    def home():
        base_url = request.host_url.rstrip("/")
        html = f"""
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>API Proveedores - Guia de uso</title>
  <style>
    body {{
      font-family: Arial, sans-serif;
      margin: 0;
      background: #f5f7fb;
      color: #1f2937;
    }}
    .wrap {{
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }}
    .card {{
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 16px;
    }}
    h1, h2 {{
      margin-top: 0;
    }}
    code {{
      background: #111827;
      color: #f9fafb;
      padding: 2px 6px;
      border-radius: 6px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }}
    th, td {{
      border: 1px solid #e5e7eb;
      text-align: left;
      padding: 8px;
    }}
    th {{
      background: #f9fafb;
    }}
    .badge {{
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1e40af;
    }}
    a {{
      color: #2563eb;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>API CRUD de Proveedores</h1>
      <p>Esta API permite autenticacion JWT y operaciones CRUD de proveedores.</p>
      <p><strong>Health:</strong> <a href="{base_url}/health">{base_url}/health</a></p>
      <p><strong>OpenAPI:</strong> <a href="{base_url}/docs/openapi.yaml">{base_url}/docs/openapi.yaml</a></p>
      <p><span class="badge">Tip</span> Usa Postman con la coleccion incluida en <code>postman/API_Proveedores_CRUD.postman_collection.json</code>.</p>
    </div>

    <div class="card">
      <h2>1) Login JWT (Bearer)</h2>
      <p>Primero genera un token:</p>
      <code>POST /api/v1/auth/login</code>
      <p>Body JSON:</p>
      <pre>{{
  "username": "admin",
  "password": "123456"
}}</pre>
      <p>Luego envia el header en rutas protegidas:</p>
      <code>Authorization: Bearer &lt;access_token&gt;</code>
    </div>

    <div class="card">
      <h2>2) Endpoints</h2>
      <table>
        <thead>
          <tr><th>Metodo</th><th>Ruta</th><th>Auth</th></tr>
        </thead>
        <tbody>
          <tr><td>GET</td><td>/health</td><td>No</td></tr>
          <tr><td>POST</td><td>/api/v1/auth/login</td><td>No</td></tr>
          <tr><td>GET</td><td>/api/v1/auth/me</td><td>Bearer</td></tr>

          <tr><td>POST</td><td>/api/v1/proveedores</td><td>No</td></tr>
          <tr><td>GET</td><td>/api/v1/proveedores</td><td>No</td></tr>
          <tr><td>GET</td><td>/api/v1/proveedores/&lt;id&gt;</td><td>No</td></tr>
          <tr><td>PUT</td><td>/api/v1/proveedores/&lt;id&gt;</td><td>No</td></tr>
          <tr><td>DELETE</td><td>/api/v1/proveedores/&lt;id&gt;</td><td>No</td></tr>

          <tr><td>POST</td><td>/api/v1/secure/proveedores</td><td>Bearer</td></tr>
          <tr><td>GET</td><td>/api/v1/secure/proveedores</td><td>Bearer</td></tr>
          <tr><td>GET</td><td>/api/v1/secure/proveedores/&lt;id&gt;</td><td>Bearer</td></tr>
          <tr><td>PUT</td><td>/api/v1/secure/proveedores/&lt;id&gt;</td><td>Bearer</td></tr>
          <tr><td>DELETE</td><td>/api/v1/secure/proveedores/&lt;id&gt;</td><td>Bearer</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
        """
        return html, 200, {"Content-Type": "text/html; charset=utf-8"}

    @app.get("/health")
    def health():
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            return jsonify(
                {
                    "status": "ok",
                    "message": "API y base de datos funcionando.",
                }
            ), 200
        except Error:
            return jsonify(
                {
                    "status": "error",
                    "message": "No hay conexion con la base de datos.",
                }
            ), 503
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @app.get("/docs/openapi.yaml")
    def openapi_yaml():
        return send_from_directory(str(docs_dir), "openapi.yaml")

    @app.get("/docs")
    def docs_info():
        return jsonify({"openapi": "/docs/openapi.yaml"}), 200

    @app.post("/api/v1/auth/login")
    def auth_login():
        payload = request.get_json(silent=True) or {}
        username = payload.get("username")
        password = payload.get("password")

        if username != Config.API_USER or password != Config.API_PASSWORD:
            return jsonify({"error": "UNAUTHORIZED", "message": "Credenciales invalidas."}), 401

        token = generate_jwt(username)
        return (
            jsonify(
                {
                    "access_token": token,
                    "token_type": "Bearer",
                    "expires_in_minutes": Config.JWT_EXPIRES_MINUTES,
                }
            ),
            200,
        )

    @app.get("/api/v1/auth/me")
    @jwt_required
    def auth_me():
        payload = g.get("jwt_payload", {})
        return (
            jsonify(
                {
                    "data": {
                        "username": payload.get("sub"),
                        "exp": payload.get("exp"),
                        "iat": payload.get("iat"),
                    }
                }
            ),
            200,
        )

    @app.get("/api/v1/proveedores")
    def get_all_proveedores():
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT id, nombre, ruc, telefono, email, direccion, estado, created_at, updated_at
                FROM proveedores
                ORDER BY id DESC
                """
            )
            rows = cursor.fetchall()
            data = [serialize_proveedor(row) for row in rows]
            return jsonify({"total": len(data), "data": data}), 200
        except Error as error:
            return jsonify(
                {
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": f"Error al consultar proveedores: {error.msg}",
                }
            ), 500
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @app.get("/api/v1/proveedores/<int:proveedor_id>")
    def get_proveedor_by_id(proveedor_id):
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT id, nombre, ruc, telefono, email, direccion, estado, created_at, updated_at
                FROM proveedores
                WHERE id = %s
                """,
                (proveedor_id,),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "NOT_FOUND", "message": "Proveedor no encontrado."}), 404
            return jsonify({"data": serialize_proveedor(row)}), 200
        except Error as error:
            return jsonify(
                {
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": f"Error al consultar proveedor: {error.msg}",
                }
            ), 500
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @app.post("/api/v1/proveedores")
    def create_proveedor():
        payload = request.get_json(silent=True) or {}
        errors = validation_errors(payload)
        if errors:
            return jsonify({"error": "VALIDATION_ERROR", "details": errors}), 400

        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute(
                """
                INSERT INTO proveedores (nombre, ruc, telefono, email, direccion, estado)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.get("nombre"),
                    payload.get("ruc"),
                    payload.get("telefono"),
                    payload.get("email"),
                    payload.get("direccion"),
                    payload.get("estado", "ACTIVO"),
                ),
            )
            new_id = cursor.lastrowid
            connection.commit()
            return get_proveedor_by_id(new_id)[0], 201
        except Error as error:
            if error.errno == 1062:
                return jsonify({"error": "CONFLICT", "message": "El RUC ya existe. Debe ser unico."}), 409
            return jsonify(
                {
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": f"Error al crear proveedor: {error.msg}",
                }
            ), 500
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @app.put("/api/v1/proveedores/<int:proveedor_id>")
    def update_proveedor(proveedor_id):
        payload = request.get_json(silent=True) or {}
        errors = validation_errors(payload)
        if errors:
            return jsonify({"error": "VALIDATION_ERROR", "details": errors}), 400

        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id FROM proveedores WHERE id = %s", (proveedor_id,))
            if not cursor.fetchone():
                return jsonify({"error": "NOT_FOUND", "message": "Proveedor no encontrado."}), 404

            cursor.execute(
                """
                UPDATE proveedores
                SET nombre = %s, ruc = %s, telefono = %s, email = %s, direccion = %s, estado = %s
                WHERE id = %s
                """,
                (
                    payload.get("nombre"),
                    payload.get("ruc"),
                    payload.get("telefono"),
                    payload.get("email"),
                    payload.get("direccion"),
                    payload.get("estado", "ACTIVO"),
                    proveedor_id,
                ),
            )
            connection.commit()
            return get_proveedor_by_id(proveedor_id)[0], 200
        except Error as error:
            if error.errno == 1062:
                return jsonify({"error": "CONFLICT", "message": "El RUC ya existe. Debe ser unico."}), 409
            return jsonify(
                {
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": f"Error al actualizar proveedor: {error.msg}",
                }
            ), 500
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @app.delete("/api/v1/proveedores/<int:proveedor_id>")
    def delete_proveedor(proveedor_id):
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute("DELETE FROM proveedores WHERE id = %s", (proveedor_id,))
            connection.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "NOT_FOUND", "message": "Proveedor no encontrado."}), 404
            return jsonify({"message": "Proveedor eliminado correctamente."}), 200
        except Error as error:
            return jsonify(
                {
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": f"Error al eliminar proveedor: {error.msg}",
                }
            ), 500
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    @app.get("/api/v1/secure/proveedores")
    @jwt_required
    def secure_get_all_proveedores():
        return get_all_proveedores()

    @app.get("/api/v1/secure/proveedores/<int:proveedor_id>")
    @jwt_required
    def secure_get_proveedor_by_id(proveedor_id):
        return get_proveedor_by_id(proveedor_id)

    @app.post("/api/v1/secure/proveedores")
    @jwt_required
    def secure_create_proveedor():
        return create_proveedor()

    @app.put("/api/v1/secure/proveedores/<int:proveedor_id>")
    @jwt_required
    def secure_update_proveedor(proveedor_id):
        return update_proveedor(proveedor_id)

    @app.delete("/api/v1/secure/proveedores/<int:proveedor_id>")
    @jwt_required
    def secure_delete_proveedor(proveedor_id):
        return delete_proveedor(proveedor_id)

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "NOT_FOUND", "message": "Ruta no encontrada."}), 404

    return app
