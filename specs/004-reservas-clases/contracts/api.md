# Contrato de la API REST: Reservas de clases grupales

Base: `http://localhost:3000/api`. Se mantienen las convenciones de los Sprints 1 a 3
(`specs/001-base-usuarios-clientes/contracts/api.md` y `specs/002-membresias-pagos-acceso/contracts/api.md`):

- JSON en UTF-8 y `Authorization: Bearer <token>` en todas las rutas.
- Respuestas `{ "data": ... }` y errores `{ "error": { "code", "message", "details?" } }`.
- Códigos de error: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403),
  `NOT_FOUND` (404), `CONFLICT` (409), `BUSINESS_RULE` (422) e `INTERNAL_ERROR` (500).
- Los campos usan los nombres de [data-model.md](../data-model.md).

**Formatos**:
- Fechas: `AAAA-MM-DD`.
- Horas: `HH:MM` (24 horas) en la zona horaria del gimnasio (`APP_TIMEZONE`).
- Fecha y hora de registro: ISO 8601.
- `dia_semana`: 1 = lunes … 7 = domingo.

**Mensajes**: todo `message` está en español y termina en punto (research R-08). Las pruebas
comparan el texto exacto.

## Matriz de permisos

| Endpoint | Admin | Recep. | Entren. | Cliente |
|----------|:-----:|:------:|:-------:|:-------:|
| `GET /classes` | ✅ todas | ✅ solo activas | ❌ | ❌ |
| `GET /classes/instructors` | ✅ | ❌ | ❌ | ❌ |
| `POST /classes`, `PATCH /classes/:id`, `PATCH /classes/:id/status` | ✅ | ❌ | ❌ | ❌ |
| `GET /classes/schedule` | ✅ | ✅ | ❌ | ❌ |
| `GET /classes/:id/sessions/:fecha` | ✅ | ✅ | ❌ | ❌ |
| `POST /reservations` | ✅ | ✅ | ❌ | ❌ |
| `PATCH /reservations/:id/cancel` | ✅ | ✅ | ❌ | ❌ |
| `PATCH /reservations/:id/attendance` | ✅ | ✅ | ❌ | ❌ |

Todo ❌ responde `403 FORBIDDEN` con "No tienes permiso para realizar esta acción." (FR-011). Sin
token: `401 UNAUTHENTICATED`.

## Objetos comunes

**Clase** (`ClassView`):

```json
{
  "id_clase": 7,
  "nombre": "Spinning",
  "instructor": { "id_usuario": 12, "nombre": "Carla Ruiz" },
  "dia_semana": 1,
  "hora_inicio": "07:00",
  "hora_fin": "07:45",
  "duracion_minutos": 45,
  "cupo_maximo": 20,
  "estado": "activa"
}
```

**Sesión** (`SessionView`):

```json
{
  "id_clase": 7,
  "nombre": "Spinning",
  "instructor": { "id_usuario": 12, "nombre": "Carla Ruiz" },
  "fecha_sesion": "2026-10-19",
  "hora_inicio": "07:00",
  "hora_fin": "07:45",
  "cupo_maximo": 20,
  "reservas_activas": 3,
  "lugares_disponibles": 17,
  "llena": false,
  "estado_sesion": "pendiente"
}
```

`estado_sesion`: `pendiente` | `en_curso` | `terminada` (research R-05).

**Reserva** (`ReservationView`):

```json
{
  "id_reserva": 31,
  "id_clase": 7,
  "fecha_sesion": "2026-10-19",
  "cliente": { "id_cliente": 15, "nombre": "Luis", "apellido": "Pérez" },
  "estado": "activa",
  "asistencia": "sin_registrar",
  "asistencia_mostrada": "Sin registrar",
  "registrada_en_curso": false,
  "registrado_por": { "id_usuario": 3, "nombre": "Ana" },
  "creado_en": "2026-10-16T18:05:00.000Z"
}
```

`asistencia_mostrada`: "Presente", "Sin registrar" o "No asistió". "No asistió" se usa cuando la
sesión es de un día anterior y no se registró asistencia (US5, criterio 6).

## Clases

### `GET /classes?estado=` (administrador, recepcionista)

Administrador: todas las clases, con filtro opcional `estado` (`activa` | `inactiva`).
Recepcionista: solo activas; el filtro se ignora. Orden: `dia_semana`, `hora_inicio`, `nombre`.

