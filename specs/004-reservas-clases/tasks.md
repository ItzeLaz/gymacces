---

description: "Lista de tareas de la feature 004: reservas de clases grupales"
---

# Tareas: Reservas de clases grupales

**Entrada**: documentos de diseño en `specs/004-reservas-clases/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

**Pruebas**: se incluyen porque la constitución (principio II) exige una prueba automática por cada
regla de negocio del backend y `npm test` en verde antes de cada commit de implementación. Hay una
tarea de prueba por cada criterio EARS del spec (principio VI), escrita **antes** de su
implementación y comprobada en rojo. Backend con `node:test` + `supertest`; frontend con Vitest +
Testing Library. Los nombres de las pruebas y los mensajes de aserción van en español.

**Organización**: las tareas se agrupan por historia de usuario. Orden de las fases:

1. US1 (P1).
2. US2 (P1).
3. US4 (P2).
4. US3 (P2).
5. US5 (P3).

US4 va antes que US3 porque las dos son P2 y US4 crea la pantalla de la sesión donde viven la
cancelación (US3) y la asistencia (US5).

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]…[US5]**: historia de usuario de `spec.md`.
- **US1-5** = historia 1, criterio de aceptación 5 del spec.
- Cada tarea indica:
  - El archivo que toca.
  - **Atiende**: la historia o el criterio, el requisito (FR-xxx) o la decisión de research
    (R-xx).
  - **Verificación**: cómo se comprueba (prueba, comando o revisión).

## Convenciones obligatorias para todas las tareas

- **Código del backend** (las mismas convenciones de los Sprints 1 a 3):
  - ES Modules con extensión `.js`, sin CommonJS.
  - SQL solo en `backend/src/models/`, con `connection.execute(sql, params)` y consultas
    parametrizadas.
  - Reglas de negocio en `backend/src/services/`; controladores delgados.
  - Respuestas `{ data }` y `{ error }` con los helpers de `utils/response.js` y `utils/AppError.js`.
- **Idioma**: identificadores, rutas y archivos en inglés; textos, comentarios y pruebas en español
  (`AGENTS.md`).
- **Tiempo**: la fecha y la hora actuales se obtienen solo con `nowInGym()` y `today()` de
  `backend/src/utils/dates.js` (research R-05). **Ninguna consulta nueva usa `NOW()` ni
  `CURDATE()`.**
- **Mensajes**: se copian textualmente de [contracts/api.md](./contracts/api.md) y terminan en punto
  (research R-08).
- **Transacciones**: toda escritura usa `withTransaction` de `backend/src/config/db.js` y registra
  la auditoría con la misma conexión.
- **Bloqueos**: al reservar, siempre en el orden cliente → clase (research R-02).
- **Dependencias**: no se agregan en `backend/`, `frontend/` ni `database/` (research R-09).
- **Antes de cada commit de implementación**: `cd backend && npm test` en verde; si se tocó
  `frontend/`, también `cd frontend && npm test` (principio II).

---

## Fase 1: Configuración inicial

**Propósito**: confirmar el punto de partida y documentar la ampliación de alcance.

- [ ] T001 Confirmar que la rama es `004-reservas-clases`, que `git status` está limpio y que `npm test` pasa en `backend/` y `frontend/` antes de tocar código (línea base). **Atiende**: principio II. **Verificación**: comandos `git branch --show-current`, `git status` y `npm test` en ambas carpetas sin fallos.
- [ ] T002 [P] Actualizar `docs/project-context.md`:
  - En la sección 4 (Alcance), agregar "Clases grupales y reservas" como ampliación posterior al MVP.
  - Agregar la sección "7.11 Clases grupales y reservas" con las funciones de US1 a US5.
  - Agregar las reglas RN-18 (cupo máximo por sesión), RN-19 (membresía vigente en la fecha de la sesión), RN-20 (sin reservas duplicadas ni empalmadas), RN-21 (cancelación solo antes del inicio) y RN-22 (asistencia el mismo día desde la hora de inicio).

  **Atiende**: principio VIII, "Justificación de alcance" del spec. **Verificación**: revisión contra `spec.md`; ninguna regla contradice los criterios EARS.
- [ ] T003 [P] Crear `docs/sprint-4.md` con el mismo formato de `docs/sprint-3.md`:
  - Objetivo.
  - Historias US1 a US5 con su prioridad.
  - Tablas nuevas `clases` y `reservas`.
  - Flujo demostrable (los escenarios de `quickstart.md`).
  - Sección "Fuera de alcance", copiada de los Supuestos del spec.

  **Atiende**: principio VIII. **Verificación**: revisión; el documento enlaza a `specs/004-reservas-clases/spec.md`.
- [ ] T004 Documentar el estado de la ampliación de alcance en `docs/sprint-4.md` (sección "Aprobación") y en el punto "Aprobación" de la sección "Ampliación de alcance" de `specs/004-reservas-clases/plan.md`: la decisión la tomó la autora de la rama para su reporte individual y la aprobación formal del equipo queda pendiente. Esta tarea **no bloquea** la implementación. **Atiende**: principio VIII y gobernanza (hallazgo C1 de `/speckit-analyze`). **Verificación**: revisión; `docs/sprint-4.md`, el punto "Aprobación" y la fila VIII de la Verificación de la constitución dicen lo mismo.

---

## Fase 2: Fundamentos (prerrequisitos que bloquean todo)

**Propósito**: migración, utilidades de tiempo y sesiones, auditoría, fábricas de prueba y routers
vacíos.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase.

- [ ] T005 Actualizar `backend/tests/database.test.js`: agregar `'clases'` y `'reservas'` a `SPRINT_TABLES` en orden alfabético (después de `'auditoria'` y después de `'pagos'`, respectivamente). Agregar estas pruebas:
  - `la_restriccion_unica_impide_dos_reservas_activas_del_mismo_cliente_en_la_sesion`.
  - `una_reserva_cancelada_no_bloquea_una_nueva_reserva_del_mismo_cliente`.
  - `la_base_rechaza_una_clase_que_termina_despues_de_la_medianoche`.

  Usar `expectRejected`. **Atiende**: R-02, R-06, FR-005, principio IV. **Verificación**: `npm test` falla (en rojo) hasta terminar T006.
- [ ] T006 Crear `database/migrations/006_create_clases_reservas.sql` sin modificar las migraciones 001 a 005. Todas las tablas con `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` y llaves foráneas `ON DELETE RESTRICT ON UPDATE RESTRICT`.

  **Tabla `clases`**:
  - Columnas:
    - `id_clase INT UNSIGNED NOT NULL AUTO_INCREMENT`
    - `nombre VARCHAR(80) NOT NULL`
    - `id_instructor INT UNSIGNED NOT NULL`
    - `dia_semana TINYINT UNSIGNED NOT NULL`
    - `hora_inicio TIME NOT NULL`
    - `duracion_minutos SMALLINT UNSIGNED NOT NULL`
    - `cupo_maximo SMALLINT UNSIGNED NOT NULL`
    - `estado ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa'`
    - `creado_por INT UNSIGNED NOT NULL`
    - `creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
    - `actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  - Restricciones CHECK:
    - `CHECK (CHAR_LENGTH(TRIM(nombre)) > 0)`
    - `CHECK (dia_semana BETWEEN 1 AND 7)`
    - `CHECK (hora_inicio >= '00:00:00' AND hora_inicio < '24:00:00')`
    - `CHECK (duracion_minutos BETWEEN 15 AND 240)`
    - `CHECK (cupo_maximo BETWEEN 1 AND 100)`
    - `chk_clases_mismo_dia CHECK (TIME_TO_SEC(hora_inicio) + duracion_minutos * 60 <= 86400)`
  - Llaves foráneas: `id_instructor` y `creado_por` → `usuarios(id_usuario)`.
  - Índices: `KEY idx_clases_dia_estado (dia_semana, estado, hora_inicio)`, `KEY idx_clases_instructor_dia (id_instructor, dia_semana, estado)` y `KEY idx_clases_creado_por (creado_por)`.

  **Tabla `reservas`**:
  - Columnas:
    - `id_reserva INT UNSIGNED NOT NULL AUTO_INCREMENT`
    - `id_clase INT UNSIGNED NOT NULL`
    - `fecha_sesion DATE NOT NULL`
    - `id_cliente INT UNSIGNED NOT NULL`
    - `estado ENUM('activa', 'cancelada') NOT NULL DEFAULT 'activa'`
    - `asistencia ENUM('sin_registrar', 'presente') NOT NULL DEFAULT 'sin_registrar'`
    - `registrada_en_curso TINYINT(1) NOT NULL DEFAULT 0`
    - `clave_activa TINYINT UNSIGNED AS (IF(estado = 'activa', 1, NULL)) STORED`
    - `registrado_por INT UNSIGNED NOT NULL`
    - `creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
    - `cancelado_por INT UNSIGNED NULL`
    - `cancelado_en DATETIME NULL`
    - `asistencia_por INT UNSIGNED NULL`
    - `asistencia_en DATETIME NULL`
  - Restricciones CHECK:
    - `CHECK (registrada_en_curso IN (0, 1))`
    - `chk_reservas_cancelacion CHECK ((estado = 'activa' AND cancelado_por IS NULL AND cancelado_en IS NULL) OR (estado = 'cancelada' AND cancelado_por IS NOT NULL AND cancelado_en IS NOT NULL))`
    - `chk_reservas_asistencia CHECK ((asistencia = 'sin_registrar' AND asistencia_por IS NULL AND asistencia_en IS NULL) OR (asistencia = 'presente' AND asistencia_por IS NOT NULL AND asistencia_en IS NOT NULL))`
    - `chk_reservas_cancelada_sin_asistencia CHECK (NOT (estado = 'cancelada' AND asistencia = 'presente'))`
  - Llaves foráneas: `id_clase` → `clases(id_clase)`; `id_cliente` → `clientes(id_cliente)`; `registrado_por`, `cancelado_por` y `asistencia_por` → `usuarios(id_usuario)`.
  - Índices: `UNIQUE KEY uq_reservas_sesion_cliente_activa (id_clase, fecha_sesion, id_cliente, clave_activa)`, `KEY idx_reservas_cliente_fecha (id_cliente, fecha_sesion, estado)` y `KEY idx_reservas_clase_fecha_estado (id_clase, fecha_sesion, estado)`.

  **Atiende**: FR-001 a FR-010, R-01, R-02, R-06, principio IV. **Verificación**:
  - `cd database && npm run db:migrate && npm run db:check-encoding` sin errores.
  - `SHOW CREATE TABLE reservas` muestra el índice único.
  - `cd backend && npm test` pone T005 en verde.
- [ ] T007 [P] Documentar las tablas `clases` y `reservas` y la migración 006 en `database/README.md`. **Atiende**: principio IV. **Verificación**: revisión.
- [ ] T008 [P] Agregar en `backend/tests/utils.unit.test.js` las pruebas `now_in_gym_devuelve_fecha_y_minutos_locales` (por ejemplo, `2026-10-19T13:05:00Z` → `{ fecha: '2026-10-19', minutos: 425 }` en `America/Mexico_City`) y `now_in_gym_cambia_de_dia_segun_la_zona_del_gimnasio`. **Atiende**: R-05, FR-014. **Verificación**: `npm test` en rojo hasta T009.
- [ ] T009 Implementar `nowInGym(date = new Date())` en `backend/src/utils/dates.js` con `Intl.DateTimeFormat` y `env.timezone`. Devuelve `{ fecha: 'AAAA-MM-DD', minutos }`, donde `minutos` son los minutos desde la medianoche local. **Atiende**: R-05, FR-014. **Verificación**: T008 en verde.
- [ ] T010 [P] Crear `backend/tests/sessions.unit.test.js` con pruebas de las funciones puras de `utils/sessions.js`:
  - `se_empalman_intervalos_que_se_cruzan` y `no_se_empalman_clases_contiguas` (08:00–09:00 y 09:00–10:00).
  - `estado_de_sesion_pendiente_en_curso_y_terminada`.
  - `la_ventana_de_reserva_incluye_hoy_y_hoy_mas_siete` y `rechaza_ayer_y_hoy_mas_ocho`.
  - `fechas_de_sesion_de_una_clase_por_dia_iso` (lunes = 1, domingo = 7).
  - `termina_el_mismo_dia` (23:00 + 60 → sí; 23:30 + 45 → no).
  - `convierte_hhmm_a_minutos_y_de_regreso`.

  **Atiende**: R-03, R-05, R-06. **Verificación**: `npm test` en rojo hasta T011.
- [ ] T011 Crear `backend/src/utils/sessions.js` con estas funciones puras, sin acceso a la base:
  - `toMinutes(hhmm)` y `toHHMM(minutos)`.
  - `overlaps(inicioA, finA, inicioB, finB)`, con intervalos semiabiertos.
  - `endsSameDay(inicioMin, duracion)`.
  - `isoWeekday(fecha)`.
  - `sessionDates(diaSemana, desde, hasta)`.
  - `bookingWindow(hoy)`, que devuelve `[hoy, hoy + 7]`.
  - `sessionState(fechaSesion, inicioMin, finMin, ahora)`, que devuelve `pendiente`, `en_curso` o `terminada`.

  Usar `addDays` de `utils/dates.js`. **Atiende**: R-01, R-03, R-05, R-06. **Verificación**: T010 en verde.
- [ ] T012 [P] Agregar a `AUDIT_ACTIONS` de `backend/src/services/audit.service.js` las acciones `CLASS_CREATE: 'clase.crear'`, `CLASS_UPDATE: 'clase.modificar'`, `CLASS_DEACTIVATE: 'clase.desactivar'`, `RESERVATION_CREATE: 'reserva.registrar'` y `RESERVATION_CANCEL: 'reserva.cancelar'`. **Atiende**: FR-012. **Verificación**: `npm test` sigue en verde; revisión del catálogo.
- [ ] T013 [P] Agregar a `backend/tests/helpers/factories.js`:
  - `createTrainer(datos)`: usa `createUser` con `rol: 'entrenador'`.
  - `createClass({ id_instructor, creado_por, ...datos })`: inserta con SQL directo. Valores por omisión: `nombre 'Spinning'`, `dia_semana` del día de mañana, `hora_inicio '07:00'`, `duracion_minutos 45`, `cupo_maximo 20`.
  - `createReservation({ id_clase, fecha_sesion, id_cliente, registrado_por, ...datos })`: inserta con SQL directo.

  **Atiende**: R-10. **Verificación**: `node --check backend/tests/helpers/factories.js` sin errores; lo usan las pruebas de las fases siguientes.
- [ ] T014 [P] Crear `backend/src/models/class.model.js` con:
  - Un `VIEW_SELECT` que una `clases` con `usuarios` para obtener el nombre del instructor y devuelva `hora_inicio` como `HH:MM`.
  - `findById(id, connection = pool)`.
  - `lockById(id, connection)`, con `SELECT ... FOR UPDATE`.

  **Atiende**: R-02, FR-002. **Verificación**: revisión; lo cubren las pruebas de US1 y US2.
- [ ] T015 [P] Crear `backend/src/models/reservation.model.js` con `countActiveBySession(idClase, fechaSesion, connection = pool)` (`COUNT(*)` con `estado = 'activa'`). **Atiende**: FR-004, FR-008. **Verificación**: revisión; lo cubren las pruebas de US1 y US2.
- [ ] T016 Crear los routers `backend/src/routes/classes.routes.js` (`classesRouter`) y `backend/src/routes/reservations.routes.js` (`reservationsRouter`), ambos con `router.use(authenticate)` y todavía sin rutas. Montarlos en `backend/src/routes/index.js` como `apiRouter.use('/classes', classesRouter)` y `apiRouter.use('/reservations', reservationsRouter)`. **Atiende**: R-04, FR-011. **Verificación**: `npm test` en verde; `curl http://localhost:3000/api/classes` sin token responde 401.

