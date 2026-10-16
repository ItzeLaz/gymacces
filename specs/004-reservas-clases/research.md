# Investigación (Fase 0): Reservas de clases grupales

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-16

Cada decisión indica qué se eligió, por qué y qué alternativas se descartaron. No quedan puntos
marcados como NEEDS CLARIFICATION en el contexto técnico.

---

## R-01. Generación de las sesiones de una clase semanal

**Decisión**: las sesiones **se calculan al vuelo** y no tienen tabla propia. Una sesión se
identifica por el par `(id_clase, fecha_sesion)`. El servicio genera las fechas de la ventana de
reserva a partir de `dia_semana` y `hora_inicio` de cada clase activa, y las reservas guardan
`id_clase` y `fecha_sesion`.

**Razón**:
- El horario de una clase con reservas futuras no puede cambiar (US1, criterios 10 y 11). Por eso
  no hace falta guardar una "foto" de cada sesión: la clase siempre describe correctamente sus
  sesiones con reservas.
- No hay que programar un proceso periódico (cron) que cree sesiones cada semana ni rellenar huecos
  si el servidor estuvo apagado.
- El volumen es pequeño (decenas de clases, ventana de 8 días), así que calcular las sesiones en
  cada consulta cuesta milisegundos.
- La base de datos sigue validando la integridad: `reservas.id_clase` es llave foránea a `clases`.

**Alternativas descartadas**:
- **Tabla `sesiones_clase` generada por un proceso programado**: agrega una dependencia operativa
  (el proceso debe correr cada semana) y duplica datos que ya están en `clases`. Sería necesaria
  solo si se pudiera cancelar o mover una sesión suelta, y eso quedó fuera de alcance (Supuestos
  del spec).
- **Tabla de sesiones creada al primer uso** (al reservar se inserta la sesión si no existe): da
  una fila que bloquear, pero obliga a resolver la carrera de "dos inserciones de la misma sesión" y
  deja sesiones vacías difíciles de mantener al cambiar la clase. El bloqueo de R-02 sobre la fila
  de la clase da la misma garantía sin esa tabla.

---

## R-02. Evitar que dos personas tomen el último lugar al mismo tiempo

**Decisión**: **transacción con bloqueo pesimista**. Al reservar, dentro de `withTransaction`:

1. `SELECT ... FROM clientes WHERE id_cliente = ? FOR UPDATE` (se reutiliza
   `clientModel.lockById`). Serializa las reservas del mismo cliente y evita dos reservas
   empalmadas creadas al mismo tiempo en clases distintas.
2. `SELECT ... FROM clases WHERE id_clase = ? FOR UPDATE`. Serializa todas las reservas, las
   cancelaciones y los cambios de cupo de esa clase.
3. Contar las reservas activas de la sesión, validar el resto de las reglas e insertar.
4. Registrar la auditoría con la misma conexión y confirmar.

Siempre se bloquea en el mismo orden (cliente → clase) para evitar interbloqueos (deadlocks).

Como segunda defensa, una **restricción única** sobre `(id_clase, fecha_sesion, id_cliente,
clave_activa)` impide dos reservas activas del mismo cliente en la misma sesión (ver
[data-model.md](./data-model.md)). Si llegara a dispararse, el error `ER_DUP_ENTRY` se traduce al
mensaje de reserva duplicada.

**Razón**:
- Es el patrón que ya usa el proyecto (`FOR UPDATE` en clientes, membresías, pagos y rostros) y
  funciona igual en MySQL 8 y MariaDB 10.4+ con InnoDB.
- El cupo es una regla de conteo ("activas < cupo") que ninguna restricción declarativa puede
  expresar; el bloqueo de la fila de la clase la vuelve atómica.
- Bloquear la clase completa, y no solo la sesión, es más grueso, pero con el volumen de un
  gimnasio la espera es de milisegundos. A cambio, también serializa con la reducción de cupo
  (US1, criterio 9), que bloquea la misma fila.
- Cumple FR-004 y SC-001 (20 intentos simultáneos por el último lugar → exactamente 1 aceptado);
  se comprueba con una prueba de concurrencia que lanza 20 solicitudes con `Promise.all`.

**Alternativas descartadas**:
- **Solo restricción única**: evita duplicados del mismo cliente, pero no puede limitar el número
  de clientes distintos en una sesión.
- **Contador `ocupados` con `UPDATE ... SET ocupados = ocupados + 1 WHERE ocupados < cupo`**:
  es atómico sin bloqueo explícito, pero necesita una fila por sesión (R-01 la descarta) y el
  contador se puede desincronizar de las reservas reales.
- **Nivel de aislamiento SERIALIZABLE**: convierte las lecturas en bloqueos compartidos y provoca
  interbloqueos frecuentes que habría que reintentar; afecta a toda la transacción y no solo a esta
  regla.
- **Bloqueo optimista con columna de versión y reintentos**: añade lógica de reintento en el
  servicio sin ventaja real con esta concurrencia tan baja.
- **Validar el cupo solo en el frontend**: no es una medida de seguridad (principio III) y no
  resuelve la concurrencia.

