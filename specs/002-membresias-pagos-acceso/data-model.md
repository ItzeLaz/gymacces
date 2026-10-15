# Modelo de datos (Fase 1): Sprint 2

Mismas reglas que el Sprint 1: MySQL 8.0+ o MariaDB 10.4+, InnoDB, `utf8mb4` /
`utf8mb4_unicode_ci`, nombres de tablas y columnas en español, llaves foráneas con
`ON DELETE RESTRICT ON UPDATE RESTRICT` y ningún borrado físico ordinario. Las migraciones ya
aplicadas (`001`, `002`) no se modifican (constitución, principio IV).

| Migración | Contenido | Uso |
|-----------|-----------|-----|
| `003_ajustar_membresias_pagos.sql` | Columnas nuevas en `membresias` y `pagos`; `ENUM` de métodos de pago | Funcional |
| `004_create_rostros_accesos_auditoria.sql` | Tablas `rostros`, `accesos`, `auditoria` | Funcional |

## Diagrama de relaciones

```text
clientes 1 ──── 0..* membresias  *──── 1 tipos_membresia
clientes 1 ──── 0..* pagos       *──── 1 membresias        (obligatoria desde el Sprint 2 en el servicio)
clientes 1 ──── 0..* rostros                               (máximo 1 activo)
clientes 0..1 ── 0..* accesos    *──── 0..1 membresias     (cliente nulo si no se identificó)
usuarios 1 ──── 0..* membresias / pagos / rostros / accesos / auditoria   (quién registró)
```

## tipos_membresia (sin cambios de estructura)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_tipo_membresia` | INT UNSIGNED AI | No | PK |
| `nombre` | VARCHAR(80) | No | Único (sin distinguir mayúsculas); 2–80 caracteres |
| `descripcion` | VARCHAR(255) | Sí | |
| `duracion_dias` | SMALLINT UNSIGNED | No | 1–3650 (`CHECK > 0` ya existe) |
| `precio` | DECIMAL(10,2) | No | ≥ 0 (`CHECK` ya existe) |
| `estado` | ENUM('activo','inactivo') | No | Por omisión `activo`; solo `activo` se puede asignar (FR-002) |

Sin borrado físico (FR-003). Cambiar `precio` o `duracion_dias` no toca las membresías existentes,
porque cada membresía guarda su propio `monto` y sus fechas (FR-004).

## membresias (migración 003 agrega columnas)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_membresia` | INT UNSIGNED AI | No | PK |
| `id_cliente` | INT UNSIGNED | No | FK → `clientes`; el cliente debe estar `activo` al asignar |
| `id_tipo_membresia` | INT UNSIGNED | No | FK → `tipos_membresia`; tipo `activo` al asignar |
| `fecha_inicio` | DATE | No | Asignación: hoy o posterior. Renovación: ver reglas |
| `fecha_fin` | DATE | No | `fecha_inicio + duracion_dias − 1` (`CHECK fecha_fin >= fecha_inicio` ya existe) |
| `monto` **(nueva)** | DECIMAL(10,2) | No | Copia de `tipos_membresia.precio` al asignar; `CHECK monto >= 0` |
| `estado` | ENUM('activa','vencida','suspendida','cancelada') | No | El sistema solo escribe `activa`, `suspendida`, `cancelada` (research R-08) |
| `motivo_estado` **(nueva)** | VARCHAR(255) | Sí | Obligatorio al suspender, reactivar o cancelar |
| `creado_por` **(nueva)** | INT UNSIGNED | Sí | FK → `usuarios`; nulo solo en filas anteriores a la migración |
| `creado_en` | DATETIME | No | Ya existe |
| `actualizado_en` **(nueva)** | DATETIME | No | `ON UPDATE CURRENT_TIMESTAMP` |

La migración 003 rellena `monto` de las filas existentes con el precio de su tipo.