**Punto de control**: migración aplicada, utilidades probadas y routers montados. Las historias
pueden comenzar.

---

## Fase 3: Historia de usuario 1 — Registro del horario semanal de clases (Prioridad: P1) 🎯 MVP

**Objetivo**: el administrador registra, modifica y desactiva clases semanales con un entrenador
activo, sin empalmes ni cupos inválidos.

**Prueba independiente**:
- El administrador registra "Spinning", lunes 07:00, 45 min, cupo 20, y la clase aparece en
  `GET /classes`.
- Un recepcionista recibe 403 al intentar registrarla.

### Pruebas de la historia 1 (escribir primero y comprobar que fallan) ⚠️

Todas en `backend/tests/classes.test.js`, salvo la de permisos. Una prueba por criterio EARS.

- [ ] T017 [US1] Prueba `registra_clase_valida_como_activa_con_mensaje_clase_registrada`: `POST /classes` → 201, `estado: 'activa'`, `message: 'Clase registrada.'`, y la clase aparece en `GET /classes`. **Atiende**: US1-1, FR-001. **Verificación**: `npm test` en rojo.
- [ ] T018 [US1] Prueba `rechaza_clase_sin_datos_obligatorios_indicando_el_campo`: un caso por campo faltante; 400 con `details.<campo>`. **Atiende**: US1-2. **Verificación**: `npm test` en rojo.
- [ ] T019 [US1] Prueba `rechaza_duracion_fuera_de_15_a_240_minutos`: 14 y 241 → 400 "La duración debe estar entre 15 y 240 minutos."; 15 y 240 se aceptan. **Atiende**: US1-3. **Verificación**: `npm test` en rojo.
- [ ] T020 [US1] Prueba `rechaza_cupo_fuera_de_1_a_100_lugares`: 0 y 101 → 400 "El cupo debe estar entre 1 y 100 lugares."; 1 y 100 se aceptan. **Atiende**: US1-4. **Verificación**: `npm test` en rojo.
- [ ] T021 [US1] Prueba `rechaza_clase_si_el_instructor_tiene_otra_que_se_empalma`:
  - Al registrar, 07:30 contra 07:00–07:45 → 422 "El instructor ya tiene una clase en ese horario.".
  - Al modificar, mover otra clase a ese horario → mismo error.
  - Una clase contigua (07:45) sí se acepta.

  **Atiende**: US1-5, R-03. **Verificación**: `npm test` en rojo.
