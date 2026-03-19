# API CRUD de Proveedores (Flask + MariaDB + JWT)

Proyecto para gestionar proveedores con CRUD y autenticacion Bearer JWT.

## Levantar todo con Docker Compose
1. Enciende Docker Desktop (debe decir **Engine running**).
2. (Opcional) copia `.env.docker.example` a `.env` para personalizar credenciales/puertos.
3. Ejecuta:

```bash
docker compose up --build
```

Con eso se levantan automaticamente:
- API Flask en `http://localhost:3000`
- MariaDB en `localhost:3307` (host) / `3306` (interno)
- Script SQL inicial (`sql/01_schema_proveedores.sql`) en el primer arranque

4. Verifica en navegador:
- `http://localhost:3000/` (guia de uso)
- `http://localhost:3000/health` (estado API + DB)
- `http://localhost:3000/docs/openapi.yaml` (OpenAPI)

## Probar la API
### Opcion A: Postman (recomendada)
1. Importa:
- `postman/API_Proveedores_CRUD.postman_collection.json`
- `postman/Local_API_Proveedores.postman_environment.json`
2. Selecciona environment `Local API Proveedores`.
3. Ejecuta toda la coleccion en Collection Runner.

La coleccion ya hace:
- Login JWT
- Guarda `accessToken`
- Envio automatico de `Authorization: Bearer {{accessToken}}`
- Pruebas CRUD sobre rutas protegidas

### Opcion B: cURL rapido
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"123456\"}"
```

## Comandos utiles

```bash
docker compose down
```

Reiniciar desde cero (borra volumen de DB):

```bash
docker compose down -v
docker compose up --build
```

## Ejecucion local sin Docker (opcional)
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
