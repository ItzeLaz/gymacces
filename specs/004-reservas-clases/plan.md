# Plan de implementación: Reservas de clases grupales

**Rama**: `004-reservas-clases` | **Fecha**: 2026-10-16 | **Especificación**: [spec.md](./spec.md)

**Entrada**: especificación de la feature en `specs/004-reservas-clases/spec.md`

## Resumen

Esta feature agrega clases grupales con cupo limitado (spinning, yoga, funcional):

- El administrador registra un horario semanal de clases. Cada clase tiene nombre, entrenador,
  día, hora, duración y cupo.
- Recepción reserva lugares para clientes activos con membresía vigente en la fecha de la sesión.
- Recepción cancela reservas antes de que empiece la clase.
- El administrador y recepción consultan la lista de reservados y los lugares disponibles.
- Recepción marca la asistencia el mismo día, desde la hora de inicio. Un cliente que llega sin
  reservar durante la clase se registra con la asistencia ya marcada.

**Enfoque técnico**:
- Dos tablas nuevas, `clases` y `reservas`, en la migración
  `database/migrations/006_create_clases_reservas.sql`.
- Las sesiones se calculan al vuelo a partir de la clase y la fecha, sin tabla propia (research
  R-01).
- El sobrecupo se evita con una transacción que bloquea la fila del cliente y la de la clase
  (`FOR UPDATE`), más un índice único para las reservas duplicadas (research R-02).
- Los empalmes se validan en el servicio del backend (research R-03).
- La hora actual se calcula en Node con `APP_TIMEZONE` (research R-05).
- API REST con los routers `/classes` y `/reservations` (research R-04) y cuatro páginas React
  nuevas.
- No se agregan dependencias (research R-09).

## Contexto técnico

**Lenguaje/versión**: JavaScript (ECMAScript 2022+) sobre Node.js 22 LTS o superior (verificado con
Node 24). ES Modules en `backend/` y `database/`.

**Dependencias principales**: Express 5, `express-validator`, `mysql2`, `jsonwebtoken` y `bcrypt`
en el backend; React 19, React Router 7 y Vite en el frontend. Sin dependencias nuevas
(research R-09).

**Almacenamiento**: MySQL 8.0.16+ o MariaDB 10.4+ (XAMPP), InnoDB y `utf8mb4_unicode_ci`.
- Tablas nuevas `clases` y `reservas` en `006_create_clases_reservas.sql`.
- Se reutilizan `usuarios`, `clientes`, `membresias` y `auditoria` sin cambios de estructura.

**Pruebas**:
- Backend: `node:test` + `supertest` contra la base de pruebas.
  - Unitarias de `utils/sessions.js`.
  - Integración, con una prueba por criterio EARS.
  - Concurrencia: 20 solicitudes simultáneas.
  - La hora se fija con `mock.timers`.
- Frontend: Vitest + Testing Library con la API simulada.
- Recorrido manual en [quickstart.md](./quickstart.md).

**Plataforma objetivo**: navegadores de escritorio actuales del personal (administrador y
recepción).

**Tipo de proyecto**: aplicación web (frontend + backend + scripts de base de datos).

**Objetivos de rendimiento**:
- Reserva completa en menos de 1 minuto para recepción (SC-002).
- Horario con lugares disponibles en menos de 10 s (SC-003).
- Asistencia de 20 reservados en menos de 2 minutos (SC-005).

Estos tres criterios se miden a mano en T104, durante el recorrido de [quickstart.md](./quickstart.md).

**Restricciones**:
- Nunca más reservas activas que el cupo, incluso con solicitudes simultáneas (FR-004, SC-001).
- Sin `NOW()` en SQL; la hora se calcula con `APP_TIMEZONE` (FR-014).
- Permisos validados en el servidor (FR-011).
- Mensajes en español con los textos del spec (FR-013).
- Identificadores, rutas y endpoints en inglés.

**Escala/alcance**:
- 2 tablas y 10 endpoints nuevos.
- 4 páginas nuevas, 1 componente nuevo (`ReservationForm`) y cambios en el menú y las rutas del
  frontend.
- Volumen esperado: decenas de clases por semana, hasta 100 lugares por sesión.

No queda ningún punto marcado como NEEDS CLARIFICATION.

## Verificación de la constitución

*COMPUERTA: debe cumplirse antes de la Fase 0 y revisarse de nuevo después de la Fase 1.*

Constitución v2.1.0.

