# Especificación de feature: Sprint 2 — Membresías, pagos, reconocimiento facial y control de acceso

**Rama de feature**: `002-membresias-pagos-acceso`

**Creada**: 2026-10-12

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Usa la descripción de @sprint2.md" (insumo:
`docs/sprint-2.md`, con `docs/project-context.md`, `docs/reglas.md`, `docs/sprint-1.md` y la
constitución como referencias).

## Clarifications

### Session 2026-10-12

Las tres preguntas de `/speckit-specify` y `/speckit-clarify` quedaron sin respuesta durante la
especificación. Al ejecutar `/speckit-plan` se adoptaron las opciones recomendadas como decisiones
provisionales, y el equipo las **confirmó tal cual el 2026-10-12** (T002 de `tasks.md`).

- Q: ¿Se permiten pagos parciales (abonos) o cada membresía se paga completa en un solo pago? → A:
  Se permiten abonos de cualquier monto mayor a cero hasta liquidar la membresía; el
  adeudo es el saldo pendiente.
- Q: ¿Un adeudo pendiente impide el acceso? → A: No; el acceso depende solo de la
  coincidencia facial, del estado del cliente y de la vigencia de la membresía. El adeudo se
  gestiona en recepción.
- Q: ¿Cómo opera el punto de acceso? → A: Como estación de reconocimiento continuo
  abierta con la sesión de un administrador o recepcionista; no se crea un rol ni una credencial
  nueva para el dispositivo.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 — Registro y mantenimiento de tipos de membresía (Prioridad: P1)

Como administrador, quiero registrar los diferentes tipos de membresía para definir sus
características, duración y precio.

Corresponde a US-S2-01 de `docs/sprint-2.md`.

**Por qué esta prioridad**: sin tipos de membresía no se puede asignar ninguna membresía ni
calcular pagos o adeudos; es el catálogo del que depende el resto del sprint.

**Prueba independiente**: el administrador registra un tipo "Mensual" de 30 días, lo consulta en
el listado, cambia su precio y lo desactiva; se comprueba que un recepcionista no puede crearlo ni
modificarlo.

**Escenarios de aceptación**:

1. **Dado** un administrador con sesión iniciada, **Cuando** registra un tipo de membresía con
   nombre, descripción, duración en días y precio válidos, **Entonces** el tipo queda disponible
   en estado activo y el sistema muestra un mensaje de éxito.
2. **Dado** un tipo de membresía existente, **Cuando** el administrador intenta registrar otro con
   el mismo nombre, **Entonces** el sistema lo rechaza indicando que el nombre ya existe.
3. **Dado** un tipo con duración menor o igual a cero o precio negativo, **Cuando** se intenta
   guardar, **Entonces** el sistema lo rechaza con un mensaje claro.
4. **Dado** un tipo de membresía con membresías ya asignadas, **Cuando** el administrador cambia
   su precio o duración, **Entonces** las membresías ya asignadas conservan sus fechas y su monto
   originales.
5. **Dado** un tipo de membresía desactivado, **Cuando** el personal asigna o renueva una
   membresía, **Entonces** ese tipo no aparece como opción y el servidor rechaza su uso.
6. **Dado** un recepcionista, entrenador o cliente, **Cuando** intenta crear o modificar un tipo de
   membresía, **Entonces** el sistema lo rechaza; el recepcionista sí puede consultar los tipos
   activos.

---

### Historia de usuario 2 — Asignación de membresía a un cliente (Prioridad: P1)

Como administrador o recepcionista, quiero asignar una membresía a un cliente para registrar su
periodo de acceso al gimnasio.

Corresponde a US-S2-02 de `docs/sprint-2.md`.

**Por qué esta prioridad**: la membresía es la condición que decide si un cliente puede entrar; sin
ella el control de acceso no tiene sentido.

**Prueba independiente**: se asigna un tipo "Mensual" de 30 días a un cliente registrado en el
Sprint 1 con inicio hoy y se verifica que el sistema calcula la fecha de fin, muestra la membresía
como activa y la relaciona con ese cliente.

**Escenarios de aceptación**:

1. **Dado** un cliente activo sin membresía vigente, **Cuando** el personal le asigna un tipo de
   membresía activo y una fecha de inicio, **Entonces** el sistema calcula la fecha de fin a partir
   de la duración del tipo, guarda el monto del tipo en ese momento y muestra la membresía en
   estado activa.
