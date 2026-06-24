<img width="1129" height="421" alt="image" src="https://github.com/user-attachments/assets/3331926b-aec7-4eb6-afa2-1e93ea69635c" />

# MedComLabs — Gestión Moderna de ETL y Cifrado de Base de Datos
<p align="left">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/shadcn/ui-latest-black" />
  <a href="https://deepwiki.com/Un2versidad/BASE_DE-DATOS_II">
    <img src="https://deepwiki.com/badge.svg" />
  </a>
</p>

> Plataforma hospitalaria con ETL avanzado y cifrado AES-256-GCM de extremo a extremo

## Descripción General

MedComLabs es un sistema hospitalario moderno que integra:
- **ETL (Extract, Transform, Load)** para importación y procesamiento masivo de datos clínicos
- **Cifrado AES-256-GCM** en toda la capa de datos sensibles (pacientes, doctores, resultados, recetas, notificaciones)
- **Notificaciones y resultados por email** usando Resend
- **Gestión de usuarios, autenticación JWT, y seguridad avanzada**

## ⚠️ AVISO LEGAL – PROYECTO EDUCATIVO

> **Este repositorio ha sido creado exclusivamente con fines académicos y de aprendizaje.**  
> No representa una entidad real ni ofrece servicios reales al público.

---

## 🎓 Finalidad del Proyecto

Este proyecto fue desarrollado como parte de un ejercicio educativo para demostrar:

- Diseño y maquetación web
- Estructuración de contenido institucional
- Simulación de entornos empresariales
- Implementación técnica con fines prácticos

Su único propósito es **formativo y no comercial**.

---

## 🏷️ Sobre Nombres, Marcas y Certificaciones

Todos los elementos mencionados en el proyecto, incluyendo pero no limitándose a:

- Nombres de empresas
- Logotipos
- Marcas comerciales
- Certificaciones
- Afiliaciones institucionales
- Información corporativa
- Datos de contacto
- Ubicaciones

Han sido utilizados **únicamente para aportar realismo visual y contextual al ejercicio académico**.

### ❗ Importante

- No representan entidades reales verificadas.
- No constituyen certificaciones oficiales.
- No implican vínculos comerciales auténticos.
- No cuentan con respaldo institucional.
- No deben interpretarse como información factual.

Cualquier similitud con organizaciones, empresas o personas reales es **coincidencia** o uso ilustrativo dentro de un entorno simulado.

---

## 🚫 Uso No Comercial

Este proyecto:

- No presta servicios médicos ni profesionales reales.
- No procesa datos reales de usuarios.
- No realiza transacciones comerciales.
- No tiene fines lucrativos.
- No busca suplantar entidades existentes.

Su contenido es únicamente demostrativo.

## 📌 Responsabilidad

El autor no se hace responsable por el uso indebido del contenido fuera de su contexto académico.

Si alguna entidad considera que existe una coincidencia no intencionada, puede tratarse de una simulación con fines exclusivamente educativos.


# Screenshot 
<img width="2535" height="9855" alt="image" src="https://github.com/user-attachments/assets/9308a187-a99e-4953-9ede-d9b934e4ca88" />

## Stack Tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Remotion
- **Backend:** Next.js API Routes, Web Crypto API (AES-256-GCM, PBKDF2), Resend (email), OpenRouter y DeepSeek (IA médica)
- **Base de Datos:** Supabase (PostgreSQL 15+), RLS, JSONB, triggers, extensiones pgcrypto/uuid-ossp
- **Seguridad:** JWT, hCaptcha, rate limiting, auditoría, RLS, bcrypt

---

## Arquitectura General

```mermaid
graph TB
    subgraph Cliente["🖥️ Cliente (Browser)"]
        UI[React 19 + shadcn/ui]
        Dashboard[Dashboard Doctor/Admin]
        Portal[Portal Pacientes]
    end
    subgraph NextJS["⚡ Next.js 16 (Server)"]
        API[API Route Handlers]
        ETL_Engine[ETL Processor]
        Crypto[Crypto Engine AES-256-GCM]
    end
    subgraph Supabase["🐘 Supabase PostgreSQL"]
        DB[(Base de Datos)]
        RLS[Row Level Security]
    end
    subgraph External["🌐 Servicios Externos"]
        Resend[Resend Email API]
        HCaptcha[hCaptcha]
        OpenRouter[OpenRouter AI]
    end
    UI --> API
    API --> Crypto
    Crypto -->|Datos cifrados| DB
    DB --> RLS
    API --> ETL_Engine
    ETL_Engine --> Crypto
    API --> Resend
    API --> OpenRouter
```

