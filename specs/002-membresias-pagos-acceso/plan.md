# Plan de implementación: Sprint 2 — Membresías, pagos, reconocimiento facial y control de acceso

**Rama**: `002-membresias-pagos-acceso` | **Fecha**: 2026-10-12 | **Especificación**: [spec.md](./spec.md)

**Entrada**: especificación de la feature en `specs/002-membresias-pagos-acceso/spec.md`

## Resumen

El Sprint 2 hace operativas las membresías y los pagos, que el Sprint 1 dejó solo como estructura,
e incorpora el reconocimiento facial y el control de acceso. Incluye:

- Catálogo de tipos de membresía (solo administrador).
- Asignación y renovación sin periodos traslapados.
- Estados calculados según la fecha.
- Pagos con abonos y anulación sin borrado.
- Consulta de pagos y adeudos.
- Registro facial con consentimiento.
- Estación de acceso que identifica al cliente por su rostro y después valida su membresía.
- Consulta de accesos y registros de auditoría.

**Enfoque técnico**: se conserva la arquitectura del Sprint 1.

- **Frontend**: el navegador procesa la cámara con `@vladmandic/human` (MIT, local, sin servicios
  externos) y envía al backend solo descriptores numéricos.
- **Backend**: guarda los descriptores cifrados con AES-256-GCM (`node:crypto`), compara por
  similitud coseno con umbral y margen configurables, decide el acceso y registra cada intento.
  Ningún descriptor sale del backend y no se guardan imágenes.
- **Estados y saldos**: el estado efectivo de las membresías y los saldos se calculan al consultar,
  sin tareas programadas.
- **Base de datos**: los cambios entran con dos migraciones nuevas (`003`, `004`), sin tocar las
  existentes.

Las decisiones están justificadas en [research.md](./research.md).

**Aclaraciones provisionales**: las tres preguntas de la especificación (abonos, adeudo y acceso,
modo de la estación) no tuvieron respuesta. Se adoptaron las opciones recomendadas y están
registradas en "Clarifications" de la especificación. Si el equipo cambia alguna, hay que revisar
research R-07 y R-10, `data-model.md` (pagos y decisión de acceso) y `contracts/api.md`.

## Contexto técnico

**Lenguaje/versión**: JavaScript (ECMAScript 2022+) sobre Node.js 22 LTS o superior; ES Modules en
`backend/`, `database/` y en los scripts de `frontend/`.

**Dependencias principales**:
- Sin cambios respecto al Sprint 1 en `backend/` y `database/`. El cifrado y la comparación usan
  `node:crypto` y aritmética propia.
- Nueva en `frontend/`: `@vladmandic/human` `3.3.6`, con versión exacta (research R-01).

**Almacenamiento**: MySQL 8.0+ o MariaDB 10.4+ (XAMPP), InnoDB, `utf8mb4_unicode_ci`.
Migraciones nuevas:
- `003_ajustar_membresias_pagos.sql`.
- `004_create_rostros_accesos_auditoria.sql`.

**Pruebas**:
- Backend: `node:test` + `supertest` contra `gym_access_test`, con descriptores sintéticos para las
  pruebas faciales.
- Frontend: `vitest` + Testing Library, con el módulo facial simulado.
- Calibración y prueba real con cámara: [quickstart.md](./quickstart.md).

**Plataforma objetivo**: navegadores de escritorio actuales (Chrome, Edge, Firefox) con cámara
web. La estación usa `http://localhost`, que el navegador trata como contexto seguro y permite
usar la cámara.

**Tipo de proyecto**: aplicación web (frontend + backend + scripts de base de datos).

**Objetivos de rendimiento**:
- De la cámara al resultado en < 3 s en el 95 % de los intentos (SC-002); la comparación en el
  backend tarda < 100 ms con 1 000 clientes.
- Consulta de accesos en < 10 s con 10 000 registros (SC-010), con índices por fecha.

**Restricciones**:
- El frontend nunca accede a MySQL.
- Ningún descriptor aparece en respuestas, registros de auditoría ni errores.
- No se guardan imágenes del rostro.
- Permisos validados en el backend en cada solicitud.
- Nada de CommonJS.
- Secretos (incluida `FACE_DATA_KEY`) solo en `.env`.
- Textos para el usuario en español; identificadores, rutas y endpoints en inglés (`AGENTS.md`).

**Escala/alcance**:
- Un gimnasio con hasta ~1 000 clientes con rostro registrado y una estación de acceso.
- Decenas de miles de registros de acceso por año.
- Unas 10 pantallas nuevas o ampliadas y unos 20 endpoints.

## Revisión de la constitución

*COMPUERTA: debe cumplirse antes de la Fase 0 y revisarse de nuevo después de la Fase 1.*