| # | Principio | Cómo lo cumple el plan | Estado |
|---|-----------|------------------------|--------|
| I | Stack tecnológico fijo | Node.js + Express con ES Modules, MySQL/MariaDB con `mysql2` y consultas parametrizadas, React + Vite, API REST con JWT. No se agregan frameworks ni dependencias (research R-09). | ✅ |
| II | Pruebas obligatorias | Cada regla de negocio (cupo, membresía, duplicado, empalmes, ventana, cancelación, asistencia, cambios de cupo y horario, permisos) tiene prueba automática en `backend/tests/`. `npm test` debe pasar antes de cada commit de implementación (research R-10). | ✅ |
| III | Seguridad | `authorize` en cada ruta según el rol. `express-validator` en todas las entradas. Consultas parametrizadas. Sin secretos nuevos (solo se reutiliza `APP_TIMEZONE`). Errores sin información técnica. | ✅ |
| IV | Manejo de datos y migraciones | Tablas InnoDB `utf8mb4_unicode_ci` en la migración nueva `006_create_clases_reservas.sql`. No se modifica ninguna migración aplicada. Llaves foráneas y CHECK en la base (data-model). | ✅ |
| V | Estilo de código | Mensajes en español. Identificadores, rutas y archivos en inglés. Capas ruta → controlador → servicio → modelo y validadores como en los sprints anteriores. Pruebas con nombres en español. | ✅ |
| VI | Requisitos en EARS | Los criterios de aceptación del spec están en EARS, y cada uno se traduce en una prueba (quickstart, sección 3). | ✅ |
| VII | Trazabilidad | Un commit por paso de Spec Kit (`spec`, `clarify`, `plan`) y uno por grupo de tareas que cite sus IDs (`T0xx-T0yy`). Sin squash ni force-push. | ✅ |
| VIII | Alcance, MVP y fuente de verdad | **Desviación justificada**: las clases grupales no están en el MVP. Ver "Ampliación de alcance" más abajo. | ⚠️ Justificada, pendiente de aprobación del equipo |
| IX | Arquitectura con responsabilidades separadas | Sin carpetas nuevas en la raíz. La lógica de reserva vive en `reservations.service.js` y no en React. Las sesiones se calculan en `utils/sessions.js`. | ✅ |
| X | Roles y permisos | Administrador: todo. Recepcionista: horario, reservas, cancelación y asistencia, sin escribir clases ("no modifica configuraciones administrativas"). Entrenador y cliente: sin acceso (403). | ✅ |
| XI | Integridad de las reglas de negocio | Reutiliza la vigencia de membresías del Sprint 2 (research R-07) y el estado activo del cliente. Las reservas nunca se borran; las canceladas se conservan. No altera las reglas de acceso ni de pagos. | ✅ |
| XII | Reconocimiento facial y control de acceso | Sin cambios. La reserva no sustituye ni modifica el control de acceso facial (Supuestos del spec). | ✅ |
| XIII | API y manejo de errores | JSON, códigos HTTP del contrato existente (400, 403, 404, 409, 422) y manejador central de errores (research R-08). | ✅ |
| XIV | UX/UI profesional y sencilla | Mismo tema y componentes (`Message`, `ConfirmDialog`, `StatusBadge`). Cancelar pide confirmación. Mensajes de éxito y error en cada operación. La etiqueta "Llena" se muestra en texto, no solo con color. | ✅ |

### Ampliación de alcance (principio VIII)

- **Qué se desvía**: el MVP del principio VIII y `docs/` no incluyen clases grupales ni reservas.
- **Justificación** (sección "Justificación de alcance" del spec):
  - El MVP quedó completo con los Sprints 1 a 3. Esta es una ampliación posterior que no modifica
    sus reglas.
  - Resuelve un problema real del gimnasio: hoy no se puede evitar el sobrecupo en clases con
    lugares limitados ni saber quién asistió.
  - Refuerza las reglas existentes: solo reservan clientes activos con membresía vigente
    (principio XI).
  - Da datos de ocupación para ajustar horarios y cupos.
- **Límites para que la ampliación no crezca**: quedan fuera las reservas hechas por el propio
  cliente, las listas de espera, las notificaciones, la cancelación de una sesión suelta, las
  sanciones, las consultas del entrenador, el cobro por clase y los reportes de ocupación
  (Supuestos del spec).
- **Aprobación**: la decisión de incluir esta ampliación la tomó la autora de la rama
  `004-reservas-clases` para su reporte individual. Todavía no la aprueba el equipo: queda
  pendiente presentarla para su aprobación formal, como exige la gobernanza de la constitución.
  Este estado se registra en T004 (también en la sección 8 de `docs/sprint-4.md`, 2026-10-16) y no
  bloquea la implementación.
- **Pendiente operativo**: actualizar `docs/` (contexto del proyecto y sprints) para incluir las
  clases grupales antes de cerrar el sprint. Se incluirá como tarea en `tasks.md`.

**Resultado de la compuerta (antes de la Fase 0)**: aprobada con condición: aprobación del equipo
pendiente, registrada en T004. La única desviación (principio VIII) está justificada y documentada.
No hay violaciones sin justificar.

**Revisión después de la Fase 1**:
- El modelo de datos agrega solo dos tablas con restricciones en la base.
- El contrato sigue las convenciones existentes.
- La estructura no crea carpetas nuevas en la raíz.