---

## Base de Datos — PostgreSQL (Supabase)

- **16 tablas principales**: pacientes, doctores, credenciales, citas, resultados, recetas, notificaciones, logs, ETL, etc.
- **Cifrado AES-256-GCM**: Todos los datos sensibles se almacenan cifrados (nombre, email, teléfono, resultados, etc.)
- **Hash SHA-256**: Columnas hash paralelas para búsquedas eficientes sobre datos cifrados
- **RLS**: Row Level Security en todas las tablas
- **JSONB**: Uso extensivo para resultados, medicamentos, logs
- **Triggers**: Actualización automática de timestamps

### Ejemplo de Cifrado

- Dos columnas: `nombre_encrypted` + `nombre_iv` (pacientes, doctores)
- Empaquetado: `iv.ciphertext` (citas, solicitudes, notificaciones)
- Hash: `cedula_hash`, `numero_licencia_hash`, etc.

---

## Diagrama Entidad-Relación de la Base de Datos

```mermaid
erDiagram
    %% ============================================
    %% DIAGRAMA ENTIDAD-RELACIÓN - MEDCOMLABS
    %% Base de datos con cifrado AES-256-GCM
    %% ============================================

    %% ENTIDADES PRINCIPALES
    
    PACIENTES {
        uuid id PK
        text cedula_hash UK "Hash para búsqueda"
        text cedula_encrypted "Cifrado AES-256"
        text cedula_iv
        text nombre_encrypted "Cifrado"
        text nombre_iv
        text email_encrypted "Cifrado"
        text email_iv
        text telefono_encrypted "Cifrado"
        text telefono_iv
        text direccion_encrypted "Cifrado"
        text direccion_iv
        text codigo_acceso "Cifrado empaquetado"
        text codigo_acceso_hash UK
        text fecha_nacimiento "Cifrado empaquetado"
        text tipo_sangre "Cifrado empaquetado"
        text genero "masculino|femenino|otro"
        text alergias_encrypted "Cifrado"
        text alergias_iv
        text condiciones_encrypted "Cifrado"
        text condiciones_iv
        text contacto_emergencia_encrypted "Cifrado"
        text contacto_emergencia_iv
        text notas_encrypted "Cifrado"
        text notas_iv
        text status "active|inactive|deceased"
        text source "manual|etl_import|api"
        uuid import_job_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    DOCTORES {
        uuid id PK
        text nombre_cifrado "Cifrado"
        text nombre_iv
        text especialidad
        text numero_licencia "Cifrado empaquetado"
        text numero_licencia_hash UK
        text email_cifrado "Cifrado"
        text email_iv
        text telefono_cifrado "Cifrado"
        text telefono_iv
        text foto_url
        text[] dias_disponibles
        time hora_inicio
        time hora_fin
        integer duracion_cita_minutos
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    CREDENCIALES_DOCTORES {
        uuid id PK
        uuid doctor_id FK
        text email UK
        text password_hash
        text refresh_token
        timestamptz refresh_token_expira
        boolean esta_aprobado
        boolean esta_activo
        timestamptz fecha_aprobacion
        uuid aprobado_por FK
        text motivo_rechazo
        boolean email_verificado
        text token_verificacion
        integer intentos_fallidos
        timestamptz bloqueado_hasta
        timestamptz ultimo_login
        text ultimo_ip
        timestamptz created_at
        timestamptz updated_at
    }

    SOLICITUDES_REGISTRO_DOCTORES {
        uuid id PK
        text nombre "Cifrado empaquetado"
        text email "Cifrado empaquetado"
        text email_hash UK
        text password_hash
        text especialidad
        text numero_licencia "Cifrado empaquetado"
        text numero_licencia_hash
        text telefono "Cifrado empaquetado"
        text estado "pendiente|aprobado|rechazado"
        text motivo_rechazo "Cifrado empaquetado"
        uuid revisado_por FK
        timestamptz fecha_revision
        timestamptz created_at
        timestamptz updated_at
    }

    CITAS {
        uuid id PK
        text numero_turno "Cifrado empaquetado"
        text numero_turno_hash UK
        uuid paciente_id FK
        uuid doctor_id FK
        text departamento
        date fecha_cita
        time hora_cita
        text tipo_consulta "primera_vez|control|emergencia|seguimiento"
        text nombre_paciente_cifrado "Opcional cifrado"
        text nombre_paciente_iv
        text cedula_paciente_cifrada "Opcional cifrado"
        text cedula_paciente_iv
        text telefono_paciente_cifrado "Opcional cifrado"
        text telefono_paciente_iv
        text estado "programada|confirmada|en_progreso|completada|cancelada|no_asistio"
        integer prioridad "1-10"
        integer tiempo_espera_estimado
        timestamptz hora_llegada
        timestamptz hora_inicio_consulta
        timestamptz hora_fin_consulta
        text motivo_consulta "Cifrado empaquetado"
        text notas "Cifrado empaquetado"
        timestamptz created_at
        timestamptz updated_at
    }

    RESULTADOS_LABORATORIO {
        uuid id PK
        uuid paciente_id FK
        text nombre_examen
        text tipo_examen "hematologia|bioquimica|microbiologia|urinalisis|imagenologia|otro"
        text resultados_cifrados "Cifrado"
        text resultados_iv
        text estado "pendiente|en_proceso|completado|revisado"
        text prioridad "baja|normal|alta|urgente"
        date fecha_orden
        date fecha_completado
        date fecha_revisado
        uuid ordenado_por FK
        uuid revisado_por FK
        text notas_cifradas "Cifrado"
        text notas_iv
        text interpretacion
        boolean requiere_seguimiento
        timestamptz created_at
        timestamptz updated_at
    }

    RECETAS {
        uuid id PK
        uuid paciente_id FK
        uuid doctor_id FK
        uuid cita_id FK
        jsonb medicamentos
        text diagnostico
        date fecha_emision
        date fecha_vencimiento
        text estado "activa|dispensada|vencida|cancelada"
        text indicaciones_generales
        timestamptz created_at
        timestamptz updated_at
    }

    NOTAS_MEDICAS {
        uuid id PK
        uuid paciente_id FK
        uuid doctor_id FK
        uuid cita_id FK
        text titulo
        text contenido "Texto plano"
        text contenido_cifrado "Cifrado si confidencial"
        text contenido_iv
        boolean es_confidencial
        text tipo "consulta|evolucion|interconsulta|alta|otro"
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICACIONES {
        uuid id PK
        uuid destinatario_id
        text tipo_destinatario "doctor|admin|paciente"
        text titulo "Cifrado empaquetado"
        text mensaje "Cifrado empaquetado"
        text tipo "cita|resultado|sistema|recordatorio|alerta|aprobacion"
        text referencia_tipo
        uuid referencia_id
        boolean leida
        timestamptz fecha_leida
        text prioridad "baja|normal|alta|urgente"
        timestamptz created_at
    }

    REGISTROS_SEGURIDAD {
        uuid id PK
        text tipo_evento "Cifrado empaquetado"
        text descripcion "Cifrado empaquetado"
        uuid usuario_id
        text usuario_email "Cifrado empaquetado"
        text usuario_tipo
        text direccion_ip
        text user_agent "Cifrado empaquetado"
        text metadatos "Cifrado empaquetado (era JSONB)"
        boolean exitoso
        timestamptz created_at
    }

    %% ENTIDADES ETL

    FUENTES_DATOS {
        uuid id PK
        text nombre
        text tipo_fuente "csv|json|api|database|excel"
        jsonb configuracion
        boolean esta_cifrado
        boolean activo
        timestamptz created_at
        timestamptz updated_at
    }

    PIPELINES_ETL {
        uuid id PK
        text nombre
        text descripcion
        uuid fuente_id FK
        text estado "active|inactive|error|running"
        text programacion
        timestamptz ultima_ejecucion
        timestamptz proxima_ejecucion
        jsonb configuracion
        timestamptz created_at
        timestamptz updated_at
    }

    IMPORT_JOBS {
        uuid id PK
        text file_name
        text file_type "csv|json|xlsx"
        integer total_records
        integer processed_records
        integer successful_records
        integer failed_records
        text status "pending|processing|completed|failed|cancelled"
        jsonb error_log
        jsonb field_mapping
        boolean encrypt_data
        boolean skip_duplicates
        uuid created_by
        timestamptz created_at
        timestamptz started_at
        timestamptz completed_at
    }

    LOGS_PIPELINE {
        uuid id PK
        uuid pipeline_id FK
        uuid import_job_id FK
        text nivel "debug|info|warning|error|critical"
        text mensaje
        jsonb metadatos
        timestamptz created_at
    }

    %% ============================================
    %% RELACIONES
    %% ============================================

    %% Relaciones de DOCTORES
    DOCTORES ||--o{ CREDENCIALES_DOCTORES : "tiene"
    DOCTORES ||--o{ CITAS : "atiende"
    DOCTORES ||--o{ RESULTADOS_LABORATORIO : "ordena"
    DOCTORES ||--o{ RESULTADOS_LABORATORIO : "revisa"
    DOCTORES ||--o{ RECETAS : "emite"
    DOCTORES ||--o{ NOTAS_MEDICAS : "escribe"

    %% Relaciones de PACIENTES
    PACIENTES ||--o{ CITAS : "solicita"
    PACIENTES ||--o{ RESULTADOS_LABORATORIO : "recibe"
    PACIENTES ||--o{ RECETAS : "recibe"
    PACIENTES ||--o{ NOTAS_MEDICAS : "tiene"
    
    %% Relaciones de CITAS
    CITAS ||--o{ RECETAS : "genera"
    CITAS ||--o{ NOTAS_MEDICAS : "documenta"

    %% Relaciones ETL
    FUENTES_DATOS ||--o{ PIPELINES_ETL : "alimenta"
    PIPELINES_ETL ||--o{ LOGS_PIPELINE : "registra"
    IMPORT_JOBS ||--o{ LOGS_PIPELINE : "documenta"
    IMPORT_JOBS ||--o{ PACIENTES : "importa"

    %% Relaciones de SOLICITUDES
    SOLICITUDES_REGISTRO_DOCTORES }o--|| DOCTORES : "revisada_por"
    CREDENCIALES_DOCTORES }o--|| DOCTORES : "aprobada_por"
```