2. **Dado** un cliente que ya tiene una membresía activa o suspendida cuyo periodo no ha
   terminado, **Cuando** se intenta asignarle otra membresía que se traslapa con ese periodo,
   **Entonces** el sistema lo rechaza e indica que debe usarse la renovación.
3. **Dado** un cliente inactivo o inexistente, **Cuando** se intenta asignarle una membresía,
   **Entonces** el sistema lo rechaza.
4. **Dado** una membresía activa cuya fecha de fin ya pasó, **Cuando** cualquier usuario la
   consulta, **Entonces** el sistema la muestra como vencida.
5. **Dado** un administrador, **Cuando** suspende, reactiva o cancela una membresía indicando el
   motivo, **Entonces** el estado cambia, queda registrado quién y cuándo lo hizo, y una membresía
   cancelada ya no puede reactivarse.
6. **Dado** un recepcionista, **Cuando** intenta suspender, reactivar o cancelar una membresía,
   **Entonces** el sistema lo rechaza por falta de permisos.

---

### Historia de usuario 3 — Registro de pagos (Prioridad: P1)

Como administrador o recepcionista, quiero registrar los pagos realizados por los clientes para
mantener un historial financiero.

Corresponde a US-S2-04 de `docs/sprint-2.md`.

**Por qué esta prioridad**: el flujo demostrable del sprint exige registrar el pago de la membresía
asignada, y es la base para calcular adeudos.

**Prueba independiente**: se registra un pago en efectivo por el monto de la membresía recién
asignada y se comprueba que aparece en el historial del cliente ligado a esa membresía.

**Escenarios de aceptación**:

1. **Dado** un cliente con una membresía asignada, **Cuando** el personal registra un pago con
   monto mayor a cero y un método de pago válido, **Entonces** el pago queda asociado al cliente y
   a la membresía, con la fecha y hora del registro y el usuario que lo registró.
2. **Dado** un pago con monto cero, negativo o con un método no permitido, **Cuando** se intenta
   guardar, **Entonces** el sistema lo rechaza con un mensaje claro.
3. **Dado** un pago con un monto mayor al saldo pendiente de la membresía, **Cuando** se intenta
   guardar, **Entonces** el sistema lo rechaza indicando el saldo pendiente.
4. **Dado** un pago registrado por error, **Cuando** el administrador lo anula indicando el motivo,
   **Entonces** el pago queda marcado como cancelado, sigue visible en el historial y deja de
   contar para el saldo de la membresía.
5. **Dado** cualquier usuario, **Cuando** intenta eliminar un pago del historial, **Entonces** el
   sistema no ofrece esa opción y el servidor rechaza la operación.

---

### Historia de usuario 4 — Registro de información facial (Prioridad: P1)

Como administrador o recepcionista autorizado, quiero registrar la información facial de un cliente
para permitir su identificación al ingresar al gimnasio.

Corresponde a US-S2-06 de `docs/sprint-2.md`.

**Por qué esta prioridad**: sin información facial registrada no es posible identificar al cliente
en el punto de acceso.

**Prueba independiente**: con la cámara de pruebas, el recepcionista registra el rostro de un
cliente existente y el sistema muestra que el cliente tiene información facial registrada, sin
mostrar en ningún momento los datos biométricos.

**Escenarios de aceptación**:

1. **Dado** un cliente activo sin información facial y que dio su consentimiento, **Cuando** el
   personal confirma el consentimiento y captura su rostro con la cámara, **Entonces** el sistema
   guarda la información facial asociada a ese cliente y muestra un mensaje de éxito.
2. **Dado** una captura sin rostro, con varios rostros o con calidad insuficiente (poca luz,
   desenfoque, rostro parcialmente cubierto), **Cuando** se intenta registrar, **Entonces** el
   sistema la rechaza e indica cómo repetir la captura.
3. **Dado** un rostro que coincide con la información facial de otro cliente, **Cuando** se intenta
   registrar, **Entonces** el sistema lo rechaza y avisa que ese rostro ya está asociado a otro
   cliente.
4. **Dado** un cliente con información facial registrada, **Cuando** el personal la reemplaza con
   una nueva captura o la desactiva, **Entonces** la información anterior deja de usarse para la
   identificación y el cambio queda registrado en la auditoría.