| # | Principio | Cómo lo cumple el plan | Estado |
|---|-----------|------------------------|--------|
| I | Alcance, MVP y fuente de verdad | Solo US-S2-01 a US-S2-09. Dashboard, reportes y consulta de auditoría en pantalla quedan fuera. Cada requisito se rastrea a su historia y aparece en el quickstart. | ✅ |
| II | Arquitectura con responsabilidades separadas | Las tres carpetas de siempre. En el backend, reconocimiento facial (`faces.*`, `utils/faceMatching.js`, `utils/faceCrypto.js`) y control de acceso (`access.*`) son módulos separados; el segundo usa el primero solo mediante el servicio. La decisión de acceso vive en `services/`, no en la interfaz. | ✅ |
| III | Stack tecnológico | React, Node.js + Express, ES Modules, MySQL/MariaDB, REST, JWT y bcrypt sin cambios. La librería facial es JavaScript y compatible con la web, y está justificada en research R-01. Única dependencia nueva: `@vladmandic/human`. | ⚠️ Pendiente de aprobación del equipo (T003) |
| IV | Base de datos y persistencia | Se crean `rostros`, `accesos` y `auditoria`, como manda la etapa Sprint 2. Todo con InnoDB, `utf8mb4`, llaves primarias y foráneas, consultas parametrizadas y migraciones nuevas `003` y `004` sin modificar `001` ni `002`. La información facial va cifrada. | ✅ |
| V | Seguridad y protección | Descriptores cifrados con AES-256-GCM y llave en `.env`. Permisos y validación en el backend. Errores genéricos. Sin endpoints públicos con datos biométricos (todas las rutas exigen sesión y rol). | ✅ |
| VI | Roles y permisos | La matriz de [contracts/api.md](./contracts/api.md) sigue la constitución. El recepcionista no gestiona tipos, no cambia estados de membresías, no anula pagos ni ve el historial financiero general (configuración administrativa). El entrenador no ve información financiera. El cliente solo ve lo suyo. | ✅ |
| VII | Integridad de las reglas de negocio | Membresía ligada a un cliente y a un tipo válidos, con fechas. Estados calculados. Pagos ligados a cliente y membresía. Historial de pagos y accesos sin borrado. Acceso identificado antes de validar. Motivo obligatorio en los rechazos. | ✅ |
| VIII | Reconocimiento facial y control de acceso | Uso exclusivo en la estación. Rostro registrado como requisito para identificar. Membresía vigente obligatoria. Todo intento queda registrado. No hay búsqueda por rostro ni seguimiento (FR-031). | ✅ |
| IX | API y manejo de errores | Mismas convenciones JSON y middlewares. Se agrega el código `422 BUSINESS_RULE` dentro del manejador centralizado, documentado en el contrato. | ✅ |
| X | Pruebas | Cubre membresías (registro y renovación), pagos, adeudos, roles, reconocimiento facial (con descriptores sintéticos y prueba manual), autorización y rechazo de accesos, y registro de accesos. Los reportes no forman parte del sprint. | ✅ |
| XI | UX/UI profesional y sencilla | Estados de membresía y acceso con `StatusBadge`. Confirmación al anular, suspender, cancelar y desactivar. Mensajes de éxito y error. La estación muestra el resultado en verde o rojo con texto. | ✅ |
| — | Flujo de desarrollo (ramas) | Se usa la rama `002-membresias-pagos-acceso`, igual que la carpeta de la feature y con la misma convención del Sprint 1; la crea T001 de `tasks.md`. | ⚠️ Pendiente de crear la rama |

**Resultado de la compuerta (antes de la Fase 0)**: aprobada con dos pendientes de aprobación del
equipo, que `tasks.md` convierte en compuertas (T002: aclaraciones provisionales; T003: librería
facial y almacenamiento de datos faciales) y un pendiente operativo (crear la rama).

**Revisión después de la Fase 1**: el modelo de datos, los contratos y la estructura mantienen el
resultado. Se revisaron dos riesgos:

- La columna `accesos.similitud` es un valor derivado para calibrar, no un dato biométrico, y solo
  la ve el administrador.
- El código `422` es una extensión compatible del contrato de errores del principio IX.

No se agregan dependencias en el backend.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/002-membresias-pagos-acceso/
├── plan.md              # Este archivo (salida de /speckit-plan)
├── research.md          # Fase 0 (salida de /speckit-plan)
├── data-model.md        # Fase 1 (salida de /speckit-plan)
├── quickstart.md        # Fase 1 (salida de /speckit-plan)
├── contracts/
│   └── api.md           # Fase 1: contrato de la API REST, matriz de permisos y rutas del frontend
├── checklists/
│   └── requirements.md  # Checklist de calidad de la especificación
└── tasks.md             # Fase 2 (salida de /speckit-tasks, NO la crea /speckit-plan)
```

### Código fuente (raíz del repositorio)

Solo se listan los archivos nuevos (➕) o modificados (✏️) en este sprint.

```text
database/
└── migrations/
    ├── 003_ajustar_membresias_pagos.sql             ➕
    └── 004_create_rostros_accesos_auditoria.sql     ➕

