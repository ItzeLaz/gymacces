---

description: "Lista de tareas del Sprint 2: membresías, pagos, reconocimiento facial y control de acceso"
---

# Tareas: Sprint 2 — Membresías, pagos, reconocimiento facial y control de acceso

**Entrada**: documentos de diseño en `specs/002-membresias-pagos-acceso/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

**Pruebas**: se incluyen porque la constitución (principio X) exige probar membresías, pagos,
adeudos, roles, reconocimiento facial y accesos antes de dar una función por terminada. Backend con
`node:test` + `supertest` contra `gym_access_test`; frontend con `vitest` + Testing Library
(research R-13). Las pruebas faciales usan descriptores sintéticos, sin cámara. Nombres de prueba y
mensajes de aserción en español.

**Organización**: las tareas se agrupan por historia de usuario de `spec.md` para implementarlas y
probarlas de forma independiente.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]…[US8]**: historia de usuario de `spec.md` a la que pertenece la tarea.
- Cada descripción incluye la ruta exacta del archivo.

## Convenciones obligatorias para todas las tareas

- Se mantienen todas las convenciones del Sprint 1 (`specs/001-base-usuarios-clientes/tasks.md`):
  ES Modules con extensión `.js` en las importaciones relativas, sin `require()` ni
  `module.exports`; SQL solo en `backend/src/models/` con `execute(sql, params)`; reglas de negocio
  solo en `backend/src/services/`; controladores delgados; respuestas `{ data }`, `{ data, meta }`
  y `{ error }`; identificadores en inglés y textos para el usuario en español (`AGENTS.md`).
- Las operaciones que verifican y escriben usan `withTransaction` de
  `backend/src/config/db.js` y pasan la `connection` a los modelos y a `audit.service.js`
  (research R-09, R-11).
- "Hoy" se obtiene siempre de `today()` de `backend/src/utils/dates.js` y se pasa como parámetro
  SQL; nunca usar `CURDATE()` ni `NOW()` para decidir vigencias (research R-08).
- Los montos viajan como texto `"450.00"` y se comparan en centavos con
  `backend/src/utils/money.js`; nunca comparar números de punto flotante (research R-10).
- **Datos biométricos**: ningún modelo, servicio, controlador, registro de auditoría ni mensaje de
  error devuelve o imprime `descriptor_cifrado`, `iv`, `auth_tag`, `muestras` o `descriptor`
  (FR-030). Solo `faces.service.js` llama a la función del modelo que lee esas columnas.
- La matriz de permisos de [contracts/api.md](./contracts/api.md) se aplica con `authorize(...)` en
  cada ruta y con proyección por rol en los servicios (el entrenador nunca recibe `monto`,
  `pagado`, `saldo`, `estado_pago` ni `adeudo`; solo el administrador recibe `similitud`).
- Las acciones de anular, suspender, cancelar y desactivar usan `ConfirmDialog` y piden motivo
  cuando el contrato lo exige (FR-046).

---

## Fase 1: Configuración inicial (infraestructura compartida)

**Propósito**: preparar la rama, la dependencia facial y la configuración.

- [X] T001 Confirmar los cambios pendientes de la rama `001-base-usuarios-clientes` y crear y cambiar a la rama `002-membresias-pagos-acceso` (misma convención que el Sprint 1; nombre relacionado con la funcionalidad, como pide la constitución en "Flujo de desarrollo"); no trabajar sobre `main` ni `master`
- [X] T002 Obtener la confirmación del equipo de las tres aclaraciones provisionales de la sección "Clarifications" de [spec.md](./spec.md) (abonos, adeudo sin bloqueo de acceso, estación con sesión del personal); quitar "(provisional)" de las confirmadas y, si alguna cambia, actualizar `spec.md`, `research.md` (R-07, R-10), `data-model.md` y `contracts/api.md` antes de continuar. **Compuerta: bloquea T051, T077 y T080** (gobernanza de la constitución)
- [X] T003 Presentar al equipo y registrar su aprobación de research R-01 (librería `@vladmandic/human` 3.3.6), R-02 (procesamiento en el navegador y comparación en el backend) y R-05 (descriptores cifrados con AES-256-GCM, sin imágenes), que la constitución lista como "Decisiones pendientes"; anotar la fecha y el resultado en la sección "Decisiones pendientes que no bloquean el plan" de [research.md](./research.md). **Compuerta: bloquea la instalación de la librería (T004) y toda la historia 4**
- [X] T004 [P] Agregar `"@vladmandic/human": "3.3.6"` (versión exacta, sin `^`) a `dependencies` y el script `"postinstall": "node scripts/copy-face-models.js"` en `frontend/package.json`, y ejecutar `npm install` en `frontend/` (research R-01, R-03)
- [X] T005 [P] Crear `frontend/scripts/copy-face-models.js` (ES Modules, `node:fs/promises`, `node:path`, `node:url`) que copie desde `frontend/node_modules/@vladmandic/human/models/` a `frontend/public/models/` los archivos `.json` y `.bin` de los modelos que usa la configuración facial (detector de rostro, malla facial, descripción facial `faceres`, `antispoof` y `liveness`); debe crear la carpeta destino si no existe, ser idempotente e imprimir en español cuántos archivos copió o un error claro si no encuentra la carpeta de origen
- [X] T006 [P] Agregar `frontend/public/models/` a `.gitignore` en la raíz
- [X] T007 [P] Agregar a `backend/.env.example`, con comentarios en español y sin valores secretos: `FACE_DATA_KEY=` (llave AES-256 en base64 de 32 bytes; comando `node -e "import('node:crypto').then((c) => console.log(c.randomBytes(32).toString('base64')))"`; advertir que perderla obliga a volver a registrar los rostros), `FACE_MATCH_THRESHOLD=0.60`, `FACE_MATCH_MARGIN=0.05`, `ACCESS_DEDUP_SECONDS=10`, `APP_TIMEZONE=America/Mexico_City` (research R-14)
- [X] T008 [P] Agregar `VITE_FACE_MODELS_URL=/models` a `frontend/.env.example`

---

## Fase 2: Fundamentos (prerrequisitos que bloquean todo)

**Propósito**: migraciones, configuración, utilidades y auditoría que usan todas las historias.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T009 Crear `database/migrations/003_ajustar_membresias_pagos.sql` (sin modificar `001` ni `002`), según [data-model.md](./data-model.md): en `membresias` agregar `monto DECIMAL(10,2) NOT NULL DEFAULT 0` con `CHECK (monto >= 0)`, `motivo_estado VARCHAR(255) NULL`, `creado_por INT UNSIGNED NULL` con FK a `usuarios (id_usuario)` `ON DELETE RESTRICT ON UPDATE RESTRICT`, `actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, y rellenar `monto` de las filas existentes con `tipos_membresia.precio`; en `pagos` convertir valores existentes (`metodo_pago` fuera de la lista → `'efectivo'`, `estado = 'pendiente'` → `'pagado'`), cambiar `metodo_pago` a `ENUM('efectivo','tarjeta','transferencia') NOT NULL` y `estado` a `ENUM('pagado','cancelado') NOT NULL DEFAULT 'pagado'`, agregar `registrado_por INT UNSIGNED NULL`, `motivo_anulacion VARCHAR(255) NULL`, `anulado_por INT UNSIGNED NULL`, `anulado_en DATETIME NULL` (FK de `registrado_por` y `anulado_por` a `usuarios` con `RESTRICT`) y el índice `idx_pagos_membresia_estado (id_membresia, estado)`; compatible con MySQL 8 y MariaDB 10.4
- [X] T010 Crear `database/migrations/004_create_rostros_accesos_auditoria.sql` con InnoDB, `utf8mb4` y `utf8mb4_unicode_ci`, según [data-model.md](./data-model.md): tabla `rostros` (`id_rostro` INT UNSIGNED AI PK; `id_cliente` INT UNSIGNED NOT NULL FK → `clientes`; `descriptor_cifrado MEDIUMBLOB NOT NULL`; `iv VARBINARY(12) NOT NULL`; `auth_tag VARBINARY(16) NOT NULL`; `version_modelo VARCHAR(40) NOT NULL`; `consentimiento TINYINT(1) NOT NULL` con `CHECK (consentimiento = 1)`; `estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'`; columna generada `id_cliente_activo INT UNSIGNED AS (IF(estado = 'activo', id_cliente, NULL)) STORED` con índice `UNIQUE`; `registrado_por` INT UNSIGNED NOT NULL FK → `usuarios`; `creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`; `desactivado_en DATETIME NULL`); tabla `accesos` (`id_acceso BIGINT UNSIGNED` AI PK; `fecha_hora DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`; `id_cliente` NULL FK → `clientes`; `id_membresia` NULL FK → `membresias`; `resultado ENUM('autorizado','rechazado') NOT NULL`; `motivo ENUM('rostro_no_identificado','cliente_inactivo','sin_membresia_vigente','membresia_vencida','membresia_suspendida','membresia_cancelada') NULL` con `CHECK ((resultado = 'autorizado' AND motivo IS NULL) OR (resultado = 'rechazado' AND motivo IS NOT NULL))`; `similitud DECIMAL(5,4) NULL`; `registrado_por` INT UNSIGNED NOT NULL FK → `usuarios`; índices `(fecha_hora)`, `(id_cliente, fecha_hora)`, `(resultado, fecha_hora)`); tabla `auditoria` (`id_auditoria BIGINT UNSIGNED` AI PK; `id_usuario` INT UNSIGNED NOT NULL FK → `usuarios`; `accion VARCHAR(60) NOT NULL`; `entidad VARCHAR(40) NOT NULL`; `id_registro BIGINT UNSIGNED NOT NULL`; `descripcion VARCHAR(500) NULL`; `creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`; índices `(entidad, id_registro)` y `(id_usuario, creado_en)`); todas las FK con `ON DELETE RESTRICT ON UPDATE RESTRICT`
- [X] T011 Ampliar `backend/src/config/env.js`: hacer obligatoria `FACE_DATA_KEY` y terminar el proceso con un mensaje en español si falta o si al decodificarla de base64 no mide 32 bytes; leer `FACE_MATCH_THRESHOLD` (por omisión 0.60, rango 0–1), `FACE_MATCH_MARGIN` (por omisión 0.05, rango 0–1), `ACCESS_DEDUP_SECONDS` (por omisión 10, entero ≥ 0) y `APP_TIMEZONE` (por omisión `America/Mexico_City`, validada con `Intl.DateTimeFormat`); exponerlas en `env.face = { key: Buffer, threshold, margin }`, `env.accessDedupSeconds` y `env.timezone` (research R-14)
- [X] T012 [P] Ampliar `backend/tests/helpers/setup-env.js` para definir, solo si no existen, `FACE_DATA_KEY` con una llave fija de prueba de 32 bytes en base64 y `APP_TIMEZONE=America/Mexico_City`, de modo que `npm test` funcione sin tocar `backend/.env`
- [X] T013 [P] Agregar `businessRule(message)` → `new AppError(422, 'BUSINESS_RULE', message)` en `backend/src/utils/AppError.js` y verificar que `backend/src/middlewares/errorHandler.js` responde 422 con `{ error: { code: 'BUSINESS_RULE', message } }`
- [X] T014 [P] Crear `backend/src/utils/dates.js` con `today()` (fecha `AAAA-MM-DD` en `env.timezone` usando `Intl.DateTimeFormat`), `addDays(fecha, dias)` (aritmética en UTC sobre fechas `AAAA-MM-DD`, sin desfases por zona horaria) y `endDateFor(fechaInicio, duracionDias)` = `addDays(fechaInicio, duracionDias - 1)` (data-model, "Duración")
- [X] T015 [P] Crear `backend/src/utils/money.js` con `toCents(texto)` (acepta números o texto con hasta 2 decimales), `fromCents(centavos)` → texto con 2 decimales y una función para comparar montos, todo en enteros (research R-10)
- [X] T016 [P] Crear `backend/src/models/audit.model.js` con `insert({ id_usuario, accion, entidad, id_registro, descripcion }, connection)` parametrizado
- [X] T017 Crear `backend/src/services/audit.service.js` con la constante congelada `AUDIT_ACTIONS` (`tipo_membresia.crear`, `tipo_membresia.modificar`, `tipo_membresia.cambiar_estado`, `membresia.asignar`, `membresia.renovar`, `membresia.suspender`, `membresia.reactivar`, `membresia.cancelar`, `pago.registrar`, `pago.anular`, `rostro.registrar`, `rostro.reemplazar`, `rostro.desactivar`) y `record(connection, user, accion, entidad, idRegistro, descripcion)`, que rechaza acciones fuera del catálogo y recorta `descripcion` a 500 caracteres (FR-042; depende de T016)
- [X] T018 [P] Crear `backend/tests/helpers/factories.js` con `createMembershipType(datos)`, `createMembership(datos)` (inserción SQL directa que permite fechas pasadas para probar vencidas), `createPayment(datos)`, `syntheticDescriptor(semilla)` (vector determinista de `FACE_DESCRIPTOR_LENGTH` = 1024 números normalizado), `nearDescriptor(base, ruido)` (variación pequeña con similitud alta) y `sampleSet(semilla)` (3 muestras cercanas entre sí); reutilizar `createClient` y `createUser` de `backend/tests/helpers/db.js`
- [X] T019 [P] Crear `backend/tests/utils.unit.test.js` con pruebas de `today()` en la zona configurada, `addDays` al cruzar fin de mes y de año, `endDateFor('2026-10-01', 30) === '2026-10-30'`, y de `toCents`/`fromCents` (`'0.10' + '0.20'` exacto, rechazo de más de 2 decimales)
- [X] T020 [P] Ampliar `backend/tests/database.test.js` para verificar que después de migrar existen `rostros`, `accesos` y `auditoria`, que `pagos.metodo_pago` rechaza `'cheque'`, que `accesos` rechaza un rechazo sin motivo y que `rostros` no admite dos registros activos del mismo cliente
- [X] T021 [P] Ampliar `frontend/src/components/StatusBadge.jsx` con etiquetas y clases para `activa`, `vencida`, `suspendida`, `cancelada`, `por_iniciar` ("Por iniciar"), `pagada`, `parcial`, `pendiente`, `pagado`, `cancelado`, `autorizado`, `rechazado`, y agregar en `frontend/src/styles/global.css` colores distinguibles con texto (no solo color) para cada uno (FR-047)
- [X] T022 [P] Crear `frontend/src/components/Money.jsx` que muestre un monto de texto como `$1,234.50` con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`
- [X] T023 Ejecutar `npm run db:migrate` en `database/` y `npm test` en `backend/` para confirmar que las migraciones 003 y 004 se aplican sobre la base del Sprint 1 y que todas las pruebas existentes siguen pasando

**Punto de control**: base de datos y utilidades listas; las historias pueden empezar.

---

## Fase 3: Historia de usuario 1 — Registro y mantenimiento de tipos de membresía (Prioridad: P1) 🎯 MVP

**Objetivo**: el administrador gestiona el catálogo de tipos de membresía (FR-001 a FR-004).

**Prueba independiente**: el administrador crea "Mensual" (30 días), lo consulta, cambia su precio y
lo desactiva; un recepcionista solo puede consultar los tipos activos.

### Pruebas de la historia 1

- [X] T024 [P] [US1] Crear `backend/tests/membership-types.test.js` con: `test_admin_registra_tipo_valido` (201, estado `activo`, auditoría `tipo_membresia.crear`), rechazo de nombre duplicado sin distinguir mayúsculas (409), rechazo de `duracion_dias` 0 y de precio negativo (400), modificación de precio (200), cambio de estado a `inactivo`, recepcionista que lista y solo recibe activos, recepcionista/entrenador/cliente que intentan crear o modificar (403), y que no existe `DELETE /api/membership-types/:id` (404)
- [X] T025 [P] [US1] Crear `frontend/src/tests/MembershipTypeForm.test.jsx` que verifique los mensajes de validación en español (nombre obligatorio, duración entera mayor a cero, precio no negativo con 2 decimales) y el mensaje de éxito al guardar con la API simulada

### Implementación de la historia 1

- [X] T026 [P] [US1] Crear `backend/src/models/membershipType.model.js` con `findById`, `findByName`, `list({ estado, limit, offset })`, `count({ estado })`, `create`, `update(id, campos)` (solo `nombre`, `descripcion`, `duracion_dias`, `precio`) y `updateStatus`, aceptando `connection` opcional como `client.model.js`
- [X] T027 [P] [US1] Crear `backend/src/validators/membershipTypes.validator.js` con `express-validator`: `nombre` 2–80 caracteres recortado, `descripcion` opcional ≤ 255, `duracion_dias` entero 1–3650, `precio` decimal ≥ 0 con hasta 2 decimales y ≤ 99999999.99, `estado` en `activo|inactivo`, `id` entero positivo, `page`/`limit` como en el Sprint 1; mensajes en español
- [X] T028 [US1] Crear `backend/src/services/membershipTypes.service.js` con `listTypes(filtros, user)` (el recepcionista solo recibe `estado = 'activo'`), `createType`, `updateType`, `changeTypeStatus`, con conflicto 409 "Ya existe un tipo de membresía con ese nombre.", 404 si no existe y auditoría en la misma transacción (FR-001 a FR-004, FR-042)
- [X] T029 [US1] Crear `backend/src/controllers/membershipTypes.controller.js` (`list`, `create`, `update`, `changeStatus`) usando `sendData`/`sendList` de `backend/src/utils/response.js`
- [X] T030 [US1] Crear `backend/src/routes/membershipTypes.routes.js` (`GET /` para administrador y recepcionista; `POST /`, `PATCH /:id`, `PATCH /:id/status` solo administrador) y montarlo en `/membership-types` en `backend/src/routes/index.js`
- [X] T031 [P] [US1] Crear `frontend/src/api/membershipTypes.js` con `listMembershipTypes`, `createMembershipType`, `updateMembershipType`, `changeMembershipTypeStatus` usando el cliente HTTP de `frontend/src/api/client.js`
- [X] T032 [US1] Crear `frontend/src/pages/MembershipTypes.jsx` (tabla con nombre, duración, precio con `Money`, estado con `StatusBadge`; botones de crear, editar y activar/desactivar con `ConfirmDialog` solo para administrador) y `frontend/src/pages/MembershipTypeForm.jsx` (alta y edición con mensajes de éxito/error)
- [X] T033 [US1] Agregar en `frontend/src/App.jsx` las rutas `/membership-types` (administrador y recepcionista) y `/membership-types/new`, `/membership-types/:id` (administrador), y la opción "Tipos de membresía" en el menú de `frontend/src/components/Layout.jsx` para esos roles

**Punto de control**: catálogo de tipos funcional y probado.

---

## Fase 4: Historia de usuario 2 — Asignación de membresía a un cliente (Prioridad: P1)

**Objetivo**: asignar membresías sin traslapes, calcular estados efectivos y permitir al administrador
suspender, reactivar y cancelar (FR-005 a FR-009, FR-012 a FR-014).

**Prueba independiente**: se asigna "Mensual" a un cliente con inicio hoy; el sistema calcula la
fecha de fin, la muestra activa y vigente, y la relaciona con el cliente.

### Pruebas de la historia 2

- [X] T034 [P] [US2] Crear `backend/tests/memberships.test.js` con: asignación válida (fin = inicio + duración − 1, `monto` copiado del precio, `estado_efectivo` `activa`, `vigente` true, auditoría `membresia.asignar`); rechazo 422 por traslape, por cliente inactivo, por tipo inactivo y por fecha anterior a hoy; 404 por cliente inexistente; tabla de estado efectivo con membresías creadas por fábrica (fin ayer → `vencida`; fin hoy → vigente; inicio mañana → `por_iniciar` y no vigente; `suspendida` con fin pasado → `vencida`); transiciones del administrador con motivo (suspender, reactivar sin cambiar fechas, cancelar) y rechazo 422 de reactivar una cancelada y de suspender una vencida; 403 para el recepcionista en `PATCH /memberships/:id/status`; el entrenador recibe el historial sin `monto`, `pagado`, `saldo` ni `estado_pago`; `GET /clients` y `GET /clients/:id` incluyen `membresia_actual`
- [X] T035 [P] [US2] Crear `frontend/src/tests/MembershipForm.test.jsx` que verifique que solo se ofrecen tipos activos, que se muestra la fecha de fin calculada antes de guardar y que un error 422 de traslape se muestra en español

### Implementación de la historia 2

- [X] T036 [US2] Crear `backend/src/models/membership.model.js` con: una expresión SQL reutilizable que calcula `estado_efectivo` (`cancelada` si `estado = 'cancelada'`; `vencida` si `fecha_fin < ?hoy`; si no, `estado`), `vigente` (`estado = 'activa' AND fecha_inicio <= ?hoy AND fecha_fin >= ?hoy`), `por_iniciar` y los totales `pagado` (suma de `pagos.monto` con `estado = 'pagado'`) y `saldo` (`monto − pagado`, 0 si está cancelada) mediante subconsulta; funciones `findById(id, hoy, connection)`, `listByClient(idCliente, hoy)` (orden `fecha_inicio` descendente), `findCurrentByClient(idCliente, hoy, connection)` (la vigente; si no, la no cancelada con mayor `fecha_fin`), `findLastNotCancelled(idCliente, connection)`, `countOverlaps(idCliente, inicio, fin, connection)` (`estado <> 'cancelada' AND fecha_inicio <= ? AND fecha_fin >= ?`), `create(datos, connection)` y `updateStatus(id, estado, motivo, connection)`; agregar en `backend/src/models/client.model.js` `lockById(id, connection)` con `SELECT ... FOR UPDATE`
- [X] T037 [P] [US2] Crear `backend/src/validators/memberships.validator.js`: `id` de cliente y de membresía enteros positivos, `id_tipo_membresia` entero positivo, `fecha_inicio` opcional con formato `AAAA-MM-DD` válido, `estado` en `suspendida|activa|cancelada`, `motivo` 1–255 caracteres obligatorio en el cambio de estado
- [X] T038 [US2] Crear `backend/src/services/memberships.service.js` con `toView(fila, rol)` (forma `MembershipView` del contrato; omite montos para el entrenador; `estado_pago` `pagada|parcial|pendiente`), `assignMembership(idCliente, datos, user)` (transacción: `lockById` del cliente, 404 si no existe, 422 "El cliente está inactivo." si está inactivo, tipo activo, `fecha_inicio` por omisión `today()` y no anterior a hoy, `fecha_fin` con `endDateFor`, `monto` = precio del tipo, 422 "El cliente ya tiene una membresía en ese periodo. Usa la renovación." si `countOverlaps > 0`, `creado_por`, auditoría `membresia.asignar`), `getClientMemberships(idCliente, user)` → `{ actual, historial }`, `changeMembershipStatus(id, { estado, motivo }, user)` según las transiciones de data-model (auditoría `membresia.suspender|reactivar|cancelar`) y `getCurrentMembership(idCliente, connection)` para otros servicios
- [X] T039 [US2] Crear `backend/src/controllers/memberships.controller.js` (`listByClient`, `assign`, `changeStatus`)
- [X] T040 [US2] Crear `backend/src/routes/memberships.routes.js` con dos routers: `clientMembershipsRouter` (`Router({ mergeParams: true })`, `GET /` para administrador, recepcionista y entrenador; `POST /` para administrador y recepcionista) montado en `/clients/:id/memberships`, y `membershipsRouter` con `PATCH /:id/status` solo administrador montado en `/memberships`; registrar ambos en `backend/src/routes/index.js` antes del router de clientes
- [X] T041 [US2] Ampliar `backend/src/services/clients.service.js`: agregar `membresia_actual` (`estado_efectivo`, `vigente`, `fecha_fin`, y `saldo` solo para administrador y recepcionista) en `listClients` y `getClient` (FR-013), y llenar `membresia` en `getOwnProfile` con `MembershipView` de la membresía actual del cliente autenticado (FR-014)
- [X] T042 [P] [US2] Crear `frontend/src/api/memberships.js` con `getClientMemberships`, `assignMembership`, `renewMembership` y `changeMembershipStatus`
- [X] T043 [US2] Crear `frontend/src/pages/MembershipForm.jsx` en modo asignación (selector de tipos activos, fecha de inicio con hoy por omisión, vista previa de fecha de fin y monto, mensajes de éxito/error) y agregar la ruta `/clients/:id/memberships/new` (administrador y recepcionista) en `frontend/src/App.jsx`
- [X] T044 [US2] Ampliar `frontend/src/pages/ClientDetail.jsx` con la sección "Membresías": membresía actual con `StatusBadge` y fechas, historial, botón "Asignar membresía" (administrador y recepcionista) y, solo para administrador, acciones "Suspender", "Reactivar" y "Cancelar" con `ConfirmDialog` que pide el motivo
- [X] T045 [P] [US2] Mostrar la columna "Membresía" (estado efectivo con `StatusBadge` y fecha de fin) en `frontend/src/pages/Clients.jsx`
- [X] T046 [P] [US2] Reemplazar en `frontend/src/pages/Profile.jsx` el texto "Disponible próximamente" de la membresía por la membresía actual del cliente (tipo, fechas y estado)

**Punto de control**: asignación y estados de membresía funcionales; la historia 1 sigue pasando.

---

## Fase 5: Historia de usuario 3 — Registro de pagos (Prioridad: P1)

**Objetivo**: registrar pagos y abonos ligados a una membresía, sin exceder el saldo, y anularlos sin
borrarlos (FR-015 a FR-019, FR-022).

**Prueba independiente**: se registra un pago en efectivo por el monto de la membresía recién
asignada y aparece en el historial del cliente ligado a esa membresía.

**Depende de**: historia 2 (los pagos se registran sobre membresías).

### Pruebas de la historia 3

- [X] T047 [P] [US3] Crear `backend/tests/payments.test.js` con: abono de 200.00 sobre 450.00 (201, `id_cliente` copiado de la membresía, `registrado_por`, saldo 250.00, `estado_pago` `parcial`, auditoría `pago.registrar`); pago que liquida (saldo 0, `pagada`); 422 "El monto supera el saldo pendiente de 250.00."; 422 sobre membresía cancelada y sobre saldo 0; 400 por monto 0, negativo, con 3 decimales o método `cheque`; dos pagos simultáneos con `Promise.all` que juntos exceden el saldo → solo uno se registra y el saldo nunca es negativo; anulación por administrador con motivo (estado `cancelado`, saldo restaurado, auditoría `pago.anular`), 422 al anular dos veces, 403 para el recepcionista; `DELETE /api/payments/:id` → 404; `GET /clients/:id/payments` para administrador y recepcionista (200) y entrenador (403)
- [X] T048 [P] [US3] Crear `frontend/src/tests/PaymentForm.test.jsx` que verifique que se muestra el saldo pendiente, que no se puede enviar un monto mayor al saldo y que el mensaje 422 del servidor se muestra en español

### Implementación de la historia 3

- [X] T049 [P] [US3] Crear `backend/src/models/payment.model.js` con `create(datos, connection)`, `findById(id, connection)` (con nombre del cliente y del usuario que registró), `listByClient(idCliente)` (orden `fecha_pago` descendente), `cancel(id, { motivo, anulado_por }, connection)` y `sumPaidByMembership(idMembresia, connection)`; agregar `lockById(id, connection)` con `SELECT ... FOR UPDATE` en `backend/src/models/membership.model.js`
- [X] T050 [P] [US3] Crear `backend/src/validators/payments.validator.js`: `id_membresia` entero positivo, `monto` decimal > 0 con hasta 2 decimales y ≤ 99999999.99, `metodo_pago` en `efectivo|tarjeta|transferencia`, `motivo` 1–255 caracteres en la anulación
- [X] T051 [US3] Crear `backend/src/services/payments.service.js` con `registerPayment({ id_membresia, monto, metodo_pago }, user)` (transacción: `lockById` de la membresía, 404 si no existe, 422 si está cancelada o con saldo 0, recalcular saldo con `money.js`, 422 "El monto supera el saldo pendiente de X." si `monto > saldo`, insertar con `id_cliente` de la membresía y `registrado_por`, auditoría `pago.registrar`, devolver `{ pago, membresia }`), `cancelPayment(id, { motivo }, user)` (422 si ya está cancelado, auditoría `pago.anular`) y `getClientPayments(idCliente)` → `{ pagos, membresias, adeudo }` (FR-015 a FR-019, FR-022, FR-024)
- [X] T052 [US3] Crear `backend/src/controllers/payments.controller.js` (`create`, `cancel`, `listByClient`)
- [X] T053 [US3] Crear `backend/src/routes/payments.routes.js` con `POST /` (administrador y recepcionista) y `PATCH /:id/cancel` (solo administrador) montado en `/payments`, y `GET /clients/:id/payments` (administrador y recepcionista) en un router con `mergeParams`; registrar ambos en `backend/src/routes/index.js`
- [X] T054 [P] [US3] Crear `frontend/src/api/payments.js` con `registerPayment`, `cancelPayment`, `getClientPayments`
- [X] T055 [US3] Crear `frontend/src/pages/PaymentForm.jsx` (membresía a pagar con su saldo, monto con el saldo como valor sugerido, método de pago, mensajes de éxito/error) y agregar la ruta `/clients/:id/payments/new` (administrador y recepcionista) en `frontend/src/App.jsx`
- [X] T056 [US3] Ampliar `frontend/src/pages/ClientDetail.jsx` con la sección "Pagos" (solo administrador y recepcionista): adeudo total con `Money`, lista de pagos con estado, botón "Registrar pago" y, solo para administrador, "Anular" con `ConfirmDialog` y motivo; sin opción de borrar

**Punto de control**: el flujo asignar → pagar funciona de extremo a extremo.

---

## Fase 6: Historia de usuario 4 — Registro de información facial (Prioridad: P1)

**Objetivo**: registrar, reemplazar y desactivar la información facial de un cliente con
consentimiento, guardada cifrada y nunca expuesta (FR-025 a FR-031).

**Prueba independiente**: con la cámara, el recepcionista registra el rostro de un cliente y el
sistema muestra solo "Registrada" y la fecha.

### Pruebas de la historia 4

- [X] T057 [P] [US4] Crear `backend/tests/face-crypto.unit.test.js`: cifrar y descifrar devuelve las mismas muestras; dos cifrados del mismo contenido producen `iv` distintos; alterar un byte del texto cifrado, del `iv` o del `auth_tag` lanza error; descifrar con otra llave lanza error
- [X] T058 [P] [US4] Crear `backend/tests/face-matching.unit.test.js`: similitud coseno de un vector consigo mismo = 1; `bestMatch` devuelve el cliente cuando supera el umbral y el margen; devuelve `null` cuando no alcanza `threshold`; devuelve `null` (ambiguo) cuando dos clientes quedan a menos de `margin`; toma la mejor de las 3 muestras de cada cliente; `isValidDescriptor` rechaza longitud distinta de 1024, `NaN` e `Infinity`
- [X] T059 [P] [US4] Crear `backend/tests/faces.test.js`: registro con `consentimiento: true` y 3 muestras sintéticas (201, `registrado: true`, auditoría `rostro.registrar`); 400 sin consentimiento, con 2 muestras o con longitud incorrecta; 422 para cliente inactivo; 422 "Este rostro ya está registrado para otro cliente." con muestras cercanas a las de otro cliente; reemplazo (200, el registro anterior queda `inactivo`, auditoría `rostro.reemplazar`); desactivación (auditoría `rostro.desactivar`) y 404 si no hay registro activo; entrenador y cliente reciben 403; ninguna respuesta ni fila de `auditoria` contiene `descriptor`, `muestras`, `descriptor_cifrado`, `iv` ni `auth_tag`; en la base, `descriptor_cifrado` no contiene el texto JSON de las muestras

### Implementación de la historia 4

- [X] T060 [P] [US4] Crear `backend/src/utils/faceCrypto.js` con `encryptSamples(muestras)` → `{ descriptor_cifrado, iv, auth_tag }` (AES-256-GCM con `node:crypto`, `iv` aleatorio de 12 bytes, llave `env.face.key`, contenido `JSON.stringify({ muestras })`) y `decryptSamples({ descriptor_cifrado, iv, auth_tag })` → `muestras` (research R-05)
- [X] T061 [P] [US4] Crear `backend/src/utils/faceMatching.js` con `FACE_DESCRIPTOR_LENGTH = 1024`, `FACE_MODEL_VERSION = 'human-3.3.6-faceres'`, `isValidDescriptor(arreglo)`, `cosineSimilarity(a, b)` (normaliza ambos vectores), `bestSimilarity(descriptor, muestras)` y `bestMatch(descriptor, candidatos, { threshold, margin })` → `{ id_cliente, similitud } | null` según research R-06 (umbral y margen frente al segundo cliente)
- [X] T062 [P] [US4] Crear `backend/src/models/face.model.js` con funciones que **no** seleccionan columnas biométricas: `findActiveStatusByClient(idCliente, connection)` (`id_rostro`, `estado`, `creado_en`, nombre de `registrado_por`) y `lockActiveByClient`; funciones de escritura `insert(datos, connection)` y `deactivate(idRostro, connection)` (pone `estado = 'inactivo'` y `desactivado_en`); y una única función `listActiveEncrypted(connection)` que devuelve `id_cliente`, `descriptor_cifrado`, `iv`, `auth_tag`, `version_modelo` de los registros activos, documentada con un comentario como uso exclusivo de `faces.service.js`
- [X] T063 [P] [US4] Crear `backend/src/validators/faces.validator.js`: `consentimiento` debe ser exactamente `true` ("Confirma que el cliente dio su consentimiento."), `version_modelo` igual a `FACE_MODEL_VERSION`, `muestras` arreglo de exactamente 3 elementos que cumplan `isValidDescriptor`, `estado` igual a `inactivo` en el cambio de estado; los mensajes de error nunca repiten los valores recibidos
- [X] T064 [US4] Crear `backend/src/services/faces.service.js` con `getFaceStatus(idCliente)` → `{ registrado, estado, creado_en, registrado_por }`, `registerFace(idCliente, { muestras, version_modelo }, user)` (transacción: `lockById` del cliente, 404/422 si no existe o está inactivo, comprobar con `bestMatch` contra los registros activos de **otros** clientes y lanzar 422 si cualquier muestra alcanza el umbral, desactivar el registro activo propio si existe, cifrar e insertar, auditoría `rostro.registrar` o `rostro.reemplazar` sin datos biométricos, devolver estado y si fue reemplazo), `deactivateFace(idCliente, user)` (auditoría `rostro.desactivar`) e `identify(descriptor)` → `{ id_cliente, similitud } | null` (descifra los registros activos con la `version_modelo` vigente, ignora y registra en consola un error genérico si alguno no se puede descifrar, y aplica `bestMatch` con `env.face`) (FR-025 a FR-032)
- [X] T065 [US4] Crear `backend/src/controllers/faces.controller.js` (`getStatus`, `register` → 201 si es nuevo o 200 si reemplazó, `changeStatus`) y `backend/src/routes/faces.routes.js` con `Router({ mergeParams: true })` (`GET /`, `PUT /`, `PATCH /status` para administrador y recepcionista) montado en `/clients/:id/face` en `backend/src/routes/index.js`
- [X] T066 [US4] Agregar `rostro_registrado` (booleano) en `getClient` de `backend/src/services/clients.service.js` solo para administrador y recepcionista
- [X] T067 [P] [US4] Crear `frontend/src/face/humanConfig.js` con la configuración de `@vladmandic/human`: `modelBasePath` desde `import.meta.env.VITE_FACE_MODELS_URL ?? '/models'`, `face.enabled`, `face.detector.maxDetected = 2`, `face.description.enabled`, `face.antispoof.enabled`, `face.liveness.enabled`, y `body`, `hand`, `gesture`, `object`, `segmentation`, `face.emotion` y edad/género desactivados; exportar también `QUALITY = { minDetectionScore: 0.8, minFaceWidth: 120, minAntispoof: 0.5, minLiveness: 0.5 }` y `FACE_MODEL_VERSION = 'human-3.3.6-faceres'` (research R-04)
- [X] T068 [US4] Crear `frontend/src/face/faceEngine.js` con `loadFaceEngine()` (crea una sola instancia de `Human`, carga y precalienta los modelos una sola vez y reutiliza la promesa) y `analyzeFrame(video)` → `{ status, descriptor, message }`, donde `status` es `ok`, `no_face`, `multiple_faces`, `too_far`, `low_quality` o `spoof`, `message` es la indicación en español ("Acércate a la cámara", "Solo debe aparecer una persona", "Mejora la iluminación") y `descriptor` es un arreglo normal de 1024 números solo si `status === 'ok'`; ninguna imagen se guarda ni se envía (FR-026, FR-029)
- [X] T069 [P] [US4] Crear `frontend/src/components/CameraView.jsx` que abra la cámara con `navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })`, muestre el video, detenga las pistas al desmontarse y muestre mensajes en español si no hay permiso o no hay cámara (FR-041)
- [X] T070 [P] [US4] Crear `frontend/src/api/faces.js` con `getFaceStatus`, `registerFace`, `deactivateFace`
- [X] T071 [US4] Crear `frontend/src/pages/FaceRegister.jsx`: casilla obligatoria "El cliente dio su consentimiento para registrar su información facial", vista de cámara, botón "Capturar" que exige 3 capturas con `status === 'ok'` mostrando el progreso (1/3, 2/3, 3/3) y la indicación de cada rechazo, envío con `registerFace` y mensaje de éxito o del error 422; si ya existe registro activo, avisar que se reemplazará; agregar la ruta `/clients/:id/face` (administrador y recepcionista) en `frontend/src/App.jsx`
- [X] T072 [US4] Ampliar `frontend/src/pages/ClientDetail.jsx` con la sección "Información facial" (administrador y recepcionista): "Registrada" o "No registrada", fecha y quién la registró, botones "Registrar"/"Reemplazar" y "Desactivar" con `ConfirmDialog`

**Punto de control**: registro facial funcional; ninguna respuesta expone datos biométricos.

---

## Fase 7: Historia de usuario 5 — Identificación facial y validación de acceso (Prioridad: P1)

**Objetivo**: la estación identifica al cliente por su rostro, valida su membresía, muestra el
resultado y registra cada intento (FR-032 a FR-038, FR-041).

**Prueba independiente**: tres clientes de prueba (vigente, vencida y sin rostro) se presentan; solo
el primero es autorizado y los tres intentos quedan registrados con resultado y motivo.

**Depende de**: historias 2 (membresías) y 4 (identificación facial).

### Pruebas de la historia 5

- [X] T073 [P] [US5] Crear `backend/tests/access.test.js` con la tabla de decisión completa de data-model usando descriptores sintéticos: autorizado con membresía vigente; rechazos `rostro_no_identificado` (descriptor desconocido, descriptor `null` y caso ambiguo entre dos clientes), `cliente_inactivo`, `membresia_suspendida`, `membresia_cancelada`, `membresia_vencida`, `sin_membresia_vigente` (sin membresías y con una membresía por iniciar); autorizado con saldo pendiente (el adeudo no interviene); rostro desactivado → `rostro_no_identificado`; cada caso inserta exactamente una fila en `accesos` con `registrado_por`; un segundo intento igual dentro de `ACCESS_DEDUP_SECONDS` no inserta otra fila y devuelve el mismo `id_acceso`; la respuesta autorizada contiene solo `id_acceso`, `resultado`, `cliente.nombre` y `mensaje`, y la rechazada no contiene `motivo`, apellido, membresía ni adeudo; 400 por descriptor de longitud incorrecta; entrenador y cliente reciben 403
- [X] T074 [P] [US5] Crear `frontend/src/tests/AccessStation.test.jsx` con `frontend/src/face/faceEngine.js` y `frontend/src/api/access.js` simulados: muestra "Acceso autorizado. ¡Bienvenido, Luis!" en verde, "Acceso no autorizado. Acude a recepción." en rojo, no envía un segundo intento mientras el rostro siga presente y muestra "No fue posible validar el acceso. Intenta de nuevo o acude a recepción." si la API falla

### Implementación de la historia 5

- [X] T075 [P] [US5] Crear `backend/src/models/access.model.js` con `insert({ id_cliente, id_membresia, resultado, motivo, similitud, registrado_por }, connection)` y `findRecentSame({ id_cliente, resultado, segundos })` (último intento del mismo cliente y resultado con `fecha_hora >= NOW(3) - INTERVAL ? SECOND`); sin funciones de actualización ni borrado (FR-039)
- [X] T076 [P] [US5] Crear `backend/src/validators/access.validator.js` para `POST /access/attempts`: `descriptor` debe ser `null` o cumplir `isValidDescriptor`; el error no repite el valor recibido
- [X] T077 [US5] Crear `backend/src/services/access.service.js` con `registerAttempt({ descriptor }, user)`: llama a `faces.service.identify` (si `descriptor` es `null`, no identifica), lee el cliente y su membresía con `memberships.service.getCurrentMembership`, aplica en orden la tabla "Decisión de acceso" de data-model (el adeudo no interviene), consulta `findRecentSame` con `env.accessDedupSeconds` para no duplicar, inserta en `accesos` y devuelve `{ id_acceso, resultado, cliente: { nombre } | null, mensaje }` con los textos del contrato; mantener este módulo separado del de reconocimiento facial y usar este último solo a través de su servicio (constitución, principio II) (FR-032 a FR-038)
- [X] T078 [US5] Crear `backend/src/controllers/access.controller.js` (`registerAttempt`) y `backend/src/routes/access.routes.js` con `POST /attempts` para administrador y recepcionista, montado en `/access` en `backend/src/routes/index.js`
- [X] T079 [P] [US5] Crear `frontend/src/api/access.js` con `registerAccessAttempt(descriptor)`
- [X] T080 [US5] Crear `frontend/src/pages/AccessStation.jsx` como pantalla completa con `CameraView` y el ciclo de research R-07: carga `loadFaceEngine()` con un mensaje "Preparando la cámara…"; analiza cuadros con `analyzeFrame`; con `status === 'ok'` estable durante ~1 s envía el descriptor; si durante 5 s hay rostro sin captura válida envía `descriptor: null`; muestra el resultado ~4 s en verde o rojo con texto grande; no vuelve a evaluar hasta que `analyzeFrame` devuelva `no_face`; ante errores de cámara o de red nunca muestra "autorizado" (FR-036, FR-038, FR-041)
- [X] T081 [US5] Agregar la ruta `/access/station` (administrador y recepcionista) en `frontend/src/App.jsx` fuera del `Layout` para que ocupe toda la pantalla pero dentro de `ProtectedRoute`, con un botón "Salir de la estación", y la opción "Estación de acceso" en el menú de `frontend/src/components/Layout.jsx`

**Punto de control**: flujo demostrable completo (pasos 1 a 17 de `docs/sprint-2.md`).

---

## Fase 8: Historia de usuario 6 — Renovación de membresía (Prioridad: P2)

**Objetivo**: renovar encadenando el nuevo periodo sin perder días ni traslapar (FR-010, FR-011).

**Prueba independiente**: se renueva una membresía vigente y la nueva inicia el día siguiente al fin
de la actual.

**Depende de**: historia 2.

### Pruebas de la historia 6

- [X] T082 [P] [US6] Crear `backend/tests/memberships-renew.test.js`: renovación de una vigente (inicio = fin anterior + 1, auditoría `membresia.renovar`); de una vencida (inicio hoy o la fecha indicada, nunca pasada); de una cancelada (como asignación nueva); doble renovación encadenada al fin de la última; renovación de una suspendida con fin futuro (se encadena después); el historial conserva todas las membresías; tipo inactivo → 422; entrenador → 403

### Implementación de la historia 6

- [X] T083 [US6] Agregar `renewMembership(idCliente, { id_tipo_membresia, fecha_inicio }, user)` en `backend/src/services/memberships.service.js` según data-model, "Renovación": transacción con `lockById` del cliente, `findLastNotCancelled`; si su `fecha_fin >= today()`, inicio = `addDays(fecha_fin, 1)`; si no, `fecha_inicio` indicada o hoy (422 si es anterior a hoy); validar traslape, copiar `monto` y auditar `membresia.renovar`
- [X] T084 [US6] Agregar `renew` en `backend/src/controllers/memberships.controller.js` y la ruta `POST /renew` (administrador y recepcionista) en `clientMembershipsRouter` de `backend/src/routes/memberships.routes.js`
- [X] T085 [US6] Agregar el modo renovación en `frontend/src/pages/MembershipForm.jsx` (muestra la fecha de inicio calculada: "Iniciará el <fecha>, al terminar la membresía actual") con la ruta `/clients/:id/memberships/renew` en `frontend/src/App.jsx`, y el botón "Renovar" en la sección de membresías de `frontend/src/pages/ClientDetail.jsx`

**Punto de control**: renovación funcional; las historias 1 a 5 siguen pasando.

---

## Fase 9: Historia de usuario 7 — Consulta de pagos y adeudos (Prioridad: P2)

**Objetivo**: el administrador consulta el historial general de pagos y los adeudos; el cliente ve
sus propios pagos y su adeudo (FR-020, FR-021, FR-023, FR-024).

**Prueba independiente**: con membresías pagadas total y parcialmente, el historial filtrado y la
lista de adeudos coinciden con el cálculo manual.

**Depende de**: historia 3.

### Pruebas de la historia 7

- [ ] T086 [P] [US7] Crear `backend/tests/debts.test.js`: `GET /payments` filtra por cliente, rango de fechas, método y estado y devuelve `meta.total_pagado` correcto; rango `desde > hasta` o de más de 366 días → 400; `GET /debts` lista solo clientes con adeudo > 0 ordenados de mayor a menor, con `total_adeudo` correcto y sin contar membresías canceladas ni pagos anulados; recepcionista, entrenador y cliente reciben 403 en ambos; `GET /clients/me` del rol cliente trae `pagos` y `adeudo` propios y nunca de otro cliente; el entrenador recibe 403 en cualquier endpoint de pagos

### Implementación de la historia 7

- [ ] T087 [US7] Agregar en `backend/src/models/payment.model.js` `list(filtros)`, `count(filtros)` y `sumPaid(filtros)` con filtros parametrizados (`id_cliente`, `desde`, `hasta`, `metodo_pago`, `estado`), y en un nuevo `backend/src/models/debt.model.js` `listDebtors({ search, limit, offset })`, `countDebtors` y `totalDebt`, calculando el saldo por membresía no cancelada con `monto − SUM(pagos 'pagado')`
- [ ] T088 [P] [US7] Agregar en `backend/src/validators/payments.validator.js` las reglas de `GET /payments` (`id_cliente` entero, `desde`/`hasta` fechas válidas con `desde ≤ hasta` y rango máximo de 366 días, `metodo_pago`, `estado` en `pagado|cancelado`, paginación) y de `GET /debts` (`search`, paginación)
- [ ] T089 [US7] Agregar `listPayments(filtros)` y `listDebts(filtros)` en `backend/src/services/payments.service.js`, y llenar `pagos` y `adeudo` en `getOwnProfile` de `backend/src/services/clients.service.js` (identificador tomado siempre de `req.user.id_cliente`)
- [ ] T090 [US7] Agregar `list` y `listDebts` en `backend/src/controllers/payments.controller.js`, las rutas `GET /payments` (solo administrador) en `backend/src/routes/payments.routes.js` y `GET /debts` (solo administrador) montada en `/debts` en `backend/src/routes/index.js`
- [ ] T091 [P] [US7] Agregar `listPayments` y `listDebts` en `frontend/src/api/payments.js`
- [ ] T092 [US7] Crear `frontend/src/pages/Payments.jsx` (filtros, tabla con `Money` y `StatusBadge`, total pagado, `Pagination`) y `frontend/src/pages/Debts.jsx` (búsqueda, clientes con adeudo y desglose por membresía, total adeudado, enlace a la ficha del cliente); agregar las rutas `/payments` y `/debts` (solo administrador) en `frontend/src/App.jsx` y las opciones "Pagos" y "Adeudos" en `frontend/src/components/Layout.jsx`
- [ ] T093 [P] [US7] Reemplazar en `frontend/src/pages/Profile.jsx` el texto "Disponible próximamente" de los pagos por la lista de pagos propios y el adeudo con `Money`

**Punto de control**: control financiero consultable; el cliente ve solo lo suyo.

---

## Fase 10: Historia de usuario 8 — Consulta de accesos (Prioridad: P2)

**Objetivo**: consultar los registros de acceso con filtros y proyección por rol (FR-039, FR-040).

**Prueba independiente**: tras varios intentos, el recepcionista filtra los rechazados del día y ve
cada uno con su motivo.

**Depende de**: historia 5 (genera los registros); las pruebas pueden crear accesos directamente.

### Pruebas de la historia 8

- [ ] T094 [P] [US8] Crear `backend/tests/access-query.test.js`: `GET /access` sin filtros devuelve solo los de hoy; filtros por rango, cliente, resultado y motivo; los de `rostro_no_identificado` llegan con `cliente: null`; el administrador recibe `similitud` y el recepcionista y el entrenador no; el entrenador no recibe datos financieros; el cliente recibe 403 en `GET /access` y en `GET /clients/me/access` solo ve los suyos sin `similitud` ni `registrado_por`; no existen `PATCH` ni `DELETE` sobre `/access/:id` (404); con 10 000 filas insertadas en bloque, filtrar los rechazados de un día responde en menos de 1 s (SC-010)

### Implementación de la historia 8

- [ ] T095 [US8] Agregar en `backend/src/models/access.model.js` `list(filtros)` y `count(filtros)` con filtros parametrizados (`desde`, `hasta`, `id_cliente`, `resultado`, `motivo`), orden `fecha_hora` descendente y uniones con `clientes` y `usuarios`
- [ ] T096 [P] [US8] Agregar en `backend/src/validators/access.validator.js` las reglas de `GET /access` y `GET /clients/me/access` (fechas válidas con `desde ≤ hasta`, `resultado` en `autorizado|rechazado`, `motivo` dentro del `ENUM`, paginación)
- [ ] T097 [US8] Agregar `listAccesses(filtros, user)` (por omisión el día de hoy en `env.timezone`; `similitud` solo para administrador) y `listOwnAccesses(user, paginacion)` en `backend/src/services/access.service.js`
- [ ] T098 [US8] Agregar `list` y `listOwn` en `backend/src/controllers/access.controller.js`, la ruta `GET /` (administrador, recepcionista y entrenador) en `backend/src/routes/access.routes.js` y `GET /me/access` (solo cliente, antes de `/:id`) en `backend/src/routes/clients.routes.js`
- [ ] T099 [P] [US8] Agregar `listAccesses` y `listOwnAccesses` en `frontend/src/api/access.js`
- [ ] T100 [US8] Crear `frontend/src/pages/Accesses.jsx` (filtros por fechas, cliente, resultado y motivo; tabla con fecha y hora, cliente o "No identificado", `StatusBadge` del resultado, motivo con los textos del contrato y similitud solo para administrador; `Pagination`), agregar la ruta `/access` (administrador, recepcionista y entrenador) en `frontend/src/App.jsx` y la opción "Accesos" en `frontend/src/components/Layout.jsx`
- [ ] T101 [P] [US8] Agregar en `frontend/src/pages/Profile.jsx` la sección "Mis accesos" con los accesos propios paginados

**Punto de control**: todas las historias funcionan de forma independiente.

---

## Fase 11: Pulido y aspectos transversales

**Propósito**: verificaciones que cruzan varias historias, documentación y validación final.

- [ ] T102 [P] Crear `backend/tests/permissions-sprint2.test.js` que recorra la matriz de permisos de [contracts/api.md](./contracts/api.md) con los cuatro roles para todos los endpoints nuevos y verifique 403 en cada combinación no permitida (SC-009)
- [ ] T103 [P] Crear `backend/tests/biometric-exposure.test.js` que registre rostros, ejecute intentos de acceso y consulte `/clients/:id`, `/clients/:id/face`, `/access`, `/access/attempts`, `/clients/me` y `/clients/me/access` con todos los roles, y verifique de forma recursiva que ninguna respuesta contiene arreglos numéricos de más de 16 elementos ni las claves `descriptor`, `muestras`, `descriptor_cifrado`, `iv` o `auth_tag`; verificar también que la tabla `auditoria` no contiene esas claves (SC-007)
- [ ] T104 [P] Actualizar `README.md` en español: nuevas variables de entorno, cómo generar y resguardar `FACE_DATA_KEY`, uso de la cámara en `http://localhost`, apertura de la estación de acceso, calibración del umbral y enlace a `specs/002-membresias-pagos-acceso/quickstart.md`
- [ ] T105 [P] Actualizar `database/README.md` con las migraciones 003 y 004 y la advertencia de que los rostros cifrados no sirven sin la misma `FACE_DATA_KEY`
- [ ] T106 Revisar con `git grep -nE "require\(|module\.exports" -- backend database frontend/scripts` que no hay CommonJS, que no existen `client/`, `server/` ni `dataBase/` y que `@vladmandic/human` solo está en `frontend/package.json` con versión exacta
- [ ] T107 Ejecutar `npm test` en `backend/` y en `frontend/` y corregir los fallos hasta que todas las pruebas pasen
- [ ] T108 Ejecutar el recorrido manual de la sección 4 de [quickstart.md](./quickstart.md) (pasos 1 a 26) y anotar en esa misma tabla cualquier desviación (SC-001, SC-002, SC-011)
- [ ] T109 Ejecutar la calibración de la sección 5 de [quickstart.md](./quickstart.md) con al menos 10 clientes y 20 personas no registradas, ajustar `FACE_MATCH_THRESHOLD` y `FACE_MATCH_MARGIN` hasta cumplir SC-003 y SC-004, y anotar los valores finales y el modelo de cámara en `backend/.env.example`, `README.md` y la sección "Decisiones pendientes" de [research.md](./research.md)
- [ ] T110 [P] Actualizar `docs/sprint-2.md` sección 9 marcando cada decisión pendiente como resuelta, con la decisión y un enlace a la sección correspondiente de `specs/002-membresias-pagos-acceso/research.md` (librería, lugar de procesamiento, captura, almacenamiento y protección de descriptores, sin imágenes, umbral calibrado, iluminación mínima, cámara de pruebas, intentos fallidos y mensaje, métodos de pago, pagos parciales, suspensión, sin tolerancia, renovación anticipada y acciones de auditoría); y agregar a `docs/project-context.md` las reglas de negocio nuevas confirmadas en T002 (abonos, adeudo sin bloqueo, suspensión sin compensación de días, sin periodo de tolerancia) (constitución, principio I)

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Configuración (Fase 1)**: sin dependencias. T002 y T003 son compuertas de aprobación del equipo: ninguna tarea posterior debe empezar hasta resolverlas.
- **Fundamentos (Fase 2)**: depende de la Fase 1 y **bloquea todas las historias**.
- **Historia 1 (Fase 3)**: depende solo de la Fase 2. Es el MVP: sin tipos de membresía no hay nada
  que asignar.
