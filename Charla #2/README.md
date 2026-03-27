
<div align="center">
<img width="300" height="200" alt="image" src="https://github.com/user-attachments/assets/1de676b6-1c30-443d-94a3-f67f13056dda" />

# 🎬 CineMax · Ticketing Platform

**Plataforma de cartelera, reservas, pagos y check-in QR construida sobre microservicios event-driven.**

---

### Stack principal

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white)

</div>

---

## ¿Qué es CineMax?

CineMax es una plataforma de cine end-to-end: cartelera, selección de asientos, dulcería, pago con Stripe y entrada QR. Cada pieza del negocio vive en su propio microservicio con su propia base de datos. **RabbitMQ es el tejido que los conecta sin que ninguno dependa directamente del otro.**

---

## Arquitectura de microservicios

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Cliente                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│                   Gateway  (Nginx / Ingress)                │
└──┬─────────────┬──────────────┬───────────────┬─────────────┘
   │             │              │               │
   ▼             ▼              ▼               ▼
┌──────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐
│ auth │   │ tickets │   │ orders  │   │ payments │
│      │   │         │   │         │   │          │
│ JWT  │   │ MongoDB │   │ MongoDB │   │ MongoDB  │
│ hCap │   │ tickets │   │ orders  │   │ payments │
└──────┘   └────┬────┘   └────┬────┘   └────┬─────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │      RabbitMQ       │
                    │  direct exchanges   │
                    │  durable queues     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │     expiration      │
                    │   Bull + Redis      │
                    └─────────────────────┘
```

Cada servicio tiene su propia base de datos MongoDB. **No hay base compartida.** La sincronización de estado entre bounded contexts es exclusivamente por eventos.

---

## 🐇 RabbitMQ: el núcleo del sistema

### Mapa completo de exchanges, colas y consumidores

```mermaid
flowchart LR
    subgraph PUB["📤  Publishers"]
        direction TB
        T("🎬 tickets")
        O("📋 orders")
        P("💳 payments")
        X("⏱ expiration")
    end

    subgraph EX["  Exchanges · direct · durable"]
        direction TB
        ET["tickets\nexchange"]
        EO["orders\nexchange"]
        EP["payment\nexchange"]
        EX2["expiration\nexchange"]
    end

    subgraph Q["📬  Queues"]
        direction TB
        QTC["ticketsCreateQueue"]
        QTU["ticketsUpdateQueue"]
        QTOC["ticketsOrdersQueueCreate"]
        QTOX["ticketsOrdersQueueCancel"]
        QPOC["paymentsOrdersQueueCreate"]
        QPOX["paymentsOrdersQueueCancel"]
        QEOC["expirationOrdersQueueCreate"]
        QEC["expirationQueueComplete"]
        QPC["paymentQueueCreate"]
    end

    subgraph CON["📥  Consumers"]
        direction TB
        CO("📋 orders")
        CT("🎬 tickets")
        CP("💳 payments")
        CX("⏱ expiration")
    end

    T -->|"ticketsKeyCreate\nticketKeyUpdate"| ET
    O -->|"ordersKeyCreate\nordersKeyCancel"| EO
    P -->|"paymentKeyCreate"| EP
    X -->|"expirationKeyComplete"| EX2

    ET --> QTC
    ET --> QTU
    EO --> QTOC
    EO --> QTOX
    EO --> QPOC
    EO --> QPOX
    EO --> QEOC
    EX2 --> QEC
    EP --> QPC

    QTC --> CO
    QTU --> CO
    QTOC --> CT
    QTOX --> CT
    QPOC --> CP
    QPOX --> CP
    QEOC --> CX
    QEC --> CO
    QPC --> CO
```

> Cada consumidor tiene su propia cola. Esto garantiza fan-out por servicio sin que dos consumidores compitan por el mismo mensaje.

---

### Flujo de negocio de punta a punta

```mermaid
sequenceDiagram
    actor U as Usuario
    participant O as orders
    participant RMQ as 🐇 RabbitMQ
    participant T as tickets
    participant P as payments
    participant EXP as expiration
    participant Redis as Redis / Bull

    Note over U,Redis: ── Reserva ──────────────────────────────────────────

    U->>O: POST /api/orders (asientos + función)
    O->>RMQ: publish OrderCreated
    RMQ-->>T: OrderCreated → ticketsOrdersQueueCreate
    RMQ-->>P: OrderCreated → paymentsOrdersQueueCreate
    RMQ-->>EXP: OrderCreated → expirationOrdersQueueCreate
    T-->>T: marca asientos como ocupados
    T->>RMQ: publish TicketUpdated
    RMQ-->>O: TicketUpdated → ticketsUpdateQueue
    P-->>P: crea copia local de la orden
    EXP->>Redis: agenda job Bull (expiresAt)

    Note over U,Redis: ── Dulcería (HTTP síncrono, no RabbitMQ) ────────────

    U->>O: PATCH /api/orders/:id/concessions
    O-->>O: recalcula concessionsTotal + totalPrice

    Note over U,Redis: ── Pago ─────────────────────────────────────────────

    U->>P: POST /api/payments (lee total actualizado)
    P->>P: crea sesión Stripe o mock
    U->>P: POST /api/payments/confirm
    P->>RMQ: publish PaymentCreated
    RMQ-->>O: PaymentCreated → paymentQueueCreate
    O-->>O: orden → Complete

    Note over U,Redis: ── QR de acceso (HTTP síncrono, no RabbitMQ) ────────

    U->>P: POST /api/payments/entry-pass
    P-->>U: token firmado (hash guardado en BD)
    U->>P: POST /api/payments/entry-pass/validate
    P-->>U: ✅ válido · ❌ expirado · revocado · ya usado

    Note over U,Redis: ── Vencimiento sin pago ─────────────────────────────

    Redis-->>EXP: job Bull dispara (expiresAt alcanzado)
    EXP->>RMQ: publish ExpirationComplete
    RMQ-->>O: ExpirationComplete → expirationQueueComplete
    O->>RMQ: publish OrderCancelled
    RMQ-->>T: OrderCancelled → ticketsOrdersQueueCancel
    RMQ-->>P: OrderCancelled → paymentsOrdersQueueCancel
    T-->>T: libera asientos
    P-->>P: bloquea cobro posterior