200 → `{ "data": [ClassView, ...] }`.

### `GET /classes/instructors` (administrador)

Entrenadores activos para el formulario (US1, criterio 7).

200 → `{ "data": [{ "id_usuario": 12, "nombre": "Carla Ruiz" }, ...] }`, ordenados por nombre.

### `POST /classes` (administrador)

Cuerpo:

```json
{ "nombre": "Spinning", "id_instructor": 12, "dia_semana": 1, "hora_inicio": "07:00",
  "duracion_minutos": 45, "cupo_maximo": 20 }
```

201 → `{ "data": ClassView, "message": "Clase registrada." }` (US1, criterio 1).

Errores:

| HTTP | Cuándo | `message` / detalle | Criterio |
|------|--------|---------------------|----------|
| 400 | Falta un campo o tiene un formato inválido | `details` por campo, por ejemplo `{ "nombre": "El nombre es obligatorio." }` | US1-2 |
| 400 | `duracion_minutos` fuera de 15–240 | "La duración debe estar entre 15 y 240 minutos." | US1-3 |
| 400 | `cupo_maximo` fuera de 1–100 | "El cupo debe estar entre 1 y 100 lugares." | US1-4 |
| 400 | Termina después de la medianoche | "La clase debe terminar el mismo día." | research R-06 |
| 422 | El instructor no existe, está inactivo o no es entrenador | "El instructor debe ser un entrenador activo." | US1-6 |
| 422 | El instructor tiene otra clase activa que se empalma ese día | "El instructor ya tiene una clase en ese horario." | US1-5 |

### `PATCH /classes/:id` (administrador)

Cuerpo parcial con cualquiera de los campos de `POST /classes`. 200 → `ClassView` actualizado,
aplicado a todas las sesiones futuras (US1, criterio 8).

Errores adicionales:

| HTTP | Cuándo | `message` | Criterio |
|------|--------|-----------|----------|
| 404 | La clase no existe | "La clase no existe." | — |
| 422 | El nuevo cupo es menor que las reservas activas de una sesión futura | "El cupo no puede ser menor que las reservas existentes (N)." | US1-9 |
| 422 | Cambia `dia_semana`, `hora_inicio` o `duracion_minutos` y hay reservas activas futuras | "No se puede cambiar el horario de una clase con reservas activas." | US1-10 |
| 422 | El nuevo instructor o el nuevo horario se empalman | "El instructor ya tiene una clase en ese horario." | US1-5 |

### `PATCH /classes/:id/status` (administrador)

Cuerpo: `{ "estado": "inactiva" }`. 200 → `ClassView` con `estado: "inactiva"`.

| HTTP | Cuándo | `message` | Criterio |
|------|--------|-----------|----------|
| 400 | `estado` distinto de `inactiva` | `details.estado` | FR-001 |
| 422 | Tiene reservas activas en sesiones futuras | "No se puede desactivar una clase con reservas activas." | US1-11 |

Una clase inactiva desaparece del horario y de `GET /classes` para recepción (US1, criterio 12).

### `GET /classes/schedule?desde=AAAA-MM-DD` (administrador, recepcionista)

Sesiones de las clases activas entre `desde` (por omisión hoy) y hoy + 7 días, ordenadas por
fecha y hora (US4, criterio 4; research R-05). Si `desde` es anterior a hoy o posterior a hoy + 7:
400.

200 → `{ "data": [SessionView, ...] }`. Las sesiones llenas tienen `llena: true` y la interfaz
muestra la etiqueta "Llena" (US4, criterio 5).

### `GET /classes/:id/sessions/:fecha` (administrador, recepcionista)

Detalle de una sesión con su lista de reservados (US4, criterios 1 a 3).

200 →

```json
{
  "data": {
    "sesion": SessionView,
    "texto_lugares": "Quedan 17 de 20 lugares",
    "reservas": [ReservationView, ...]
  }
}
```

- `reservas` incluye solo las activas, ordenadas por `apellido` y `nombre` del cliente (US4,
  criterio 2). Las canceladas no aparecen ni cuentan (US4, criterio 3).
- 404 si la clase no existe. 400 si `:fecha` no es una fecha válida o no corresponde a
  `dia_semana`.