---

## R-03. Dónde validar los empalmes de horario

**Decisión**: en la **capa de servicio del backend, dentro de la transacción**, con consultas
SQL parametrizadas en el modelo:

- **Empalme del cliente** (US2, criterio 6): con la fila del cliente bloqueada (R-02), el modelo
  busca reservas activas del cliente en la misma `fecha_sesion` cuya clase cumpla
  `inicio_existente < fin_nuevo AND inicio_nuevo < fin_existente`. Los intervalos son semiabiertos:
  una clase que termina a las 08:00 no se empalma con otra que empieza a las 08:00.
- **Empalme del instructor** (US1, criterio 5): al registrar o modificar una clase, con la fila del
  usuario instructor bloqueada (`FOR UPDATE`), se buscan clases activas del mismo instructor y el
  mismo `dia_semana` con la misma condición, excluyendo la clase que se modifica.
- La función que compara intervalos se escribe una vez en `backend/src/utils/sessions.js` para
  las reglas en memoria y sus pruebas unitarias; el modelo usa la misma condición en SQL.

**Razón**:
- El principio IX exige que la lógica de negocio viva en el backend y no en la interfaz.
- El servicio ya tiene la transacción y los bloqueos de R-02; validar ahí evita condiciones de
  carrera entre la validación y la inserción.
- El frontend puede mostrar los avisos, pero el servidor decide.

**Alternativas descartadas**:
- **Disparadores (triggers) en la base de datos**: el proyecto no usa triggers. Sus mensajes de
  error son difíciles de traducir a los textos en español del spec y su sintaxis difiere entre
  MySQL y MariaDB.
- **Restricción de exclusión por rango**: MySQL y MariaDB no tienen restricciones de exclusión
  como PostgreSQL.
- **Solo en el frontend**: no es una medida de seguridad y no ve las reservas que otra persona hace
  al mismo tiempo.

---

## R-04. Organización de las rutas de la API

**Decisión**: dos routers nuevos montados en `backend/src/routes/index.js`, con el mismo estilo
que pagos y membresías:

- `/classes` (`classes.routes.js`): catálogo de clases y consultas del horario.
  - `GET /classes`, `POST /classes`, `PATCH /classes/:id`, `PATCH /classes/:id/status`.
  - `GET /classes/instructors`: entrenadores activos para el formulario.
  - `GET /classes/schedule`: sesiones de la ventana de reserva con sus lugares disponibles.
  - `GET /classes/:id/sessions/:fecha`: detalle de una sesión con su lista de reservados.
- `/reservations` (`reservations.routes.js`): acciones sobre reservas.
  - `POST /reservations`, `PATCH /reservations/:id/cancel`, `PATCH /reservations/:id/attendance`.

Los detalles están en [contracts/api.md](./contracts/api.md).

**Razón**:
- Sigue la convención existente: recursos en plural y en inglés, acciones de estado como
  `PATCH /:id/<acción>` (igual que `PATCH /payments/:id/cancel` y `PATCH /memberships/:id/status`).
- La sesión no tiene tabla (R-01), así que se expone como subrecurso de solo lectura de la clase,
  identificado por la fecha.
- Las reservas son un recurso plano, como los pagos: el cuerpo trae `id_clase`, `fecha_sesion` e
  `id_cliente`, y se validan juntos en un solo lugar.
- Las rutas fijas (`/instructors`, `/schedule`) se declaran antes de `/:id` para que Express no
  las confunda con un identificador.

**Alternativas descartadas**:
- **Todo anidado (`/classes/:id/sessions/:fecha/reservations/:idReserva/...`)**: rutas largas y
  validación de tres parámetros en cada acción, sin beneficio, porque el `id_reserva` ya identifica
  la reserva.
- **Rutas bajo `/clients/:id/reservations`**: el flujo parte de la sesión y no del cliente; además,
  la consulta de reservas por cliente quedó fuera de alcance.
- **Reutilizar `GET /users?rol=entrenador` para el formulario**: el listado de usuarios es solo para
  el administrador y devuelve más datos de los necesarios. `GET /classes/instructors` devuelve solo
  `id_usuario` y `nombre` de entrenadores activos.

---

## R-05. Fecha y hora actuales y zona horaria

**Decisión**: todas las comparaciones de tiempo (si la sesión ya empezó, está en curso o terminó,
la ventana de 7 días y el "mismo día") se hacen en Node con la zona horaria `APP_TIMEZONE` del
gimnasio. Se agrega a `backend/src/utils/dates.js` una función `nowInGym()` que devuelve la fecha
(`AAAA-MM-DD`) y los minutos desde la medianoche locales, y los valores se pasan como parámetros a
SQL. **Ninguna consulta de esta feature usa `NOW()` ni `CURDATE()`.**

- Estado de una sesión: `pendiente` (antes de `hora_inicio`), `en_curso` (desde `hora_inicio`
  hasta antes de `hora_inicio + duracion_minutos`) o `terminada`.
