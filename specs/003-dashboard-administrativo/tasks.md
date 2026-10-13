---

description: "Lista de tareas del Sprint 3: dashboard administrativo"
---

# Tareas: Sprint 3 — Dashboard administrativo

**Entrada**: documentos de diseño en `specs/003-dashboard-administrativo/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

**Pruebas**: se incluyen porque la constitución (principio X) exige probar las funciones antes de
darlas por terminadas y la especificación pide verificar cifras contra conteos manuales (SC-002),
permisos (SC-004), datos sensibles (SC-005) y rendimiento (SC-001). Backend con `node:test` +
`supertest`; frontend con `vitest` + Testing Library. Nombres de prueba y mensajes de aserción en
español.

**Organización**: las tareas se agrupan por historia de usuario de `spec.md`. Orden por prioridad:
historia 1 (P1), historia 3 (P1) e historia 2 (P2).

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]…[US3]**: historia de usuario de `spec.md` a la que pertenece la tarea.

## Convenciones obligatorias para todas las tareas

- Se mantienen las convenciones de los Sprints 1 y 2: ES Modules con extensión `.js`, sin CommonJS;
  SQL solo en `backend/src/models/` con `execute(sql, params)`; reglas en `backend/src/services/`;
  controladores delgados; respuestas `{ data }` y `{ error }`; identificadores en inglés y textos en
  español (`AGENTS.md`).
- El dashboard es **de solo lectura**: ninguna tarea escribe en la base de datos fuera de la
  migración 005.
- "Hoy" se obtiene con `today()` de `backend/src/utils/dates.js` y los días se filtran como
  `fecha >= 'desde 00:00:00' AND fecha < DATE_ADD(hasta, INTERVAL 1 DAY)` (research R-05).
- Montos como texto con 2 decimales mediante `formatAmount` de `backend/src/utils/money.js`.
- Las consultas seleccionan columnas explícitas: nunca `correo`, `telefono`, `direccion`, columnas
  de `rostros` ni `similitud` (FR-012).
- No se agregan dependencias en `frontend/` ni en `backend/` (research R-01).

---

## Fase 1: Configuración inicial

**Propósito**: preparar la rama y alinear la documentación con el alcance aprobado.

- [X] T001 Confirmar el cierre del Sprint 2 (T108 y T109 de `specs/002-membresias-pagos-acceso/tasks.md` hechos o explícitamente pospuestos por el equipo), hacer commit de `specs/003-dashboard-administrativo/` y `docs/sprint-3.md` y crear, a partir de `002-membresias-pagos-acceso`, la rama `003-dashboard-administrativo` y cambiar a ella; no trabajar sobre `main` ni `master`
- [X] T002 [P] Actualizar `docs/sprint-3.md` al alcance aprobado el 2026-10-12: título "Sprint 3: Dashboard administrativo", objetivo, historia US-S3-06 como única historia del sprint, flujo demostrable del dashboard, tablas consultadas (`clientes`, `membresias`, `tipos_membresia`, `pagos`, `accesos`) y una sección "Mejoras futuras" con US-S3-01 a US-S3-05 y US-S3-07 (entrenadores, asignación, rutinas, objetivos, progreso y carga de trabajo), sin borrar su descripción (constitución, principio I)

---

## Fase 2: Fundamentos (prerrequisitos que bloquean todo)

**Propósito**: índices, ruta protegida y piezas comunes del frontend.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T003 Crear `database/migrations/005_indices_dashboard.sql` (sin modificar 001 a 004) con `ALTER TABLE pagos ADD KEY idx_pagos_fecha_estado (fecha_pago, estado);` y `ALTER TABLE membresias ADD KEY idx_membresias_fecha_fin (fecha_fin);`, compatible con MySQL 8 y MariaDB 10.4 (research R-04)
- [X] T004 [P] Agregar en `backend/tests/helpers/factories.js` la función `createAccess({ id_cliente = null, resultado, motivo = null, fecha_hora = null, registrado_por })`, que inserta en `accesos` con `COALESCE(fecha_hora, NOW(3))`, y permitir `fecha_pago` opcional en `createPayment`
- [X] T005 [P] Crear `backend/src/validators/dashboard.validator.js` con `dashboardRules`: `periodo` opcional en `hoy|7d|mes|rango` ("El periodo debe ser hoy, 7d, mes o rango."); con `periodo=rango`, `desde` y `hasta` obligatorios y válidos (usar `dateQuery` y `dateRangeQuery(366)` de `backend/src/validators/common.js`, más un `custom` que exija ambas fechas: "Indica la fecha inicial y la final del rango.")
- [X] T006 Crear `backend/src/routes/dashboard.routes.js` con `GET /` protegido con `authenticate` y `authorize(ROLES.ADMIN)`, `dashboardRules` y `validate`, que llame a `dashboardController.get`, y montarlo en `/dashboard` en `backend/src/routes/index.js` (FR-001)
- [X] T007 [P] Crear `frontend/src/api/dashboard.js` con `getDashboard(query)` que llame a `GET /dashboard` usando `apiRequest` de `frontend/src/api/client.js`
- [X] T008 [P] Crear `frontend/src/components/StatCard.jsx` (título, valor principal en texto grande y detalle opcional) y agregar en `frontend/src/styles/global.css` las clases `.stat-grid` (cuadrícula adaptable) y `.stat-card`
- [X] T009 Ejecutar `npm run db:migrate` en `database/` y `npm test` en `backend/` para confirmar que la migración 005 se aplica y las pruebas existentes siguen pasando

**Punto de control**: ruta protegida y piezas comunes listas.

---

## Fase 3: Historia de usuario 1 — Resumen general del gimnasio (Prioridad: P1) 🎯 MVP

**Objetivo**: el administrador ve clientes, membresías, pagos, ingresos, adeudo y accesos del mes en
curso, con las listas de membresías por vencer y rechazos recientes (FR-002 a FR-007, FR-010, FR-013,
FR-014).

**Prueba independiente**: con datos conocidos, cada indicador del dashboard coincide con el conteo
manual.

### Pruebas de la historia 1

- [X] T010 [P] [US1] Crear `backend/tests/dashboard.test.js` con datos conocidos y fechas relativas a `today()`: clientes activos e inactivos; un cliente con membresía vigente, uno con membresía que termina hoy (cuenta como vigente y por vencer), uno con membresía que termina en 3 días y una renovación ya registrada (vigente, **no** por vencer), uno con dos membresías vencidas (cuenta una sola vez en vencidas), uno con membresía cancelada (no cuenta en ningún indicador de membresías) y uno con membresía futura (no cuenta como vencido); pagos del mes en curso con uno anulado (no suma) y uno del mes anterior (no suma); accesos autorizados y rechazados del mes y de antes, con varios motivos. Verificar `clientes`, `membresias`, `por_vencer` (orden por `fecha_fin`, máximo 20), `pagos.cantidad`, `pagos.ingresos`, `adeudo_total` (igual a `meta.total_adeudo` de `GET /api/debts`), `accesos`, `rechazos_por_motivo` (los 6 motivos, con 0 si no hay) y `rechazos_recientes` (10 más recientes, `cliente` null en rostro no identificado). Agregar `test_base_vacia_devuelve_ceros_sin_errores` con una base recién reiniciada
- [X] T011 [P] [US1] Crear `frontend/src/tests/Dashboard.test.jsx` con `fetch` simulado: muestra en texto clientes activos, membresías vigentes, ingresos con formato de moneda y adeudo; lista de membresías por vencer con fecha en español; rechazos recientes con "No identificado" y el texto del motivo; mensaje "Todavía no hay datos para mostrar." con todos los valores en cero; y mensaje de error en español si la API falla, sin mostrar cifras

### Implementación de la historia 1

- [X] T012 [US1] Crear `backend/src/models/dashboard.model.js` con funciones parametrizadas: `countClientsByStatus()`; `membershipCounts(hoy, limite)` que devuelve vigentes, vencidas y por vencer contando clientes distintos con las reglas de [data-model.md](./data-model.md) ("vencidas": al menos una no cancelada, ninguna vigente ni futura; "por vencer": vigente con `fecha_fin` entre hoy y `limite` = hoy + 6, sin otra no cancelada que empiece después); `expiringSoon(hoy, limite, 20)` con `id_cliente`, `nombre`, `apellido`, nombre del tipo y `DATE_FORMAT(fecha_fin, '%Y-%m-%d')` ordenado por `fecha_fin` y apellido; `paymentTotals(desde, hasta)` (conteo y suma con `estado = 'pagado'`); `accessTotals(desde, hasta)` (conteo por `resultado`); `rejectionsByReason(desde, hasta)`; y `recentRejections(10)` con `LEFT JOIN clientes` seleccionando solo `nombre` y `apellido`
- [X] T013 [US1] Crear `backend/src/services/dashboard.service.js` con `getDashboard({ periodo = 'mes', desde, hasta })` que, por ahora, resuelva `mes` (día 1 del mes en curso a hoy con `today()`), ejecute en paralelo las funciones de `dashboard.model.js` y `debtModel.countDebtors({})` para `adeudo_total`, complete `rechazos_por_motivo` con los 6 motivos de `ACCESS_REASONS` de `backend/src/validators/access.validator.js` y arme la respuesta de [contracts/api.md](./contracts/api.md) con `periodo`, `generado_en`, montos con `formatAmount` y `tendencia: []` (la llena la historia 2)
- [X] T014 [US1] Crear `backend/src/controllers/dashboard.controller.js` con `get(req, res)` que lea `periodo`, `desde` y `hasta` de `req.validatedQuery` y responda con `sendData`
- [X] T015 [US1] Crear `frontend/src/pages/Dashboard.jsx` con: encabezado con el periodo resuelto; tarjetas `StatCard` de clientes, "Clientes con membresía vigente", "Clientes con membresía vencida", "Clientes con membresía por vencer", pagos e ingresos (con `Money`), adeudo total y accesos; tabla "Membresías por vencer" (nombre con enlace a `/clients/:id`, tipo y fecha con `formatDay`); tabla "Rechazos recientes" (fecha con `formatDateTime`, cliente o "No identificado", motivo con `REASON_LABELS` de `frontend/src/pages/Accesses.jsx`); lista "Rechazos por motivo"; estado de carga, mensaje "Todavía no hay datos para mostrar." y mensaje de error con `Message`
- [X] T016 [US1] Mostrar `Dashboard` en `frontend/src/pages/Home.jsx` cuando `user.rol === 'administrador'` y la pantalla actual para los demás roles; agregar la ruta `/dashboard` (solo administrador) en `frontend/src/App.jsx` y la opción "Dashboard" en el menú del administrador en `frontend/src/components/Layout.jsx` (FR-014)

**Punto de control**: el administrador ve el resumen del mes en curso desde que inicia sesión.

---

## Fase 4: Historia de usuario 3 — Dashboard seguro según el rol (Prioridad: P1)

**Objetivo**: solo el administrador ve el dashboard y la respuesta nunca contiene datos sensibles
(FR-001, FR-012).

**Prueba independiente**: con los cuatro roles, solo el administrador abre el dashboard desde la
interfaz o la API.

### Pruebas de la historia 3

- [X] T017 [P] [US3] Crear `backend/tests/dashboard-security.test.js`: sin sesión → 401; recepcionista, entrenador y cliente → 403 en `GET /api/dashboard` con cualquier periodo; con datos que incluyen correos, teléfonos, rostros registrados y accesos con similitud, recorrer de forma recursiva la respuesta del administrador y verificar que no aparecen las claves `correo`, `telefono`, `direccion`, `similitud`, `descriptor`, `muestras`, `saldo`, `monto` ni `adeudo` (salvo `adeudo_total`), ni el texto de ningún correo o teléfono de los datos de prueba (SC-004, SC-005)
- [X] T018 [P] [US3] Crear `frontend/src/tests/DashboardAccess.test.jsx`: `getMenu('administrador')` de `frontend/src/components/Layout.jsx` incluye "Dashboard" y `getMenu` de recepcionista, entrenador y cliente no lo incluye; renderizar `/dashboard` con un usuario recepcionista (contexto simulado) muestra "Acceso restringido"; `Home` con un usuario recepcionista no llama a `GET /dashboard`

### Implementación de la historia 3

- [X] T019 [US3] Revisar `backend/src/models/dashboard.model.js` y `backend/src/services/dashboard.service.js` para que cada consulta y la respuesta usen solo los campos de [contracts/api.md](./contracts/api.md) y corregir cualquier campo extra que detecten T017 o T018

**Punto de control**: dashboard protegido y sin datos sensibles.

---

## Fase 5: Historia de usuario 2 — Indicadores por periodo y tendencia (Prioridad: P2)

**Objetivo**: el administrador elige el periodo y ve la evolución diaria de ingresos y accesos
(FR-008, FR-009, FR-011).

**Prueba independiente**: con pagos y accesos en fechas distintas, los totales y la tendencia
coinciden con lo registrado en cada periodo.

**Depende de**: historia 1 (amplía su servicio y su pantalla).

### Pruebas de la historia 2

- [X] T020 [P] [US2] Crear `backend/tests/dashboard-periods.test.js`: `periodo=hoy` (desde = hasta = hoy), `7d` (hoy − 6 a hoy, 7 entradas en `tendencia`), `mes` y `rango` con fechas conocidas; la `tendencia` tiene una entrada por día en orden ascendente, con ceros en los días sin datos, y la suma de sus `ingresos`, `autorizados` y `rechazados` coincide con `pagos.ingresos` y `accesos`; los indicadores que no dependen del periodo (clientes, membresías, adeudo, rechazos recientes) no cambian; errores 400 con `periodo=semana`, `periodo=rango` sin fechas, rango invertido y rango de 367 días
- [X] T021 [P] [US2] Crear `frontend/src/tests/BarChart.test.jsx`: con 3 días de datos dibuja 3 barras, cada barra tiene un `<title>` con la fecha y el valor, y la tabla alternativa muestra los mismos valores; con todos los valores en cero no falla y muestra las barras vacías

### Implementación de la historia 2

- [X] T022 [US2] Agregar en `backend/src/models/dashboard.model.js` `dailyPayments(desde, hasta)` y `dailyAccesses(desde, hasta)` con `DATE_FORMAT(fecha, '%Y-%m-%d')` y `GROUP BY` del día (pagos solo con `estado = 'pagado'`; accesos separados por `resultado`)
- [X] T023 [US2] Completar en `backend/src/services/dashboard.service.js` la resolución de todos los periodos según la tabla "Periodo" de [data-model.md](./data-model.md) (`hoy`, `7d` con `addDays(hoy, -6)`, `mes`, `rango`) y armar `tendencia` con una entrada por cada día de `desde` a `hasta` (usar `addDays`), rellenando con `ingresos: '0.00'`, `autorizados: 0` y `rechazados: 0` los días sin datos
- [X] T024 [P] [US2] Crear `frontend/src/components/BarChart.jsx`: gráfica de barras en SVG con `viewBox` adaptable, una barra por día con `<title>` "fecha: valor", eje con la primera y la última fecha, colores con variables CSS, y un botón "Ver datos" que muestra u oculta una tabla con los mismos valores (FR-011); agregar sus estilos en `frontend/src/styles/global.css`
- [X] T025 [US2] Ampliar `frontend/src/pages/Dashboard.jsx` con un selector de periodo (Hoy, Últimos 7 días, Mes en curso, Rango) y, para el rango, dos campos de fecha con botón "Aplicar"; validar en la interfaz que el inicio no sea posterior al fin ni el rango supere 366 días, y ante un error del servidor mostrarlo y conservar el periodo y las cifras anteriores; agregar dos `BarChart`: "Ingresos por día" y "Accesos por día" (autorizados y rechazados)

**Punto de control**: las tres historias funcionan de forma independiente.

---

## Fase 6: Pulido y aspectos transversales

- [ ] T026 [P] Crear `backend/tests/dashboard-volume.test.js` que inserte en bloque 1 000 clientes con membresías, 5 000 pagos y 10 000 accesos repartidos en 300 días, y verifique que `GET /api/dashboard` y `GET /api/dashboard?periodo=rango` con un rango de 366 días responden en menos de 3 s cada uno (SC-001, SC-003)
- [ ] T027 [P] Actualizar `README.md`: el administrador inicia en el dashboard, qué muestra, cómo elegir el periodo, y enlace a `specs/003-dashboard-administrativo/quickstart.md`
- [ ] T028 [P] Agregar la migración 005 a la tabla de `database/README.md`
- [ ] T029 [P] Agregar en `docs/project-context.md` sección 16 un "Sprint 3 - Dashboard administrativo" con su objetivo y funcionalidades, y aclarar que el MVP se completa en tres sprints, con entrenadores, rutinas y progreso como mejoras futuras (constitución, principio I)
- [ ] T030 Revisar con `git grep -nE "require\(|module\.exports" -- backend database` que no hay CommonJS, que `frontend/package.json` y `backend/package.json` no tienen dependencias nuevas frente a la rama del Sprint 2 y que todos los textos nuevos están en español
- [ ] T031 Ejecutar `npm test` en `backend/` y `frontend/`, y `npx vite build` en `frontend/`, y corregir los fallos hasta que todo pase
- [ ] T032 Ejecutar el recorrido manual de la sección 3 de [quickstart.md](./quickstart.md) (pasos 1 a 10) y anotar cualquier desviación (SC-002, SC-006)

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Configuración (Fase 1)**: T001 primero. T002 puede hacerse en paralelo con la Fase 2.
- **Fundamentos (Fase 2)**: depende de T001 y **bloquea todas las historias**.
- **Historia 1 (Fase 3)**: depende de la Fase 2. Es el MVP.
- **Historia 3 (Fase 4)**: sus pruebas pueden escribirse después de la Fase 2, pero T019 y la
  verificación completa dependen de la historia 1.
- **Historia 2 (Fase 5)**: depende de la historia 1 (amplía `dashboard.model.js`,
  `dashboard.service.js` y `Dashboard.jsx`).
- **Pulido (Fase 6)**: depende de las tres historias.

### Dentro de cada historia

- Las pruebas se escriben primero y deben fallar antes de implementar.
- Modelo → servicio → controlador → pantalla.
- Archivos que varias historias modifican en orden (no en paralelo): `dashboard.model.js`,
  `dashboard.service.js`, `Dashboard.jsx`, `global.css`.

### Oportunidades de paralelismo

- Fase 2: T004, T005, T007 y T008 en paralelo; T006 después de T005.
- Historia 1: T010 y T011 en paralelo.
- Historia 3: T017 y T018 en paralelo (también con la historia 1 en curso).
- Historia 2: T020, T021 y T024 en paralelo.
- Pulido: T026 a T029 en paralelo.

---

## Ejemplo de paralelismo: historia de usuario 2

```text
Tarea: "T020 Pruebas de periodos en backend/tests/dashboard-periods.test.js"
Tarea: "T021 Pruebas de la gráfica en frontend/src/tests/BarChart.test.jsx"
Tarea: "T024 Gráfica de barras en frontend/src/components/BarChart.jsx"
```

---

## Estrategia de implementación

### MVP primero (historia 1)

1. Fase 1 (rama y documentación).
2. Fase 2 (índices, ruta protegida, piezas comunes).
3. Fase 3 (resumen del mes en curso).
4. **Detenerse y validar** con su prueba independiente.

### Entrega incremental

1. Historia 1 → resumen del mes (MVP).
2. Historia 3 → verificación de permisos y datos sensibles.
3. Historia 2 → periodos y tendencias.
4. Fase 6 → rendimiento, documentación y validación final.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- La etiqueta [USn] relaciona cada tarea con su historia (constitución, principio I).
- Commits con Conventional Commits en español, por ejemplo
  `feat(dashboard): agregar resumen general del gimnasio`.
- Entrenadores, rutinas, objetivos y progreso no forman parte de este sprint: ninguna tarea los
  implementa.