**Duración**: con inicio el 1 y 30 días, el fin es el día 30 (la vigencia incluye ambos extremos,
FR-012).

**Sin traslapes (FR-007)**: al asignar o renovar, dentro de una transacción que bloquea la fila del
cliente (research R-09), se rechaza la operación si existe otra membresía no cancelada del mismo
cliente con `fecha_inicio <= nueva_fin AND fecha_fin >= nuevo_inicio`.

**Renovación (FR-010)**: se toma la última membresía no cancelada del cliente (mayor `fecha_fin`).
Si `fecha_fin >= hoy` (vigente, suspendida o futura), la nueva inicia en `fecha_fin + 1`. Si no
existe o ya terminó, inicia en la fecha indicada (por omisión hoy, nunca anterior a hoy).

### Estado efectivo (calculado, research R-08)

| `estado` guardado | Condición de fechas (hoy en `APP_TIMEZONE`) | Estado efectivo | ¿Vigente? |
|-------------------|---------------------------------------------|-----------------|-----------|
| `cancelada` | cualquiera | `cancelada` | No |
| `activa` o `suspendida` | `fecha_fin < hoy` | `vencida` | No |
| `suspendida` | `fecha_fin >= hoy` | `suspendida` | No |
| `activa` | `fecha_inicio > hoy` | `activa` (indicador "por iniciar") | No |
| `activa` | `fecha_inicio <= hoy <= fecha_fin` | `activa` | **Sí** |

**Membresía actual de un cliente**: la vigente; si no hay, la no cancelada con mayor `fecha_fin`;
si no hay, ninguna.

### Transiciones (solo administrador, FR-009)

```text
activa ──suspender──▶ suspendida ──reactivar──▶ activa
activa / suspendida ──cancelar──▶ cancelada   (final, no se reactiva)
```

Cada transición exige `motivo` (1–255 caracteres), no modifica las fechas y escribe en
`auditoria`. No se puede suspender ni reactivar una membresía con estado efectivo `vencida`.

## pagos (migración 003 ajusta columnas)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_pago` | INT UNSIGNED AI | No | PK |
| `id_cliente` | INT UNSIGNED | No | FK → `clientes`; se copia del cliente de la membresía, no se recibe del usuario |
| `id_membresia` | INT UNSIGNED | Sí (en la tabla) | FK → `membresias`; el servicio la exige siempre en el Sprint 2 |
| `monto` | DECIMAL(10,2) | No | > 0 (`CHECK` ya existe) y ≤ saldo pendiente (FR-018) |
| `fecha_pago` | DATETIME | No | Fecha y hora del registro, asignada por el servidor |
| `metodo_pago` | **ENUM('efectivo','tarjeta','transferencia')** | No | Cambia desde VARCHAR(30) (FR-016) |
| `estado` | **ENUM('pagado','cancelado')** | No | Se retira `pendiente`; por omisión `pagado` |
| `registrado_por` **(nueva)** | INT UNSIGNED | Sí | FK → `usuarios` (FR-017); nulo solo en filas anteriores |
| `motivo_anulacion` **(nueva)** | VARCHAR(255) | Sí | Obligatorio al anular |
| `anulado_por` **(nueva)** | INT UNSIGNED | Sí | FK → `usuarios` |
| `anulado_en` **(nueva)** | DATETIME | Sí | |
| `creado_en` | DATETIME | No | Ya existe |

Antes de cambiar los `ENUM`, la migración 003 convierte los valores existentes que no encajen
(`metodo_pago` desconocido → `efectivo`, `estado = 'pendiente'` → `pagado`). En una base creada
con el Sprint 1 no hay pagos, así que en la práctica no afecta datos.

Nuevo índice: `idx_pagos_membresia_estado (id_membresia, estado)` para calcular saldos.