5. **Dado** cualquier usuario, incluido el administrador, **Cuando** consulta la información facial
   de un cliente, **Entonces** solo ve si está registrada, su estado y la fecha de registro, nunca
   los datos biométricos.
6. **Dado** un entrenador o un cliente, **Cuando** intenta registrar o modificar información
   facial, **Entonces** el sistema lo rechaza.

---

### Historia de usuario 5 — Identificación facial y validación de acceso (Prioridad: P1)

Como cliente previamente registrado, quiero utilizar mi rostro para identificarme al ingresar al
gimnasio; y como sistema, quiero verificar la membresía del cliente después de identificarlo para
determinar si puede ingresar.

Corresponde a US-S2-07 y US-S2-08 de `docs/sprint-2.md`.

**Por qué esta prioridad**: es el objetivo central del sprint y del proyecto; integra la
identificación facial con la vigencia de la membresía.

**Prueba independiente**: con tres clientes de prueba (membresía vigente, membresía vencida y sin
información facial), cada uno se presenta ante la cámara del punto de acceso y se comprueba que
solo el primero es autorizado y que los tres intentos quedan registrados con su resultado y motivo.

**Escenarios de aceptación**:

1. **Dado** un cliente activo con información facial registrada y una membresía activa y vigente,
   **Cuando** se presenta ante la cámara del punto de acceso, **Entonces** el sistema lo identifica,
   autoriza el acceso, muestra un mensaje claro de acceso autorizado con su nombre y registra el
   acceso como autorizado.
2. **Dado** un cliente identificado cuya membresía está vencida, **Cuando** intenta ingresar,
   **Entonces** el sistema rechaza el acceso y lo registra con el motivo "membresía vencida".
3. **Dado** un cliente identificado cuya membresía está suspendida o cancelada, **Cuando** intenta
   ingresar, **Entonces** el sistema rechaza el acceso y lo registra con el motivo correspondiente.
4. **Dado** un cliente identificado sin ninguna membresía, o cuya membresía aún no inicia,
   **Cuando** intenta ingresar, **Entonces** el sistema rechaza el acceso con el motivo "sin
   membresía vigente".
5. **Dado** una persona cuyo rostro no coincide de forma válida con ningún cliente registrado (o
   coincide de forma ambigua con más de uno), **Cuando** se presenta ante la cámara, **Entonces**
   el sistema rechaza el acceso, muestra un mensaje que la invita a acudir a recepción y registra
   el intento con el motivo "rostro no identificado".
6. **Dado** un cliente identificado cuyo registro de cliente está inactivo, **Cuando** intenta
   ingresar, **Entonces** el sistema rechaza el acceso con el motivo "cliente inactivo".
7. **Dado** un cliente identificado con membresía vigente y un saldo pendiente de pago,
   **Cuando** intenta ingresar, **Entonces** el sistema autoriza el acceso; el adeudo no se
   considera en la validación ni se muestra en el punto de acceso.
8. **Dado** el punto de acceso, **Cuando** se muestra un rechazo en pantalla, **Entonces** el
   mensaje no revela datos personales ni financieros del cliente; el motivo detallado solo queda
   en el registro de accesos.

---

### Historia de usuario 6 — Renovación de membresía (Prioridad: P2)

Como administrador o recepcionista, quiero renovar la membresía de un cliente para mantener
actualizado su periodo de acceso al gimnasio.

Corresponde a US-S2-03 de `docs/sprint-2.md`.

**Por qué esta prioridad**: es necesaria para la operación continua, pero el flujo demostrable
puede probarse primero con una asignación nueva.

**Prueba independiente**: se renueva la membresía vigente de un cliente y se comprueba que el nuevo
periodo comienza al día siguiente del fin del actual, sin perder días.

**Escenarios de aceptación**:

1. **Dado** un cliente con membresía activa y vigente, **Cuando** el personal la renueva con un
   tipo activo, **Entonces** el sistema crea una nueva membresía que inicia el día siguiente a la
   fecha de fin de la actual, con su propia fecha de fin y su propio monto.
2. **Dado** un cliente con membresía vencida, **Cuando** el personal la renueva, **Entonces** la
   nueva membresía inicia en la fecha indicada (por omisión, hoy) y no en una fecha pasada.
3. **Dado** un cliente con membresía cancelada, **Cuando** el personal la renueva, **Entonces** el
   sistema la trata como una asignación nueva que inicia hoy o en la fecha indicada.
