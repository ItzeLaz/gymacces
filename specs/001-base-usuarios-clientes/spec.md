# Especificación de feature: Sprint 1 — Base del sistema, autenticación, usuarios, roles y clientes

**Rama de feature**: `001-base-usuarios-clientes`

**Creada**: 2026-10-08

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Genera la especificación únicamente para Sprint 1. Usa
docs/project-context.md, docs/reglas.md y docs/sprint-1.md como fuentes de verdad. Sprint 1 debe
cubrir la base del sistema, autenticación, usuarios, roles y clientes. No implementes todavía
membresías funcionales, pagos funcionales ni reconocimiento facial. El reconocimiento facial
pertenece a Sprint 2. Respeta la estructura frontend/, backend/, database/ y ES Modules en backend
y scripts JavaScript de database."

## Clarifications

### Session 2026-10-08

- Q: ¿Cómo se crea la cuenta de acceso de un cliente para que pueda consultar su información? → A:
  El administrador la crea desde Usuarios y la vincula a un cliente ya registrado; el registro de
  clientes no crea cuentas.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 — Inicio de sesión y acceso según el rol (Prioridad: P1)

Como usuario registrado (administrador, recepcionista, entrenador o cliente), quiero iniciar sesión
con mi correo y contraseña para acceder únicamente a las funciones permitidas para mi rol.

Corresponde a US-S1-01 de `docs/sprint-1.md`.

**Por qué esta prioridad**: sin autenticación ninguna otra función puede protegerse ni usarse. Es
la base sobre la que se construyen los permisos de todo el sistema.

**Prueba independiente**: con un usuario administrador creado en la carga inicial de datos, se
inicia sesión, se verifica que el sistema muestra el menú del administrador y que una ruta
protegida rechaza las solicitudes sin sesión válida.

**Escenarios de aceptación**:

1. **Dado** un usuario activo con credenciales válidas, **Cuando** ingresa su correo y contraseña,
   **Entonces** el sistema inicia la sesión, identifica su rol y le muestra solo las opciones de
   ese rol.
2. **Dado** un usuario que escribe una contraseña incorrecta o un correo no registrado,
   **Cuando** intenta iniciar sesión, **Entonces** el sistema muestra un mensaje genérico de
   credenciales inválidas sin indicar cuál de los dos datos falló.
3. **Dado** un usuario desactivado, **Cuando** intenta iniciar sesión con credenciales correctas,
   **Entonces** el sistema rechaza el acceso con un mensaje claro.
4. **Dado** una persona sin sesión iniciada, **Cuando** intenta acceder a una función protegida,
   **Entonces** el sistema la rechaza y la dirige al inicio de sesión.
5. **Dado** un usuario con sesión iniciada, **Cuando** intenta ejecutar una función que su rol no
   permite (aunque la invoque directamente, sin usar la interfaz), **Entonces** el sistema la
   rechaza.
6. **Dado** un usuario con sesión iniciada, **Cuando** cierra sesión o su sesión expira,
   **Entonces** debe volver a autenticarse para usar funciones protegidas.

---

### Historia de usuario 2 — Gestión de usuarios y asignación de roles (Prioridad: P1)

Como administrador, quiero registrar, consultar y modificar usuarios del sistema, asignarles un rol
y activarlos o desactivarlos para controlar quién usa la plataforma y qué puede hacer.

Corresponde a US-S1-02 y US-S1-03 de `docs/sprint-1.md`.

**Por qué esta prioridad**: el personal del gimnasio y los clientes necesitan una cuenta con un rol
para usar cualquier otra función del sprint.

**Prueba independiente**: el administrador crea un usuario recepcionista, el nuevo usuario inicia
sesión y ve únicamente las funciones de recepcionista; después el administrador lo desactiva y el
usuario ya no puede iniciar sesión.

**Escenarios de aceptación**:

1. **Dado** un administrador con sesión iniciada, **Cuando** registra un usuario con nombre,
   correo, contraseña inicial y rol válidos, **Entonces** el usuario queda creado en estado activo
   y puede iniciar sesión.
2. **Dado** un administrador, **Cuando** intenta registrar un usuario con un correo que ya existe,
   **Entonces** el sistema rechaza el registro e indica que el correo ya está en uso.
