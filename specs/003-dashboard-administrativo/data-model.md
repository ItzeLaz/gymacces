# Modelo de datos (Fase 1): Sprint 3 — Dashboard administrativo

El dashboard **no crea tablas**: solo lee `clientes`, `membresias`, `tipos_membresia`, `pagos` y
`accesos` de los Sprints 1 y 2 (ver `specs/002-membresias-pagos-acceso/data-model.md`). La única
migración del sprint agrega índices.

| Migración | Contenido |
|-----------|-----------|
| `005_indices_dashboard.sql` | `idx_pagos_fecha_estado (fecha_pago, estado)` en `pagos`; `idx_membresias_fecha_fin (fecha_fin)` en `membresias` |

## Periodo

| Valor de `periodo` | `desde` | `hasta` |
|--------------------|---------|---------|
| `hoy` | hoy | hoy |
| `7d` | hoy − 6 días | hoy |
| `mes` (por omisión) | día 1 del mes en curso | hoy |
| `rango` | `desde` recibido | `hasta` recibido |

"Hoy" se calcula con `APP_TIMEZONE`. Para `rango`: ambas fechas obligatorias, válidas, `desde ≤
hasta` y como máximo 366 días (FR-008). Un día abarca de `00:00:00` a `23:59:59.999`.

## Indicadores (todos calculados al consultar, FR-010)

| Indicador | Regla | Depende del periodo |
|-----------|-------|:-------------------:|
| `clientes.activos` / `clientes.inactivos` | Conteo de `clientes` por `estado` | No |
| `membresias.vigentes` | Clientes con al menos una membresía vigente (`estado = 'activa'` y `fecha_inicio ≤ hoy ≤ fecha_fin`) | No |
| `membresias.vencidas` | Clientes con al menos una membresía no cancelada, ninguna vigente y ninguna futura (`fecha_inicio > hoy`), es decir, cuya última membresía ya terminó | No |
| `membresias.por_vencer` | Clientes con membresía vigente cuya `fecha_fin` está entre hoy y hoy + 6, **sin** otra membresía no cancelada que empiece después (ya renovados no cuentan) | No |
| `por_vencer[]` | Hasta 20 de esos clientes: `id_cliente`, nombre, apellido, tipo de membresía, `fecha_fin`; orden por `fecha_fin` y apellido (FR-004) | No |
| `pagos.cantidad` / `pagos.ingresos` | Conteo y suma de `pagos` con `estado = 'pagado'` y `fecha_pago` dentro del periodo | Sí |
| `adeudo_total` | Suma de saldos de membresías no canceladas (misma regla que `GET /debts` del Sprint 2) | No (es el adeudo vigente) |
| `accesos.autorizados` / `accesos.rechazados` | Conteo de `accesos` por `resultado` con `fecha_hora` dentro del periodo | Sí |
| `accesos.rechazos_por_motivo` | Conteo de rechazos del periodo por cada uno de los 6 motivos; los motivos sin rechazos aparecen con 0 | Sí |
| `rechazos_recientes[]` | Los 10 accesos rechazados más recientes (sin importar el periodo): `id_acceso`, `fecha_hora`, cliente (`nombre`, `apellido`) o `null`, `motivo` (FR-007) | No |
| `tendencia[]` | Una entrada por cada día del periodo, incluidos los días sin datos: `fecha`, `ingresos`, `autorizados`, `rechazados` (FR-009) | Sí |

Notas de cálculo:

- Un cliente se cuenta una sola vez en cada indicador de membresías, aunque tenga varias
  membresías (caso límite de la especificación).
- Una membresía que termina hoy es vigente y "por vencer"; mañana es vencida.
- Los pagos anulados no cuentan como pagos ni como ingresos; las membresías canceladas no cuentan
  en ningún indicador de membresías.
- Los montos se devuelven como texto con 2 decimales (convención del Sprint 2).

## Campos prohibidos en la respuesta (FR-012)

Nunca se devuelven: `correo`, `telefono`, `direccion`, datos de `rostros`, `similitud`, montos
pagados o adeudados **por cliente**, ni ningún dato de usuarios distinto del nombre del cliente.
