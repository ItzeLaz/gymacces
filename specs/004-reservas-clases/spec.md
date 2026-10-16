# Especificación de feature: Reservas de clases grupales

**Rama de feature**: `004-reservas-clases`

**Creada**: 2026-10-16

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Reservas de clases grupales para GymAccess. El gimnasio
ofrece clases grupales (spinning, yoga, funcional) con cupo limitado y hoy no hay forma de
controlar quién asiste ni evitar sobrecupo. Usuarios: administrador y recepción."

## Clarifications

### Session 2026-10-16

- Q: ¿Las clases se registran como un horario semanal que se repite o como sesiones sueltas con
  fecha y hora únicas? → A: Como clase semanal que se repite (por ejemplo, Spinning cada lunes a
  las 07:00); cada fecha es una sesión que se reserva por separado, con hasta 7 días de
  anticipación.

## Escenarios de usuario y pruebas *(obligatorio)*

Todos los criterios de aceptación siguen los patrones EARS del principio VI de la constitución
(Ubicuo, CUANDO, MIENTRAS, SI... ENTONCES, DONDE).

Términos usados en este documento:

- **Clase**: actividad grupal que se repite cada semana en el mismo día y a la misma hora (por
  ejemplo, "Spinning, lunes 07:00, 45 minutos, cupo 20").
- **Sesión**: cada fecha concreta en que se imparte una clase (por ejemplo, Spinning del lunes
  2026-10-19 a las 07:00). Las reservas, el cupo disponible y la asistencia se controlan por sesión.
- **Recepción**: usuario con rol recepcionista. El administrador puede hacer todo lo que hace
  recepción.

### Historia de usuario 1 — Registro del horario semanal de clases (Prioridad: P1)

Como administrador, quiero registrar clases (nombre, instructor, día y hora, duración y cupo
máximo) para publicar el horario semanal.

**Por qué esta prioridad**: sin clases registradas no hay nada que reservar; el horario semanal es
la base de todas las demás historias.

**Prueba independiente**: el administrador registra "Spinning", lunes 07:00, 45 minutos, cupo 20,
y la clase aparece en el horario semanal; un recepcionista intenta registrar otra clase y el
sistema lo rechaza.

**Criterios de aceptación (EARS)**:

1. CUANDO el administrador registre una clase con nombre, instructor, día de la semana, hora de
   inicio, duración y cupo máximo válidos, el sistema DEBE guardarla como activa, mostrarla en el
   horario semanal y mostrar el mensaje "Clase registrada".
2. SI falta alguno de los datos obligatorios de la clase, ENTONCES el sistema DEBE rechazar el
   registro e indicar qué dato falta.
3. SI la duración es menor a 15 minutos o mayor a 240 minutos, ENTONCES el sistema DEBE rechazar
   el registro y mostrar el mensaje "La duración debe estar entre 15 y 240 minutos".
4. SI el cupo máximo es menor a 1 o mayor a 100, ENTONCES el sistema DEBE rechazar el registro y
   mostrar el mensaje "El cupo debe estar entre 1 y 100 lugares".
5. SI el instructor ya tiene otra clase activa el mismo día de la semana cuyo horario se empalma
   con el de la nueva clase, ENTONCES el sistema DEBE rechazar el registro y mostrar el mensaje
   "El instructor ya tiene una clase en ese horario".
6. CUANDO el administrador modifique el nombre, el instructor o aumente el cupo de una clase, el
   sistema DEBE guardar el cambio y aplicarlo a todas las sesiones futuras.
7. SI el administrador intenta reducir el cupo de una clase por debajo del número de reservas
   activas de alguna de sus sesiones futuras, ENTONCES el sistema DEBE rechazar el cambio y mostrar
   el mensaje "El cupo no puede ser menor que las reservas existentes (N)", donde N es el mayor
   número de reservas activas en una sesión futura.
8. SI el administrador intenta cambiar el día, la hora de inicio o la duración de una clase que
   tiene reservas activas en sesiones futuras, ENTONCES el sistema DEBE rechazar el cambio y
   mostrar el mensaje "No se puede cambiar el horario de una clase con reservas activas".