4. **Dado** un cliente que ya tiene una renovación pendiente de iniciar, **Cuando** se intenta
   renovarla otra vez, **Entonces** el sistema encadena la nueva membresía al fin de la última
   registrada, sin traslapar periodos.
5. **Dado** una renovación, **Cuando** se consulta el historial de membresías del cliente,
   **Entonces** se ven las membresías anteriores y la nueva, sin que se hayan sobrescrito.
6. **Dado** un cliente con una membresía suspendida cuya fecha de fin aún no llega, **Cuando** el
   personal la renueva, **Entonces** la nueva membresía inicia el día siguiente a esa fecha de fin.

---

### Historia de usuario 7 — Consulta de pagos y adeudos (Prioridad: P2)

Como administrador, quiero consultar los pagos y adeudos de los clientes para llevar un control
financiero del gimnasio.

Corresponde a US-S2-05 de `docs/sprint-2.md` y al rol cliente de la constitución (consultar sus
propios pagos y adeudos).

**Por qué esta prioridad**: aporta control financiero, pero depende de que primero existan
membresías y pagos registrados.

**Prueba independiente**: con membresías pagadas total y parcialmente, el administrador consulta el
historial de pagos filtrado por fechas y la lista de clientes con adeudo, y verifica que los saldos
coinciden con lo registrado.

**Escenarios de aceptación**:

1. **Dado** un administrador, **Cuando** consulta el historial de pagos, **Entonces** ve los pagos
   con cliente, membresía, monto, método, fecha, estado y usuario que lo registró, y puede
   filtrarlos por cliente, rango de fechas, método y estado.
2. **Dado** un administrador, **Cuando** consulta los adeudos, **Entonces** ve los clientes con
   saldo pendiente, el monto adeudado por membresía y el total, calculados según la regla de
   adeudo definida en FR-024.
3. **Dado** un recepcionista, **Cuando** consulta a un cliente concreto, **Entonces** ve los pagos y
   el saldo pendiente de ese cliente para poder cobrarle, pero no el reporte general de adeudos.
4. **Dado** un usuario con rol cliente, **Cuando** consulta su información, **Entonces** ve su
   membresía, sus pagos y su saldo pendiente, y nunca los de otros clientes.
5. **Dado** un entrenador, **Cuando** intenta consultar pagos o adeudos, **Entonces** el sistema lo
   rechaza.

---

### Historia de usuario 8 — Consulta de accesos (Prioridad: P2)

Como administrador o recepcionista, quiero consultar los registros de acceso para conocer las
entradas autorizadas y los intentos rechazados.

Corresponde a US-S2-09 de `docs/sprint-2.md`.

**Por qué esta prioridad**: da trazabilidad al control de acceso, pero el registro en sí ya se
genera en la historia 5.

**Prueba independiente**: después de varios intentos autorizados y rechazados, el recepcionista
filtra los accesos rechazados del día y ve cada intento con su motivo.

**Escenarios de aceptación**:

1. **Dado** un administrador o recepcionista, **Cuando** consulta los registros de acceso,
   **Entonces** ve fecha y hora, cliente identificado (si lo hubo), resultado y motivo de rechazo,
   y puede filtrar por rango de fechas, cliente y resultado.
2. **Dado** un intento rechazado por rostro no identificado, **Cuando** se consulta, **Entonces**
   aparece sin cliente asociado y con su motivo.
3. **Dado** un entrenador, **Cuando** consulta los accesos, **Entonces** ve fecha, hora, cliente y
   resultado, sin datos financieros.
4. **Dado** un usuario con rol cliente, **Cuando** consulta su historial de accesos, **Entonces**
   solo ve sus propios accesos.
5. **Dado** cualquier usuario, **Cuando** intenta modificar o eliminar un registro de acceso,
   **Entonces** el sistema no lo permite.

---

### Casos límite

- La fecha de fin coincide con hoy: la membresía sigue vigente durante todo ese día y pasa a
  vencida al día siguiente.
- Una renovación anticipada deja una membresía futura: mientras no llega su fecha de inicio, la
  vigente es la actual; el día de inicio la nueva pasa a ser la vigente sin intervención manual.
- Se suspende una membresía y después llega su fecha de fin: al consultarla se muestra como
  vencida y una reactivación no extiende sus fechas.