- Ventana de reserva y del horario: desde hoy hasta hoy + 7 días, ambos incluidos (el spec rechaza
  solo las fechas "a más de 7 días").

**Razón**:
- Cumple FR-014 y reutiliza `APP_TIMEZONE`, igual que el dashboard (Sprint 3).
- Las pruebas pueden fijar la hora con `mock.timers` de `node:test` (`apis: ['Date']`) sin depender
  del reloj del servidor de base de datos.

**Alternativas descartadas**:
- **`NOW()` en SQL**: depende de la zona horaria configurada en MySQL/XAMPP y no se puede simular
  en las pruebas.
- **Guardar la fecha y hora de cada sesión en UTC**: no hay tabla de sesiones (R-01), y la regla
  "mismo día" es local al gimnasio.

---

## R-06. Clases que cruzan la medianoche

**Decisión**: una clase **debe terminar el mismo día** en que empieza (`hora_inicio +
duracion_minutos ≤ 24:00`). Se valida en el backend con el mensaje "La clase debe terminar el mismo
día." y con una restricción CHECK en la base.

**Razón**: así las comparaciones de empalme y la regla de asistencia "el mismo día" funcionan con
una sola fecha. Un gimnasio no programa clases grupales después de la medianoche.

**Alternativas descartadas**: permitir clases que crucen la medianoche obligaría a comparar
intervalos entre dos fechas y a redefinir "el mismo día" de la asistencia.

**Criterio de aceptación**: US1, criterio 14 del spec (agregado el 2026-10-16).

---

## R-07. Validación de membresía y cliente

**Decisión**: se reutiliza la regla de vigencia del Sprint 2: `membershipModel.findCurrentByClient
(idCliente, fecha_sesion, connection)` con la **fecha de la sesión** en lugar de hoy. La reserva se
acepta solo si la membresía devuelta tiene `vigente = true` (estado `activa` y la fecha dentro de
`fecha_inicio`–`fecha_fin`). El adeudo no se consulta.

**Razón**: una sola definición de "membresía vigente" en todo el sistema (principio XI). Usar la
fecha de la sesión cumple US2, criterio 3: una membresía activa hoy que vence antes de la sesión no
alcanza.

**Alternativas descartadas**: escribir una consulta nueva de vigencia duplicaría la regla y podría
divergir de la del control de acceso.

---

## R-08. Mensajes, códigos HTTP y textos

**Decisión**:
- Los rechazos de reglas de negocio usan `422 BUSINESS_RULE` con el texto del spec.
- La reserva duplicada usa `409 CONFLICT` ("El cliente ya tiene una reserva en esta clase.").
- La falta de permiso usa el `403 FORBIDDEN` existente.
- Los errores de formato usan `400 VALIDATION_ERROR` por campo.
- Los textos terminan en punto, como el resto de los mensajes del sistema (por ejemplo, "No tienes
  permiso para realizar esta acción."). Las pruebas comparan el texto completo.

**Razón**: mantiene las convenciones de `AppError` y del contrato de los Sprints 1 a 3 (principio
XIII) y cumple FR-013.

**Alternativas descartadas**: usar 409 para todos los rechazos de reserva mezclaría conflictos de
unicidad con reglas de negocio, en contra del contrato del Sprint 2.

---

## R-09. Dependencias

**Decisión**: **no se agregan dependencias** al backend, al frontend ni a `database/`. Se usan
Express, `express-validator`, `mysql2`, React, React Router, Vitest y Testing Library, que ya están
instalados.

**Razón**: el principio I prohíbe frameworks nuevos sin justificación, y nada en esta feature los
necesita. El horario semanal se dibuja con una tabla o con tarjetas en CSS, sin librería de
calendario.

**Alternativas descartadas**: una librería de calendario (por ejemplo, FullCalendar) agrega peso
y estilo propio para una vista de 8 días que se resuelve con una tabla.

---

## R-10. Estrategia de pruebas

**Decisión**:
- **Unitarias** (`node:test`): `utils/sessions.js`, que cubre empalme de intervalos, estado de la
  sesión, ventana de reserva y fechas de sesión de una clase.
- **Integración** (`node:test` + `supertest` contra la base de pruebas):
  - Una prueba por cada criterio EARS de las historias 1 a 5.
  - Permisos de los cuatro roles.
  - Auditoría.
  - Concurrencia (20 solicitudes simultáneas por el último lugar).
  - La hora se fija con `mock.timers`.
- **Frontend** (Vitest + Testing Library con la API simulada): formulario de clase, horario
  semanal y detalle de sesión con sus mensajes.
- `backend/tests/database.test.js` se actualiza con las tablas `clases` y `reservas`.

**Razón**: el principio II exige prueba automática de toda regla de negocio del backend y `npm
test` en verde antes de cada commit de implementación. Los criterios EARS (principio VI) se
traducen uno a uno en pruebas con nombres en español.

**Alternativas descartadas**: pruebas de extremo a extremo con navegador (Playwright o Cypress):
serían un framework nuevo sin justificación (principio I). El recorrido completo se valida a mano
con [quickstart.md](./quickstart.md).