- **Historia 2 (Fase 4)**: depende de la Fase 2; para probar desde la interfaz necesita tipos
  (historia 1), pero las pruebas automáticas crean tipos con `factories.js`.
- **Historia 3 (Fase 5)**: depende de la historia 2 (`membership.model.js` y
  `memberships.service.js`).
- **Historia 4 (Fase 6)**: depende solo de la Fase 2; se puede hacer en paralelo con las historias
  1 a 3.
- **Historia 5 (Fase 7)**: depende de las historias 2 (`getCurrentMembership`) y 4 (`identify`).
- **Historia 6 (Fase 8)**: depende de la historia 2.
- **Historia 7 (Fase 9)**: depende de la historia 3.
- **Historia 8 (Fase 10)**: depende de la tabla `accesos` (Fase 2) y de `access.model.js` (T075 de la
  historia 5).
- **Pulido (Fase 11)**: depende de todas las historias.

### Dentro de cada historia

- Las pruebas se escriben primero y deben fallar antes de implementar.
- Modelos y validadores → servicios → controladores → rutas → API del frontend → páginas.
- Archivos compartidos que varias historias amplían en orden (no en paralelo):
  `backend/src/routes/index.js`, `backend/src/services/clients.service.js`,
  `backend/src/services/memberships.service.js`, `backend/src/models/membership.model.js`,
  `backend/src/models/payment.model.js`, `backend/src/services/payments.service.js`,
  `backend/src/models/access.model.js`, `backend/src/services/access.service.js`,
  `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx`,
  `frontend/src/pages/ClientDetail.jsx`, `frontend/src/pages/Profile.jsx`.

