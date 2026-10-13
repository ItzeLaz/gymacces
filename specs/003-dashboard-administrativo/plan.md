# Plan de implementación: Sprint 3 — Dashboard administrativo

**Rama**: `003-dashboard-administrativo` | **Fecha**: 2026-10-12 | **Especificación**: [spec.md](./spec.md)

**Entrada**: especificación de la feature en `specs/003-dashboard-administrativo/spec.md`

## Resumen

El Sprint 3 agrega el dashboard administrativo de `docs/project-context.md` (sección 7.8). El equipo
redujo el alcance de `docs/sprint-3.md` a esta parte el 2026-10-12. El dashboard incluye:

- Clientes activos e inactivos.
- Membresías vigentes, vencidas y por vencer, con la lista para contactar.
- Pagos e ingresos del periodo y adeudo total.
- Accesos autorizados y rechazados, con su distribución por motivo y los rechazos recientes.
- Tendencia diaria de ingresos y accesos, con periodo elegible.

Solo lo ve el administrador y es su pantalla de inicio.

**Enfoque técnico**:
- Un endpoint `GET /api/dashboard` calcula todo al consultar con consultas agregadas
  parametrizadas.
- Reutiliza las reglas de vigencia y saldo del Sprint 2.
- Resuelve el periodo con la zona horaria del gimnasio.
- Se apoya en una migración de índices.
- El frontend muestra tarjetas y gráficas de barras en SVG propias, sin dependencias nuevas.

Las decisiones están en [research.md](./research.md).

## Contexto técnico

**Lenguaje/versión**: JavaScript (ECMAScript 2022+) sobre Node.js 22 LTS o superior; ES Modules en
`backend/` y `database/`.

**Dependencias principales**: sin cambios respecto al Sprint 2; no se agregan dependencias
(research R-01).

**Almacenamiento**: MySQL 8.0+ o MariaDB 10.4+ (XAMPP). Sin tablas nuevas. Migración
`005_indices_dashboard.sql` con índices por fecha.

**Pruebas**:
- Backend: `node:test` + `supertest` con datos conocidos y una prueba de volumen.
- Frontend: `vitest` + Testing Library con la API simulada.
- Validación manual: [quickstart.md](./quickstart.md).

**Plataforma objetivo**: navegadores de escritorio actuales del personal administrativo.

**Tipo de proyecto**: aplicación web (frontend + backend + scripts de base de datos).

**Objetivos de rendimiento**:
- Dashboard completo en < 5 s con 1 000 clientes, 5 000 pagos y 10 000 accesos (SC-001).
- Cambio de periodo en < 3 s (SC-003).

**Restricciones**:
- Solo lectura.
- Solo el administrador (validado en el servidor).
- Sin datos de contacto, faciales, similitud ni montos por cliente en la respuesta.
- Días según `APP_TIMEZONE`.
- Textos en español; identificadores y rutas en inglés.

**Escala/alcance**:
- 1 endpoint nuevo.
- 1 pantalla nueva y 1 componente de gráfica.
- Cambios menores en la pantalla de inicio, las rutas y el menú.

## Revisión de la constitución

*COMPUERTA: debe cumplirse antes de la Fase 0 y revisarse de nuevo después de la Fase 1.*

