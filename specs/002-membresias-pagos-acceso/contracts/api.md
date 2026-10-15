# Contrato de la API REST: Sprint 2

Base: `http://localhost:3000/api`. Se mantienen todas las convenciones del Sprint 1
(`specs/001-base-usuarios-clientes/contracts/api.md`): JSON en UTF-8, `Authorization: Bearer
<token>` en todas las rutas, respuestas `{ "data": ... }`, listados `{ "data": [...], "meta": {
"page", "limit", "total" } }`, errores `{ "error": { "code", "message", "details?" } }` y los mismos
códigos (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`INTERNAL_ERROR`). Los campos usan los nombres de [data-model.md](../data-model.md).

**Montos**: se envían y se reciben como texto decimal con dos decimales (`"450.00"`), research R-10.
**Fechas**: `AAAA-MM-DD` para fechas y ISO 8601 para fecha y hora.
**Datos biométricos**: ninguna respuesta de ningún endpoint contiene descriptores (FR-030).

Nuevo código de error:

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 422 | `BUSINESS_RULE` | La solicitud es válida en formato, pero viola una regla de negocio (traslape, saldo excedido, tipo inactivo, transición no permitida, rostro duplicado). `message` explica la regla en español |

## Matriz de permisos

| Endpoint | Admin | Recep. | Entren. | Cliente |
|----------|:-----:|:------:|:-------:|:-------:|
| `GET /membership-types` | ✅ todos | ✅ solo activos | ❌ | ❌ |
| `POST /membership-types`, `PATCH /membership-types/:id`, `PATCH /membership-types/:id/status` | ✅ | ❌ | ❌ | ❌ |
| `GET /clients/:id/memberships` | ✅ | ✅ | ✅ sin montos | ❌ |
| `POST /clients/:id/memberships`, `POST /clients/:id/memberships/renew` | ✅ | ✅ | ❌ | ❌ |
| `PATCH /memberships/:id/status` | ✅ | ❌ | ❌ | ❌ |
| `POST /payments` | ✅ | ✅ | ❌ | ❌ |
| `GET /payments` (historial general) | ✅ | ❌ | ❌ | ❌ |
| `GET /clients/:id/payments` | ✅ | ✅ | ❌ | ❌ |
| `PATCH /payments/:id/cancel` | ✅ | ❌ | ❌ | ❌ |
| `GET /debts` | ✅ | ❌ | ❌ | ❌ |
| `GET /clients/:id/face`, `PUT /clients/:id/face`, `PATCH /clients/:id/face/status` | ✅ | ✅ | ❌ | ❌ |
| `POST /access/attempts` (estación) | ✅ | ✅ | ❌ | ❌ |
| `GET /access` | ✅ | ✅ | ✅ sin similitud | ❌ |
| `GET /clients/me` (ampliado), `GET /clients/me/access` | ❌ | ❌ | ❌ | ✅ |

`similitud` solo la recibe el administrador. El entrenador nunca recibe `monto`, `saldo`,
`pagado`, `estado_pago` ni `adeudo` (FR-013, FR-023).

## Objetos comunes

**Membresía** (`MembershipView`):

```json
{
  "id_membresia": 41,
  "id_cliente": 15,
  "tipo": { "id_tipo_membresia": 2, "nombre": "Mensual" },
  "fecha_inicio": "2026-10-12",
  "fecha_fin": "2026-11-10",
  "estado": "activa",
  "estado_efectivo": "activa",
  "vigente": true,
  "por_iniciar": false,
  "motivo_estado": null,
  "monto": "450.00",
  "pagado": "200.00",
  "saldo": "250.00",
  "estado_pago": "parcial"
}
```

Para el entrenador se omiten `monto`, `pagado`, `saldo` y `estado_pago`.

**Pago** (`PaymentView`):

```json
{
  "id_pago": 88, "id_cliente": 15, "id_membresia": 41,
  "cliente": { "nombre": "Luis", "apellido": "Pérez" },
  "monto": "200.00", "metodo_pago": "efectivo", "fecha_pago": "2026-10-12T16:05:00.000Z",
  "estado": "pagado", "registrado_por": { "id_usuario": 3, "nombre": "Ana" },
  "motivo_anulacion": null, "anulado_en": null
}
```

## Tipos de membresía

### `GET /membership-types?estado=&page=1&limit=20`

Administrador: todos, filtro opcional `estado`. Recepcionista: solo `activo` (se ignora el filtro).
200 → lista de `{ id_tipo_membresia, nombre, descripcion, duracion_dias, precio, estado }`.