9. SI el administrador intenta desactivar una clase que tiene reservas activas en sesiones futuras,
   ENTONCES el sistema DEBE rechazar la desactivación y mostrar el mensaje "No se puede desactivar
   una clase con reservas activas".
10. MIENTRAS una clase esté desactivada, el sistema DEBE excluirla del horario semanal y rechazar
    nuevas reservas en sus sesiones.
11. SI un usuario con rol recepcionista, entrenador o cliente intenta registrar, modificar o
    desactivar una clase, ENTONCES el sistema DEBE rechazar la operación y mostrar el mensaje "No
    tienes permiso para realizar esta acción".

---

### Historia de usuario 2 — Reservar un lugar para un cliente (Prioridad: P1)

Como recepción, quiero reservar un lugar a un cliente en una clase para asegurar su asistencia.

**Por qué esta prioridad**: es la función que resuelve el problema central: controlar quién va a
cada clase y evitar el sobrecupo.

**Prueba independiente**: con una clase de cupo 2 y tres clientes con membresía activa, recepción
reserva para los dos primeros, ve que quedan 0 lugares y el tercer intento se rechaza con "Clase
llena".

**Criterios de aceptación (EARS)**:

1. CUANDO recepción reserve un lugar para un cliente con membresía activa en una sesión con cupo
   disponible, el sistema DEBE registrar la reserva y reducir en uno los lugares disponibles de esa
   sesión.
2. SI la sesión no tiene lugares disponibles, ENTONCES el sistema DEBE rechazar la reserva y
   mostrar el mensaje "Clase llena".
3. SI el cliente no tiene una membresía en estado activa que cubra la fecha de la sesión (vencida,
   suspendida, cancelada o inexistente), ENTONCES el sistema DEBE rechazar la reserva y mostrar el
   mensaje "El cliente no tiene una membresía vigente para la fecha de la clase".
4. SI el cliente no existe o está inactivo, ENTONCES el sistema DEBE rechazar la reserva y mostrar
   el mensaje "Cliente no encontrado o inactivo".
5. SI el cliente ya tiene una reserva activa en la misma sesión, ENTONCES el sistema DEBE rechazar
   la reserva y mostrar el mensaje "El cliente ya tiene una reserva en esta clase".
6. SI el cliente ya tiene una reserva activa en otra sesión de la misma fecha cuyo horario se
   empalma con el de la sesión elegida, ENTONCES el sistema DEBE rechazar la reserva y mostrar el
   mensaje "El cliente ya tiene una reserva en una clase que se empalma con este horario".
7. SI la sesión ya empezó o su fecha está a más de 7 días de la fecha actual, ENTONCES el sistema
   DEBE rechazar la reserva y mostrar el mensaje "Solo se puede reservar en clases que no han
   empezado y dentro de los próximos 7 días".
8. CUANDO dos reservas para el último lugar disponible de una sesión se registren al mismo tiempo,
   el sistema DEBE aceptar solo una y rechazar la otra con el mensaje "Clase llena".
9. SI un usuario con rol entrenador o cliente intenta registrar una reserva, ENTONCES el sistema
   DEBE rechazar la operación y mostrar el mensaje "No tienes permiso para realizar esta acción".

---

### Historia de usuario 3 — Cancelar la reserva de un cliente (Prioridad: P2)

Como recepción, quiero cancelar la reserva de un cliente para liberar el lugar.

**Por qué esta prioridad**: sin cancelación, los lugares de clientes que no asistirán quedan
bloqueados y otros clientes no pueden reservar.

**Prueba independiente**: en una sesión llena, recepción cancela una reserva, el número de lugares
disponibles sube a 1 y otro cliente puede reservar ese lugar.

**Criterios de aceptación (EARS)**:

1. CUANDO recepción cancele una reserva activa de una sesión que todavía no empieza, el sistema
   DEBE marcar la reserva como cancelada, conservarla en el historial y aumentar en uno los
   lugares disponibles de esa sesión.