### Oportunidades de paralelismo

- Fase 1: T004 a T008 en paralelo después de las compuertas T002 y T003 (T001 primero).
- Fase 2: T012 a T016 y T018 a T022 en paralelo; T017 después de T016; T023 al final.
- Después de la Fase 2: la historia 4 (rostros) en paralelo con las historias 1 → 2 → 3.
- Después de la historia 2: las historias 3 y 6 en paralelo (archivos distintos salvo
  `memberships.service.js`, que solo toca la 6).
- Las tareas de prueba [P] de cada historia en paralelo entre sí.

---

## Ejemplo de paralelismo: historia de usuario 4

```text
Tarea: "T057 Pruebas de cifrado en backend/tests/face-crypto.unit.test.js"
Tarea: "T058 Pruebas de comparación en backend/tests/face-matching.unit.test.js"
Tarea: "T059 Pruebas de la API facial en backend/tests/faces.test.js"

Tarea: "T060 Cifrado AES-256-GCM en backend/src/utils/faceCrypto.js"
Tarea: "T061 Similitud y umbral en backend/src/utils/faceMatching.js"
Tarea: "T062 Modelo en backend/src/models/face.model.js"
Tarea: "T063 Validador en backend/src/validators/faces.validator.js"
Tarea: "T067 Configuración de Human en frontend/src/face/humanConfig.js"
Tarea: "T069 Cámara en frontend/src/components/CameraView.jsx"
```