- Se desactiva un tipo de membresía con membresías vigentes: estas siguen siendo válidas hasta su
  fecha de fin.
- Se intenta registrar un pago para una membresía cancelada o ya liquidada: el sistema lo rechaza.
- Dos usuarios registran pagos de la misma membresía casi al mismo tiempo: el saldo resultante
  nunca queda negativo.
- La cámara no está disponible, no tiene permiso o se desconecta: el sistema muestra un mensaje
  claro, no registra un acceso autorizado y permite reintentar cuando se restablezca.
- Aparecen varios rostros frente a la cámara del punto de acceso: el sistema solicita que se
  presente una sola persona y no decide el acceso hasta tener una única cara.
- Iluminación insuficiente o rostro parcialmente cubierto (gorra, cubrebocas): se trata como
  rostro no identificado y se registra el intento.
- Una persona presenta una fotografía o pantalla con el rostro de un cliente: el sistema no
  garantiza detectar suplantaciones sofisticadas en este sprint; la supervisión del personal en
  recepción es la medida de mitigación (ver Supuestos).
- El mismo cliente es identificado varias veces seguidas en pocos segundos: cada intento se
  registra, pero el punto de acceso no debe generar registros duplicados por una misma
  presentación continua ante la cámara.
- Un cliente con información facial se desactiva: su rostro deja de producir accesos autorizados.
- El servidor no responde durante la validación: el acceso se considera no autorizado y se informa
  al usuario que intente de nuevo o acuda a recepción.

## Requisitos *(obligatorio)*

### Requisitos funcionales

#### Tipos de membresía

- **FR-001**: Solo el administrador DEBE poder registrar y modificar tipos de membresía con nombre
  único, descripción opcional, duración en días mayor que cero, precio mayor o igual a cero y
  estado (activo/inactivo).
- **FR-002**: El administrador y el recepcionista DEBEN poder consultar los tipos de membresía;
  solo los tipos activos DEBEN poder usarse en asignaciones y renovaciones.
- **FR-003**: Los tipos de membresía NO DEBEN eliminarse físicamente; la baja se realiza
  desactivándolos.
- **FR-004**: Modificar el precio o la duración de un tipo NO DEBE alterar las fechas ni el monto de
  las membresías ya asignadas.

#### Membresías

- **FR-005**: El administrador y el recepcionista DEBEN poder asignar una membresía a un cliente
  existente y activo, eligiendo un tipo activo y una fecha de inicio (por omisión, hoy).
- **FR-006**: El sistema DEBE calcular la fecha de fin a partir de la fecha de inicio y la
  duración del tipo, y DEBE guardar con la membresía el monto del tipo vigente al momento de
  asignarla.
- **FR-007**: El sistema NO DEBE permitir que un cliente tenga membresías con periodos traslapados
  que no estén canceladas.
- **FR-008**: El sistema DEBE manejar los estados activa, vencida, suspendida y cancelada. Una
  membresía activa cuya fecha de fin ya pasó DEBE mostrarse y tratarse como vencida sin
  intervención manual.
- **FR-009**: Solo el administrador DEBE poder suspender, reactivar y cancelar membresías, indicando
  un motivo. La reactivación NO DEBE extender las fechas; una membresía cancelada NO DEBE
  reactivarse.
- **FR-010**: El administrador y el recepcionista DEBEN poder renovar una membresía. Si la última
  membresía no cancelada del cliente aún no termina (vigente, suspendida o por iniciar), la nueva
  DEBE iniciar el día siguiente a su fecha de fin; si ya terminó o el cliente no tiene membresías
  no canceladas, DEBE iniciar en la fecha indicada (por omisión, hoy), que no puede ser anterior a
  hoy.
- **FR-011**: Una renovación DEBE crear una nueva membresía y conservar las anteriores en el
  historial del cliente.
- **FR-012**: Una membresía es vigente cuando su estado es activa y la fecha actual está entre su
  fecha de inicio y su fecha de fin, ambas inclusive.
- **FR-013**: El administrador, el recepcionista y el entrenador DEBEN poder consultar el estado y
  la vigencia de la membresía de los clientes; el entrenador NO DEBE ver montos ni saldos.
- **FR-014**: Un usuario con rol cliente DEBE poder consultar solo su propia membresía y su
  historial de membresías.

#### Pagos y adeudos

