# Guía de validación (quickstart): Sprint 3 — Dashboard administrativo

Demuestra de extremo a extremo que el dashboard funciona. Los detalles están en
[data-model.md](./data-model.md) y [contracts/api.md](./contracts/api.md).

## Requisitos previos

- El entorno de los Sprints 1 y 2 funcionando (base migrada, administrador inicial, backend y
  frontend en marcha). Si hay un backend antiguo corriendo, reinícialo.
- Verificar que la base usa la zona horaria del gimnasio: `SELECT NOW();` debe coincidir con la hora
  local de `APP_TIMEZONE` (research R-05).

## 1. Base de datos

```powershell
cd database
npm run db:migrate     # aplica 005_indices_dashboard.sql
```

**Resultado esperado**: existen `idx_pagos_fecha_estado` en `pagos` e `idx_membresias_fecha_fin` en
`membresias`; las migraciones 001 a 004 no cambiaron.

## 2. Pruebas automáticas

```powershell
cd backend;  npm test
cd frontend; npm test
```

**Resultado esperado**: todas pasan, incluidas la comparación con conteos conocidos (SC-002), los
permisos de los cuatro roles (SC-004), la ausencia de campos sensibles (SC-005) y la prueba de
rendimiento con 1 000 clientes, 5 000 pagos y 10 000 accesos (SC-001).

## 3. Recorrido manual

Preparar datos conocidos con las pantallas de los Sprints 1 y 2 (o con la base de pruebas): al
menos 3 clientes activos y 1 inactivo; una membresía vigente, una que termina hoy, una que termina
en 3 días y ya fue renovada, una vencida y una cancelada; 3 pagos de hoy (uno anulado); accesos
autorizados y rechazados de hoy y de días anteriores.

| # | Acción | Resultado esperado | Requisitos |
|---|--------|--------------------|------------|
| 1 | Iniciar sesión como administrador | La pantalla de inicio es el dashboard | FR-014 |
| 2 | Revisar las tarjetas con el periodo "Mes en curso" | Cada cifra coincide con el conteo manual; el pago anulado no suma; la cancelada no cuenta | FR-002 a FR-006, SC-002 |
| 3 | Revisar "Membresías por vencer" | Aparece la que termina hoy; la ya renovada no aparece; se identifica en menos de 30 s | FR-003, FR-004, SC-006 |
| 4 | Revisar "Rechazos recientes" y "Rechazos por motivo" | Se ven los 10 más recientes con motivo; "No identificado" sin cliente | FR-006, FR-007 |
| 5 | Cambiar a "Hoy", "Últimos 7 días" y un rango personalizado | Las cifras y la tendencia diaria se recalculan en menos de 3 s; cada barra muestra su valor en texto | FR-008, FR-009, FR-011, SC-003 |
| 6 | Aplicar un rango invertido o de más de 366 días | Mensaje claro; se conserva el periodo anterior | FR-008 |
| 7 | Con una base vacía (base de pruebas recién creada) | Todo en cero, sin errores | FR-013 |
| 8 | Iniciar sesión como recepcionista, entrenador y cliente; abrir `/dashboard` y llamar `GET /api/dashboard` con su token | Sin opción en el menú; la API responde 403 | FR-001, SC-004 |
| 9 | Revisar la respuesta de `GET /api/dashboard` en las herramientas del navegador | No hay correos, teléfonos, direcciones, datos faciales, similitud ni montos por cliente | FR-012, SC-005 |
| 10 | Detener el backend y recargar el dashboard | Mensaje claro sin detalles técnicos ni cifras a medias | FR-013 |

## 4. Revisión de restricciones

- No se agregaron dependencias nuevas en `frontend/` ni en `backend/` (research R-01).
- No hay CommonJS en `backend/` ni en `database/`; no existen `client/`, `server/` ni `dataBase/`.
- Todos los textos nuevos están en español.