## Ejemplo de paralelismo: historia de usuario 3

```text
Tarea: "T047 Pruebas de pagos en backend/tests/payments.test.js"
Tarea: "T048 Pruebas del formulario en frontend/src/tests/PaymentForm.test.jsx"
Tarea: "T049 Modelo en backend/src/models/payment.model.js"
Tarea: "T050 Validador en backend/src/validators/payments.validator.js"
Tarea: "T054 API del frontend en frontend/src/api/payments.js"
```

---

## Estrategia de implementación

### MVP primero (historia 1)

1. Completar la Fase 1 (configuración).
2. Completar la Fase 2 (fundamentos; bloquea todo).
3. Completar la Fase 3 (historia 1: tipos de membresía).
4. **Detenerse y validar** con su prueba independiente.

### Entrega incremental

1. Fases 1 y 2 → base lista.
2. Historia 1 → catálogo de tipos (MVP).
3. Historia 2 → asignación y estados.
4. Historia 3 → pagos (flujo asignar → pagar).
5. Historia 4 → registro facial.
6. Historia 5 → estación de acceso (**flujo demostrable del sprint completo**).
7. Historias 6, 7 y 8 → renovación, consultas financieras y consulta de accesos.
8. Fase 11 → permisos, exposición biométrica, calibración y documentación.

### Equipo en paralelo

1. Todo el equipo completa juntos las Fases 1 y 2.
2. Después:
   - Persona A: historias 1 → 2 → 3 → 7.
   - Persona B: historia 4 → historia 5 (cuando la historia 2 esté lista) → historia 8.
   - Persona C: historia 6 (cuando la historia 2 esté lista) y luego la Fase 11.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- La etiqueta [USn] relaciona cada tarea con su historia para mantener la trazabilidad
  (constitución, principio I).
- Hacer commit después de cada tarea o grupo lógico con Conventional Commits en español, por ejemplo
  `feat(memberships): agregar asignación de membresías sin traslapes`.
- Detenerse en cada punto de control para validar la historia de forma independiente.
- Las aclaraciones de `spec.md` se confirman en T002, antes de implementar; si el equipo cambia
  alguna, revisar primero T051, T077 y T080.
