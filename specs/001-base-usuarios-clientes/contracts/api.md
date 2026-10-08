# Contrato de la API REST: Sprint 1

Base: `http://localhost:3000/api` (configurable). Todas las solicitudes y respuestas usan JSON en
UTF-8. Rutas en inglés y textos para el usuario en español (`AGENTS (1).md`). Los campos de datos
usan los nombres de las columnas de [data-model.md](../data-model.md).

## Convenciones

**Autenticación**: todas las rutas, salvo `GET /health` y `POST /auth/login`, exigen
`Authorization: Bearer <token>`. El backend relee el usuario en cada solicitud (research R-04).

**Respuesta correcta**:

```json
{ "data": { } }
```

Los listados agregan paginación:

```json
{ "data": [ ], "meta": { "page": 1, "limit": 20, "total": 134 } }
```

**Respuesta de error** (nunca incluye trazas ni SQL):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos marcados.",
    "details": [{ "field": "telefono", "message": "El teléfono debe tener entre 10 y 15 dígitos." }]
  }
}
```

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `VALIDATION_ERROR` | Datos con formato inválido o faltantes (`details` obligatorio) |
| 401 | `INVALID_CREDENTIALS` | Correo o contraseña incorrectos, o usuario inactivo al iniciar sesión |
| 401 | `UNAUTHENTICATED` | Falta el token, es inválido, expiró o el usuario ya no está activo |
| 403 | `FORBIDDEN` | El rol no tiene permiso para la operación |
| 404 | `NOT_FOUND` | El recurso no existe |
| 409 | `CONFLICT` | Correo duplicado, cliente ya vinculado, último administrador |
| 500 | `INTERNAL_ERROR` | Error no previsto; mensaje genérico |

Para el inicio de sesión de un usuario inactivo se usa `INVALID_CREDENTIALS` con el mensaje
"Tu cuenta está desactivada. Contacta al administrador." solo cuando la contraseña es correcta; si
la contraseña es incorrecta, se responde el mensaje genérico, para no revelar qué cuentas existen.

## Matriz de permisos

| Endpoint | Administrador | Recepcionista | Entrenador | Cliente |
|----------|:-------------:|:-------------:|:----------:|:-------:|
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ |
| `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/status` | ✅ | ❌ | ❌ | ❌ |
| `GET /clients`, `GET /clients/:id` | ✅ completo | ✅ completo | ✅ básico | ❌ |
| `POST /clients`, `PATCH /clients/:id`, `PATCH /clients/:id/status` | ✅ | ✅ | ❌ | ❌ |
| `GET /clients/me` | ❌ | ❌ | ❌ | ✅ |

"Básico" = solo `id_cliente`, `nombre`, `apellido`, `estado` (FR-023).

## Salud

### `GET /health`

200 → `{ "data": { "status": "ok" } }`. No consulta datos sensibles.

## Autenticación

### `POST /auth/login`

Cuerpo: `{ "correo": "admin@gym.local", "password": "********" }`

200:

```json
{
  "data": {
    "token": "<jwt>",
    "expiresIn": "8h",
    "user": { "id_usuario": 1, "nombre": "Administrador", "correo": "admin@gym.local", "rol": "administrador", "id_cliente": null }
  }
}
```

Errores: 400 (correo o contraseña vacíos), 401 `INVALID_CREDENTIALS`.

### `GET /auth/me`

200 → `{ "data": { "id_usuario", "nombre", "correo", "rol", "estado", "id_cliente" } }`.
Lo usa el frontend al recargar la página para recuperar la sesión. Error: 401.

## Usuarios (solo administrador)

### `GET /users?search=&rol=&estado=&page=1&limit=20`

200 → listado paginado de usuarios **sin** `password`. `search` busca en nombre y correo; `limit`
máximo 100.

### `POST /users`

Cuerpo:

```json
{ "nombre": "Ana López", "correo": "ana@gym.local", "password": "Recep2026", "rol": "recepcionista" }
```

Para rol `cliente`: `{ "nombre": "...", "password": "...", "rol": "cliente", "id_cliente": 15 }`
(el correo se toma del cliente; ver data-model).

201 → `{ "data": <usuario sin password> }`.
Errores: 400 (validación, rol inválido, `id_cliente` faltante con rol cliente o presente con otro
rol), 404 (cliente inexistente), 409 (correo duplicado, cliente ya vinculado o sin correo).

### `GET /users/:id`

200 → usuario sin `password`. Error 404.

### `PATCH /users/:id`

Cuerpo parcial con cualquiera de: `nombre`, `correo`, `password` (restablecimiento por el
administrador), `rol`, `id_cliente`. 200 → usuario actualizado. Errores: 400, 404, 409 (correo
duplicado, último administrador activo).

### `PATCH /users/:id/status`

Cuerpo: `{ "estado": "inactivo" }`. 200 → usuario actualizado. Errores: 400, 404, 409 (último
administrador activo o intento de desactivarse a sí mismo).

## Clientes

### `GET /clients?search=&estado=&page=1&limit=20`

`search` busca coincidencias parciales en nombre, apellido y correo (FR-022). Orden: apellido y
nombre. 200 → listado paginado; el entrenador recibe solo los campos básicos. Una búsqueda sin
resultados devuelve 200 con `data: []`.

### `POST /clients` (administrador, recepcionista)

Cuerpo:

```json
{ "nombre": "Luis", "apellido": "Pérez", "correo": "luis@correo.com", "telefono": "5512345678", "direccion": "Calle 1 #23" }
```

`correo` y `direccion` son opcionales. `fecha_registro` y `estado` los asigna el sistema
(FR-018). Registrar un cliente nunca crea una cuenta de usuario; la cuenta la crea el
administrador con `POST /users` (FR-013). 201 → cliente creado. Errores: 400, 409 (correo
duplicado).

### `GET /clients/:id`

200 → cliente (proyección según el rol). Errores: 403 (rol cliente), 404.

### `PATCH /clients/:id` (administrador, recepcionista)

Cuerpo parcial con `nombre`, `apellido`, `correo`, `telefono`, `direccion`. No se aceptan
`fecha_registro` ni `estado`. 200 → cliente actualizado. Errores: 400, 404, 409.

### `PATCH /clients/:id/status` (administrador, recepcionista)

Cuerpo: `{ "estado": "inactivo" }` o `{ "estado": "activo" }`. 200 → cliente actualizado.

### `GET /clients/me` (solo rol cliente)

200:

```json
{
  "data": {
    "cliente": { "id_cliente": 15, "nombre": "Luis", "apellido": "Pérez", "correo": "luis@correo.com", "telefono": "5512345678", "direccion": "Calle 1 #23", "fecha_registro": "2026-10-08T17:00:00Z", "estado": "activo" },
    "membresia": null,
    "pagos": null
  }
}
```

`membresia` y `pagos` son `null` hasta el Sprint 2; el frontend muestra "Disponible
próximamente" (escenario 3 de la historia 5). El identificador se toma siempre del usuario
autenticado, nunca de la solicitud (FR-024).

## Rutas del frontend

| Ruta | Pantalla | Roles |
|------|----------|-------|
| `/login` | Inicio de sesión | Público |
| `/` | Inicio con el menú del rol | Todos |
| `/users`, `/users/new`, `/users/:id` | Listado, alta y edición de usuarios | Administrador |
| `/clients`, `/clients/:id` | Listado, búsqueda y detalle de clientes | Administrador, recepcionista, entrenador |
| `/clients/new`, `/clients/:id/edit` | Alta y edición de clientes | Administrador, recepcionista |
| `/profile` | Mi información | Cliente |
| `*` | Página no encontrada | Todos |

Las restricciones del frontend solo mejoran la experiencia; la autorización real es la del backend.