---

## ETL y Procesamiento de Datos

- **Importación masiva** de pacientes desde CSV/JSON/Excel
- **Deduplicación** por hash de cédula
- **Cifrado automático** en el pipeline ETL
- **Tracking y logs** de cada importación
- **Pipelines configurables** para otras fuentes de datos

### Flujo ETL

1. Admin sube archivo CSV/JSON
2. El sistema valida, deduplica y cifra cada registro
3. Inserta en la base de datos cifrada
4. Registra logs y métricas de importación

---

## Seguridad y Autenticación

- **JWT Access/Refresh Tokens** (HS256, HttpOnly cookies)
- **hCaptcha** en registro de doctores
- **Rate limiting** por acción y usuario
- **Auditoría completa** de eventos críticos
- **Hashing de contraseñas** con bcrypt
- **RLS**: Políticas estrictas en todas las tablas

---

## Notificaciones y Resultados por Email

- **Resend API** para envío de resultados y recetas médicas
- **Correos HTML personalizados** con branding institucional
- **Notificaciones internas** para doctores y pacientes

---

## Variables de Entorno Clave

```env
ENCRYPTION_SECRET=clave-secreta-para-aes-256-gcm
RESEND_API_KEY=re_xxx
EMAIL_FROM=MedComLabs <onboarding@resend.dev>
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=clave-secreta-jwt-access
JWT_REFRESH_SECRET=clave-secreta-jwt-refresh
```