**Reglas**:
- Solo se registran pagos en membresías cuyo estado guardado no es `cancelada` y con saldo > 0.
- El registro bloquea la fila de la membresía (`FOR UPDATE`), recalcula el saldo y valida
  `monto <= saldo` en la misma transacción (research R-09).
- **Anular** (solo administrador): `estado` pasa a `cancelado` y se llenan `motivo_anulacion`,
  `anulado_por` y `anulado_en`. Un pago anulado no se reactiva. Nunca se borra (FR-019).

### Saldo y adeudo (calculados, research R-10)

- `pagado(membresía) = SUM(monto)` de sus pagos con `estado = 'pagado'`.
- `saldo(membresía) = monto − pagado`; vale 0 para membresías canceladas.
- `adeudo(cliente) = SUM(saldo)` de sus membresías no canceladas.
- Estado de pago de una membresía: `pagada` (saldo 0), `parcial` (0 < pagado < monto) o
  `pendiente` (pagado 0 y monto > 0).

## rostros (nueva, migración 004)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_rostro` | INT UNSIGNED AI | No | PK |
| `id_cliente` | INT UNSIGNED | No | FK → `clientes` |
| `descriptor_cifrado` | MEDIUMBLOB | No | Las 3 muestras serializadas y cifradas con AES-256-GCM (research R-05). **Nunca se devuelve** |
| `iv` | VARBINARY(12) | No | Vector de inicialización aleatorio |
| `auth_tag` | VARBINARY(16) | No | Etiqueta de autenticación GCM |
| `version_modelo` | VARCHAR(40) | No | Ej. `human-3.3.6-faceres`; permite detectar registros de otro modelo |
| `consentimiento` | TINYINT(1) | No | Debe ser 1 (`CHECK`); confirmado por el personal (FR-025) |
| `estado` | ENUM('activo','inactivo') | No | Por omisión `activo` |
| `id_cliente_activo` | INT UNSIGNED, generada `STORED` | Sí | `IF(estado = 'activo', id_cliente, NULL)` con índice **único**: máximo un registro activo por cliente (FR-028) |
| `registrado_por` | INT UNSIGNED | No | FK → `usuarios` |
| `creado_en` | DATETIME | No | Por omisión ahora |
| `desactivado_en` | DATETIME | Sí | |

**Ciclo de vida**:
- **Registrar** (sin registro activo): inserta una fila `activo`.
- **Reemplazar**: en una transacción, pone `inactivo` el registro activo actual (con
  `desactivado_en`) e inserta uno nuevo `activo`.
- **Desactivar**: pone `inactivo` el registro activo. No hay borrado físico en el sprint; la fila
  inactiva conserva el descriptor cifrado, pero nunca se lee para comparar.
- Si el cliente pasa a `inactivo`, sus rostros no se modifican, pero la decisión de acceso lo
  rechaza (`cliente_inactivo`).

**Contenido descifrado** (solo en memoria del backend):
`{ "muestras": [[1024 números], [1024 números], [1024 números]] }`. La longitud se valida con la
constante `FACE_DESCRIPTOR_LENGTH` (1024 con el modelo de R-01) y cada valor debe ser un número
finito.

## accesos (nueva, migración 004)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_acceso` | BIGINT UNSIGNED AI | No | PK |
| `fecha_hora` | DATETIME(3) | No | Asignada por el servidor |
| `id_cliente` | INT UNSIGNED | Sí | FK → `clientes`; nulo si el rostro no se identificó |
| `id_membresia` | INT UNSIGNED | Sí | FK → `membresias`; la evaluada, si existía |
| `resultado` | ENUM('autorizado','rechazado') | No | |
| `motivo` | ENUM('rostro_no_identificado','cliente_inactivo','sin_membresia_vigente','membresia_vencida','membresia_suspendida','membresia_cancelada') | Sí | `CHECK`: nulo si y solo si `resultado = 'autorizado'` (FR-035) |
| `similitud` | DECIMAL(5,4) | Sí | Mejor similitud obtenida; solo para calibración, visible únicamente para el administrador. No es un dato biométrico |
| `registrado_por` | INT UNSIGNED | No | FK → `usuarios` (sesión de la estación) |

