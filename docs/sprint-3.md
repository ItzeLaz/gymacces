<!--

Plantilla de insumo para /speckit.specify.

NO lo pongas dentro de specs/ (esa carpeta la genera Spec Kit).

-->

# Insumo de especificación - Sprint 3: Dashboard administrativo

> **Referencias obligatorias para el agente:**
>
> * Contexto maestro: `docs/project-context.md`
> * Constitución: `docs/reglas.md` (y `.specify/memory/constitution.md` una vez ratificada)
> * Sprint 1: `docs/sprint-1.md`
> * Sprint 2: `docs/sprint-2.md`
> * Especificación generada: `specs/003-dashboard-administrativo/`
> * Este documento describe únicamente el alcance de este sprint.

> **Cambio de alcance (2026-10-12)**: la versión original de este documento proponía además
> entrenadores, asignación de clientes, rutinas, objetivos y progreso. Esas funciones no forman
> parte del MVP definido en la constitución (principio I) ni en `docs/project-context.md`
> (secciones 4 y 16), por lo que el equipo decidió limitar el Sprint 3 al dashboard administrativo
> (sección 7.8 del contexto maestro). Las historias aplazadas se conservan en la sección 8
> ("Mejoras futuras").

## 1. Contexto del sprint

Este sprint agrega el dashboard administrativo previsto en el MVP. El dashboard resume, en una sola
pantalla, la información que los Sprints 1 y 2 ya registran: clientes, membresías, pagos, adeudos y
accesos.

La aplicación mantendrá la arquitectura establecida en los sprints anteriores:

* `frontend/`: aplicación React con JavaScript.
* `backend/`: aplicación Node.js + Express con JavaScript.
* `database/`: scripts, migraciones y semillas de MySQL.

El backend utilizará **ES Modules**, mediante `import` y `export`. No se utilizará CommonJS mediante `require()` o `module.exports`.

El archivo `backend/package.json` deberá mantener:

```json
{
  "type": "module"
}
```

El frontend no tendrá acceso directo a MySQL. Toda comunicación con la base de datos se realizará mediante la API REST del backend.

## 2. Objetivo

Implementar un dashboard administrativo que permita al administrador supervisar de forma rápida el
estado de clientes, membresías, pagos, ingresos y accesos del gimnasio para tomar decisiones
operativas.

## 3. Historia de usuario del sprint

### US-S3-06 — Dashboard administrativo

Como administrador, quiero ver un resumen de clientes activos, membresías, pagos, ingresos, adeudos
y accesos del gimnasio para tomar decisiones operativas.

## 4. Flujo demostrable al cierre del sprint

1. El administrador inicia sesión y su pantalla de inicio es el dashboard.
2. El dashboard muestra clientes activos e inactivos; clientes con membresía vigente, vencida y por
   vencer; pagos, ingresos y adeudo total; y accesos autorizados y rechazados.
3. El administrador revisa la lista de clientes con membresía por vencer para contactarlos.
4. El administrador revisa los accesos rechazados recientes y su distribución por motivo.
5. El administrador cambia el periodo (hoy, últimos 7 días, mes en curso o un rango) y ve la
   evolución diaria de ingresos y accesos.
6. El recepcionista, el entrenador y el cliente no pueden abrir el dashboard.

## 5. Entidades y tablas que toca este sprint

| Tabla             | Operaciones principales |
| ----------------- | ----------------------- |
| `clientes`        | Consultar               |
| `membresias`      | Consultar               |
| `tipos_membresia` | Consultar               |
| `pagos`           | Consultar               |
| `accesos`         | Consultar               |

El dashboard no crea tablas: calcula sus indicadores al consultar. Solo se agrega una migración con
índices para mantener el rendimiento.

## 6. Reglas de negocio aplicables

* Solo el administrador puede consultar el dashboard; los permisos se validan en el backend.
* El dashboard muestra información resumida y segura: no expone datos de contacto, información
  facial, similitud del reconocimiento ni montos individuales por cliente.
* Los indicadores reutilizan las reglas de los Sprints 1 y 2 (vigencia, cancelación, saldos y
  pagos anulados) para coincidir con las demás pantallas.
* Los días se delimitan con la zona horaria del gimnasio.

## 7. Criterios de aceptación

* El administrador puede consultar un dashboard con el resumen de clientes, membresías, pagos,
  ingresos, adeudo y accesos.
* El administrador puede elegir el periodo de los indicadores y ver su evolución diaria.
* La información se presenta en formato claro y legible, con los valores también en texto.
* Los datos del dashboard respetan los permisos del usuario autenticado.
* El dashboard no expone información sensible de los clientes.

## 8. Mejoras futuras (fuera del MVP)

Las siguientes historias se propusieron para este sprint y se aplazaron el 2026-10-12. Para
implementarlas habría que enmendar la constitución (principios I, IV y VI) y actualizar
`docs/project-context.md`.

### US-S3-01 — Registro de entrenadores

Como administrador, quiero registrar a los entrenadores del gimnasio para definir quiénes estarán a cargo del acompañamiento de los clientes.

### US-S3-02 — Asignación de entrenador a cliente

Como administrador o recepcionista, quiero asignar un entrenador a un cliente para establecer la responsabilidad del seguimiento físico y de entrenamiento.

### US-S3-03 — Creación de rutinas de entrenamiento

Como entrenador, quiero crear rutinas personalizadas para los clientes asignados para orientar su plan de entrenamiento.

### US-S3-04 — Registro de objetivos y progresos

Como entrenador, quiero registrar objetivos y avances del cliente para seguir su evolución de forma ordenada y medible.

### US-S3-05 — Consulta de rutina y progreso

Como cliente, quiero consultar mi rutina y mi progreso para conocer mi evolución y mantenerme motivado.

### US-S3-07 — Consulta del personal asignado

Como administrador o recepcionista, quiero consultar los clientes asignados a cada entrenador para organizar la carga de trabajo del equipo.

Tablas que se habían propuesto para estas historias: `entrenadores`, `asignaciones_entrenador`,
`rutinas`, `ejercicios_rutina`, `objetivos_entrenamiento` y `progresos_clientes`.

## 9. Criterios de cierre del sprint

El sprint se considera completado cuando:

1. El administrador cuenta con un dashboard funcional que coincide con la información registrada.
2. El dashboard permite elegir el periodo y muestra la evolución diaria.
3. El sistema mantiene la seguridad de permisos según el rol del usuario.
4. La documentación del proyecto refleja el alcance final del sprint.