- **FR-015**: El administrador y el recepcionista DEBEN poder registrar pagos asociados a un cliente
  y a una de sus membresías, con monto mayor a cero, método de pago y fecha y hora del registro.
- **FR-016**: Los métodos de pago permitidos DEBEN ser efectivo, tarjeta y transferencia; el
  sistema solo registra el pago y NO DEBE procesar cobros con bancos ni plataformas externas.
- **FR-017**: Cada pago DEBE registrar el usuario que lo capturó.
- **FR-018**: El sistema NO DEBE permitir pagos cuyo monto supere el saldo pendiente de la
  membresía, ni pagos sobre membresías canceladas.
- **FR-019**: Los pagos NO DEBEN eliminarse. Solo el administrador DEBE poder anular un pago,
  indicando un motivo; el pago anulado DEBE permanecer visible con estado cancelado y no contar
  para el saldo.
- **FR-020**: Solo el administrador DEBE poder consultar el historial general de pagos, con filtros
  por cliente, rango de fechas, método y estado.
- **FR-021**: Solo el administrador DEBE poder consultar el listado general de clientes con adeudo y
  el total adeudado.
- **FR-022**: El recepcionista DEBE poder consultar los pagos y el saldo pendiente de un cliente
  específico para atenderlo.
- **FR-023**: Un usuario con rol cliente DEBE poder consultar solo sus propios pagos y su saldo
  pendiente; el entrenador NO DEBE tener acceso a pagos ni adeudos.
- **FR-024**: El saldo pendiente de una membresía DEBE calcularse como su monto menos la suma de
  sus pagos no cancelados, y el adeudo de un cliente como la suma de los saldos pendientes de sus
  membresías no canceladas. Se permiten pagos parciales (abonos) de cualquier monto mayor a cero
  hasta liquidar la membresía.

#### Información facial

- **FR-025**: El administrador y el recepcionista DEBEN poder registrar la información facial de un
  cliente existente y activo mediante una captura con cámara, después de confirmar en el sistema
  que el cliente dio su consentimiento.
- **FR-026**: El sistema DEBE rechazar capturas sin rostro, con más de un rostro o con calidad
  insuficiente, e indicar cómo repetirlas.
- **FR-027**: El sistema DEBE impedir registrar un rostro que ya coincide con la información facial
  de otro cliente.
- **FR-028**: Cada cliente DEBE tener como máximo un registro facial activo; el personal DEBE poder
  reemplazarlo o desactivarlo, y la información reemplazada o desactivada NO DEBE usarse para
  identificar.
- **FR-029**: El sistema DEBE almacenar únicamente la información facial mínima necesaria para la
  identificación; NO DEBE conservar fotografías del rostro una vez generada esa información.
- **FR-030**: La información facial DEBE almacenarse protegida y NUNCA DEBE devolverse en ninguna
  respuesta, pantalla ni consulta; los usuarios solo DEBEN ver si existe, su estado y la fecha de
  registro.
- **FR-031**: La información facial DEBE usarse exclusivamente para identificar clientes
  registrados en el punto de acceso; el sistema NO DEBE ofrecer búsqueda de personas por rostro,
  seguimiento ni identificación fuera del punto de acceso.

#### Identificación y control de acceso

- **FR-032**: El punto de acceso DEBE capturar el rostro con la cámara, compararlo solo contra los
  registros faciales activos de clientes y considerar identificado al cliente únicamente cuando
  exista una coincidencia válida y no ambigua.
- **FR-033**: La identificación facial DEBE realizarse antes de validar la membresía; una
  coincidencia facial por sí sola NO DEBE autorizar el acceso.
- **FR-034**: El sistema DEBE autorizar el acceso solo si el cliente identificado está activo y
  tiene una membresía vigente (FR-012); en cualquier otro caso DEBE rechazarlo.
- **FR-035**: El sistema DEBE manejar al menos estos motivos de rechazo: rostro no identificado,
  cliente inactivo, sin membresía vigente, membresía vencida, membresía suspendida y membresía
  cancelada.
- **FR-036**: El punto de acceso DEBE mostrar de forma clara si el acceso fue autorizado o
  rechazado; en un rechazo NO DEBE mostrar datos personales ni financieros e invitará a acudir a
  recepción.
- **FR-037**: El punto de acceso DEBE operar como una estación de reconocimiento continuo que solo
  puede abrir un administrador o recepcionista con su sesión iniciada; no existe un rol ni una
  credencial adicional para el dispositivo. El adeudo NO DEBE considerarse para autorizar el
  acceso.