- [ ] T022 [US1] Prueba `rechaza_instructor_inexistente_inactivo_o_sin_rol_entrenador`: tres casos → 422 "El instructor debe ser un entrenador activo.". **Atiende**: US1-6. **Verificación**: `npm test` en rojo.
- [ ] T023 [US1] Prueba `lista_de_instructores_solo_incluye_entrenadores_activos`: `GET /classes/instructors` no incluye administradores, recepcionistas ni entrenadores inactivos. **Atiende**: US1-7. **Verificación**: `npm test` en rojo.
- [ ] T024 [US1] Prueba `modificar_nombre_instructor_o_aumentar_cupo_se_aplica_a_sesiones_futuras`: `PATCH /classes/:id` → 200 con los valores nuevos, aunque la clase tenga reservas futuras. **Atiende**: US1-8. **Verificación**: `npm test` en rojo.
- [ ] T025 [US1] Prueba `rechaza_reducir_cupo_por_debajo_de_las_reservas_existentes`:
  - Con 2 reservas activas en una sesión futura, el cupo 1 → 422 "El cupo no puede ser menor que las reservas existentes (2).".
  - Las reservas canceladas y las de sesiones pasadas no cuentan.

  **Atiende**: US1-9, FR-010. **Verificación**: `npm test` en rojo.
- [ ] T026 [US1] Prueba `rechaza_cambiar_horario_de_clase_con_reservas_activas`: cambiar `dia_semana`, `hora_inicio` o `duracion_minutos` → 422 "No se puede cambiar el horario de una clase con reservas activas."; sin reservas activas futuras, el cambio se acepta. **Atiende**: US1-10, FR-010. **Verificación**: `npm test` en rojo.
- [ ] T027 [US1] Prueba `rechaza_desactivar_clase_con_reservas_activas`: `PATCH /classes/:id/status` → 422 "No se puede desactivar una clase con reservas activas."; sin reservas futuras → 200 `estado: 'inactiva'`. **Atiende**: US1-11, FR-010. **Verificación**: `npm test` en rojo.
- [ ] T028 [US1] Prueba `clase_desactivada_no_aparece_para_recepcion`: `GET /classes` como recepcionista no la incluye; el administrador la ve con `?estado=inactiva`. **Atiende**: US1-12 (las partes del horario y de la reserva se comprueban en T060 y T045). **Verificación**: `npm test` en rojo.
- [ ] T029 [US1] Prueba `rechaza_clase_que_termina_despues_de_la_medianoche`: 23:30 + 45 min → 400 "La clase debe terminar el mismo día."; 23:00 + 60 min se acepta. **Atiende**: US1-14, R-06. **Verificación**: `npm test` en rojo.
- [ ] T030 [P] [US1] Crear `backend/tests/classes-permissions.test.js` con la prueba `solo_el_administrador_registra_modifica_o_desactiva_clases`: recepcionista, entrenador y cliente → 403 "No tienes permiso para realizar esta acción." en `POST /classes`, `PATCH /classes/:id`, `PATCH /classes/:id/status` y `GET /classes/instructors`; sin token → 401. **Atiende**: US1-13, FR-011. **Verificación**: `npm test` en rojo.
- [ ] T106 [US1] Agregar a `backend/tests/classes.test.js` la prueba `registra_auditoria_al_crear_modificar_y_desactivar_clases`: después de `POST /classes`, `PATCH /classes/:id` y `PATCH /classes/:id/status`, la tabla `auditoria` tiene una fila `clase.crear`, una `clase.modificar` (con la descripción de los campos con su valor anterior y el nuevo) y una `clase.desactivar`, con `entidad = 'clases'`, `id_registro` igual a `id_clase` e `id_usuario` del administrador. **Atiende**: FR-012 (hallazgo G1). **Verificación**: `npm test` en rojo.
- [ ] T108 [US1] Agregar a `backend/tests/classes.test.js` la prueba `modificar_clase_cuyo_entrenador_se_desactivo_sin_cambiar_instructor_se_acepta`: con la clase creada y su entrenador desactivado después, `PATCH /classes/:id` con solo `nombre` → 200; cambiar a otro instructor activo → 200; cambiar a un instructor inactivo → 422 "El instructor debe ser un entrenador activo.". **Atiende**: supuesto del spec sobre entrenadores desactivados, US1-6 (hallazgo U3). **Verificación**: `npm test` en rojo.

### Implementación de la historia 1

- [ ] T031 [P] [US1] Crear `backend/src/validators/classes.validator.js` siguiendo `validators/common.js`. Exporta:
  - `createClassRules`:
    - `nombre`: obligatorio, sin espacios sobrantes, 1 a 80 caracteres.
    - `id_instructor`: entero positivo.
    - `dia_semana`: entero entre 1 y 7.
    - `hora_inicio`: formato `HH:MM`.
    - `duracion_minutos`: entero entre 15 y 240, con mensaje "La duración debe estar entre 15 y 240 minutos.".
    - `cupo_maximo`: entero entre 1 y 100, con mensaje "El cupo debe estar entre 1 y 100 lugares.".
    - Validación cruzada con `endsSameDay`, con mensaje "La clase debe terminar el mismo día.".
  - `updateClassRules`: los mismos campos, opcionales; exige al menos un campo.
  - `classStatusRules`: `estado` debe ser `inactiva`.
  - `classIdParam`.

  **Atiende**: US1-2, US1-3, US1-4, US1-14, R-06. **Verificación**: T018, T019, T020 y T029 en verde después de T035.
- [ ] T032 [US1] Ampliar `backend/src/models/class.model.js` con:
  - `create(datos, connection)` y `update(id, campos, connection)`.
  - `list({ estado }, connection)`, ordenada por `dia_semana`, `hora_inicio` y `nombre`.
  - `listActiveTrainers(connection)`: solo `rol = 'entrenador' AND estado = 'activo'`, ordenados por nombre.
  - `lockInstructor(idUsuario, connection)`: `SELECT id_usuario, rol, estado FROM usuarios WHERE id_usuario = ? FOR UPDATE`.
  - `countInstructorOverlaps(idInstructor, diaSemana, inicioMin, finMin, excluirId, connection)`: clases activas que cumplen `inicio_existente < fin_nuevo AND inicio_nuevo < fin_existente`.

  **Atiende**: FR-001, US1-5, US1-6, US1-7, R-03. **Verificación**: revisión de los parámetros (sin concatenar valores); pruebas de US1 en verde después de T035.