| # | Principio | Cómo lo cumple el plan | Estado |
|---|-----------|------------------------|--------|
| I | Alcance, MVP y fuente de verdad | El dashboard forma parte del MVP (`project-context.md` §4 y §7.8). El resto de `docs/sprint-3.md` quedó fuera por decisión del equipo (Clarifications). Falta actualizar `docs/sprint-3.md` con el alcance reducido; se incluye como tarea. | ⚠️ Pendiente de actualizar la documentación |
| II | Arquitectura con responsabilidades separadas | Las tres carpetas de siempre. Backend en ruta → controlador → servicio → modelo. Los cálculos van en el servicio y el modelo, no en la interfaz. | ✅ |
| III | Stack tecnológico | Sin cambios y sin dependencias nuevas. | ✅ |
| IV | Base de datos y persistencia | Sin tablas nuevas. Solo índices en una migración nueva `005`. Consultas parametrizadas. | ✅ |
| V | Seguridad y protección | Permiso validado en el servidor. Respuesta sin datos sensibles. Errores genéricos. | ✅ |
| VI | Roles y permisos | "Dashboard" y "control financiero" son del administrador; los demás roles reciben 403. | ✅ |
| VII | Integridad de las reglas de negocio | Reutiliza las reglas de vigencia, cancelación y saldo del Sprint 2 sin redefinirlas. | ✅ |
| VIII | Reconocimiento facial y control de acceso | Solo cuenta accesos; no expone datos faciales ni similitud. | ✅ |
| IX | API y manejo de errores | Misma estructura JSON, validación de parámetros y manejador central. | ✅ |
| X | Pruebas | Pruebas automáticas de indicadores, permisos, datos sensibles y rendimiento, más recorrido manual. | ✅ |
| XI | UX/UI profesional y sencilla | Tarjetas y gráficas con valor en texto, estados vacíos y de error claros. | ✅ |
| — | Flujo de desarrollo (ramas) | El repositorio está en `002-membresias-pagos-acceso`. Antes de implementar hay que crear `003-dashboard-administrativo`, después de cerrar o confirmar el Sprint 2. | ⚠️ Pendiente de crear la rama |

**Resultado de la compuerta (antes de la Fase 0)**: aprobada, sin violaciones. Quedan dos
pendientes operativos: actualizar `docs/sprint-3.md` y crear la rama.

**Revisión después de la Fase 1**: el modelo de datos (sin tablas), el contrato (un endpoint de solo
lectura) y la estructura mantienen el resultado. No hay dependencias nuevas.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/003-dashboard-administrativo/
├── plan.md              # Este archivo (salida de /speckit-plan)
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── api.md           # Fase 1: GET /dashboard y rutas del frontend
├── checklists/
│   └── requirements.md  # Checklist de calidad de la especificación
└── tasks.md             # Fase 2 (salida de /speckit-tasks, NO la crea /speckit-plan)
```

### Código fuente (raíz del repositorio)

Solo archivos nuevos (➕) o modificados (✏️).

```text
database/migrations/
└── 005_indices_dashboard.sql                ➕

backend/
├── src/
│   ├── routes/dashboard.routes.js           ➕ GET / solo administrador
│   ├── routes/index.js                      ✏️ montar /dashboard
│   ├── controllers/dashboard.controller.js  ➕
│   ├── services/dashboard.service.js        ➕ periodo, ejecución en paralelo, días sin datos con cero
│   ├── models/dashboard.model.js            ➕ consultas agregadas parametrizadas
│   └── validators/dashboard.validator.js    ➕ periodo y rango
└── tests/
    └── dashboard.test.js                    ➕ indicadores, periodos, permisos, datos sensibles, volumen

frontend/src/
├── api/dashboard.js                         ➕
├── components/BarChart.jsx                  ➕ barras SVG con valor en texto
├── components/StatCard.jsx                  ➕ tarjeta de indicador
├── pages/Dashboard.jsx                      ➕
├── pages/Home.jsx                           ✏️ el administrador ve el dashboard
├── App.jsx                                  ✏️ ruta /dashboard
├── components/Layout.jsx                    ✏️ opción "Dashboard" para el administrador
├── styles/global.css                        ✏️ tarjetas y gráficas
└── tests/Dashboard.test.jsx, tests/BarChart.test.jsx   ➕
```

**Decisión de estructura**: se mantiene la estructura de tres carpetas y las capas del backend de
los sprints anteriores; no se crean carpetas nuevas.

## Seguimiento de complejidad

No hay violaciones de la constitución que justificar.