2. SI la sesión de la reserva ya empezó, ENTONCES el sistema DEBE rechazar la cancelación y
   mostrar el mensaje "No se puede cancelar una reserva de una clase que ya empezó".
3. SI la reserva ya estaba cancelada, ENTONCES el sistema DEBE rechazar la operación y mostrar el
   mensaje "La reserva ya está cancelada".
4. CUANDO una reserva se cancele, el sistema DEBE permitir que el mismo cliente vuelva a reservar
   en esa sesión si cumple las demás reglas de reserva.

---

### Historia de usuario 4 — Consultar reservados y lugares disponibles (Prioridad: P2)

Como administrador, quiero ver la lista de reservados de cada clase y cuántos lugares quedan.

**Por qué esta prioridad**: permite planear la ocupación y detectar clases con mucha o poca
demanda; recepción también la necesita para atender a los clientes y tomar asistencia.

**Prueba independiente**: con una sesión de cupo 20 y 3 reservas activas y 1 cancelada, el
administrador ve los 3 clientes reservados y "Quedan 17 de 20 lugares".

**Criterios de aceptación (EARS)**:

1. CUANDO el administrador o recepción consulte una sesión, el sistema DEBE mostrar el nombre de la
   clase, el instructor, la fecha y hora, el cupo máximo, el número de reservas activas y los
   lugares disponibles con el texto "Quedan X de Y lugares".
2. CUANDO el administrador o recepción consulte una sesión, el sistema DEBE listar los clientes con
   reserva activa ordenados alfabéticamente por nombre, junto con el estado de asistencia de cada
   uno.
3. El sistema DEBE excluir las reservas canceladas del conteo de lugares ocupados y de la lista de
   reservados.
4. CUANDO el administrador o recepción consulte el horario semanal, el sistema DEBE mostrar, para
   cada sesión de los próximos 7 días, los lugares disponibles.
5. MIENTRAS una sesión no tenga lugares disponibles, el sistema DEBE mostrarla con la etiqueta
   "Llena" en el horario semanal.
6. SI un usuario con rol entrenador o cliente intenta consultar la lista de reservados, ENTONCES el
   sistema DEBE rechazar la consulta y mostrar el mensaje "No tienes permiso para realizar esta
   acción".

---

### Historia de usuario 5 — Marcar asistencia de los reservados (Prioridad: P3)

Como recepción, quiero marcar asistencia de los reservados al iniciar la clase.

**Por qué esta prioridad**: aporta el control de quién asistió realmente; depende de que existan
clases y reservas.

**Prueba independiente**: en una sesión con 3 reservas, cuando llega la hora de inicio, recepción
marca a 2 clientes como presentes; al terminar el día, el tercero aparece como "No asistió".

**Criterios de aceptación (EARS)**:

1. CUANDO recepción marque como presente a un cliente con reserva activa en una sesión que ya
   empezó el mismo día, el sistema DEBE registrar su asistencia con la fecha y hora del registro y
   el usuario que la marcó.
2. SI recepción intenta marcar asistencia antes de la hora de inicio de la sesión, ENTONCES el
   sistema DEBE rechazar la operación y mostrar el mensaje "La asistencia solo se puede registrar a
   partir de la hora de inicio de la clase".
3. SI recepción intenta marcar asistencia después del día de la sesión, ENTONCES el sistema DEBE
   rechazar la operación y mostrar el mensaje "La asistencia solo se puede registrar el mismo día
   de la clase".
4. SI la reserva está cancelada o el cliente no tiene reserva en la sesión, ENTONCES el sistema DEBE
   rechazar la operación y mostrar el mensaje "El cliente no tiene una reserva activa en esta
   clase".
5. CUANDO recepción desmarque la asistencia de un cliente el mismo día de la sesión, el sistema DEBE
   regresar la reserva al estado sin asistencia.
6. CUANDO termine el día de una sesión, el sistema DEBE mostrar como "No asistió" las reservas
   activas que no tengan asistencia registrada.

