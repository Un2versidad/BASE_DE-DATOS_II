<img width="1107" height="243" alt="image" src="https://github.com/user-attachments/assets/67bde022-8ce0-4633-8304-5c2a944a4f75" />

# Legalia - Sistema de Gestion de Expedientes

Sistema web para gestion de expedientes legales, agenda diaria y administracion de aseguradoras y juzgados.

## Screenshot del Website

<img width="400" height="400" alt="image" src="https://github.com/user-attachments/assets/9a6427f9-317d-4ed0-ab3a-25e788450a95" />

<img width="410" height="410" alt="image" src="https://github.com/user-attachments/assets/14fbfa66-b262-42e1-b4bf-a7aef108c3f8" />

## Requisitos

- Docker Desktop
- Docker Compose (incluido con Docker Desktop)

## Despliegue rapido (Docker)

1. Levanta los servicios:
   ```
   docker compose up --build
   ```

2. Accede a la web:
   - Login: `http://localhost:8080/login.html`
   - App principal: `http://localhost:8080/index.html`

3. Accede a la API:
- Swagger: `http://localhost:5001/apidocs`
- Health: `http://localhost:5001/api/health`
- Reportes API: `GET /api/reports/summary`
- Validacion de sesion: `GET /api/me`

## Credenciales iniciales

- Usuario: `admin`
- Contrasena: `admin123`

Estas credenciales se crean automaticamente al iniciar el backend. Puedes cambiarlas en `docker-compose.yml` usando `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

## Puertos usados

- Frontend: `8080`
- Backend API: `5001`
- MariaDB: `3308`

## Datos de ejemplo

Al iniciar el backend por primera vez (o si la base esta vacia), se crean:

- Aseguradoras de ejemplo
- Juzgados de ejemplo
- 3 expedientes de ejemplo con la fecha del dia

Si ya tienes una base con datos, el seed no se repite.

Para reiniciar la base y recargar los datos de ejemplo:
```
docker compose down -v
docker compose up --build
```

## Flujo de uso

1. Abre `http://localhost:8080/login.html`.
2. Inicia sesion con el usuario `admin`.
3. Usa el boton `+` para crear expedientes.
4. Desde el menu lateral puedes abrir los modales de Aseguradora y Juzgado para agregar catalogos.
5. En los modales puedes editar o eliminar registros existentes (con ID visible para diferenciar duplicados).
6. En `Reportes` veras estadisticas reales por estado, aseguradora y juzgado.
7. La agenda se alimenta automaticamente con los expedientes del dia y el calendario es interactivo.

## Configuracion recomendada

- Cambia `JWT_SECRET` por un valor de 32+ caracteres para mayor seguridad.
- Cambia `ADMIN_PASSWORD` en `docker-compose.yml`.
- Mantener CSP habilitado (ver `CSP_ENABLED`) para seguridad en frontend y Swagger.

Si Swagger no carga en tu navegador por politicas CSP, puedes desactivar CSP:

```
CSP_ENABLED=0
```

en el servicio `backend` dentro de `docker-compose.yml`.

## Base de datos (SQL)

- Script unico y fuente de verdad: `docker/init.sql`
- El contenedor de MariaDB crea las tablas reales desde `docker/init.sql` en el primer arranque.

## Diagrama Entidad-Relacion (ER)

```mermaid
erDiagram
    ROLES ||--o{ USERS : asigna
    ROLES ||--o{ ROLE_PERMISSIONS : define
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : incluye
    ASEGURADORAS ||--o{ EXPEDIENTES : tiene
    JUZGADOS ||--o{ EXPEDIENTES : tiene
    EXPEDIENTES ||--o{ EXPEDIENTE_VERSIONS : versiona
    USERS ||--o{ AUDIT_LOG : registra

    ROLES {
        BINARY(16) id PK
        VARCHAR(30) name
    }
    PERMISSIONS {
        BINARY(16) id PK
        VARCHAR(50) name
    }
    ROLE_PERMISSIONS {
        BINARY(16) role_id FK
        BINARY(16) permission_id FK
    }
    USERS {
        BINARY(16) id PK
        VARCHAR(50) username
        VARCHAR(255) password_hash
        BINARY(16) role_id FK
        TIMESTAMP created_at
        TIMESTAMP deleted_at
    }
    ASEGURADORAS {
        BINARY(16) id PK
        VARCHAR(100) nombre
        TIMESTAMP created_at
        TIMESTAMP deleted_at
    }
    JUZGADOS {
        BINARY(16) id PK
        VARCHAR(100) nombre
        TIMESTAMP created_at
        TIMESTAMP deleted_at
    }
    EXPEDIENTES {
        BINARY(16) id PK
        BINARY(16) aseguradora_id FK
        BINARY(16) juzgado_id FK
        VARCHAR(100) abogado
        ENUM estado
        DATE fecha
        INT version
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at
    }
    EXPEDIENTE_VERSIONS {
        BINARY(16) id PK
        BINARY(16) expediente_id FK
        INT version
        JSON data
        TIMESTAMP created_at
    }
    AUDIT_LOG {
        BINARY(16) id PK
        BINARY(16) user_id
        VARCHAR(50) action
        VARCHAR(50) table_name
        BINARY(16) record_id
        JSON changes
        VARCHAR(45) ip
        TIMESTAMP created_at
    }
```

## PyMySQL

La conexion a MariaDB se hace con PyMySQL en:

- `backend/app/database.py`

```python
import pymysql

def get_db():
    return pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASS,
        database=Config.DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )
```

## Features UI/UX

- Calendario interactivo con feedback al seleccionar un dia.
- Chart.js solo en el tab de reportes.
- Modales con validacion y mensajes de confirmacion.
- CRUD completo en Aseguradoras, Juzgados y Expedientes con acciones en tabla e IDs visibles.
- Tab de reportes funcional (estadisticas por estado, aseguradora y juzgado).
- Layout responsive y accesible.
- Tooltips y animaciones suaves con Tippy.js y Animate.css.
- Sidebar colapsable en desktop y deslizable en mobile.

## Hardening y validaciones

- Longitudes y tipos restringidos en SQL (CHECK, ENUM, NOT NULL).
- Sanitizacion y validacion en API (username, password, nombres, fechas).
- Consultas parametrizadas con PyMySQL.

## Estructura del proyecto

```
backend/
  app/
    main.py
    routes/
    security/
frontend/
  index.html
  login.html
  css/
  js/
docker/
  init.sql
docker-compose.yml
```

## Notas

- El backend usa PyMySQL con MariaDB.
- La UI es HTML/CSS/JS puro con FullCalendar y Chart.js.