3. **Dado** un administrador, **Cuando** cambia el rol de un usuario, **Entonces** en su siguiente
   inicio de sesión el usuario solo tiene acceso a las funciones del nuevo rol.
4. **Dado** un administrador, **Cuando** desactiva un usuario, **Entonces** ese usuario ya no puede
   iniciar sesión y su registro se conserva.
5. **Dado** un administrador, **Cuando** registra un usuario con rol cliente, **Entonces** el
   sistema exige vincularlo con un cliente ya registrado que no tenga otra cuenta.
6. **Dado** un recepcionista, entrenador o cliente, **Cuando** intenta consultar, crear o modificar
   usuarios, **Entonces** el sistema rechaza la operación.
7. **Dado** el único administrador activo, **Cuando** el administrador intenta desactivarse a sí
   mismo o quitarse el rol de administrador, **Entonces** el sistema lo impide.

---

### Historia de usuario 3 — Registro y modificación de clientes (Prioridad: P2)

Como administrador o recepcionista, quiero registrar nuevos clientes y modificar su información para
mantener sus datos organizados y actualizados.

Corresponde a US-S1-04 y US-S1-05 de `docs/sprint-1.md`.

**Por qué esta prioridad**: el cliente es la entidad central del negocio; las membresías, los pagos
y el reconocimiento facial del Sprint 2 dependen de que exista (RN-01).

**Prueba independiente**: un recepcionista registra un cliente con datos válidos, lo busca en el
listado, modifica su teléfono y verifica que el cambio se conserva.

**Escenarios de aceptación**:

1. **Dado** un administrador o recepcionista, **Cuando** registra un cliente con los datos
   obligatorios válidos, **Entonces** el cliente queda guardado en estado activo con su fecha de
   registro y se muestra un mensaje de éxito.
2. **Dado** un administrador o recepcionista, **Cuando** registra un cliente con datos obligatorios
   faltantes o con formato inválido, **Entonces** el sistema no lo guarda e indica qué campos debe
   corregir.
3. **Dado** un administrador o recepcionista, **Cuando** registra un cliente con un correo que ya
   pertenece a otro cliente, **Entonces** el sistema rechaza el registro.
4. **Dado** un cliente existente, **Cuando** un administrador o recepcionista modifica sus datos con
   valores válidos, **Entonces** los cambios se guardan y se muestra un mensaje de éxito.
5. **Dado** un cliente existente, **Cuando** un administrador o recepcionista lo marca como
   inactivo, **Entonces** el cliente se conserva en el sistema con estado inactivo (no se elimina
   físicamente).
6. **Dado** un entrenador o cliente, **Cuando** intenta registrar o modificar clientes,
   **Entonces** el sistema rechaza la operación.

---

### Historia de usuario 4 — Consulta de clientes por el personal (Prioridad: P2)

Como administrador, recepcionista o entrenador, quiero consultar la información de los clientes
para realizar mis actividades.

Corresponde a US-S1-06 de `docs/sprint-1.md`.

**Por qué esta prioridad**: el personal necesita localizar rápidamente a un cliente; el entrenador
lo necesita para atenderlo sin acceder a datos que no le corresponden.

**Prueba independiente**: con varios clientes registrados, un recepcionista los busca por nombre y
un entrenador consulta el mismo cliente y solo ve la información básica.

**Escenarios de aceptación**:

1. **Dado** varios clientes registrados, **Cuando** un administrador o recepcionista consulta el
   listado, **Entonces** ve los clientes con su información completa y puede buscarlos por nombre,
   apellido o correo.
2. **Dado** un entrenador, **Cuando** consulta clientes, **Entonces** solo ve la información básica
   (nombre, apellido y estado) y no ve correo, teléfono ni dirección.
3. **Dado** una búsqueda sin coincidencias, **Cuando** se ejecuta, **Entonces** el sistema muestra
   un mensaje claro de que no hay resultados.
4. **Dado** un usuario con rol cliente, **Cuando** intenta consultar el listado de clientes o los
   datos de otro cliente, **Entonces** el sistema rechaza la operación.

---

### Historia de usuario 5 — Consulta de información propia del cliente (Prioridad: P3)

Como cliente, quiero consultar mi propia información para conocer los datos registrados en el
sistema.

Corresponde a US-S1-07 de `docs/sprint-1.md`.