El resultado se mantiene: aprobada con condición (aprobación del equipo pendiente, registrada en
T004). La regla "la
clase debe terminar el mismo día" (research R-06) ya tiene su criterio EARS en el spec (US1,
criterio 14), como pide el principio VI.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/004-reservas-clases/
├── plan.md              # Este archivo (salida de /speckit-plan)
├── research.md          # Fase 0: decisiones R-01 a R-10
├── data-model.md        # Fase 1: clases, sesión calculada, reservas, diagrama ER
├── quickstart.md        # Fase 1: pruebas automáticas y recorrido manual
├── contracts/
│   └── api.md           # Fase 1: endpoints /classes y /reservations, rutas del frontend
├── checklists/
│   └── requirements.md  # Checklist de calidad de la especificación
└── tasks.md             # Fase 2 (salida de /speckit-tasks; NO la crea /speckit-plan)
```

### Código fuente (raíz del repositorio)

Solo archivos nuevos (➕) o modificados (✏️).

```text
database/
├── migrations/006_create_clases_reservas.sql       ➕ tablas clases y reservas
└── README.md                                       ✏️ tablas nuevas

backend/
├── src/
│   ├── routes/classes.routes.js                    ➕ /classes, /instructors, /schedule, /:id/sessions/:fecha
│   ├── routes/reservations.routes.js               ➕ POST /, PATCH /:id/cancel, PATCH /:id/attendance
│   ├── routes/index.js                             ✏️ montar /classes y /reservations
│   ├── controllers/classes.controller.js           ➕
│   ├── controllers/reservations.controller.js      ➕
│   ├── services/classes.service.js                 ➕ alta, cambios, desactivación, horario y detalle de sesión
│   ├── services/reservations.service.js            ➕ reservar (bloqueos), cancelar y asistencia
│   ├── services/audit.service.js                   ✏️ acciones clase.* y reserva.*
│   ├── models/class.model.js                       ➕ consultas parametrizadas y lockById
│   ├── models/reservation.model.js                 ➕ conteos, empalmes y cambios de estado
│   ├── validators/classes.validator.js             ➕
│   ├── validators/reservations.validator.js        ➕
│   ├── utils/sessions.js                           ➕ empalme, estado de sesión, ventana, fechas por día ISO
│   └── utils/dates.js                              ✏️ nowInGym()
└── tests/
    ├── helpers/factories.js                        ✏️ createClass, createReservation
    ├── database.test.js                            ✏️ tablas clases y reservas
    ├── sessions.unit.test.js                       ➕
    ├── classes.test.js                             ➕ US1
    ├── reservations.test.js                        ➕ US2 y US3
    ├── reservations-concurrency.test.js            ➕ SC-001
    ├── sessions.test.js                            ➕ US4
    ├── attendance.test.js                          ➕ US5
    └── classes-permissions.test.js                 ➕ FR-011, SC-006

frontend/src/
├── api/classes.js                                  ➕
├── api/reservations.js                             ➕
├── pages/Classes.jsx                               ➕ catálogo (administrador)
├── pages/ClassForm.jsx                             ➕ alta y edición (administrador)
├── pages/Schedule.jsx                              ➕ horario con lugares y "Llena"
├── pages/SessionDetail.jsx                         ➕ reservados, reservar, cancelar y asistencia
├── components/ReservationForm.jsx                  ➕ búsqueda de cliente y reserva (US2)
├── App.jsx                                         ✏️ rutas /classes y /schedule
├── components/Navbar.jsx                           ✏️ "Clases" (administrador) y "Horario" (administrador y recepción)
├── styles/global.css                               ✏️ horario y lista de asistencia
├── tests/ClassForm.test.jsx, Schedule.test.jsx, SessionDetail.test.jsx, ReservationForm.test.jsx   ➕
└── tests/Navigation.test.jsx                       ✏️ opciones "Clases" y "Horario" por rol

docs/                                               ✏️ registrar la ampliación de alcance
```

**Decisión de estructura**: se mantiene la estructura de tres carpetas (`frontend/`, `backend/` y
`database/`) y las capas del backend de los sprints anteriores. No se crean carpetas nuevas.

## Seguimiento de complejidad

| Desviación | Por qué se necesita | Alternativa más simple descartada porque |
|------------|---------------------|------------------------------------------|
| Ampliación de alcance fuera del MVP (principio VIII) | El gimnasio no puede controlar el sobrecupo ni la asistencia a clases grupales (ver "Ampliación de alcance") | Dejarlo como mejora futura mantiene el problema; la feature reutiliza clientes, membresías y auditoría sin modificarlos |
| Bloqueo de la fila completa de la clase al reservar (research R-02) | Hace atómica la regla de cupo y la serializa con la reducción de cupo | Un contador por sesión necesitaría una tabla de sesiones (R-01); SERIALIZABLE provoca interbloqueos |