Índices: `(fecha_hora)`, `(id_cliente, fecha_hora)`, `(resultado, fecha_hora)` para SC-010.

Solo se insertan filas; no hay operaciones de modificación ni borrado (FR-039).

### Decisión de acceso (orden de evaluación, FR-033 a FR-035)

| Paso | Condición | Resultado | Motivo |
|------|-----------|-----------|--------|
| 1 | Sin descriptor, o sin coincidencia válida y no ambigua (research R-06) | rechazado | `rostro_no_identificado` |
| 2 | Cliente identificado con `estado = 'inactivo'` | rechazado | `cliente_inactivo` |
| 3 | Tiene una membresía vigente | **autorizado** | — |
| 4 | Membresía actual con estado efectivo `suspendida` | rechazado | `membresia_suspendida` |
| 5 | Membresía actual con estado efectivo `cancelada` | rechazado | `membresia_cancelada` |
| 6 | Membresía actual con estado efectivo `vencida` | rechazado | `membresia_vencida` |
| 7 | Sin membresías, o solo una futura (por iniciar) | rechazado | `sin_membresia_vigente` |

El adeudo no interviene (aclaración confirmada el 2026-10-12). Si en la ventana
`ACCESS_DEDUP_SECONDS` ya existe un intento del mismo cliente con el mismo resultado, no se inserta
otra fila y se devuelve la existente (FR-038).

## auditoria (nueva, migración 004)

| Columna | Tipo | Nulo | Reglas |
|---------|------|------|--------|
| `id_auditoria` | BIGINT UNSIGNED AI | No | PK |
| `id_usuario` | INT UNSIGNED | No | FK → `usuarios` |
| `accion` | VARCHAR(60) | No | Ver catálogo |
| `entidad` | VARCHAR(40) | No | `tipos_membresia`, `membresias`, `pagos`, `rostros` |
| `id_registro` | BIGINT UNSIGNED | No | Identificador del registro afectado |
| `descripcion` | VARCHAR(500) | Sí | Texto breve; **nunca** descriptores, contraseñas ni tokens |
| `creado_en` | DATETIME | No | Por omisión ahora |

Índices: `(entidad, id_registro)`, `(id_usuario, creado_en)`.

**Catálogo de acciones (FR-042)**: `tipo_membresia.crear`, `tipo_membresia.modificar`,
`tipo_membresia.cambiar_estado`, `membresia.asignar`, `membresia.renovar`, `membresia.suspender`,
`membresia.reactivar`, `membresia.cancelar`, `pago.registrar`, `pago.anular`, `rostro.registrar`,
`rostro.reemplazar`, `rostro.desactivar`.

## Validaciones de entrada (resumen)

| Dato | Regla |
|------|-------|
| Identificadores | Enteros positivos |
| `nombre` del tipo | 2–80 caracteres, sin espacios al inicio ni al final |
| `duracion_dias` | Entero 1–3650 |
| `precio`, `monto` | Decimal con hasta 2 decimales; precio ≥ 0, monto > 0; máximo 99 999 999.99 |
| `fecha_inicio` | Fecha `AAAA-MM-DD` válida, no anterior a hoy |
| `metodo_pago` | `efectivo`, `tarjeta` o `transferencia` |
| `motivo` | 1–255 caracteres |
| `muestras` (rostro) | Exactamente 3 arreglos de `FACE_DESCRIPTOR_LENGTH` números finitos |
| `descriptor` (acceso) | Arreglo de `FACE_DESCRIPTOR_LENGTH` números finitos, o `null` |
| `consentimiento` | Debe ser `true` |
| Filtros de fecha | `desde ≤ hasta`; rango máximo de 366 días en consultas generales |