- [ ] T033 [US1] Agregar a `backend/src/models/reservation.model.js` dos funciones. Las dos reciben `hoy` y `minutosAhora` como parámetros, sin `NOW()`. Una sesión futura es `fecha_sesion > hoy`, o `fecha_sesion = hoy` con `hora_inicio + duracion` mayor que `minutosAhora`:
  - `maxActiveInFutureSessions(idClase, hoy, minutosAhora, connection)`: el mayor `COUNT(*)` de reservas activas agrupando por `fecha_sesion` entre las sesiones futuras.
  - `countActiveInFutureSessions(idClase, hoy, minutosAhora, connection)`.

  **Atiende**: US1-9, US1-10, US1-11, FR-010, R-05. **Verificación**: T025, T026 y T027 en verde después de T035.
- [ ] T034 [US1] Crear `backend/src/services/classes.service.js` con:
  - `listClasses(filtros, user)`: el recepcionista solo recibe las activas.
  - `listInstructors()`.
  - `createClass(datos, user)`.
  - `updateClass(id, campos, user)`.
  - `deactivateClass(id, user)`.

  Las escrituras van en `withTransaction`. Orden de las reglas:
  1. Bloquear la clase con `lockById`, o 404 "La clase no existe.".
  2. Si es un alta o si la modificación cambia `id_instructor`, bloquear al instructor con `lockInstructor` y validar que sea entrenador activo. Si no cambia el instructor, no se valida su estado (T108).
  3. Validar el empalme del instructor.
  4. Validar el cupo contra `maxActiveInFutureSessions`.
  5. Validar el cambio de horario o la desactivación contra `countActiveInFutureSessions`, usando `nowInGym()`.
  6. Escribir.
  7. Registrar la auditoría con `clase.crear`, `clase.modificar` (campos con su valor anterior y el nuevo) o `clase.desactivar`.

  Devuelve un `ClassView` con `hora_fin` calculada. **Atiende**: US1-1 a US1-12, US1-14, FR-001, FR-010, FR-012. **Verificación**: pruebas de US1 (incluidas T106 y T108) en verde después de T035.
- [ ] T035 [US1] Crear `backend/src/controllers/classes.controller.js`, con `list`, `instructors`, `create` (201 con `message: 'Clase registrada.'`), `update` y `deactivate`. Registrar las rutas en `backend/src/routes/classes.routes.js`:
  - `GET /` (administrador y recepcionista).
  - `GET /instructors` (administrador), declarada antes de `/:id`.
  - `POST /`, `PATCH /:id` y `PATCH /:id/status` (administrador).

  **Atiende**: R-04, FR-011. **Verificación**: `cd backend && npm test`: T017 a T030, T106 y T108 en verde.
- [ ] T036 [P] [US1] Crear `frontend/src/api/classes.js` con `listClasses(estado)`, `listInstructors()`, `createClass(datos)`, `updateClass(id, datos)` y `deactivateClass(id)`, siguiendo el patrón de `frontend/src/api/membershipTypes.js`. **Atiende**: R-04. **Verificación**: revisión; lo cubre T037.
- [ ] T037 [P] [US1] Crear `frontend/src/tests/ClassForm.test.jsx`, con la API simulada:
  - `muestra_solo_los_entrenadores_activos_en_el_selector`.
  - `envia_la_clase_y_muestra_clase_registrada`.
  - `muestra_el_mensaje_de_error_del_servidor` (por ejemplo, "El instructor ya tiene una clase en ese horario.").
  - `muestra_los_dias_en_espanol`.

  **Atiende**: US1-1, US1-5, US1-7. **Verificación**: `cd frontend && npm test` en rojo hasta T038.
- [ ] T038 [US1] Crear `frontend/src/pages/ClassForm.jsx`, para alta y edición:
  - Campos: nombre, selector de instructor, día de la semana (lunes a domingo, con valor 1 a 7), hora de inicio, duración y cupo.
  - Muestra los mensajes con `Message`.
  - En modo edición, carga la clase.

  **Atiende**: US1-1, US1-8, principio XIV. **Verificación**: T037 en verde.
- [ ] T039 [P] [US1] Crear `frontend/src/pages/Classes.jsx`:
  - Lista con día, hora de inicio y de fin, instructor, cupo y estado (`StatusBadge`).
  - Filtro por estado.
  - Botones "Editar" y "Desactivar"; este último pide confirmación con `ConfirmDialog` y muestra el mensaje del servidor si se rechaza.

  **Atiende**: US1-11, US1-12, principio XIV. **Verificación**: revisión manual (escenario 1 de `quickstart.md`).
- [ ] T040 [US1] Agregar las rutas `classes`, `classes/new` y `classes/:id` bajo `ProtectedRoute roles={ADMIN}` en `frontend/src/App.jsx`. Agregar `{ to: '/classes', label: 'Clases' }` solo al menú del administrador en `frontend/src/components/Navbar.jsx`. **Atiende**: FR-011. **Verificación**: `cd frontend && npm test` en verde.
- [ ] T041 [US1] Actualizar `frontend/src/tests/Navigation.test.jsx`: el menú del administrador incluye "Clases"; recepcionista, entrenador y cliente no la ven. **Atiende**: FR-011. **Verificación**: `cd frontend && npm test` en verde.

**Punto de control**: la historia 1 funciona sola: el horario semanal se registra, se modifica y se
desactiva con todas sus reglas.

---

## Fase 4: Historia de usuario 2 — Reservar un lugar para un cliente (Prioridad: P1)

**Objetivo**: recepción reserva lugares sin sobrecupo, solo para clientes activos con membresía
vigente en la fecha de la sesión, sin duplicados ni empalmes. Si la clase está en curso, la reserva
queda con la asistencia marcada.

**Prueba independiente** (por API, con clases creadas con `createClass`):
- Con cupo 2 y tres clientes con membresía activa, las dos primeras reservas se aceptan.
- La tercera responde "Clase llena.".

### Pruebas de la historia 2 (escribir primero y comprobar que fallan) ⚠️

Todas en `backend/tests/reservations.test.js`, salvo la de concurrencia y la de permisos. La hora
se fija con `mock.timers.enable({ apis: ['Date'], now })` de `node:test`.

- [ ] T042 [US2] Prueba `reserva_lugar_para_cliente_con_membresia_activa_y_reduce_los_lugares`: `POST /reservations` → 201, `estado: 'activa'`, `asistencia: 'sin_registrar'`; `countActiveBySession` sube en 1. **Atiende**: US2-1, FR-003. **Verificación**: `npm test` en rojo.
- [ ] T043 [US2] Prueba `rechaza_reserva_en_clase_llena`: con el cupo ocupado → 422 "Clase llena.". **Atiende**: US2-2, FR-004. **Verificación**: `npm test` en rojo.
- [ ] T044 [US2] Prueba `rechaza_reserva_si_la_membresia_no_cubre_la_fecha_de_la_sesion`: cinco casos (sin membresía, vencida, suspendida, cancelada, y activa hoy pero que vence antes de la sesión) → 422 "El cliente no tiene una membresía vigente para la fecha de la clase.". **Atiende**: US2-3, FR-003, R-07. **Verificación**: `npm test` en rojo.
- [ ] T045 [US2] Prueba `rechaza_reserva_de_cliente_inexistente_o_inactivo_y_en_clase_inactiva`:
  - Cliente inexistente o inactivo → 422 "Cliente no encontrado o inactivo.".
  - Clase inactiva → 422 "La clase está inactiva.".

  **Atiende**: US2-4, US1-12. **Verificación**: `npm test` en rojo.
- [ ] T046 [US2] Prueba `rechaza_reserva_duplicada_del_mismo_cliente_en_la_sesion`: segunda reserva → 409 "El cliente ya tiene una reserva en esta clase.". **Atiende**: US2-5, FR-005. **Verificación**: `npm test` en rojo.
- [ ] T047 [US2] Prueba `rechaza_reserva_que_se_empalma_con_otra_del_cliente_el_mismo_dia`:
  - 07:30 contra 07:00–07:45 → 422 "El cliente ya tiene una reserva en una clase que se empalma con este horario.".
  - Una clase contigua (07:45) y otra en distinta fecha sí se aceptan.

  **Atiende**: US2-6, FR-005, R-03. **Verificación**: `npm test` en rojo.
