# Investigación (Fase 0): Sprint 3 — Dashboard administrativo

Cada decisión resuelve una incógnita del contexto técnico de [plan.md](./plan.md). Las decisiones
de los Sprints 1 y 2 (`specs/001-base-usuarios-clientes/research.md` y
`specs/002-membresias-pagos-acceso/research.md`) siguen vigentes; en particular, el cálculo de
estados efectivos (R-08) y de saldos (R-10) del Sprint 2.

## R-01. Gráficas sin dependencias nuevas

- **Decisión**: las tendencias diarias se dibujan con un componente propio de barras en SVG
  (`frontend/src/components/BarChart.jsx`), con un `<title>` por barra y una tabla con los mismos
  valores (que se puede mostrar u ocultar) debajo de cada gráfica (FR-011). Los indicadores numéricos son
  tarjetas con texto.
- **Justificación**: la constitución (principio III y "Tecnologías y dependencias") pide no agregar
  librerías innecesarias. Las gráficas del sprint son solo barras por día; un SVG sencillo cubre la
  necesidad, funciona en los dos temas de color con variables CSS y se prueba fácilmente con
  Testing Library.
- **Alternativas consideradas**: Recharts o Chart.js (dependencias de varios cientos de KB para
  dos gráficas de barras); gráficas en canvas (no accesibles sin trabajo adicional).

## R-02. Un solo endpoint con el periodo resuelto en el servidor

- **Decisión**: `GET /api/dashboard?periodo=hoy|7d|mes|rango&desde=&hasta=`, que devuelve todos los
  indicadores en una respuesta. El servidor convierte el periodo en fechas con `today()` y
  `APP_TIMEZONE` (Sprint 2, research R-08) y devuelve el rango resuelto. Por omisión, `mes`.
- **Justificación**: los días se delimitan con la zona horaria del gimnasio (FR-010) aunque el
  navegador esté en otra; una sola solicitud garantiza que todos los indicadores correspondan al
  mismo instante y simplifica los permisos (una ruta, solo administrador).
- **Alternativas consideradas**: un endpoint por indicador (más solicitudes y riesgo de cifras de
  momentos distintos); calcular las fechas en el navegador (depende de la zona del equipo).

## R-03. Cálculo de los indicadores al consultar

- **Decisión**: cada indicador es una consulta agregada parametrizada en un modelo nuevo
  `backend/src/models/dashboard.model.js`; el servicio las ejecuta en paralelo. Las reglas de
  estado efectivo y saldo se reutilizan del Sprint 2: la expresión de vigencia de
  `membership.model.js` y el adeudo de `debt.model.js` (`countDebtors().totalAdeudo`). La serie
  diaria se obtiene con `GROUP BY DATE(...)` y el servicio completa con ceros los días sin datos.
- **Justificación**: FR-010 exige cifras del momento de la consulta; no hay tabla
  `estadisticas_dashboard` que pueda quedar desactualizada (supuesto de la especificación).
  Reutilizar las reglas del Sprint 2 evita que el dashboard y las pantallas de pagos o membresías
  muestren cifras distintas.
- **Alternativas consideradas**: tabla de estadísticas actualizada por tarea programada (datos
  desfasados y una tarea más que mantener); vistas SQL (la lógica de "hoy" depende de un parámetro).

## R-04. Índices para el rendimiento

- **Decisión**: migración `005_indices_dashboard.sql` con `idx_pagos_fecha_estado (fecha_pago,
  estado)` y `idx_membresias_fecha_fin (fecha_fin)`. Los accesos ya tienen `idx_accesos_fecha` e
  `idx_accesos_resultado_fecha` (Sprint 2).
- **Justificación**: el índice existente de pagos empieza por `id_cliente` y no sirve para filtrar
  por rango de fechas; con 5 000 pagos y 10 000 accesos, los índices por fecha mantienen las
  consultas muy por debajo de los 5 s de SC-001.
- **Alternativas consideradas**: no agregar índices (funciona con pocos datos, pero no garantiza
  SC-001 al crecer).

## R-05. Zona horaria de los registros

- **Decisión**: los rangos de días se filtran como `fecha >= 'desde 00:00:00' AND fecha <
  'hasta' + 1 día`, igual que las consultas de pagos y accesos del Sprint 2. Se asume que el
  servidor MySQL o MariaDB local usa la misma zona horaria que `APP_TIMEZONE`, como en el
  despliegue local del proyecto.
- **Justificación**: es consistente con los filtros existentes, así que el dashboard y la consulta
  de accesos dan los mismos números para el mismo día.
- **Riesgo**: si el servidor de base de datos usa otra zona, los totales por día podrían
  desplazarse. Se documenta en el quickstart cómo verificarlo (`SELECT NOW()` contra la hora local).

## R-06. Pantalla de inicio del administrador

- **Decisión**: la ruta `/` muestra el dashboard cuando el usuario es administrador y la pantalla
  de inicio actual para los demás roles (FR-014); además, `/dashboard` queda como ruta explícita
  solo para el administrador y como opción "Dashboard" en su menú.
- **Justificación**: cumple SC-006 (identificar membresías por vencer en menos de 30 s desde el
  inicio de sesión) sin cambiar la experiencia de los otros roles.

## R-07. Estrategia de pruebas

- **Backend** (`node:test` + `supertest`): `dashboard.test.js` con datos conocidos que cubren cada
  indicador y cada caso límite (pagos anulados, membresías canceladas, fin hoy, clientes con varias
  membresías vencidas, cliente con renovación ya registrada), los cuatro periodos, validación del
  rango, permisos de los cuatro roles, ausencia de campos sensibles y una prueba de rendimiento con
  1 000 clientes, 5 000 pagos y 10 000 accesos (SC-001).
- **Frontend** (`vitest` + Testing Library): `Dashboard.test.jsx` con la API simulada (indicadores
  en texto, cambio de periodo, mensaje sin datos y de error) y `BarChart.test.jsx` (una barra y un
  valor en texto por día).

## Decisiones pendientes

Ninguna bloquea el plan.