---

### Casos límite

- **Clase llena**: la reserva se rechaza con "Clase llena" (US2, criterio 2), incluso cuando dos
  personas intentan tomar el último lugar al mismo tiempo (US2, criterio 8).
- **Membresía vencida o inexistente**: la reserva se rechaza si la membresía no está activa o no
  cubre la fecha de la sesión, aunque esté activa el día en que se hace la reserva (US2,
  criterio 3).
- **Reserva duplicada**: un cliente no puede tener dos reservas activas en la misma sesión (US2,
  criterio 5); sí puede volver a reservar después de cancelar (US3, criterio 4).
- **Clases que se empalman**: dos sesiones se empalman si sus intervalos [inicio, inicio + duración)
  se cruzan; una clase que termina a las 08:00 y otra que empieza a las 08:00 no se empalman (US2,
  criterio 6).
- **Cancelar una clase que ya empezó**: se rechaza (US3, criterio 2).
- **Reducir el cupo por debajo de las reservas**: se rechaza indicando el número de reservas
  existentes (US1, criterio 7).
- **Cambiar el horario o desactivar una clase con reservas futuras**: se rechaza para no dejar
  reservas en un horario distinto al que eligió el cliente (US1, criterios 8 y 9).
- **Membresía que cambia después de reservar**: una reserva hecha cuando la membresía cubría la
  fecha de la sesión se conserva aunque después la membresía se suspenda o se cancele; recepción
  decide si cancela la reserva.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir que solo el administrador registre, modifique y desactive
  clases con nombre, instructor, día de la semana, hora de inicio, duración (15 a 240 minutos) y
  cupo máximo (1 a 100 lugares).
- **FR-002**: El sistema DEBE generar las sesiones de cada clase activa a partir de su día de la
  semana y hora, y DEBE controlar reservas, cupo y asistencia por sesión.
- **FR-003**: El sistema DEBE permitir que el administrador y recepción registren reservas para
  clientes activos con membresía activa que cubra la fecha de la sesión.
- **FR-004**: El sistema NUNCA DEBE registrar en una sesión más reservas activas que su cupo
  máximo, incluso con solicitudes simultáneas.
- **FR-005**: El sistema DEBE impedir que un cliente tenga dos reservas activas en la misma sesión o
  en sesiones de la misma fecha cuyos horarios se empalmen.
- **FR-006**: El sistema DEBE aceptar reservas solo para sesiones que no han empezado y que ocurren
  dentro de los próximos 7 días.
- **FR-007**: El sistema DEBE permitir que el administrador y recepción cancelen reservas activas
  de sesiones que no han empezado, conservando la reserva cancelada en el historial.
- **FR-008**: El sistema DEBE mostrar, para cada sesión, la lista de clientes con reserva activa,
  el número de reservas activas y los lugares disponibles.
- **FR-009**: El sistema DEBE permitir que el administrador y recepción marquen y desmarquen la
  asistencia de clientes con reserva activa desde la hora de inicio de la sesión hasta el final de
  ese mismo día.
- **FR-010**: El sistema DEBE rechazar la reducción del cupo por debajo de las reservas activas de
  cualquier sesión futura, y el cambio de horario o la desactivación de una clase con reservas
  activas en sesiones futuras.
- **FR-011**: El sistema DEBE rechazar con el mensaje "No tienes permiso para realizar esta acción"
  cualquier operación de esta feature hecha por un usuario con rol entrenador o cliente, y
  cualquier registro, modificación o desactivación de clases hecha por recepción.
- **FR-012**: El sistema DEBE registrar en la auditoría el registro, la modificación y la
  desactivación de clases, y el registro y la cancelación de reservas, con el usuario que hizo la
  acción y la fecha y hora.
- **FR-013**: El sistema DEBE mostrar todos los mensajes de éxito y de rechazo en español con los
  textos definidos en los criterios de aceptación, sin revelar información técnica.