- [ ] T048 [US2] Prueba `rechaza_reserva_en_sesion_terminada_o_fuera_de_la_ventana_de_7_dias`:
  - Sesión terminada y sesión en hoy + 8 → 422 "Solo se puede reservar en clases que no han terminado y dentro de los próximos 7 días.".
  - La sesión de hoy + 7 se acepta.
  - Una fecha que no coincide con `dia_semana` → 400.

  **Atiende**: US2-7, FR-006, FR-002. **Verificación**: `npm test` en rojo.
- [ ] T049 [US2] Prueba `reserva_en_sesion_en_curso_queda_con_asistencia_presente`:
  - Con la hora fijada a la mitad de la clase → 201 con `asistencia: 'presente'` y `registrada_en_curso: true`.
  - En curso pero llena → "Clase llena.".

  **Atiende**: US2-8, FR-006. **Verificación**: `npm test` en rojo.
- [ ] T050 [US2] Prueba `registra_auditoria_al_reservar`: existe una fila `reserva.registrar` con `id_registro` igual a `id_reserva` y el usuario que reservó. **Atiende**: FR-012. **Verificación**: `npm test` en rojo.
- [ ] T107 [US2] Agregar a `backend/tests/reservations.test.js` la prueba `la_reserva_se_conserva_si_la_membresia_se_cancela_despues`: con una reserva activa, cambiar la membresía del cliente a `cancelada` (y en otro caso a `suspendida`) con `PATCH /memberships/:id/status`; la reserva sigue `activa` y ocupa su lugar. **Atiende**: caso límite "Membresía que cambia después de reservar" (hallazgo G2). **Verificación**: `npm test` en verde después de T056; no requiere código nuevo, porque ningún proceso cancela reservas automáticamente.
- [ ] T051 [P] [US2] Crear `backend/tests/reservations-concurrency.test.js` con la prueba `veinte_reservas_simultaneas_por_el_ultimo_lugar_aceptan_solo_una`:
  - Una clase con cupo 1 y 20 clientes con membresía vigente.
  - `Promise.all` de 20 `POST /reservations`.
  - Exactamente un 201; 19 respuestas 422 "Clase llena."; en la base hay 1 reserva activa.

  **Atiende**: US2-9, FR-004, SC-001, R-02. **Verificación**: `npm test` en rojo.
- [ ] T052 [US2] Agregar a `backend/tests/classes-permissions.test.js` la prueba `entrenador_y_cliente_no_pueden_reservar`: `POST /reservations` → 403 "No tienes permiso para realizar esta acción.". **Atiende**: US2-10, FR-011, SC-006. **Verificación**: `npm test` en rojo.

### Implementación de la historia 2

- [ ] T053 [P] [US2] Crear `backend/src/validators/reservations.validator.js` con:
  - `createReservationRules`: `id_clase` e `id_cliente` enteros positivos; `fecha_sesion` con `isValidDate`.
  - `reservationIdParam`.

  **Atiende**: FR-002, FR-003. **Verificación**: casos 400 de T048 en verde después de T056.
- [ ] T054 [US2] Ampliar `backend/src/models/reservation.model.js` con:
  - `create(datos, connection)`.
  - `findById(id, connection)`, que une la clase y el cliente y devuelve `ReservationView`.
  - `existsActive(idClase, fechaSesion, idCliente, connection)`.
  - `countClientOverlaps(idCliente, fechaSesion, inicioMin, finMin, connection)`: une `clases` y aplica `inicio_existente < fin_nuevo AND inicio_nuevo < fin_existente` sobre reservas activas.

  **Atiende**: FR-003, FR-005, R-03. **Verificación**: revisión de los parámetros; pruebas de US2 en verde después de T056.
- [ ] T055 [US2] Crear `backend/src/services/reservations.service.js` con `createReservation({ id_clase, fecha_sesion, id_cliente }, user)` dentro de `withTransaction`. Pasos, en el orden de evaluación de `contracts/api.md`:
  1. Bloquear el cliente con `clientModel.lockById`.
  2. Bloquear la clase con `classModel.lockById`. Si no existe → 404; si está inactiva → 422.
  3. Validar que la fecha coincide con `dia_semana` (400).
  4. Validar la ventana y el estado de la sesión con `bookingWindow`, `sessionState` y `nowInGym()`.
  5. Validar que el cliente existe y está activo.
  6. Validar la membresía con `membershipModel.findCurrentByClient(id_cliente, fecha_sesion, connection)` y `vigente`.
  7. Rechazar duplicados con `existsActive` (409).
  8. Rechazar empalmes con `countClientOverlaps`.
  9. Validar el cupo con `countActiveBySession`.
  10. Insertar. Si la sesión está `en_curso`, insertar con `asistencia: 'presente'`, `asistencia_por`, `asistencia_en` y `registrada_en_curso: 1`. `asistencia_en` se genera en Node con `new Date()` y se pasa como parámetro, sin `NOW()` (research R-05).
  11. Registrar la auditoría `reserva.registrar`.

  Traducir `ER_DUP_ENTRY` a 409 "El cliente ya tiene una reserva en esta clase.". **Atiende**: US2-1 a US2-9, FR-003 a FR-006, FR-012, R-02, R-07. **Verificación**: T042 a T051 en verde después de T056.
- [ ] T056 [US2] Crear `backend/src/controllers/reservations.controller.js` con `create` (201). Registrar `POST /` con `authorize(ROLES.ADMIN, ROLES.RECEPTIONIST)` en `backend/src/routes/reservations.routes.js`. **Atiende**: R-04, FR-011. **Verificación**: `cd backend && npm test`: T042 a T052 en verde.
- [ ] T057 [P] [US2] Crear `frontend/src/api/reservations.js` con `createReservation(datos)`. **Atiende**: R-04. **Verificación**: revisión; lo cubre T058.
- [ ] T058 [P] [US2] Crear `frontend/src/tests/ReservationForm.test.jsx`, con la API simulada:
  - `busca_cliente_y_envia_la_reserva`.
  - `muestra_clase_llena_cuando_el_servidor_la_rechaza`.
  - `muestra_el_mensaje_de_membresia_no_vigente`.

  **Atiende**: US2-1, US2-2, US2-3. **Verificación**: `cd frontend && npm test` en rojo hasta T059.
- [ ] T059 [US2] Crear `frontend/src/components/ReservationForm.jsx`:
  - Busca clientes con `listClients({ search })` de `frontend/src/api/clients.js`.
  - Envía `createReservation` con `id_clase` y `fecha_sesion` recibidos por props.
  - Muestra el mensaje del servidor con `Message`.
  - Llama a `onReserved()` al tener éxito.

  **Atiende**: US2-1, principio XIV. **Verificación**: T058 en verde.

**Punto de control**: las reservas funcionan por API con todas sus reglas, incluida la concurrencia.
El formulario queda listo para integrarse en la pantalla de la sesión (US4).

---

## Fase 5: Historia de usuario 4 — Consultar reservados y lugares disponibles (Prioridad: P2)

**Objetivo**: el administrador y recepción ven el horario de la ventana de reserva con lugares
disponibles y la etiqueta "Llena", y abren cada sesión con su lista de reservados.

**Prueba independiente**: con una sesión de cupo 20, 3 reservas activas y 1 cancelada, el detalle
muestra 3 reservados y "Quedan 17 de 20 lugares".

### Pruebas de la historia 4 (escribir primero y comprobar que fallan) ⚠️

Todas en `backend/tests/sessions.test.js`, salvo la de permisos.

- [ ] T060 [US4] Prueba `el_horario_muestra_las_sesiones_de_la_ventana_con_sus_lugares`:
  - `GET /classes/schedule` → sesiones desde hoy hasta hoy + 7, ordenadas por fecha y hora, con `lugares_disponibles`.
  - Excluye las clases inactivas (US1-12).
  - `desde` fuera de la ventana → 400.

  **Atiende**: US4-4, US1-12, FR-008, R-05. **Verificación**: `npm test` en rojo.