**Por qué esta prioridad**: aporta valor al cliente, pero depende de que existan las cuentas y los
clientes de las historias anteriores.

**Prueba independiente**: un usuario con rol cliente vinculado a un cliente inicia sesión y ve sus
datos personales; al intentar consultar otro cliente, el sistema lo rechaza.

**Escenarios de aceptación**:

1. **Dado** un usuario con rol cliente vinculado a un cliente, **Cuando** consulta su perfil,
   **Entonces** ve únicamente sus propios datos.
2. **Dado** un usuario con rol cliente, **Cuando** intenta consultar los datos de otro cliente
   (incluso modificando directamente el identificador solicitado), **Entonces** el sistema rechaza
   la operación (RN-14).
3. **Dado** un usuario con rol cliente, **Cuando** consulta su perfil, **Entonces** el sistema
   indica que la información de membresía y pagos estará disponible próximamente, sin mostrar
   datos ficticios.

---

### Historia de usuario 6 — Base de datos preparada para el Sprint 2 (Prioridad: P3)

Como equipo de desarrollo, quiero que la estructura de datos de tipos de membresía, membresías y
pagos quede creada y relacionada con los clientes para que el Sprint 2 implemente esas funciones
sin rehacer la base del sistema.

**Por qué esta prioridad**: no aporta funciones visibles en este sprint, pero evita retrabajo y es
un entregable explícito de `docs/sprint-1.md` (sección 5) y de la constitución (principio IV).

**Prueba independiente**: se reconstruye la base de datos desde cero con los scripts versionados
del proyecto y se comprueba que existen las estructuras de usuarios, clientes, tipos de membresía,
membresías y pagos con sus relaciones.

**Escenarios de aceptación**:

1. **Dado** un entorno sin base de datos, **Cuando** se ejecutan los scripts versionados en orden,
   **Entonces** se crean las estructuras de usuarios, clientes, tipos de membresía, membresías y
   pagos, y se carga un administrador inicial.
2. **Dado** la estructura creada, **Cuando** se intenta registrar una membresía o un pago que haga
   referencia a un cliente inexistente, **Entonces** la base de datos lo impide.
3. **Dado** el Sprint 1 terminado, **Cuando** un usuario navega por el sistema, **Entonces** no
   existen pantallas ni funciones operativas de membresías, pagos ni reconocimiento facial.

---

### Casos límite

- Un usuario intenta iniciar sesión muchas veces seguidas con contraseñas incorrectas: el sistema
  responde siempre con el mismo mensaje genérico y no revela si el correo existe.
- Un usuario desactivado tiene una sesión abierta en el momento de su desactivación: sus siguientes
  solicitudes a funciones protegidas se rechazan.
- El rol de un usuario cambia mientras tiene una sesión abierta: los permisos se evalúan con el rol
  vigente en el sistema, no con el que tenía al iniciar sesión.
- Se intenta registrar un usuario o cliente con un correo que solo difiere en mayúsculas y
  minúsculas de uno existente: se considera duplicado.
- Se envían datos con espacios al inicio o al final: se recortan antes de validar y guardar.
- Una cuenta con rol cliente queda vinculada a un cliente marcado como inactivo: puede seguir
  iniciando sesión y consultando su información, ya que el estado del cliente no equivale a la
  vigencia de una membresía (eso se resuelve en el Sprint 2).
- Ocurre un error inesperado en el servidor: el usuario ve un mensaje claro y genérico, sin detalles
  técnicos internos.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Autenticación y sesión**

- **FR-001**: El sistema DEBE permitir iniciar sesión con correo y contraseña a los usuarios activos.
- **FR-002**: El sistema DEBE responder con un mensaje genérico cuando las credenciales sean
  incorrectas, sin indicar si el correo existe.
- **FR-003**: El sistema DEBE impedir el inicio de sesión de usuarios desactivados.
- **FR-004**: El sistema DEBE identificar el rol del usuario al iniciar sesión y mostrar solo las
  opciones permitidas para ese rol.
- **FR-005**: El sistema DEBE exigir una sesión válida para toda función distinta del inicio de
  sesión.
- **FR-006**: El sistema DEBE validar los permisos de cada operación en el servidor, de forma
  independiente de lo que muestre la interfaz (RN-13).
- **FR-007**: Las sesiones DEBEN expirar después de un tiempo máximo de 8 horas y el usuario DEBE
  poder cerrar sesión manualmente.