- **FR-038**: Cada intento de acceso DEBE registrarse con fecha y hora, cliente identificado (si lo
  hubo), resultado y motivo de rechazo; una misma presentación continua ante la cámara NO DEBE
  producir registros duplicados.
- **FR-039**: Los registros de acceso NO DEBEN modificarse ni eliminarse desde el sistema.
- **FR-040**: El administrador y el recepcionista DEBEN poder consultar los registros de acceso con
  filtros por rango de fechas, cliente y resultado; el entrenador DEBE poder consultarlos sin datos
  financieros; el cliente DEBE ver solo los suyos.
- **FR-041**: Si la cámara o el servidor no están disponibles, el sistema NO DEBE autorizar el
  acceso y DEBE informar el problema con un mensaje claro.

#### Auditoría, seguridad y calidad

- **FR-042**: El sistema DEBE registrar en la auditoría, con usuario, acción, registro afectado y
  fecha y hora: la creación y modificación de tipos de membresía; la asignación, renovación y
  cambios de estado de membresías; el registro y la anulación de pagos; y el registro, reemplazo y
  desactivación de información facial. La auditoría NO DEBE contener datos biométricos.
- **FR-043**: Todos los permisos de este sprint DEBEN validarse en el servidor, de forma
  independiente a lo que muestre la interfaz.
- **FR-044**: El sistema DEBE validar en el servidor todos los datos de entrada antes de guardarlos.
- **FR-045**: El sistema DEBE mostrar un mensaje de éxito o error después de cada operación, y los
  errores NO DEBEN revelar información técnica interna.
- **FR-046**: La anulación de pagos, la cancelación o suspensión de membresías y la desactivación de
  información facial DEBEN pedir confirmación antes de ejecutarse.
- **FR-047**: Los estados de las membresías y de los accesos DEBEN mostrarse de forma clara y
  distinguible en todas las pantallas donde aparezcan.
- **FR-048**: Todos los textos visibles para el usuario DEBEN estar en español.
- **FR-049**: Los cambios de estructura de datos de este sprint DEBEN poder aplicarse sobre la base
  del Sprint 1 y reconstruirse desde cero con los scripts del repositorio.

### Entidades clave

- **Tipo de membresía**: plan disponible. Atributos: nombre (único), descripción, duración en días,
  precio, estado (activo/inactivo).
- **Membresía**: periodo de acceso de un Cliente con un Tipo de membresía. Atributos: fecha de
  inicio, fecha de fin, monto acordado al asignarla, estado (activa, vencida, suspendida,
  cancelada), motivo del último cambio de estado. Un cliente tiene un historial de membresías sin
  periodos traslapados.
- **Pago**: dinero recibido de un Cliente para una Membresía. Atributos: monto, método (efectivo,
  tarjeta, transferencia), fecha y hora, estado (pagado/cancelado), usuario que lo registró, motivo
  de anulación cuando aplique.
- **Adeudo** *(dato calculado, no se captura)*: saldo pendiente de una membresía o de un cliente,
  derivado de los montos de sus membresías y sus pagos no cancelados.
- **Información facial (rostro)**: datos biométricos mínimos que permiten identificar a un
  Cliente. Atributos visibles: estado (activo/inactivo), fecha de registro, usuario que la
  registró, confirmación de consentimiento. Los datos biométricos en sí nunca se muestran.
- **Registro de acceso**: intento de entrada al gimnasio. Atributos: fecha y hora, Cliente
  identificado (opcional), Membresía evaluada (opcional), resultado (autorizado/rechazado), motivo
  de rechazo.
- **Registro de auditoría**: acción importante realizada en el sistema. Atributos: usuario, acción,
  entidad y registro afectados, fecha y hora, descripción sin datos sensibles.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Un recepcionista asigna una membresía a un cliente existente y registra su pago en
  menos de 2 minutos.
- **SC-002**: Desde que el cliente se coloca frente a la cámara hasta que ve el resultado de acceso
  transcurren menos de 3 segundos en el 95 % de los intentos.
- **SC-003**: En una prueba con al menos 10 clientes registrados y buena iluminación, al menos el
  95 % de los intentos de clientes registrados se identifican correctamente en el primer o segundo
  intento.