- [ ] T061 [US4] Prueba `el_detalle_de_sesion_muestra_datos_y_quedan_x_de_y_lugares`: `GET /classes/:id/sessions/:fecha` → nombre, instructor, fecha, hora, cupo, `reservas_activas` y `texto_lugares: 'Quedan 17 de 20 lugares'`. **Atiende**: US4-1, FR-008. **Verificación**: `npm test` en rojo.
- [ ] T062 [US4] Prueba `la_lista_de_reservados_esta_ordenada_por_apellido_y_nombre_con_su_asistencia`. **Atiende**: US4-2. **Verificación**: `npm test` en rojo.
- [ ] T063 [US4] Prueba `las_reservas_canceladas_no_cuentan_ni_aparecen`: con 3 activas y 1 cancelada → 3 en la lista y 17 lugares. **Atiende**: US4-3. **Verificación**: `npm test` en rojo.
- [ ] T064 [US4] Prueba `una_sesion_sin_lugares_aparece_llena_en_el_horario`: `llena: true` y `lugares_disponibles: 0`. **Atiende**: US4-5. **Verificación**: `npm test` en rojo.
- [ ] T065 [US4] Prueba `el_detalle_rechaza_fecha_que_no_corresponde_a_la_clase`: 404 si la clase no existe; 400 si la fecha no coincide con `dia_semana`. **Atiende**: FR-002. **Verificación**: `npm test` en rojo.
- [ ] T066 [US4] Agregar a `backend/tests/classes-permissions.test.js` la prueba `entrenador_y_cliente_no_consultan_horario_ni_reservados`: `GET /classes/schedule`, `GET /classes/:id/sessions/:fecha` y `GET /classes` → 403. **Atiende**: US4-6, FR-011, SC-006. **Verificación**: `npm test` en rojo.

### Implementación de la historia 4

- [ ] T067 [P] [US4] Agregar a `backend/src/validators/classes.validator.js` `scheduleRules` (`desde` opcional con `isValidDate`) y `sessionParams` (`id` entero positivo y `fecha` con `isValidDate`). **Atiende**: FR-002, R-05. **Verificación**: casos 400 de T060 y T065 en verde después de T070.
- [ ] T068 [US4] Agregar a los modelos:
  - En `backend/src/models/class.model.js`: `listActive(connection)`.
  - En `backend/src/models/reservation.model.js`:
    - `countActiveBySessions(idsClase, desde, hasta, connection)`: devuelve `id_clase`, `fecha_sesion` y `total`, con `IN (?)` parametrizado.
    - `listActiveBySession(idClase, fechaSesion, connection)`: une `clientes`, devuelve `id_cliente`, `nombre` y `apellido` sin datos de contacto, y ordena por `apellido, nombre`.

  **Atiende**: FR-008, US4-2, US4-3. **Verificación**: revisión de los parámetros; T060 a T064 en verde después de T070.
- [ ] T069 [US4] Agregar a `backend/src/services/classes.service.js`:
  - `getSchedule({ desde })`: genera las sesiones con `sessionDates` sobre `bookingWindow(hoy)` y une los conteos; cada sesión es un `SessionView` con `llena` y `estado_sesion`.
  - `getSessionDetail(idClase, fecha)`: valida el día; devuelve `sesion`, `texto_lugares` ("Quedan X de Y lugares") y `reservas`. Cada reserva lleva `asistencia_mostrada`: "Presente"; "No asistió" si la fecha de la sesión es anterior a hoy y la asistencia está `sin_registrar`; o "Sin registrar" en otro caso.

  **Atiende**: US4-1 a US4-5, US5-6, FR-002, FR-008, R-01, R-05. **Verificación**: T060 a T065 en verde después de T070.
- [ ] T070 [US4] Agregar `schedule` y `sessionDetail` a `backend/src/controllers/classes.controller.js`. Registrar `GET /schedule` y `GET /:id/sessions/:fecha` (administrador y recepcionista) en `backend/src/routes/classes.routes.js`, con `/schedule` declarada antes de `/:id`. **Atiende**: R-04, FR-011. **Verificación**: `cd backend && npm test`: T060 a T066 en verde.
- [ ] T071 [P] [US4] Agregar `getSchedule(desde)` y `getSessionDetail(idClase, fecha)` a `frontend/src/api/classes.js`. **Atiende**: R-04. **Verificación**: revisión; lo cubren T072 y T073.
- [ ] T072 [P] [US4] Crear `frontend/src/tests/Schedule.test.jsx`, con la API simulada:
  - `agrupa_las_sesiones_por_dia_y_muestra_los_lugares`.
  - `muestra_la_etiqueta_llena_en_texto`.
  - `cada_sesion_enlaza_a_su_detalle`.

  **Atiende**: US4-4, US4-5. **Verificación**: `cd frontend && npm test` en rojo hasta T074.
- [ ] T073 [P] [US4] Crear `frontend/src/tests/SessionDetail.test.jsx`, con la API simulada:
  - `muestra_quedan_x_de_y_lugares`.
  - `lista_los_reservados_con_su_asistencia`.
  - `incluye_el_formulario_de_reserva_y_recarga_al_reservar`.

  **Atiende**: US4-1, US4-2, US2-1. **Verificación**: `cd frontend && npm test` en rojo hasta T075.
- [ ] T074 [US4] Crear `frontend/src/pages/Schedule.jsx`:
  - Sesiones agrupadas por día (fecha y nombre del día en español).
  - Cada sesión muestra la hora, la clase, el instructor y "Quedan X de Y lugares", o la etiqueta "Llena" en texto.
  - Cada sesión enlaza a `/schedule/:idClase/:fecha`.
  - Muestra un estado vacío y uno de error.

  **Atiende**: US4-4, US4-5, SC-003, principio XIV. **Verificación**: T072 en verde.
- [ ] T075 [US4] Crear `frontend/src/pages/SessionDetail.jsx`:
  - Encabezado de la sesión y `texto_lugares`.
  - Tabla de reservados con `asistencia_mostrada`.
  - `ReservationForm` cuando `estado_sesion` no es `terminada`.
  - Recarga los datos después de cada acción.

  **Atiende**: US4-1, US4-2, US2-1, principio XIV. **Verificación**: T073 en verde.
- [ ] T076 [US4] Agregar en `frontend/src/App.jsx` las rutas `schedule` y `schedule/:idClase/:fecha` bajo `ProtectedRoute roles={FRONT_DESK}`. Agregar `{ to: '/schedule', label: 'Horario' }` a los menús del administrador y de la recepcionista en `frontend/src/components/Navbar.jsx`. Actualizar `frontend/src/tests/Navigation.test.jsx`: el administrador y la recepcionista ven "Horario"; el entrenador y el cliente no. **Atiende**: FR-011. **Verificación**: `cd frontend && npm test` en verde.
- [ ] T077 [P] [US4] Agregar a `frontend/src/styles/global.css` los estilos del horario (columnas por día y tarjetas de sesión) y de la lista de reservados, reutilizando las variables del tema existente. **Atiende**: principio XIV. **Verificación**: revisión visual (escenario 2 de `quickstart.md`) en escritorio y a 375 px de ancho.

**Punto de control**: el horario y el detalle de sesión funcionan, y las reservas de US2 ya se
hacen desde la interfaz.

---

## Fase 6: Historia de usuario 3 — Cancelar la reserva de un cliente (Prioridad: P2)

**Objetivo**: recepción cancela reservas de sesiones que no han empezado; el lugar se libera y la
reserva se conserva en el historial.

**Prueba independiente**: en una sesión llena, cancelar una reserva sube los lugares a 1 y otro
cliente puede reservar.

### Pruebas de la historia 3 (escribir primero y comprobar que fallan) ⚠️

Todas en `backend/tests/reservations.test.js`.

- [ ] T078 [US3] Prueba `cancelar_reserva_de_sesion_pendiente_libera_el_lugar_y_la_conserva`:
  - `PATCH /reservations/:id/cancel` → 200 `estado: 'cancelada'`, con `cancelado_por` y `cancelado_en`.
  - La fila sigue en la base y los lugares suben en 1.
  - Existe una auditoría `reserva.cancelar`.

  **Atiende**: US3-1, FR-007, FR-012. **Verificación**: `npm test` en rojo.
- [ ] T079 [US3] Prueba `rechaza_cancelar_reserva_de_clase_que_ya_empezo`: con la hora en curso o terminada → 422 "No se puede cancelar una reserva de una clase que ya empezó.". **Atiende**: US3-2. **Verificación**: `npm test` en rojo.
- [ ] T080 [US3] Prueba `rechaza_cancelar_una_reserva_ya_cancelada`: 422 "La reserva ya está cancelada."; si la reserva no existe → 404 "La reserva no existe.". **Atiende**: US3-3. **Verificación**: `npm test` en rojo.
- [ ] T081 [US3] Prueba `el_cliente_puede_volver_a_reservar_despues_de_cancelar`: `POST /reservations` para el mismo cliente y la misma sesión → 201; la base tiene 1 activa y 1 cancelada. **Atiende**: US3-4, FR-005. **Verificación**: `npm test` en rojo.