---

## API Routes — Mapa Completo

```
/api
├── admin/
│   ├── notifications/       GET (listar), POST (crear)
│   ├── reset-password/      POST (resetear contraseña de doctor)
│   └── users/               GET (listar doctores con credenciales)
│
├── ai/
│   ├── actions/             POST (acciones IA)
│   └── chat/                POST (chat con asistente médico)
│
├── appointments/
│   ├── route.ts             GET (listar), POST (crear cita pública)
│   └── [id]/route.ts        GET, PATCH (actualizar), DELETE
│
├── auth/
│   └── login/               POST (login admin)
│
├── doctor-registrations/
│   ├── route.ts             GET (admin: listar), POST (público: solicitar)
│   └── [id]/route.ts        PATCH (aprobar/rechazar)
│
├── doctors/
│   ├── route.ts             GET (listar doctores)
│   ├── [id]/route.ts        GET, PATCH, DELETE
│   ├── [id]/appointments/
│   │   ├── cancel-all/      PATCH
│   │   ├── pending/         GET
│   │   └── reassign/        PATCH
│   ├── appointments/
│   │   ├── route.ts         GET, PATCH (doctor autenticado)
│   │   └── reschedule/      PATCH
│   ├── auth/
│   │   ├── login/           POST
│   │   ├── refresh/         POST
│   │   └── register/        POST
│   ├── dashboard/           GET (datos agregados)
│   ├── lab-results/
│   │   ├── route.ts         GET, POST, PATCH, DELETE
│   │   └── [id]/review/     PATCH
│   ├── notifications/       GET, PATCH (marcar leída)
│   ├── patients/[id]/
│   │   ├── route.ts         GET, PATCH
│   │   └── results/         GET
│   ├── prescriptions/
│   │   ├── route.ts         GET, POST, PATCH, DELETE
│   │   └── send/            POST (enviar por email)
│   ├── profile/             GET, PATCH
│   ├── public/              GET (doctores públicos para citas)
│   ├── results/
│   │   ├── route.ts         POST (crear resultado)
│   │   ├── send/            POST (enviar por email)
│   │   └── [id]/pdf/        GET (generar PDF)
│
├── etl/
│   ├── data-sources/        GET, POST
│   ├── pipelines/           GET, POST
│   ├── process/             POST (ejecutar pipeline)
│   └── stats/               GET (métricas)
│
├── results/
│   ├── route.ts             POST (consulta pública por cédula+código)
│   ├── [id]/route.ts        GET
│   └── download/            GET (HTML para print-to-PDF)
│
└── security-logs/           GET (admin: consultar logs)
```