- **SC-004**: En al menos 20 intentos de personas no registradas, ninguno se identifica como cliente
  ni recibe acceso autorizado.
- **SC-005**: El 100 % de los casos de prueba de membresía vencida, suspendida, cancelada,
  inexistente y de cliente inactivo resultan en acceso rechazado con el motivo correcto.
- **SC-006**: El 100 % de los intentos de acceso, autorizados y rechazados, aparecen en la consulta
  de accesos con su resultado y motivo.
- **SC-007**: En ninguna pantalla, respuesta del sistema ni registro de auditoría pueden leerse
  datos biométricos.
- **SC-008**: Los saldos pendientes mostrados coinciden en el 100 % de los casos de prueba con el
  cálculo manual a partir de membresías y pagos registrados.
- **SC-009**: El 100 % de los intentos de ejecutar funciones de este sprint no permitidas para el
  rol (desde la interfaz o de forma directa) son rechazados en las pruebas de permisos de los
  cuatro roles.
- **SC-010**: El personal encuentra los accesos rechazados de un día en menos de 10 segundos con al
  menos 10 000 registros de acceso almacenados.
- **SC-011**: El flujo demostrable de la sección 4 de `docs/sprint-2.md` (pasos 1 a 18) se completa
  de principio a fin sin errores en la demostración del sprint.

## Supuestos

- Se reutilizan sin cambios la autenticación, los cuatro roles fijos, los usuarios y los clientes
  del Sprint 1; no se crean roles nuevos.
- La estructura de tipos de membresía, membresías y pagos creada en el Sprint 1 se conserva y se
  amplía con nuevas migraciones cuando haga falta (por ejemplo, monto acordado de la membresía,
  usuario que registra el pago o motivos de cambio de estado); las tablas de información facial,
  accesos y auditoría se crean en este sprint.
- No existe periodo de tolerancia: una membresía es válida hasta el final de su fecha de fin y
  vencida a partir del día siguiente (`docs/sprint-2.md`, sección 6, y RN-07).
- La suspensión no compensa días: el tiempo suspendido se descuenta del periodo pagado.
- No hay acceso manual alternativo en este sprint: si el rostro no se identifica, el cliente acude
  a recepción para revisar o repetir su registro facial; el acceso solo se autoriza con
  coincidencia facial válida y membresía vigente (`docs/sprint-2.md`, sección 6).
- Las fechas se manejan en la zona horaria local del gimnasio.
- El consentimiento del cliente para el tratamiento de su información facial se obtiene de forma
  verbal o escrita en recepción y el personal lo confirma en el sistema antes de la captura; el
  formato legal del aviso de privacidad queda fuera del alcance de este sprint.
- No se exige detección avanzada de suplantación (fotografías o pantallas); el punto de acceso está
  ubicado a la vista del personal de recepción. Si la librería elegida ofrece una verificación
  básica de presencia sin costo adicional, la planificación podrá incorporarla.
- La librería de reconocimiento facial, el lugar donde se procesa la captura, el umbral de
  coincidencia, la forma de proteger la información facial y la cámara de pruebas se deciden y
  justifican en la investigación y planificación (`docs/sprint-2.md`, sección 9), respetando las
  reglas de esta especificación.
- La consulta de la auditoría en pantalla, el dashboard y los reportes quedan para un sprint
  posterior; en este sprint solo se generan los registros de auditoría.
- Queda fuera de alcance todo lo listado en `docs/sprint-2.md`, sección 8: dashboard y reportes
  avanzados, aplicación móvil, múltiples sucursales, nómina, inventario, contabilidad completa,
  facturación electrónica, procesamiento de pagos con bancos o plataformas externas, y cualquier uso
  del reconocimiento facial para vigilancia, seguimiento o fuera del punto de acceso.
- Restricciones del proyecto que la planificación DEBE respetar (constitución y `docs/sprint-2.md`,
  sección 10): carpetas `frontend/`, `backend/` y `database/` sin estructuras alternativas; ES
  Modules en el backend y en los scripts de `database/`; la interfaz se comunica con el servidor solo
  mediante su API y nunca accede a la base de datos; consultas parametrizadas; migraciones SQL
  numeradas nuevas sin modificar las ya aplicadas; credenciales en variables de entorno; y toda
  dependencia nueva, incluida la de reconocimiento facial, justificada antes de incorporarse.