### Implementación de la historia 3

- [ ] T082 [US3] Agregar a `backend/src/models/reservation.model.js` `lockById(id, connection)` (`FOR UPDATE`, con los datos de la clase para calcular el estado de la sesión) y `cancel(id, idUsuario, connection)`, que guarda `estado = 'cancelada'`, `cancelado_por` y `cancelado_en`. `cancelado_en` se genera en Node con `new Date()` y se pasa como parámetro, sin `NOW()` (research R-05; hallazgo U2). **Atiende**: FR-007. **Verificación**: revisión; T078 a T081 en verde después de T084.
- [ ] T083 [US3] Agregar `cancelReservation(id, user)` a `backend/src/services/reservations.service.js`, dentro de `withTransaction`. Pasos:
  1. `lockById`; si no existe → 404.
  2. Si está cancelada → 422.
  3. Si `sessionState` no es `pendiente` → 422.
  4. `cancel`.
  5. Registrar la auditoría `reserva.cancelar`.

  **Atiende**: US3-1 a US3-3, FR-007, FR-012. **Verificación**: T078 a T080 en verde después de T084.
- [ ] T084 [US3] Agregar `cancel` a `backend/src/controllers/reservations.controller.js`. Registrar `PATCH /:id/cancel` (administrador y recepcionista) con `reservationIdParam` en `backend/src/routes/reservations.routes.js`. **Atiende**: R-04, FR-011. **Verificación**: `cd backend && npm test`: T078 a T081 en verde.
- [ ] T085 [P] [US3] Agregar `cancelReservation(id)` a `frontend/src/api/reservations.js`. **Atiende**: R-04. **Verificación**: revisión; lo cubre T086.
- [ ] T086 [US3] Agregar a `frontend/src/tests/SessionDetail.test.jsx` las pruebas `cancelar_pide_confirmacion_y_recarga_la_lista` y `muestra_el_mensaje_si_la_clase_ya_empezo`. **Atiende**: US3-1, US3-2. **Verificación**: `cd frontend && npm test` en rojo hasta T087.
- [ ] T087 [US3] Agregar en `frontend/src/pages/SessionDetail.jsx` el botón "Cancelar reserva" por cliente. Solo aparece cuando `estado_sesion` es `pendiente`, pide confirmación con `ConfirmDialog` y muestra el mensaje de éxito o de error. **Atiende**: US3-1, principio XIV. **Verificación**: T086 en verde.

**Punto de control**: la cancelación libera lugares y respeta el inicio de la clase.

---

## Fase 7: Historia de usuario 5 — Marcar asistencia de los reservados (Prioridad: P3)

**Objetivo**: recepción marca y desmarca la asistencia el mismo día de la sesión, desde la hora de
inicio. Las reservas sin asistencia de días anteriores se muestran como "No asistió".

**Prueba independiente**: en una sesión con 3 reservas iniciada hoy, marcar a 2 clientes; al día
siguiente, el tercero aparece como "No asistió".

### Pruebas de la historia 5 (escribir primero y comprobar que fallan) ⚠️

Todas en `backend/tests/attendance.test.js`, con la hora fijada mediante `mock.timers`.

- [ ] T088 [P] [US5] Crear `backend/tests/attendance.test.js` con la prueba `marca_presente_a_cliente_con_reserva_en_sesion_iniciada_hoy`: `PATCH /reservations/:id/attendance` con `{ presente: true }` → 200, con `asistencia: 'presente'`, `asistencia_por` (el usuario) y `asistencia_en`. **Atiende**: US5-1, FR-009. **Verificación**: `npm test` en rojo.
- [ ] T089 [US5] Prueba `rechaza_marcar_asistencia_antes_de_la_hora_de_inicio`: 422 "La asistencia solo se puede registrar a partir de la hora de inicio de la clase.". **Atiende**: US5-2. **Verificación**: `npm test` en rojo.
- [ ] T090 [US5] Prueba `rechaza_marcar_asistencia_despues_del_dia_de_la_sesion`: 422 "La asistencia solo se puede registrar el mismo día de la clase.". **Atiende**: US5-3. **Verificación**: `npm test` en rojo.
- [ ] T091 [US5] Prueba `rechaza_marcar_asistencia_de_reserva_cancelada`: 422 "El cliente no tiene una reserva activa en esta clase."; `presente` no booleano → 400. **Atiende**: US5-4. **Verificación**: `npm test` en rojo.
- [ ] T092 [US5] Prueba `desmarcar_asistencia_el_mismo_dia_regresa_a_sin_registrar`: `{ presente: false }` → `asistencia: 'sin_registrar'`, con `asistencia_por` y `asistencia_en` en `NULL`. **Atiende**: US5-5. **Verificación**: `npm test` en rojo.
- [ ] T093 [US5] Prueba `al_terminar_el_dia_las_reservas_sin_asistencia_se_muestran_como_no_asistio`: con la hora fijada al día siguiente, `GET /classes/:id/sessions/:fecha` → `asistencia_mostrada: 'No asistió'` para la reserva sin marcar y "Presente" para las marcadas. **Atiende**: US5-6. **Verificación**: `npm test`; si ya pasa en verde gracias a T069, comprobar que falla al quitar temporalmente el cálculo de "No asistió".

### Implementación de la historia 5

- [ ] T094 [P] [US5] Agregar a `backend/src/validators/reservations.validator.js` `attendanceRules`: `presente` booleano, con mensaje en español. **Atiende**: FR-009. **Verificación**: caso 400 de T091 en verde después de T096.
- [ ] T095 [US5] Agregar `setAttendance(id, presente, idUsuario, connection)` a `backend/src/models/reservation.model.js`. Con `presente = true`, asigna `asistencia = 'presente'`, `asistencia_por` y `asistencia_en`; con `presente = false`, asigna `asistencia = 'sin_registrar'` y pone ambos campos en `NULL`. Agregar `setAttendance(id, presente, user)` a `backend/src/services/reservations.service.js`. Sus pasos, dentro de `withTransaction`:
  1. `lockById`; si no existe → 404.
  2. Si está cancelada → 422.
  3. Si la fecha de la sesión es posterior a hoy, o es hoy y `minutos` es menor que la hora de inicio → 422 (antes del inicio).
  4. Si la fecha de la sesión es anterior a hoy → 422 (después del día).
  5. Guardar con `setAttendance`. `asistencia_en` se genera en Node con `new Date()` y se pasa como parámetro, sin `NOW()` (research R-05; hallazgo U2).

  Los pasos 3 y 4 usan `nowInGym()`. **Atiende**: US5-1 a US5-5, FR-009, FR-014. **Verificación**: T088 a T092 en verde después de T096.
- [ ] T096 [US5] Agregar `attendance` a `backend/src/controllers/reservations.controller.js`. Registrar `PATCH /:id/attendance` (administrador y recepcionista) con `reservationIdParam` y `attendanceRules` en `backend/src/routes/reservations.routes.js`. **Atiende**: R-04, FR-011. **Verificación**: `cd backend && npm test`: T088 a T093 en verde.
- [ ] T097 [P] [US5] Agregar `setAttendance(id, presente)` a `frontend/src/api/reservations.js`. **Atiende**: R-04. **Verificación**: revisión; lo cubre T098.
- [ ] T098 [US5] Agregar a `frontend/src/tests/SessionDetail.test.jsx` las pruebas `marcar_asistencia_con_un_clic_por_cliente`, `muestra_no_asistio_en_sesiones_de_dias_anteriores` y `muestra_el_mensaje_si_la_clase_no_ha_empezado`. **Atiende**: US5-1, US5-6, SC-005. **Verificación**: `cd frontend && npm test` en rojo hasta T099.
- [ ] T099 [US5] Agregar en `frontend/src/pages/SessionDetail.jsx` una casilla "Presente" por reserva activa. Se habilita solo si la fecha de la sesión es hoy y `estado_sesion` no es `pendiente`, y cada clic llama a `setAttendance`. Mostrar `asistencia_mostrada` en texto. **Atiende**: US5-1, US5-5, US5-6, SC-005, principio XIV. **Verificación**: T098 en verde.