- Se permiten fechas pasadas para consultar la asistencia ("No asistió").

## Reservas

### `POST /reservations` (administrador, recepcionista)

Cuerpo: `{ "id_clase": 7, "fecha_sesion": "2026-10-19", "id_cliente": 15 }`.

201 → `{ "data": ReservationView }`.
- Sesión pendiente: `asistencia: "sin_registrar"` y `registrada_en_curso: false` (US2, criterio 1).
- Sesión en curso: `asistencia: "presente"` y `registrada_en_curso: true` (US2, criterio 8).

Errores, en el orden en que se evalúan:

| HTTP | Cuándo | `message` | Criterio |
|------|--------|-----------|----------|
| 400 | Formato inválido o la fecha no coincide con el día de la clase | `details` por campo | FR-002 |
| 404 | La clase no existe | "La clase no existe." | — |
| 422 | La clase está inactiva | "La clase está inactiva." | US1-12 |
| 422 | La sesión terminó o la fecha está fuera de `[hoy, hoy + 7]` | "Solo se puede reservar en clases que no han terminado y dentro de los próximos 7 días." | US2-7 |
| 422 | El cliente no existe o está inactivo | "Cliente no encontrado o inactivo." | US2-4 |
| 422 | Sin membresía vigente en `fecha_sesion` | "El cliente no tiene una membresía vigente para la fecha de la clase." | US2-3 |
| 409 | Ya tiene una reserva activa en la sesión | "El cliente ya tiene una reserva en esta clase." | US2-5 |
| 422 | Tiene una reserva activa que se empalma ese día | "El cliente ya tiene una reserva en una clase que se empalma con este horario." | US2-6 |
| 422 | Sin lugares disponibles, incluso con solicitudes simultáneas | "Clase llena." | US2-2, US2-9 |

### `PATCH /reservations/:id/cancel` (administrador, recepcionista)

Sin cuerpo. 200 → `ReservationView` con `estado: "cancelada"`. El lugar se libera (US3,
criterio 1) y el cliente puede volver a reservar (US3, criterio 4).

| HTTP | Cuándo | `message` | Criterio |
|------|--------|-----------|----------|
| 404 | La reserva no existe | "La reserva no existe." | — |
| 422 | Ya estaba cancelada | "La reserva ya está cancelada." | US3-3 |
| 422 | La sesión ya empezó (en curso o terminada) | "No se puede cancelar una reserva de una clase que ya empezó." | US3-2 |

### `PATCH /reservations/:id/attendance` (administrador, recepcionista)

Cuerpo: `{ "presente": true }` para marcar o `{ "presente": false }` para desmarcar.
200 → `ReservationView` actualizado (US5, criterios 1 y 5).

| HTTP | Cuándo | `message` | Criterio |
|------|--------|-----------|----------|
| 400 | `presente` no es booleano | `details.presente` | — |
| 404 | La reserva no existe | "La reserva no existe." | — |
| 422 | La reserva está cancelada | "El cliente no tiene una reserva activa en esta clase." | US5-4 |
| 422 | Es antes de `hora_inicio` del día de la sesión | "La asistencia solo se puede registrar a partir de la hora de inicio de la clase." | US5-2 |
| 422 | Es después del día de la sesión | "La asistencia solo se puede registrar el mismo día de la clase." | US5-3 |

## Rutas del frontend

| Ruta | Página | Roles | Uso |
|------|--------|-------|-----|
| `/classes` | `Classes.jsx` | Administrador | Catálogo de clases: registrar, modificar y desactivar |
| `/classes/new`, `/classes/:id` | `ClassForm.jsx` | Administrador | Formulario de clase con la lista de entrenadores activos |
| `/schedule` | `Schedule.jsx` | Administrador, recepcionista | Horario de los próximos días con lugares disponibles y la etiqueta "Llena" |
| `/schedule/:idClase/:fecha` | `SessionDetail.jsx` | Administrador, recepcionista | Lista de reservados, "Quedan X de Y lugares", reservar (búsqueda de cliente), cancelar con confirmación y marcar asistencia |

El menú agrega "Clases" para el administrador y "Horario" para el administrador y la
recepcionista. El entrenador y el cliente no ven estas opciones y, si escriben la ruta,
`ProtectedRoute` los redirige.