### `POST /membership-types` (administrador)

Cuerpo: `{ "nombre": "Mensual", "descripcion": "Acceso libre 30 días", "duracion_dias": 30, "precio": "450.00" }`
201 → tipo creado con `estado: "activo"`. 409 `CONFLICT` si el nombre ya existe.

### `PATCH /membership-types/:id` (administrador)

Cuerpo parcial con `nombre`, `descripcion`, `duracion_dias`, `precio`. 200 → tipo actualizado. No
altera membresías existentes (FR-004).

### `PATCH /membership-types/:id/status` (administrador)

Cuerpo: `{ "estado": "inactivo" }` o `{ "estado": "activo" }`. 200 → tipo actualizado.

## Membresías

### `GET /clients/:id/memberships`

200 → `{ "data": { "actual": MembershipView | null, "historial": [MembershipView, ...] } }`, con el
historial ordenado por `fecha_inicio` descendente.

### `POST /clients/:id/memberships` (asignar; administrador, recepcionista)

Cuerpo: `{ "id_tipo_membresia": 2, "fecha_inicio": "2026-10-12" }` (`fecha_inicio` opcional, por
omisión hoy). 201 → `MembershipView`.
Errores: 404 cliente o tipo inexistente; 422 cliente inactivo, tipo inactivo, fecha pasada o
traslape ("El cliente ya tiene una membresía en ese periodo. Usa la renovación.").

### `POST /clients/:id/memberships/renew` (administrador, recepcionista)

Cuerpo: `{ "id_tipo_membresia": 2, "fecha_inicio": "2026-10-12" }` (`fecha_inicio` solo se usa si
no hay una membresía vigente o futura; ver data-model, "Renovación"). 201 → `MembershipView` de la
nueva membresía.

### `PATCH /memberships/:id/status` (administrador)

Cuerpo: `{ "estado": "suspendida" | "activa" | "cancelada", "motivo": "Lesión, a petición del cliente" }`
200 → `MembershipView`. 422 si la transición no está permitida (cancelada → cualquiera,
vencida → suspendida/activa).

## Pagos y adeudos

### `POST /payments` (administrador, recepcionista)

Cuerpo: `{ "id_membresia": 41, "monto": "200.00", "metodo_pago": "efectivo" }`
201 → `{ "data": { "pago": PaymentView, "membresia": MembershipView } }`.
Errores: 404 membresía; 422 membresía cancelada, saldo en 0 o
"El monto supera el saldo pendiente de 250.00.".

### `GET /payments?id_cliente=&desde=&hasta=&metodo_pago=&estado=&page=1&limit=20` (administrador)

200 → lista de `PaymentView` ordenada por `fecha_pago` descendente, más
`meta.total_pagado` (suma de pagos `pagado` del filtro).

### `GET /clients/:id/payments` (administrador, recepcionista)

200 → `{ "data": { "pagos": [PaymentView], "membresias": [MembershipView con saldo], "adeudo": "250.00" } }`.

### `PATCH /payments/:id/cancel` (administrador)

Cuerpo: `{ "motivo": "Capturado dos veces" }`. 200 → `PaymentView` con `estado: "cancelado"`.
422 si ya estaba cancelado. No existe `DELETE /payments/:id` (responde 404).

### `GET /debts?search=&page=1&limit=20` (administrador)

200 →

```json
{
  "data": [
    { "id_cliente": 15, "nombre": "Luis", "apellido": "Pérez", "adeudo": "250.00",
      "membresias": [{ "id_membresia": 41, "tipo": "Mensual", "saldo": "250.00" }] }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "total_adeudo": "250.00" }
}
```

Solo clientes con adeudo > 0, ordenados por adeudo descendente.

## Información facial

### `GET /clients/:id/face`

200 → `{ "data": { "registrado": true, "estado": "activo", "creado_en": "2026-10-12T16:10:00.000Z", "registrado_por": { "id_usuario": 3, "nombre": "Ana" } } }`
o `{ "data": { "registrado": false } }`. Nunca contiene el descriptor.

### `PUT /clients/:id/face` (registrar o reemplazar)

Cuerpo:

```json
{ "consentimiento": true, "version_modelo": "human-3.3.6-faceres", "muestras": [[0.012, -0.044, ...], [...], [...]] }
```

201 si no había registro activo, 200 si reemplazó uno → mismo objeto que `GET /clients/:id/face`.
Errores: 400 si las muestras no tienen la longitud esperada o `consentimiento` no es `true`;
404 cliente; 422 cliente inactivo o "Este rostro ya está registrado para otro cliente." (sin
revelar cuál).