**Punto de control**: todas las historias funcionan de forma independiente.

---

## Fase 8: Pulido y verificación transversal

**Propósito**: comprobaciones de seguridad, codificación, criterios de éxito y cierre de la
documentación.

- [ ] T100 [P] Revisar con `grep -rn "NOW()\|CURDATE()" backend/src/models/class.model.js backend/src/models/reservation.model.js` que no haya resultados. Revisar también que ninguna consulta nueva concatene valores del usuario. **Atiende**: R-05, FR-014, principio III. **Verificación**: el comando no devuelve resultados; revisión del código.
- [ ] T101 [P] Revisar que las respuestas de `GET /classes/:id/sessions/:fecha` y `POST /reservations` no incluyan `correo`, `telefono`, `direccion`, datos faciales ni montos. **Atiende**: principio III. **Verificación**: agregar a `backend/tests/sessions.test.js` la prueba `el_detalle_no_expone_datos_de_contacto` y correr `npm test` en verde.
- [ ] T102 Ejecutar `cd backend && npm test` y `cd frontend && npm test` completos. **Atiende**: principio II. **Verificación**: 0 pruebas fallidas en ambas carpetas.
- [ ] T103 Ejecutar `cd database && npm run db:reset && npm run db:seed && npm run db:check-encoding` para comprobar que la base se reconstruye desde cero con la migración 006. **Atiende**: principio IV. **Verificación**: los comandos terminan sin errores.
- [ ] T104 Recorrer a mano los escenarios 1 a 5 de `specs/004-reservas-clases/quickstart.md` y medir SC-002, SC-003 y SC-005. Registrar el resultado (fecha, escenarios aprobados y tiempos) en una sección "Resultados de validación" de ese archivo. **Atiende**: SC-002, SC-003, SC-004, SC-005. **Verificación**: revisión de la sección.
- [ ] T105 [P] Cambiar el estado de `specs/004-reservas-clases/spec.md` de "Borrador" a "Implementada" y marcar como `[X]` las tareas terminadas de este archivo. **Atiende**: principio VII. **Verificación**: revisión.

---

## Dependencias y orden de ejecución

### Dependencias entre fases

```text
Fase 1 (Configuración) ──▶ Fase 2 (Fundamentos) ──▶ Fase 3 (US1) ─┐
                                              │                 ├──▶ Fase 8 (Pulido)
                                              ├──▶ Fase 4 (US2) ──▶ Fase 5 (US4) ──▶ Fase 6 (US3) ──▶ Fase 7 (US5) ─┘
```

- **Fase 1**: sin dependencias. T004 va después de T003 (mismo archivo `docs/sprint-4.md`) y **no
  bloquea** las fases siguientes: la aprobación formal del equipo queda pendiente y registrada.
- **Fase 2**: depende de T001. T005 → T006 (prueba antes que migración). T008 → T009 y T010 →
  T011 (prueba antes que implementación). T016 depende de que existan los routers. **Bloquea todas
  las historias.**
- **Fase 3 (US1)**: depende de la Fase 2. Su backend no depende de otras historias, porque las
  pruebas de US1-9 a US1-11 crean reservas con `createReservation` (T013).
- **Fase 4 (US2)**: depende de la Fase 2. Su backend no depende del backend de US1, porque usa
  `createClass` (T013). T055 depende de T054 y de `findCurrentByClient` (Sprint 2, existente).
- **Fase 5 (US4)**: depende de la Fase 2 para el backend. El frontend (T075) depende de T059
  (`ReservationForm`, US2). T076 depende de T040 (mismo archivo `App.jsx` y `Navbar.jsx`).
- **Fase 6 (US3)**: su backend depende solo de la Fase 2. El frontend (T087) depende de T075
  (`SessionDetail.jsx`, US4).
- **Fase 7 (US5)**: su backend depende de la Fase 2. T093 depende de T069 (`asistencia_mostrada`,
  US4). El frontend (T099) depende de T075 y T087 (mismo archivo).
- **Fase 8**: depende de todas las historias.

### Dentro de cada historia

- Primero las pruebas, comprobadas en rojo (principio II). Después validadores y modelos, luego
  servicios, luego controladores y rutas, y al final el frontend.
- Las tareas que tocan el mismo archivo (por ejemplo, `reservations.test.js`,
  `reservation.model.js` y `SessionDetail.jsx`) van en orden de ID.

### Oportunidades de paralelismo

- **Fase 1**: T002 y T003.
- **Fase 2**: T007, T008, T010, T012, T013, T014 y T015 (archivos distintos).
- **US1**: T030 en paralelo con las pruebas de `classes.test.js`; T031, T036, T037 y T039 en
  paralelo con el backend.
- **US2**: T051 en paralelo con las pruebas de `reservations.test.js`; T053, T057 y T058.
- **US4**: T067, T071, T072, T073 y T077.
- **US3 y US5**: T085, T088, T094 y T097.
- Después de la Fase 2, los backends de US1, US2 y US4 pueden avanzar en paralelo, porque usan
  archivos de prueba y fábricas distintos. Los cambios en `class.model.js`, `classes.service.js`
  y `classes.routes.js` se coordinan por orden de ID.

---

## Ejemplo de paralelismo: historia 2

```bash
# En paralelo, después de la Fase 2:
Tarea: "T051 Crear backend/tests/reservations-concurrency.test.js"
Tarea: "T053 Crear backend/src/validators/reservations.validator.js"
Tarea: "T057 Crear frontend/src/api/reservations.js"
Tarea: "T058 Crear frontend/src/tests/ReservationForm.test.jsx"

# En secuencia (mismo archivo o dependencia):
T042 → T043 → … → T050 (reservations.test.js) → T054 → T055 → T056
```

---

## Estrategia de implementación

### Primero el MVP (historias 1 y 2)

1. Fases 1 y 2.
2. Fase 3 (US1): el horario semanal se registra. **Detenerse y validar** con el escenario 1 del
   quickstart.
3. Fase 4 (US2): las reservas funcionan por API sin sobrecupo. **Detenerse y validar** con la
   prueba de concurrencia.

Las dos historias P1 juntas resuelven el problema central (evitar el sobrecupo).

### Entrega incremental

4. Fase 5 (US4): pantallas de horario y de sesión; las reservas se hacen desde la interfaz.
5. Fase 6 (US3): cancelación.
6. Fase 7 (US5): asistencia.
7. Fase 8: pulido y validación final.

### Grupos de commit (principio VII)

Un commit por grupo de tareas, con los IDs en el mensaje y `npm test` en verde antes de cada commit
de implementación:

| Grupo | Ejemplo de mensaje |
|-------|--------------------|
| T001-T004 | `docs(docs): documentar la ampliación de alcance de clases grupales (T001-T004)` |
| T005-T007 | `feat(database): crear tablas clases y reservas (T005-T007)` |
| T008-T016 | `feat(classes): agregar utilidades de sesiones, auditoría y routers base (T008-T016)` |
| T017-T035, T106, T108 | `feat(classes): registrar, modificar y desactivar clases (T017-T035, T106, T108)` |
| T036-T041 | `feat(frontend): agregar catálogo y formulario de clases (T036-T041)` |
| T042-T056, T107 | `feat(reservations): reservar lugares sin sobrecupo (T042-T056, T107)` |
| T057-T059 | `feat(frontend): agregar formulario de reserva (T057-T059)` |
| T060-T070 | `feat(classes): consultar horario y reservados por sesión (T060-T070)` |
| T071-T077 | `feat(frontend): agregar horario y detalle de sesión (T071-T077)` |
| T078-T087 | `feat(reservations): cancelar reservas antes del inicio (T078-T087)` |
| T088-T099 | `feat(reservations): marcar asistencia el día de la clase (T088-T099)` |
| T100-T105 | `test(reservations): validar seguridad, codificación y quickstart (T100-T105)` |

Sin squash ni force-push.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Cada criterio EARS del spec tiene al menos una prueba automática:
  - US1: T017 a T030, T106 y T108.
  - US2: T042 a T052 y T107.
  - US3: T078 a T081.
  - US4: T060 a T066.
  - US5: T088 a T093.
- Verificar que cada prueba falla antes de implementar.
- Detenerse en cada punto de control para validar la historia de forma independiente.