```

---

### Tabla de eventos

| Evento | Publica | Consume | Efecto |
|---|---|---|---|
| `TicketCreated` | `tickets` | `orders` | orders proyecta catálogo localmente |
| `TicketUpdated` | `tickets` | `orders` | orders sincroniza cambios de asiento |
| `OrderCreated` | `orders` | `tickets` · `payments` · `expiration` | ocupa asiento · crea copia pagable · agenda vencimiento |
| `OrderCancelled` | `orders` | `tickets` · `payments` | libera asiento · bloquea cobro |
| `PaymentCreated` | `payments` | `orders` | cierra la orden como `Complete` |
| `ExpirationComplete` | `expiration` | `orders` | dispara cancelación → `OrderCancelled` en cadena |

### Lo que intencionalmente NO pasa por RabbitMQ

| Operación | Por qué es HTTP síncrono |
|---|---|
| Login / refresh de sesión | requiere respuesta inmediata al usuario |
| `PATCH /concessions` | el monto a cobrar debe estar sincronizado al instante |
| Fetch del total antes del checkout | payments necesita el snapshot más reciente |
| Emisión y validación del QR | la puerta necesita resultado transaccional en tiempo real |

---

## Stack completo

### Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express_4-000000?style=flat-square&logo=express&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose_8-880000?style=flat-square&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe&logoColor=white)
![hCaptcha](https://img.shields.io/badge/hCaptcha-grey?style=flat-square&logo=hcaptcha&logoColor=white)

### Mensajería y colas

![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Bull](https://img.shields.io/badge/Bull_Queue-DC382D?style=flat-square&logo=redis&logoColor=white)

### Frontend

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)

### Bases de datos

![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)

### Infraestructura y despliegue

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white)
![Skaffold](https://img.shields.io/badge/Skaffold-4285F4?style=flat-square&logo=google&logoColor=white)

### Testing

![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white)
![Supertest](https://img.shields.io/badge/Supertest-000000?style=flat-square&logo=nodedotjs&logoColor=white)

---

## Levantar en local

```bash
cp .env.example .env
docker compose up --build
```

| Recurso | URL |
|---|---|
| App | `http://localhost:3000` |
| RabbitMQ Management UI | `http://localhost:15672` |

Credenciales del broker local: `app-user / app-password`

Variables mínimas en `.env`:

```env
JWT_KEY=cualquier-string-secreto
ADMIN_EMAIL=tu@correo.com
ENTRY_PASS_SECRET=otro-string-secreto
```

Para inspeccionar el broker en Kubernetes:

```bash
kubectl port-forward svc/rabbit-srv 15673:15672
# → http://localhost:15673
```

---

## Estructura del repositorio

```
.
├── auth/           sesiones, refresh tokens, roles efectivos
├── client/         frontend React / Vite
├── expiration/     worker Bull + Redis para vencimiento de órdenes
├── infra/
│   ├── docker/     nginx local para Compose
│   └── k8s/        manifests Kubernetes + RabbitmqCluster
├── orders/         reservas, dulcería, dashboard admin
├── payments/       checkout, confirmación, QR y check-in
└── tickets/        catálogo, funciones, estado de asientos
```

---

## Panel admin

| Ruta | Descripción |
|---|---|
| `/admin/orders` | KPIs de revenue, attach rate de dulcería, breakdown por estado / cine / formato, top películas, top productos, exportes PDF y Excel |
| `/admin/check-in` | Consola QR: cámara, upload de imagen, validación manual, reemisión, revocación e historial |

---

## Tests

```bash
cd auth     && npm run test:ci
cd orders   && npm run test:ci
cd tickets  && npm run test:ci
cd payments && npm run test:ci
```
