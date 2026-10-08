# Plan de implementación: Sprint 1 — Base del sistema, autenticación, usuarios, roles y clientes

**Rama**: `001-base-usuarios-clientes` | **Fecha**: 2026-10-08 | **Especificación**: [spec.md](./spec.md)

**Entrada**: especificación de la feature en `specs/001-base-usuarios-clientes/spec.md`

## Resumen

El Sprint 1 crea la base del sistema web del gimnasio: inicio de sesión con control por rol
(administrador, recepcionista, entrenador y cliente), gestión de usuarios y roles exclusiva del
administrador, registro, consulta y modificación de clientes, y consulta del perfil propio para el
rol cliente. También deja creada en MySQL la estructura de `tipos_membresia`, `membresias` y `pagos`
para el Sprint 2, sin funciones operativas.

Enfoque técnico: aplicación web separada en tres carpetas. `frontend/` es una SPA con React y Vite
que solo habla con la API. `backend/` es una API REST con Node.js y Express en ES Modules,
organizada en rutas → controladores → servicios → modelos, con autenticación JWT, contraseñas con
bcrypt y validación de permisos en cada solicitud. `database/` contiene migraciones SQL numeradas
y scripts JavaScript (ES Modules) para aplicarlas y cargar el administrador inicial en MySQL local.
Las decisiones están justificadas en [research.md](./research.md).

Revisado el 2026-10-08 después de `/speckit-clarify`: la cuenta de un cliente solo la crea el
administrador desde Usuarios (FR-013), lo que ya coincidía con el contrato `POST /users`. La
pregunta sobre el cambio de contraseña por el propio usuario quedó sin responder; se mantiene que
solo el administrador fija y restablece contraseñas (research R-05).

## Contexto técnico

**Lenguaje/versión**: JavaScript (ECMAScript 2022+) sobre Node.js 22 LTS o superior (el equipo
tiene Node.js 24); ES Modules en `backend/` y `database/`.

**Dependencias principales**:
- Backend: `express`, `mysql2`, `jsonwebtoken`, `bcrypt`, `express-validator`, `helmet`, `cors`,
  `dotenv`.
- Frontend: `react`, `react-dom`, `react-router-dom`; herramienta de construcción `vite`.
- Database: `mysql2`, `bcrypt`, `dotenv` (solo para los scripts de migración y carga inicial).

**Almacenamiento**: MySQL 8.0+ o MariaDB 10.4+ (XAMPP) en local, motor InnoDB, `utf8mb4` con collation
`utf8mb4_unicode_ci`, llaves primarias y foráneas, consultas parametrizadas.

**Pruebas**: backend con el runner nativo `node:test` y `supertest` contra una base de datos de
pruebas (`gym_access_test`); frontend con `vitest` y `@testing-library/react` para el inicio de
sesión y la protección de rutas; validación manual de extremo a extremo con
[quickstart.md](./quickstart.md).

**Plataforma objetivo**: navegadores de escritorio actuales (Chrome, Edge, Firefox) del personal;
servidor local en Windows durante el desarrollo del MVP.

**Tipo de proyecto**: aplicación web (frontend + backend + scripts de base de datos).

**Objetivos de rendimiento**: inicio de sesión en menos de 30 s de principio a fin (SC-001) y
búsqueda de clientes en menos de 10 s con 500 clientes (SC-003); en la práctica, menos de 1 s por
operación en local.

**Restricciones**: el frontend nunca accede a MySQL; permisos validados en el backend en cada
solicitud; nada de CommonJS (`require`, `module.exports`); secretos solo en `.env`; sin librerías
de reconocimiento facial; textos visibles en español; identificadores de código, rutas y
endpoints en inglés (`AGENTS (1).md`).

**Escala/alcance**: un gimnasio, hasta unas decenas de usuarios del personal y del orden de cientos
o pocos miles de clientes; unas 8 pantallas y 15 endpoints.

## Revisión de la constitución

*COMPUERTA: debe cumplirse antes de la Fase 0 y revisarse de nuevo después de la Fase 1.*

| # | Principio | Cómo lo cumple el plan | Estado |
|---|-----------|------------------------|--------|
| I | Alcance, MVP y fuente de verdad | Solo las historias US-S1-01 a US-S1-07; las tablas de membresías y pagos se crean sin funciones (FR-033, FR-034). | ✅ |
| II | Arquitectura con responsabilidades separadas | `frontend/`, `backend/`, `database/`; backend en `routes/`, `controllers/`, `services/`, `models/`, `middlewares/`, `validators/`, `utils/`; reglas de negocio solo en `services/`. | ✅ |
| III | Stack tecnológico | React + JavaScript, Node.js + Express, API REST, JWT, bcrypt y variables de entorno: se cumplen. **La base de datos es MySQL y la constitución v1.0.0 dice MongoDB.** | ⚠️ Desviación justificada (ver "Seguimiento de complejidad") |
| IV | Base de datos y persistencia | Sprint 1 crea `usuarios`, `clientes`, `tipos_membresia`, `membresias`, `pagos`; relaciones por identificadores (llaves foráneas); solo el backend accede a la base; cambios documentados mediante migraciones numeradas. `rostros`, `accesos` y `auditoria` quedan para el Sprint 2. Términos "tablas" en lugar de "colecciones" por la desviación de III. | ⚠️ Misma desviación |
| V | Seguridad y protección | bcrypt, JWT con secreto en `.env`, `.env` en `.gitignore`, `.env.example` sin secretos, permisos y validación en el backend, manejador de errores que oculta detalles internos. Sin datos faciales. | ✅ |
| VI | Roles y permisos | Matriz de permisos en [contracts/api.md](./contracts/api.md); el entrenador solo recibe campos básicos y el cliente solo su propio registro. | ✅ |
| VII | Integridad de reglas de negocio | Llaves foráneas `membresias → clientes`, `membresias → tipos_membresia`, `pagos → clientes/membresias` con `ON DELETE RESTRICT`; sin borrado físico de usuarios ni clientes. | ✅ |
| VIII | Reconocimiento facial y control de acceso | Fuera del sprint; ninguna dependencia facial instalada. | ✅ (no aplica) |
| IX | API y manejo de errores | Rutas `/api/...` consistentes, JSON, códigos HTTP apropiados, middlewares `authenticate` y `authorize`, validación con `express-validator`, manejador de errores centralizado. | ✅ |
| X | Pruebas | Pruebas de autenticación, roles, registro y modificación de clientes; prueba de extremo a extremo en `quickstart.md`. | ✅ |
| XI | UX/UI profesional y sencilla | Diseño consistente con CSS propio, mensajes de éxito/error, confirmación al desactivar, estados visibles. | ✅ |
| — | Flujo de desarrollo (ramas) | La constitución pide `feature/<nombre>`; Spec Kit usa `001-base-usuarios-clientes`. Se usará la rama `feature/base-usuarios-clientes` para el código y la carpeta `specs/001-...` para la documentación. El proyecto todavía no es un repositorio Git. | ⚠️ Pendiente de configurar |

