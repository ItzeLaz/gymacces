# Sprint 4: Clases grupales y reservas

> **Referencias**:
>
> * Contexto maestro: `docs/project-context.md` (secciones 4, 7.11, RN-19 a RN-23 y 16)
> * Constitución: `.specify/memory/constitution.md` (v2.1.0)
> * Especificación: `specs/004-reservas-clases/spec.md`
> * Plan, modelo de datos y contrato: `specs/004-reservas-clases/`
> * Este documento describe únicamente el alcance de este sprint.

> **Ampliación posterior al MVP**: el MVP (Sprints 1 a 3) no incluye clases grupales. Esta
> ampliación se justifica en la sección "Justificación de alcance" del spec y en la "Verificación
> de la constitución" del plan (principio VIII). Ver la sección 8, "Aprobación".

## 1. Contexto del sprint

El gimnasio ofrece clases grupales (spinning, yoga, funcional) con cupo limitado y hoy no tiene
forma de controlar quién asiste ni de evitar el sobrecupo. Este sprint agrega un horario semanal de
clases y reservas hechas por recepción, sobre los clientes y las membresías de los sprints
anteriores.

Se mantiene la arquitectura de siempre: `frontend/` (React con Vite), `backend/` (Node.js con
Express y ES Modules) y `database/` (migraciones SQL de MySQL o MariaDB).

## 2. Objetivo

Controlar el cupo y la asistencia de las clases grupales: el administrador publica el horario
semanal y recepción reserva, cancela y toma asistencia sin sobrecupo.

## 3. Historias de usuario del sprint

| Historia | Prioridad | Descripción |
|----------|-----------|-------------|
| US1 | P1 | Como administrador, quiero registrar clases (nombre, instructor, día y hora, duración y cupo máximo) para publicar el horario semanal. |
| US2 | P1 | Como recepción, quiero reservar un lugar a un cliente en una clase para asegurar su asistencia. |
| US3 | P2 | Como recepción, quiero cancelar la reserva de un cliente para liberar el lugar. |
| US4 | P2 | Como administrador, quiero ver la lista de reservados de cada clase y cuántos lugares quedan. |
| US5 | P3 | Como recepción, quiero marcar asistencia de los reservados al iniciar la clase. |

Los criterios de aceptación, escritos en EARS, están en `specs/004-reservas-clases/spec.md`.

## 4. Flujo demostrable al cierre del sprint

Corresponde a los escenarios de `specs/004-reservas-clases/quickstart.md`:

1. El administrador registra "Spinning" con un entrenador activo, el día de mañana, 07:00, 45
   minutos y cupo 2; la clase aparece en el horario.
2. Recepción reserva para dos clientes; la sesión aparece como "Llena" y una tercera reserva se
   rechaza con "Clase llena.".
3. Una reserva para un cliente sin membresía vigente en la fecha de la clase se rechaza.
4. Recepción cancela una reserva antes del inicio y el lugar se libera.
5. Durante la clase, recepción registra a un cliente que llega sin reserva (con asistencia marcada)
   y marca la asistencia de los reservados.
6. Al día siguiente, las reservas sin asistencia aparecen como "No asistió".
7. El entrenador y el cliente no pueden usar el módulo.

## 5. Tablas que toca este sprint

| Tabla | Operaciones principales |
|-------|-------------------------|
| `clases` (nueva) | Registrar, modificar, desactivar y consultar |
| `reservas` (nueva) | Registrar, cancelar, marcar asistencia y consultar |
| `usuarios` | Consultar (entrenadores activos) |
| `clientes` | Consultar |
| `membresias` | Consultar (vigencia en la fecha de la sesión) |
| `auditoria` | Registrar las acciones `clase.*` y `reserva.*` |

Migración nueva: `database/migrations/006_create_clases_reservas.sql`.

## 6. Reglas de negocio aplicables

RN-19 a RN-23 de `docs/project-context.md`: cupo máximo por sesión, membresía vigente en la fecha
de la sesión, sin reservas duplicadas ni empalmadas, cancelación antes del inicio y asistencia el
mismo día.

## 7. Fuera de alcance

Tomado de los Supuestos del spec:

* Que los clientes reserven por su cuenta.
* Listas de espera.
* Notificaciones a clientes.
* Cancelar una sola sesión sin desactivar la clase.
* Sanciones por inasistencia.
* Consultas para el rol entrenador.
* Cobro por clase.
* Reportes de ocupación.

## 8. Aprobación

La decisión de incluir esta ampliación la tomó la autora de la rama `004-reservas-clases` para su
reporte individual. **La aprobación formal del equipo queda pendiente**, como exige la gobernanza
de la constitución. Este estado no bloquea la implementación (T004 de
`specs/004-reservas-clases/tasks.md`).

## 9. Criterios de cierre del sprint

1. Todos los criterios EARS del spec tienen prueba automática y `npm test` pasa en `backend/` y
   `frontend/`.
2. Los escenarios de `quickstart.md` se recorren a mano sin errores.
3. La documentación del proyecto refleja la ampliación de alcance.
