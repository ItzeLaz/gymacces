# Modelo de datos (Fase 1): Sprint 1

Base de datos MySQL 8.0+, motor InnoDB, `utf8mb4` / `utf8mb4_unicode_ci` (ver
[research.md](./research.md), R-01). Nombres de tablas y columnas en minúsculas y en español, como
define `docs/project-context.md` (sección 14). Ninguna tabla permite borrado físico ordinario: todas
las llaves foráneas usan `ON DELETE RESTRICT` y `ON UPDATE RESTRICT`.

Las migraciones se reparten así:

| Migración | Tablas | Uso en el Sprint 1 |
|-----------|--------|--------------------|
| `001_create_usuarios_clientes.sql` | `clientes`, `usuarios` | Funcional |
| `002_create_membresias_pagos.sql` | `tipos_membresia`, `membresias`, `pagos` | Solo estructura |

`schema_migrations` (tabla de control de `migrate.js`) guarda `nombre` y `aplicada_en`.

## Diagrama de relaciones

```text
clientes 1 ──── 0..1 usuarios          (solo usuarios con rol = 'cliente')
clientes 1 ──── 0..* membresias  *──── 1 tipos_membresia
clientes 1 ──── 0..* pagos       *──── 0..1 membresias
```

`clientes` se crea antes que `usuarios` porque `usuarios.id_cliente` hace referencia a ella.

## clientes (funcional)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_cliente` | INT UNSIGNED AUTO_INCREMENT | No | Llave primaria |
| `nombre` | VARCHAR(80) | No | 1-80 caracteres tras recortar espacios (FR-017) |
| `apellido` | VARCHAR(80) | No | 1-80 caracteres tras recortar espacios (FR-017) |
| `correo` | VARCHAR(120) | Sí | Formato de correo válido; minúsculas; `UNIQUE` (varios nulos permitidos) (FR-019) |
| `telefono` | VARCHAR(20) | No | 10-15 dígitos; se permiten espacios, guiones y `+` inicial (FR-017) |
| `direccion` | VARCHAR(200) | Sí | Hasta 200 caracteres |
| `fecha_registro` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP`; no editable (FR-018) |
| `estado` | ENUM('activo','inactivo') | No | `DEFAULT 'activo'` (FR-018, FR-020) |
| `actualizado_en` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

Índices: `UNIQUE (correo)`, `INDEX (apellido, nombre)` para la búsqueda (SC-003), `INDEX (estado)`.

**Transiciones de estado**: `activo ⇄ inactivo`, solo por administrador o recepcionista, con
confirmación en la interfaz (FR-028). No existe eliminación.

## usuarios (funcional)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_usuario` | INT UNSIGNED AUTO_INCREMENT | No | Llave primaria |
| `nombre` | VARCHAR(120) | No | 1-120 caracteres |
| `correo` | VARCHAR(120) | No | Formato válido; minúsculas; `UNIQUE` (FR-011) |
| `password` | CHAR(60) | No | Hash bcrypt; nunca se devuelve en la API (FR-008). La contraseña en claro: 8-72 caracteres, al menos una letra y un número (FR-012) |
| `rol` | ENUM('administrador','recepcionista','entrenador','cliente') | No | Un solo rol (FR-009, FR-011) |
| `estado` | ENUM('activo','inactivo') | No | `DEFAULT 'activo'` |
| `id_cliente` | INT UNSIGNED | Sí | FK → `clientes.id_cliente`; `UNIQUE` (FR-013) |
| `creado_en` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP` |
| `actualizado_en` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

Restricción:
`CHECK ((rol = 'cliente' AND id_cliente IS NOT NULL) OR (rol <> 'cliente' AND id_cliente IS NULL))`.

Reglas aplicadas en `services/` (no en la base):

- Un usuario con rol `cliente` solo puede vincularse a un cliente sin otra cuenta y con correo
  registrado; el correo del usuario se toma del correo del cliente (supuesto de la especificación).
- No puede quedar ningún administrador activo (FR-014; ver research R-09).
- Un usuario no puede desactivarse a sí mismo.

**Transiciones de estado**: `activo ⇄ inactivo`, solo por el administrador. Un usuario inactivo no
puede iniciar sesión ni usar una sesión abierta (FR-003, research R-04).

**Cambio de rol**: si el nuevo rol es `cliente`, se exige `id_cliente`; si el rol anterior era
`cliente` y el nuevo no, `id_cliente` pasa a nulo.

## tipos_membresia (solo estructura)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_tipo_membresia` | INT UNSIGNED AUTO_INCREMENT | No | Llave primaria |
| `nombre` | VARCHAR(80) | No | `UNIQUE` |
| `descripcion` | VARCHAR(255) | Sí | |
| `duracion_dias` | SMALLINT UNSIGNED | No | `CHECK (duracion_dias > 0)` |
| `precio` | DECIMAL(10,2) | No | `CHECK (precio >= 0)` |
| `estado` | ENUM('activo','inactivo') | No | `DEFAULT 'activo'` |

## membresias (solo estructura)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_membresia` | INT UNSIGNED AUTO_INCREMENT | No | Llave primaria |
| `id_cliente` | INT UNSIGNED | No | FK → `clientes` (RN-01, RN-02) |
| `id_tipo_membresia` | INT UNSIGNED | No | FK → `tipos_membresia` (RN-02) |
| `fecha_inicio` | DATE | No | RN-03 |
| `fecha_fin` | DATE | No | `CHECK (fecha_fin >= fecha_inicio)` (RN-03) |
| `estado` | ENUM('activa','vencida','suspendida','cancelada') | No | `DEFAULT 'activa'` (RN-04) |
| `creado_en` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP` |

Índice: `INDEX (id_cliente, estado)` para la validación de acceso del Sprint 2.

## pagos (solo estructura)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_pago` | INT UNSIGNED AUTO_INCREMENT | No | Llave primaria |
| `id_cliente` | INT UNSIGNED | No | FK → `clientes` (RN-05) |
| `id_membresia` | INT UNSIGNED | Sí | FK → `membresias` ("cuando corresponda", principio VII) |
| `monto` | DECIMAL(10,2) | No | `CHECK (monto > 0)` |
| `fecha_pago` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP` |
| `metodo_pago` | VARCHAR(30) | No | Valores definitivos pendientes para el Sprint 2 |
| `estado` | ENUM('pagado','pendiente','cancelado') | No | `DEFAULT 'pagado'`; provisional, se revisará en el Sprint 2 |
| `creado_en` | DATETIME | No | `DEFAULT CURRENT_TIMESTAMP` |

Índice: `INDEX (id_cliente, fecha_pago)`.

## Fuera de este sprint

`rostros`, `accesos` y `auditoria` se crearán en el Sprint 2 con nuevas migraciones numeradas
(`003_...` en adelante). Ninguna tabla del Sprint 1 guarda información facial.