**Resultado de la compuerta (antes de la Fase 0)**: aprobada con una desviación justificada (motor
de base de datos). No hay violaciones sin justificar.

**Revisión después de la Fase 1**: el modelo de datos, los contratos y la estructura mantienen el
mismo resultado. No aparecieron nuevas desviaciones: las dependencias agregadas (`helmet`, `cors`,
`express-validator`) están justificadas en `research.md` y responden a los principios V y IX.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/001-base-usuarios-clientes/
├── plan.md              # Este archivo (salida de /speckit-plan)
├── research.md          # Fase 0 (salida de /speckit-plan)
├── data-model.md        # Fase 1 (salida de /speckit-plan)
├── quickstart.md        # Fase 1 (salida de /speckit-plan)
├── contracts/
│   └── api.md           # Fase 1: contrato de la API REST y matriz de permisos
├── checklists/
│   └── requirements.md  # Checklist de calidad de la especificación
└── tasks.md             # Fase 2 (salida de /speckit-tasks, NO la crea /speckit-plan)
```

### Código fuente (raíz del repositorio)

```text
frontend/
├── package.json
├── index.html
├── vite.config.js
├── .env.example                 # VITE_API_URL
└── src/
    ├── main.jsx
    ├── App.jsx                  # Definición de rutas
    ├── api/                     # Cliente HTTP (fetch) y funciones por recurso
    ├── context/                 # AuthContext: sesión, token y rol
    ├── components/              # Layout, menú por rol, ProtectedRoute, mensajes, diálogos
    ├── pages/                   # Login, Home, Users, UserForm, Clients, ClientDetail, ClientForm, Profile, NotFound
    ├── styles/
    └── tests/

backend/
├── package.json                 # "type": "module"
├── .env.example
├── src/
│   ├── server.js                # Arranque del servidor
│   ├── app.js                   # Configuración de Express y middlewares
│   ├── config/                  # env.js, db.js (pool de mysql2)
│   ├── routes/                  # auth.routes.js, users.routes.js, clients.routes.js, index.js
│   ├── controllers/             # auth, users, clients
│   ├── services/                # auth, users, clients (reglas de negocio)
│   ├── models/                  # Consultas SQL parametrizadas por tabla
│   ├── middlewares/             # authenticate, authorize, validate, errorHandler, notFound
│   ├── validators/              # Reglas de express-validator por recurso
│   └── utils/                   # AppError, roles, respuestas
└── tests/
    ├── helpers/                 # setup-env.js, db.js, auth.js
    ├── health.test.js
    ├── auth.test.js
    ├── users.test.js
    ├── clients-write.test.js
    ├── clients-read.test.js
    ├── profile.test.js
    └── database.test.js

database/
├── package.json                 # "type": "module"
├── README.md
├── migrations/
│   ├── 001_create_usuarios_clientes.sql
│   └── 002_create_membresias_pagos.sql
├── seeds/
│   └── 001_admin_inicial.js
└── scripts/
    ├── migrate.js               # Aplica migraciones pendientes en orden
    ├── seed.js                  # Ejecuta las semillas
    └── reset.js                 # Recrea la base (solo desarrollo y pruebas)

.env.example                     # Plantilla general sin secretos
.gitignore                       # Incluye .env y node_modules/
README.md
```

**Decisión de estructura**: aplicación web con las tres carpetas obligatorias de
`docs/sprint-1.md` (`frontend/`, `backend/`, `database/`) y sin `client/`, `server/` ni
`dataBase/`. Cada carpeta tiene su propio `package.json`; no se usa un monorepo con workspaces para
mantener la configuración sencilla.

## Seguimiento de complejidad

| Desviación | Por qué se necesita | Por qué se descartó la alternativa más simple |
|------------|---------------------|-----------------------------------------------|
| MySQL en lugar de MongoDB (principios III y IV de la constitución v1.0.0) | El equipo eligió MySQL el 2026-10-08. `docs/project-context.md`, `docs/sprint-1.md` y `docs/sprint-2.md` exigen MySQL local, InnoDB, `utf8mb4`, llaves foráneas y scripts SQL versionados. | Seguir la constitución obligaría a reescribir tres documentos y a perder la integridad referencial nativa que piden las reglas de negocio. Se resuelve enmendando la constitución a v2.0.0 antes de `/speckit-implement`. |