backend/
├── .env.example                                     ✏️ FACE_DATA_KEY, FACE_MATCH_*, ACCESS_DEDUP_SECONDS, APP_TIMEZONE
├── src/
│   ├── config/env.js                                ✏️ validar FACE_DATA_KEY (32 bytes) y valores nuevos
│   ├── routes/
│   │   ├── index.js                                 ✏️ montar los routers nuevos
│   │   ├── membershipTypes.routes.js                ➕
│   │   ├── memberships.routes.js                    ➕ /clients/:id/memberships y /memberships/:id/status
│   │   ├── payments.routes.js                       ➕ /payments, /clients/:id/payments, /debts
│   │   ├── faces.routes.js                          ➕ /clients/:id/face
│   │   ├── access.routes.js                         ➕ /access, /access/attempts
│   │   └── clients.routes.js                        ✏️ /clients/me/access
│   ├── controllers/                                 ➕ membershipTypes, memberships, payments, faces, access
│   ├── services/
│   │   ├── membershipTypes.service.js               ➕
│   │   ├── memberships.service.js                   ➕ asignación, renovación, transiciones, estado efectivo
│   │   ├── payments.service.js                      ➕ pagos, anulación, saldos y adeudos
│   │   ├── faces.service.js                         ➕ registro, reemplazo, desactivación, identificación
│   │   ├── access.service.js                        ➕ decisión de acceso, deduplicación, consulta
│   │   ├── audit.service.js                         ➕ escritura dentro de la transacción
│   │   └── clients.service.js                       ✏️ membresia_actual, rostro_registrado, perfil ampliado
│   ├── models/                                      ➕ membershipType, membership, payment, face, access, audit
│   ├── validators/                                  ➕ uno por recurso nuevo (incluye validación de descriptores)
│   ├── middlewares/errorHandler.js                  ✏️ solo si hace falta para 422
│   └── utils/
│       ├── AppError.js                              ✏️ businessRule() → 422 BUSINESS_RULE
│       ├── dates.js                                 ➕ "hoy" según APP_TIMEZONE, suma de días
│       ├── money.js                                 ➕ conversión y comparación de montos en centavos
│       ├── faceCrypto.js                            ➕ cifrar y descifrar con AES-256-GCM
│       └── faceMatching.js                          ➕ similitud coseno, umbral y margen
└── tests/
    ├── helpers/                                     ✏️ fábricas de tipos, membresías y descriptores sintéticos
    ├── membership-types.test.js                     ➕
    ├── memberships.test.js                          ➕
    ├── payments.test.js                             ➕
    ├── debts.test.js                                ➕
    ├── faces.test.js                                ➕
    ├── access.test.js                               ➕ tabla de decisión completa
    ├── permissions-sprint2.test.js                  ➕ matriz de los 4 roles
    ├── biometric-exposure.test.js                   ➕ SC-007
    ├── face-matching.unit.test.js                   ➕
    └── face-crypto.unit.test.js                     ➕

frontend/
├── .env.example                                     ✏️ VITE_FACE_MODELS_URL
├── package.json                                     ✏️ @vladmandic/human y postinstall
├── scripts/copy-face-models.js                      ➕
├── public/models/                                   (generada; en .gitignore)
└── src/
    ├── App.jsx                                      ✏️ rutas nuevas
    ├── api/                                         ➕ membershipTypes, memberships, payments, faces, access
    ├── face/                                        ➕ carga de Human, captura de cámara, validación de calidad
    ├── components/
    │   ├── Layout.jsx                               ✏️ menú por rol
    │   ├── StatusBadge.jsx                          ✏️ estados de membresía, pago y acceso
    │   ├── CameraView.jsx                           ➕
    │   └── Money.jsx                                ➕ formato de montos
    ├── pages/
    │   ├── MembershipTypes.jsx, MembershipTypeForm.jsx               ➕
    │   ├── MembershipForm.jsx                       ➕ asignar y renovar
    │   ├── PaymentForm.jsx, Payments.jsx, Debts.jsx                  ➕
    │   ├── FaceRegister.jsx                         ➕
    │   ├── AccessStation.jsx, Accesses.jsx          ➕
    │   ├── ClientDetail.jsx                         ✏️ secciones de membresías, pagos y rostro
    │   └── Profile.jsx                              ✏️ membresía, pagos, adeudo y accesos propios
    └── tests/                                       ➕ MembershipTypeForm, PaymentForm, AccessStation

.gitignore                                           ✏️ frontend/public/models/
README.md                                            ✏️ configuración facial, llave y calibración
```

**Decisión de estructura**: se mantiene la aplicación web de tres carpetas del Sprint 1, sin
`client/`, `server/` ni `dataBase/`, y con la separación del backend en rutas, controladores,
servicios, modelos, middlewares, validadores y utilidades. El único directorio nuevo de primer
nivel dentro de una carpeta es `frontend/src/face/`. Agrupa el uso de la librería facial para
poder reemplazarla (research R-01) sin tocar las pantallas, y `frontend/scripts/` contiene el
script de copia de modelos.

## Seguimiento de complejidad

No hay violaciones de la constitución que justificar.