- **FR-008**: El sistema NUNCA DEBE almacenar ni mostrar contraseñas en texto plano; DEBE guardarlas
  protegidas con un algoritmo de hash seguro.

**Usuarios y roles**

- **FR-009**: El sistema DEBE manejar exactamente cuatro roles: administrador, recepcionista,
  entrenador y cliente.
- **FR-010**: Solo el administrador DEBE poder registrar, consultar y modificar usuarios, asignar
  roles y activar o desactivar usuarios.
- **FR-011**: Cada usuario DEBE tener nombre, correo único, contraseña, un único rol y estado
  (activo o inactivo).
- **FR-012**: La contraseña de un usuario DEBE tener al menos 8 caracteres e incluir al menos una
  letra y un número.
- **FR-013**: Un usuario con rol cliente DEBE estar vinculado a exactamente un cliente registrado, y
  cada cliente DEBE tener como máximo una cuenta de usuario. Solo el administrador DEBE poder crear
  esa cuenta, desde la gestión de usuarios; registrar un cliente NO DEBE crear una cuenta.
- **FR-014**: El sistema DEBE impedir que quede sin ningún administrador activo.
- **FR-015**: Los usuarios NO DEBEN eliminarse físicamente; la baja se realiza desactivándolos.
- **FR-016**: El sistema DEBE incluir un mecanismo de carga inicial que cree un primer
  administrador cuyas credenciales se definan mediante configuración del entorno, no dentro del
  código.

**Clientes**

- **FR-017**: El administrador y el recepcionista DEBEN poder registrar clientes con nombre,
  apellido, correo, teléfono y dirección; nombre, apellido y teléfono son obligatorios.
- **FR-018**: El sistema DEBE registrar automáticamente la fecha de registro y el estado inicial
  activo de cada cliente.
- **FR-019**: El correo de un cliente, cuando se proporcione, DEBE ser único entre clientes y tener
  un formato válido.
- **FR-020**: El administrador y el recepcionista DEBEN poder modificar los datos de un cliente y
  cambiar su estado entre activo e inactivo.
- **FR-021**: Los clientes NO DEBEN eliminarse físicamente durante este sprint.
- **FR-022**: El administrador, el recepcionista y el entrenador DEBEN poder consultar el listado
  de clientes y buscar por nombre, apellido o correo.
- **FR-023**: El entrenador DEBE ver únicamente nombre, apellido y estado de los clientes.
- **FR-024**: Un usuario con rol cliente DEBE poder consultar solo su propia información y NO DEBE
  poder consultar el listado ni los datos de otros clientes (RN-14).
- **FR-025**: El sistema DEBE validar en el servidor todos los datos de entrada antes de guardarlos
  e indicar al usuario qué campos debe corregir.

**Calidad, errores e interfaz**

- **FR-026**: El sistema DEBE mostrar un mensaje de éxito o error después de cada operación de
  registro o modificación.
- **FR-027**: Los mensajes de error NO DEBEN revelar información técnica interna.
- **FR-028**: Las acciones que cambien el estado de un usuario o cliente a inactivo DEBEN pedir
  confirmación.
- **FR-029**: Todos los textos visibles para el usuario DEBEN estar en español.

**Datos y preparación para el Sprint 2**

- **FR-030**: La estructura de datos DEBE incluir usuarios, clientes, tipos de membresía,
  membresías y pagos, con las relaciones definidas en `docs/project-context.md` (sección 14).
- **FR-031**: La estructura de datos DEBE poder reconstruirse desde cero mediante scripts
  versionados y numerados guardados en el repositorio.
- **FR-032**: Las relaciones entre membresías, pagos y clientes DEBEN impedir registros que hagan
  referencia a clientes o tipos de membresía inexistentes.
- **FR-033**: Este sprint NO DEBE incluir funciones operativas de membresías, pagos, adeudos,
  reconocimiento facial, control de acceso, dashboard, reportes ni auditoría.
- **FR-034**: Este sprint NO DEBE capturar, procesar ni almacenar información facial, ni incorporar
  herramientas de reconocimiento facial.
- **FR-035**: La base de datos DEBE ser relacional, ejecutarse en un entorno local, garantizar la
  integridad referencial entre las entidades y admitir texto en español con tildes y eñes sin
  pérdida de caracteres (motor definido en "Supuestos").