---

## Seguridad API y Hardening

### Medidas de Hardening Aplicadas
- **Cifrado AES-256-GCM** en tránsito y en reposo para todos los datos sensibles
- **JWT (HttpOnly, HS256)** para autenticación y autorización
- **Rate limiting** por usuario/IP en endpoints críticos
- **hCaptcha** en flujos de registro público
- **RLS (Row Level Security)** en la base de datos: cada consulta sólo accede a datos permitidos
- **Auditoría de eventos**: logs de acceso, cambios y operaciones sensibles
- **Validación estricta** de payloads y sanitización de entradas
- **Cabeceras de seguridad** (CORS, CSP, HSTS, X-Content-Type-Options, etc.)
- **Protección contra brute force** en login y registro
- **Hashing de contraseñas** con bcrypt
- **Despliegue en entorno aislado** y sin exposición de claves en frontend

### Rutas Protegidas vs Públicas

| Ruta                                 | Método(s)         | Acceso         | Protección           |
|--------------------------------------|-------------------|----------------|---------------------|
| /api/doctors/auth/login              | POST              | Público        | Rate limit, hCaptcha|
| /api/doctors/auth/register           | POST              | Público        | hCaptcha, RLS       |
| /api/doctor-registrations/           | POST              | Público        | hCaptcha, RLS       |
| /api/appointments/                   | GET, POST         | Público        | Rate limit, RLS     |
| /api/results/route.ts                | POST              | Público        | RLS, hash lookup    |
| /api/doctors/                        | GET, PATCH, DELETE| Protegido      | JWT, RLS            |
| /api/doctors/prescriptions/          | GET, POST, PATCH  | Protegido      | JWT, RLS, audit     |
| /api/doctors/prescriptions/send/     | POST              | Protegido      | JWT, audit, Resend  |
| /api/doctors/lab-results/            | GET, POST, PATCH  | Protegido      | JWT, RLS, audit     |
| /api/doctors/notifications/          | GET, PATCH        | Protegido      | JWT, RLS            |
| /api/admin/*                         | GET, POST         | Protegido      | JWT (admin), audit  |
| /api/etl/*                           | GET, POST         | Protegido      | JWT (admin), audit  |
| /api/security-logs/                  | GET               | Protegido      | JWT (admin), audit  |

- **Protegido**: Requiere JWT válido, y en algunos casos rol de admin.
- **Público**: Acceso sin autenticación, pero con controles de rate limit, hCaptcha y RLS.

> Todas las rutas que exponen o modifican datos sensibles requieren autenticación y pasan por políticas de RLS y auditoría. Las rutas públicas sólo permiten operaciones de registro, login, consulta de citas y resultados, siempre con controles de seguridad y sin exponer datos confidenciales.

---

> MedComLabs — Gestión hospitalaria moderna con ETL y cifrado de base de datos.

---

<div align="center">

**Proyecto Académico | Uso Educativo | No Comercial**

</div>
