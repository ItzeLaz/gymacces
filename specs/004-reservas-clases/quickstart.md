# Guía rápida de validación: Reservas de clases grupales

**Feature**: [spec.md](./spec.md) | **Contrato**: [contracts/api.md](./contracts/api.md) |
**Modelo**: [data-model.md](./data-model.md)

Esta guía comprueba de extremo a extremo que la feature funciona. No contiene código de
implementación.

## 1. Requisitos previos

- MySQL 8 o MariaDB 10.4+ en ejecución (por ejemplo, XAMPP).
- `backend/.env`, `database/.env` y `frontend/.env` configurados a partir de sus `.env.example`,
  con `APP_TIMEZONE=America/Mexico_City` (o la zona del gimnasio).
- Dependencias instaladas: `npm install` en `backend/`, `frontend/` y `database/`. Esta feature no
  agrega dependencias.

## 2. Preparar la base de datos

```bash
cd database
npm run db:migrate          # aplica 006_create_clases_reservas.sql
npm run db:seed             # administrador inicial
npm run db:check-encoding   # confirma utf8mb4 en las tablas nuevas
```

Comprobaciones:
- `SHOW TABLES` incluye `clases` y `reservas`.
- `SHOW CREATE TABLE reservas` muestra `ENGINE=InnoDB`, `utf8mb4_unicode_ci` y el índice único
  `uq_reservas_sesion_cliente_activa`.

## 3. Pruebas automáticas (deben pasar antes de cada commit de implementación)

```bash
cd backend && npm test     # node:test + supertest; incluye la prueba de concurrencia
cd frontend && npm test    # Vitest + Testing Library
```

Resultado esperado: todas las pruebas en verde, incluidas las nuevas:

| Archivo | Qué comprueba |
|---------|---------------|
| `backend/tests/sessions.unit.test.js` | Empalme semiabierto, estado de la sesión, ventana `[hoy, hoy + 7]`, fechas de sesión por día ISO |
| `backend/tests/classes.test.js` | US1, criterios 1 a 12 y 14 |
| `backend/tests/reservations.test.js` | US2, criterios 1 a 8, y US3, criterios 1 a 4 |
| `backend/tests/reservations-concurrency.test.js` | US2, criterio 9, y SC-001: 20 solicitudes simultáneas por el último lugar → exactamente 1 aceptada |
| `backend/tests/sessions.test.js` | US4, criterios 1 a 5 (lista, "Quedan X de Y lugares", canceladas excluidas, horario y "Llena") |
| `backend/tests/attendance.test.js` | US5, criterios 1 a 6 (con la hora fijada mediante `mock.timers`) |
| `backend/tests/classes-permissions.test.js` | US1-13, US2-10, US4-6, FR-011 y SC-006 para los cuatro roles |
| `backend/tests/database.test.js` | Las tablas nuevas existen con InnoDB y utf8mb4 |
| `frontend/src/tests/ClassForm.test.jsx`, `Schedule.test.jsx`, `SessionDetail.test.jsx` | Formularios, mensajes y etiquetas en español |

## 4. Recorrido manual

Inicia `backend` (`npm run dev`) y `frontend` (`npm run dev`). Prepara antes:

- Un usuario **entrenador** activo ("Carla Ruiz") y un usuario **recepcionista**, creados en
  Usuarios.
- Tres clientes activos (A, B y C) con membresía activa que cubra la próxima semana y un cliente D
  con la membresía vencida.

### Escenario 1 — Registrar el horario (US1)

1. Como administrador, abre **Clases → Nueva clase** y registra "Spinning", Carla Ruiz, el día de
   mañana, 07:00, 45 minutos, cupo **2**.
   → Mensaje "Clase registrada." y la clase aparece en **Horario** con "Quedan 2 de 2 lugares".
2. Intenta registrar otra clase de Carla el mismo día a las 07:30.
   → "El instructor ya tiene una clase en ese horario."
3. Intenta registrar una clase con duración 10 o cupo 0.
   → Mensajes de duración y de cupo del contrato.
4. Inicia sesión como recepcionista y comprueba que no aparece la opción **Clases** y que
   `POST /api/classes` responde 403.

### Escenario 2 — Reservar y llenar la clase (US2, US4)

1. Como recepcionista, abre **Horario → Spinning (mañana)** y reserva para el cliente A.
   → "Quedan 1 de 2 lugares".
2. Reserva otra vez para A → "El cliente ya tiene una reserva en esta clase."
3. Reserva para B → "Quedan 0 de 2 lugares" y la sesión aparece como **Llena** en el horario.
4. Reserva para C → "Clase llena."
5. Reserva para D en otra clase con lugares → "El cliente no tiene una membresía vigente para la
   fecha de la clase."
6. Crea "Yoga" el mismo día a las 07:30 con otro entrenador y reserva para A.
   → "El cliente ya tiene una reserva en una clase que se empalma con este horario."

### Escenario 3 — Cancelar y cambiar el cupo (US3, US1)

1. Como administrador, intenta cambiar el cupo de Spinning a 1.
   → "El cupo no puede ser menor que las reservas existentes (2)."
2. Intenta desactivar Spinning → "No se puede desactivar una clase con reservas activas."
3. Como recepcionista, cancela la reserva de B (confirmando el diálogo).
   → "Quedan 1 de 2 lugares" y B ya no aparece en la lista.
4. Reserva para C → se acepta.

### Escenario 4 — Asistencia y reserva durante la clase (US5, US2-8)

Para no esperar a mañana, registra una clase de prueba para hoy que haya empezado hace 5 minutos
y dure 60 minutos (la sesión queda en curso):

1. En la sesión en curso, reserva para A → la reserva aparece con asistencia **Presente**.
2. Desmarca la asistencia de A → "Sin registrar". Márcala de nuevo → "Presente".
3. Intenta cancelar la reserva de A → "No se puede cancelar una reserva de una clase que ya
   empezó."
4. En la sesión de mañana, intenta marcar asistencia → "La asistencia solo se puede registrar a
   partir de la hora de inicio de la clase."
5. Al día siguiente, abre la sesión de prueba: las reservas sin asistencia aparecen como **No
   asistió** y marcar asistencia responde "La asistencia solo se puede registrar el mismo día de la
   clase."

### Escenario 5 — Auditoría

```sql
SELECT accion, entidad, id_registro, descripcion
FROM auditoria
WHERE accion LIKE 'clase.%' OR accion LIKE 'reserva.%'
ORDER BY id_auditoria;
```

→ Aparecen `clase.crear`, `reserva.registrar` y `reserva.cancelar` con el usuario que hizo cada
acción, sin datos sensibles.

## 5. Criterios de éxito

| SC | Cómo se comprueba |
|----|-------------------|
| SC-001 | `reservations-concurrency.test.js` |
| SC-002 | Escenario 2, paso 1: menos de 1 minuto desde que se abre el horario |
| SC-003 | El horario muestra los lugares de todas las sesiones sin abrir cada una (< 10 s) |
| SC-004 | Cada rechazo de los escenarios 2 y 3 muestra el mensaje exacto del contrato |
| SC-005 | Marcar 20 reservas en el detalle de la sesión (un clic por cliente) en menos de 2 minutos |
| SC-006 | `classes-permissions.test.js` y el escenario 1, paso 4 |