### Entidades clave

- **Usuario**: cuenta de acceso al sistema. Atributos: nombre, correo (único), contraseña
  protegida, rol, estado (activo/inactivo). Un usuario con rol cliente se vincula con un Cliente.
- **Rol**: nivel de acceso fijo (administrador, recepcionista, entrenador, cliente) que determina
  qué funciones puede usar cada usuario.
- **Cliente**: persona inscrita en el gimnasio. Atributos: nombre, apellido, correo, teléfono,
  dirección, fecha de registro, estado (activo/inactivo). Puede tener como máximo una cuenta de
  usuario.
- **Tipo de membresía** *(solo estructura)*: plan disponible con nombre, descripción, duración,
  precio y estado.
- **Membresía** *(solo estructura)*: relaciona un Cliente con un Tipo de membresía, con fecha de
  inicio, fecha de fin y estado.
- **Pago** *(solo estructura)*: relaciona un Cliente y, cuando corresponda, una Membresía, con
  monto, fecha, método y estado.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Un usuario con credenciales válidas inicia sesión y llega a su pantalla principal en
  menos de 30 segundos.
- **SC-002**: Un recepcionista registra un cliente nuevo con todos sus datos en menos de 2 minutos.
- **SC-003**: El personal encuentra a un cliente mediante búsqueda en menos de 10 segundos con al
  menos 500 clientes registrados.
- **SC-004**: El 100 % de los intentos de ejecutar una función no permitida para el rol (desde la
  interfaz o de forma directa) son rechazados en las pruebas de permisos de los cuatro roles.
- **SC-005**: El 100 % de los intentos de un cliente de consultar datos de otro cliente son
  rechazados.
- **SC-006**: Ninguna contraseña puede leerse en texto plano en los datos almacenados ni en las
  respuestas del sistema.
- **SC-007**: La estructura de datos completa del sprint se reconstruye desde cero con los scripts
  del repositorio en menos de 5 minutos, sin pasos manuales adicionales.
- **SC-008**: El flujo demostrable de la sección 4 de `docs/sprint-1.md` (pasos 1 a 16) se completa
  de principio a fin sin errores en la demostración del sprint.

## Supuestos

- La cuenta de un cliente la crea el administrador vinculándola a un cliente ya registrado
  (confirmado en Clarifications, 2026-10-08); no existe auto-registro ni recuperación de contraseña por correo en este sprint
  (`docs/sprint-1.md`, sección 8).
- La "información básica" visible para el entrenador se limita a nombre, apellido y estado del
  cliente; el estado de membresía se agregará en el Sprint 2.
- La sesión dura como máximo 8 horas, equivalente a un turno de trabajo; la configuración exacta
  se definirá en la planificación.
- El correo del cliente es opcional, porque no todos los clientes de un gimnasio tienen correo;
  sí es obligatorio para quienes tengan una cuenta de usuario con rol cliente.
- El sistema se usa en un solo gimnasio, desde navegadores de escritorio del personal y con la base
  de datos en un entorno local durante el desarrollo del MVP.
- Restricciones del proyecto que la planificación DEBE respetar (constitución y `docs/sprint-1.md`,
  sección 10): el código se organiza en las carpetas `frontend/`, `backend/` y `database/` (no se
  crean `client/`, `server/` ni variantes); el backend y los scripts JavaScript de
  `database/scripts/` usan ES Modules (`import`/`export`, `"type": "module"`) y no usan CommonJS;
  la interfaz se comunica con el servidor solo mediante su API y nunca accede directamente a la
  base de datos; las credenciales se manejan con variables de entorno, con `.env` excluido del
  repositorio y un `.env.example` sin secretos.
- Motor de base de datos (decisión del 2026-10-08): MySQL local con InnoDB, `utf8mb4`, llaves
  primarias y foráneas, consultas parametrizadas y scripts SQL versionados en `database/`, como
  indican `docs/project-context.md` y `docs/sprint-1.md`. La constitución y `docs/reglas.md`, que
  mencionan MongoDB, deben enmendarse para quedar alineadas.
- Dependencia: el Sprint 2 (`docs/sprint-2.md`) se apoya en los usuarios, clientes y estructuras de
  datos creados en este sprint.