- **FR-014**: El sistema DEBE usar la zona horaria del gimnasio para determinar fechas de sesión,
  si una sesión ya empezó y el fin del día.

### Entidades clave

- **Clase**: actividad grupal recurrente. Atributos: nombre, instructor (usuario con rol
  entrenador), día de la semana, hora de inicio, duración en minutos, cupo máximo y estado (activa
  o inactiva).
- **Sesión**: ocurrencia de una clase en una fecha concreta; se identifica por la clase y la fecha.
  Sus lugares disponibles son el cupo máximo menos las reservas activas.
- **Reserva**: lugar apartado para un cliente en una sesión. Atributos: cliente, clase, fecha de la
  sesión, estado (activa o cancelada), asistencia (sin registrar o presente), usuario y fecha de
  registro, y usuario y fecha de cancelación o de asistencia cuando correspondan.
- **Cliente** y **Membresía**: entidades existentes de los Sprints 1 y 2; se consultan para validar
  que el cliente esté activo y tenga una membresía vigente en la fecha de la sesión.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En las pruebas, ninguna sesión llega a tener más reservas activas que su cupo
  máximo, incluyendo 20 intentos simultáneos de reservar el último lugar.
- **SC-002**: Recepción registra una reserva para un cliente en menos de 1 minuto desde que abre el
  horario semanal.
- **SC-003**: El administrador conoce los lugares disponibles de cualquier sesión de la semana en
  menos de 10 segundos.
- **SC-004**: El 100 % de las reservas rechazadas muestra el motivo exacto definido en los criterios
  de aceptación.
- **SC-005**: Recepción marca la asistencia de una sesión de 20 reservados en menos de 2 minutos.
- **SC-006**: El 100 % de los intentos de entrenadores y clientes de usar las funciones de esta
  feature son rechazados en las pruebas.

## Supuestos

- La feature amplía el alcance del MVP; la justificación y el tratamiento de esa desviación están
  en la sección "Justificación de alcance".
- El instructor es un usuario existente con rol entrenador y estado activo.
- Una membresía cubre una sesión si su estado es activa y la fecha de la sesión está entre su fecha
  de inicio y su fecha de fin, ambas incluidas. Un adeudo pendiente no impide reservar, igual que no
  impide el acceso (decisión del Sprint 2).
- La reserva no sustituye el control de acceso: el cliente sigue entrando al gimnasio por
  reconocimiento facial.
- Se reutilizan sin cambios la autenticación, los roles, los clientes, las membresías y la
  auditoría de los Sprints 1 a 3.
- Quedan fuera de esta feature: que los clientes reserven por su cuenta, listas de espera,
  notificaciones a clientes, cancelar una sola sesión sin desactivar la clase, sanciones por
  inasistencia, consultas para el rol entrenador, cobro por clase y reportes de ocupación.

## Justificación de alcance

- **Ampliación posterior al MVP**: el MVP definido en la constitución (principio VIII) cubre
  clientes, membresías, pagos, reconocimiento facial, control de acceso, usuarios, roles y
  reportes, y quedó completo con los Sprints 1 a 3. Las reservas de clases grupales no forman parte
  de ese MVP: son una ampliación posterior que se construye sobre él sin modificar sus reglas.
- **Valor para el gimnasio**:
  - Evita el sobrecupo en clases con lugares limitados (spinning, yoga, funcional), que hoy no se
    puede controlar.
  - Permite saber quién está inscrito y quién asistió realmente a cada clase.
  - Aprovecha la información existente: solo reservan clientes activos con membresía vigente, lo
    que refuerza las reglas de negocio del principio XI.
  - Da al administrador datos de ocupación para ajustar horarios y cupos según la demanda.
- **Tratamiento de la desviación**: el `plan.md` de esta feature DEBE documentar la ampliación de
  alcance en su sección "Verificación de la constitución", con su justificación y la aprobación del
  equipo, tal como exige la gobernanza de la constitución. La documentación del proyecto (`docs/`)
  DEBE actualizarse para incluir las clases grupales antes de cerrar el sprint.