### `PATCH /clients/:id/face/status`

Cuerpo: `{ "estado": "inactivo" }`. 200 → estado actualizado. 404 si no hay registro activo.

## Control de acceso

### `POST /access/attempts` (estación; administrador, recepcionista)

Cuerpo: `{ "descriptor": [0.012, -0.044, ...] }` o `{ "descriptor": null }` (no se obtuvo una
captura válida, research R-07).

200 (siempre 200 cuando se procesa, autorizado o no):

```json
{ "data": { "id_acceso": 9001, "resultado": "autorizado", "cliente": { "nombre": "Luis" }, "mensaje": "Acceso autorizado. ¡Bienvenido, Luis!" } }
```

```json
{ "data": { "id_acceso": 9002, "resultado": "rechazado", "cliente": null, "mensaje": "Acceso no autorizado. Acude a recepción." } }
```

La respuesta de la estación **no** incluye el motivo, el apellido, la membresía ni el adeudo
(FR-036); el motivo solo se guarda en `accesos`. 400 si el descriptor tiene un formato inválido.
Si el servidor falla, la estación muestra "No fue posible validar el acceso. Intenta de nuevo o
acude a recepción." y no autoriza (FR-041).

### `GET /access?desde=&hasta=&id_cliente=&resultado=&motivo=&page=1&limit=20`

Administrador y recepcionista; entrenador sin `similitud`. Por omisión, el día de hoy. 200 →

```json
{
  "data": [
    { "id_acceso": 9002, "fecha_hora": "2026-10-12T16:20:01.120Z", "resultado": "rechazado",
      "motivo": "membresia_vencida", "cliente": { "id_cliente": 15, "nombre": "Luis", "apellido": "Pérez" },
      "registrado_por": { "id_usuario": 3, "nombre": "Ana" }, "similitud": "0.8123" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 37 }
}
```

`cliente` es `null` para `rostro_no_identificado`. No existen rutas para modificar o eliminar
accesos (FR-039).

Textos de los motivos en la interfaz: `rostro_no_identificado` → "Rostro no identificado",
`cliente_inactivo` → "Cliente inactivo", `sin_membresia_vigente` → "Sin membresía vigente",
`membresia_vencida` → "Membresía vencida", `membresia_suspendida` → "Membresía suspendida",
`membresia_cancelada` → "Membresía cancelada".

## Rol cliente

### `GET /clients/me` (ampliado)

Mantiene `cliente` y llena los campos que el Sprint 1 dejaba en `null`:

```json
{ "data": { "cliente": { ... }, "membresia": MembershipView | null, "pagos": [PaymentView], "adeudo": "250.00" } }
```

### `GET /clients/me/access?page=1&limit=20`

Solo los accesos del cliente autenticado (sin `similitud` ni `registrado_por`). El identificador
se toma siempre del token (FR-014, FR-023, FR-040).

## Cambios en endpoints del Sprint 1

- `GET /clients` y `GET /clients/:id` agregan `membresia_actual`:
  `{ "estado_efectivo", "vigente", "fecha_fin" }` para todos los roles del personal, y además
  `saldo` solo para administrador y recepcionista. Además, `GET /clients/:id` agrega
  `rostro_registrado` (booleano) para administrador y recepcionista.

## Rutas del frontend (nuevas)

| Ruta | Pantalla | Roles |
|------|----------|-------|
| `/membership-types`, `/membership-types/new`, `/membership-types/:id` | Catálogo y formulario de tipos | Administrador (recepcionista: solo lectura del listado) |
| `/clients/:id` (ampliada) | Secciones de membresías, pagos e información facial | Según la matriz |
| `/clients/:id/memberships/new`, `/clients/:id/memberships/renew` | Asignar y renovar | Administrador, recepcionista |
| `/clients/:id/payments/new` | Registrar pago | Administrador, recepcionista |
| `/clients/:id/face` | Registro facial con cámara | Administrador, recepcionista |
| `/payments` | Historial general de pagos | Administrador |
| `/debts` | Clientes con adeudo | Administrador |
| `/access` | Consulta de accesos | Administrador, recepcionista, entrenador |
| `/access/station` | Estación de acceso (pantalla completa) | Administrador, recepcionista |
| `/profile` (ampliada) | Mi membresía, mis pagos, mi adeudo y mis accesos | Cliente |

Las restricciones del frontend solo mejoran la experiencia; la autorización real es la del backend.
