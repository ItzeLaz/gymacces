# Constitución de GymAccess — Sistema de Gestión para Gimnasio

El Sistema de Gestión para Gimnasio (GymAccess) es un proyecto académico cuyo
objetivo es desarrollar una plataforma web para administrar clientes,
membresías, pagos y accesos mediante reconocimiento facial.

El sistema centraliza la información del gimnasio, controla el estado de las
membresías, registra pagos y valida el acceso de los clientes. Cuenta con
diferentes roles que limitan el acceso a las funciones según las
responsabilidades de cada usuario.

El detalle de los requisitos, módulos, entidades, reglas de negocio y sprints
se encuentra en la documentación del proyecto (`docs/`) y en las
especificaciones de Spec Kit (`specs/`), que constituyen la fuente de verdad
para el desarrollo.

## Principios fundamentales

### I. Stack tecnológico fijo (NO NEGOCIABLE)

- Backend: Node.js con Express y JavaScript, usando ES Modules
  (`"type": "module"` e `import`/`export`). NO DEBE usarse CommonJS
  (`require()` ni `module.exports`). Esto aplica también a los scripts
  JavaScript de `database/`.
- Base de datos: MySQL (MySQL 8 o MariaDB 10.4+ en ejecución local, por
  ejemplo el servidor de XAMPP), con el driver `mysql2`.
- Frontend: React con JavaScript, construido y servido con Vite.
- La comunicación entre frontend y backend DEBE realizarse mediante una API
  REST con autenticación JWT.
- NO DEBEN agregarse frameworks nuevos (de servidor, de interfaz, de acceso a
  datos u ORM, de estado, de componentes ni de pruebas) sin justificarlo en la
  sección "Contexto técnico" o "Seguimiento de complejidad" del `plan.md` de la
  feature correspondiente, indicando por qué el stack actual no basta.
- Toda dependencia nueva, aunque no sea un framework, DEBE justificarse antes
  de incorporarse.

**Razón:** un stack fijo y conocido por todo el equipo evita que cada feature
introduzca herramientas distintas, reduce la curva de aprendizaje y mantiene
el proyecto fácil de instalar, probar y mantener.

### II. Pruebas obligatorias (NO NEGOCIABLE)

- Toda regla de negocio del backend DEBE tener al menos una prueba automática
  que verifique el caso válido y los casos de rechazo relevantes.
- Las pruebas del backend DEBEN ejecutarse con `npm test` dentro de
  `backend/` (Node test runner y supertest).
- `npm test` del backend DEBE pasar antes de cada commit de implementación. NO
  DEBE hacerse commit de implementación con pruebas fallidas u omitidas a
  propósito.
- Si un commit modifica `frontend/`, DEBERÍA pasar también `npm test` de
  `frontend/` (Vitest).
- Las pruebas DEBEN cubrir como mínimo: autenticación, validación de roles,
  clientes, membresías (registro y renovación), pagos y adeudos,
  reconocimiento facial, autorización y rechazo de accesos, registro de
  accesos y reportes.
- Una funcionalidad NO DEBE considerarse terminada solo porque exista su
  interfaz visual; cuando dependa del backend y la base de datos, DEBE
  comprobarse de extremo a extremo.

**Razón:** las reglas de negocio (vigencia de membresías, pagos, acceso)
son el núcleo del sistema; una prueba automática que se ejecuta antes de cada
commit detecta regresiones cuando todavía son baratas de corregir.

### III. Seguridad (NO NEGOCIABLE)

- Las contraseñas DEBEN almacenarse con hash bcrypt; NUNCA en texto plano.
- Toda entrada recibida por la API DEBE validarse en el backend antes de
  procesarse, aunque el frontend también la valide.
- Todas las consultas SQL DEBEN ser parametrizadas; NUNCA DEBEN construirse
  concatenando valores proporcionados por el usuario.
- Ningún secreto (contraseñas, llaves JWT, credenciales de base de datos) DEBE
  estar en el repositorio. Los archivos `.env` NO DEBEN subirse; DEBE existir
  un `.env.example` sin información sensible.
- El acceso a cada ruta DEBE validarse en el backend según el rol del usuario
  (administrador, recepcionista y los demás roles del principio X) mediante
  middlewares de autenticación y autorización. Ocultar una opción en la
  interfaz NO es una medida de seguridad suficiente.
- El sistema NO DEBE mostrar información técnica interna ni errores que puedan
  comprometer la seguridad.
- La información de reconocimiento facial DEBE protegerse y solo PUEDE
  utilizarse para las funciones establecidas dentro del sistema.

**Razón:** el sistema maneja información personal, financiera y biométrica
de los clientes; una sola contraseña filtrada, una inyección SQL o una ruta sin
control de rol comprometería a todo el gimnasio.

### IV. Manejo de datos y migraciones (NO NEGOCIABLE)

- Todo el sistema DEBE trabajar en UTF-8: la base de datos, las tablas y la
  conexión DEBEN usar `utf8mb4` (con una collation disponible en MySQL 8 y
  MariaDB 10.4+, por ejemplo `utf8mb4_unicode_ci`), y el backend DEBE rechazar
  cuerpos que no estén en UTF-8.
- Todas las tablas DEBEN usar el motor InnoDB, tener llave primaria y definir
  sus relaciones con llaves foráneas.
- Cada cambio de la base de datos (tablas, columnas, índices, restricciones)
  DEBE hacerse con un nuevo script de migración SQL versionado y numerado en
  `database/migrations/` (`001_...sql`, `002_...sql`, ...). Una migración ya
  aplicada NO DEBE modificarse; los ajustes van en una migración nueva.
- La base de datos DEBE poder reconstruirse desde cero con las migraciones y
  semillas del repositorio. Los archivos físicos de datos de MySQL NO DEBEN
  subirse.
- El frontend NUNCA DEBE conectarse directamente a la base de datos.
- La información facial DEBE tratarse como información sensible.

**Razón:** el sistema registra nombres en español con tildes y eñes que se
corrompen fuera de `utf8mb4`, y las migraciones versionadas garantizan que todo
el equipo tenga exactamente la misma estructura de base de datos.

### V. Estilo de código (NO NEGOCIABLE)

- Todo mensaje que vea el usuario final (interfaz, respuestas de error de la
  API, salida de scripts) DEBE estar en español claro, con tildes y eñes.
- Los identificadores del código (variables, funciones, clases, archivos,
  rutas y endpoints) DEBEN estar en inglés. Los comentarios y los nombres
  descriptivos de las pruebas DEBEN estar en español.
- El código nuevo DEBE ser consistente con el existente: misma estructura de
  carpetas, mismos patrones (rutas, controladores, servicios, middlewares),
  mismo formato de respuestas y mismo estilo de nombres.

**Razón:** los usuarios del gimnasio hablan español, mientras que los
identificadores en inglés y un estilo uniforme hacen que cualquier integrante
del equipo pueda leer y modificar cualquier módulo.

### VI. Requisitos en EARS (NO NEGOCIABLE)

- Todos los criterios de aceptación de los `spec.md` DEBEN escribirse con uno
  de los patrones EARS:
  - **Ubicuo:** "El sistema DEBE <respuesta>."
  - **Cuando** (evento): "Cuando <disparador>, el sistema DEBE <respuesta>."
  - **Mientras** (estado): "Mientras <estado>, el sistema DEBE <respuesta>."
  - **Si... entonces** (comportamiento no deseado): "Si <condición no
    deseada>, entonces el sistema DEBE <respuesta>."
  - **Donde** (característica opcional): "Donde <característica incluida>, el
    sistema DEBE <respuesta>."
- Cada criterio DEBE describir un único comportamiento observable y
  verificable con una prueba.
- Esta regla aplica a los specs nuevos o modificados a partir de esta versión;
  los specs anteriores NO necesitan reescribirse salvo que se modifiquen.

**Razón:** los patrones EARS eliminan la ambigüedad de los requisitos en
lenguaje natural y producen criterios que se traducen directamente en pruebas
automáticas.

### VII. Trazabilidad (NO NEGOCIABLE)

- DEBE hacerse un commit por cada paso de Spec Kit (`/speckit-specify`,
  `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`,
  etc.) que genere o modifique artefactos.
- Durante la implementación DEBE hacerse un commit por cada grupo de tareas, y
  su mensaje DEBE citar los IDs de tarea que cubre, por ejemplo
  `feat(reservas): agregar reserva de clases (T005-T008)`.
- NO DEBE usarse squash (ni al fusionar pull requests) ni `git push --force`;
  el historial publicado no se reescribe.

**Razón:** un historial completo que enlaza cada commit con su paso de Spec
Kit o sus tareas permite reconstruir por qué y cuándo se hizo cada cambio, y
evaluar el proceso del proyecto.

### VIII. Alcance, MVP y fuente de verdad (NO NEGOCIABLE)

- El desarrollo DEBE respetar el alcance definido para el proyecto.
- NO DEBEN agregarse funcionalidades fuera del alcance sin autorización previa
  del equipo.
- El sistema DEBE desarrollarse por etapas y respetar el orden establecido para
  los sprints.
- El MVP DEBE concentrarse en las funciones principales del gimnasio: clientes,
  membresías, pagos, reconocimiento facial, control de acceso, usuarios, roles
  y reportes.
- Las funciones fuera del alcance actual PUEDEN registrarse como mejoras
  futuras, pero NO DEBEN implementarse dentro del MVP.
- DEBE mantenerse la trazabilidad entre requisito, historia de usuario, sprint
  e implementación.
- Si cambia una regla de negocio, rol, entidad, requisito o sprint, la
  documentación del proyecto DEBE actualizarse.

**Razón:** un alcance definido permite entregar un sistema funcional y evita
que el proyecto crezca de manera innecesaria.

### IX. Arquitectura con responsabilidades separadas (NO NEGOCIABLE)

- El proyecto DEBE separar frontend, backend y base de datos en las carpetas
  `frontend/`, `backend/` y `database/` de la raíz del repositorio. NO DEBEN
  crearse estructuras alternativas como `client/`, `server/` o `dataBase/`.
- El frontend DEBE encargarse de la interfaz y de la interacción con el usuario.
- El backend DEBE encargarse de la lógica de negocio, autenticación,
  autorización y comunicación con la base de datos.
- La lógica de negocio NO DEBE concentrarse en los componentes de la interfaz.
- El backend DEBE organizarse de manera modular, separando rutas,
  controladores, modelos, servicios, middlewares y utilidades.
- El reconocimiento facial y el control de acceso DEBEN mantenerse como módulos
  independientes, aunque puedan comunicarse entre ellos.

**Razón:** separar responsabilidades facilita el mantenimiento, las pruebas y
las modificaciones futuras del sistema.

### X. Roles y permisos

El sistema DEBE manejar diferentes niveles de acceso.

#### Administrador

DEBE tener acceso a:

- Clientes.
- Membresías.
- Pagos.
- Control financiero.
- Reconocimiento facial.
- Control de acceso.
- Usuarios y roles.
- Reportes.
- Auditoría.

#### Recepcionista

DEBE poder:

- Registrar clientes.
- Modificar información de clientes.
- Registrar pagos.
- Renovar membresías.
- Consultar membresías.
- Registrar información facial.
- Consultar accesos.

NO DEBE modificar configuraciones administrativas que correspondan al
administrador.

#### Entrenador

DEBE poder:

- Consultar clientes.
- Consultar información básica.
- Consultar el estado de las membresías.
- Consultar asistencia o accesos.

NO DEBE tener acceso a información financiera administrativa.

#### Cliente

DEBE poder:

- Consultar su información personal.
- Consultar su membresía.
- Consultar sus pagos.
- Consultar sus adeudos.
- Consultar su historial de accesos.

El cliente NO DEBE poder consultar información de otros clientes.

**Razón:** la separación de roles evita accesos innecesarios y protege la
información de los usuarios.

### XI. Integridad de las reglas de negocio (NO NEGOCIABLE)

- Un cliente DEBE estar registrado antes de asignarle una membresía.
- Una membresía DEBE estar relacionada con un cliente y con un tipo de
  membresía válido.
- Una membresía DEBE tener fecha de inicio y fecha de vencimiento.
- El sistema DEBE identificar si una membresía está activa, vencida, suspendida
  o cancelada.
- Un pago DEBE estar relacionado con un cliente y, cuando corresponda, con una
  membresía.
- El sistema DEBE conservar el historial de pagos.
- Un cliente con membresía vencida NO DEBE recibir acceso como cliente activo.
- El reconocimiento facial DEBE identificar al cliente antes de validar su
  acceso.
- Todo acceso DEBE registrarse, haya sido autorizado o rechazado.
- Cuando un acceso sea rechazado, DEBE registrarse el motivo.
- Un registro de acceso NO DEBE eliminarse de manera ordinaria.
- La información financiera NO DEBE eliminarse sin autorización.

**Razón:** estas reglas mantienen la consistencia de la información y
permiten conocer el historial real de clientes, pagos y accesos.

### XII. Reconocimiento facial y control de acceso

- El reconocimiento facial DEBE utilizarse únicamente para identificar y validar
  el acceso de clientes registrados.
- Un cliente DEBE tener registrada previamente su información facial para usar
  esta función.
- El sistema DEBE comprobar que el cliente identificado tenga una membresía
  válida antes de autorizar su entrada.
- Si la membresía está vencida, suspendida o no existe, el acceso DEBE ser
  rechazado.
- Todo intento de acceso DEBE generar un registro.
- El sistema DEBE indicar si el acceso fue autorizado o rechazado.
- El reconocimiento facial NO DEBE utilizarse para vigilancia, seguimiento ni
  funciones distintas a las definidas en el proyecto.
- Se reconoce que el funcionamiento del reconocimiento facial depende de
  factores como la cámara, la iluminación y las condiciones del entorno.

**Razón:** el reconocimiento facial es una de las funciones principales del
sistema y debe utilizarse únicamente para el propósito establecido.

### XIII. API y manejo de errores

- Las rutas de la API DEBEN mantener una estructura consistente.
- Las respuestas DEBEN utilizar formato JSON.
- DEBEN utilizarse códigos HTTP apropiados.
- DEBE existir un middleware de autenticación y uno de autorización por rol.
- El manejo de errores DEBE estar centralizado.
- Los mensajes de error DEBEN ser claros para el usuario sin revelar
  información interna del sistema.

**Razón:** una API organizada facilita la comunicación entre React y Node.js
y mantiene el sistema ordenado.

### XIV. UX/UI profesional y sencilla

- La interfaz DEBE ser clara, sencilla y fácil de utilizar.
- El diseño DEBE mantener una apariencia consistente en todos los módulos.
- Las acciones principales DEBEN ser fáciles de identificar.
- Las operaciones de eliminación DEBEN solicitar confirmación.
- El sistema DEBE mostrar mensajes de éxito o error después de cada operación.
- Los estados de las membresías y de los accesos DEBEN mostrarse de forma clara.
- Los elementos visuales DEBEN facilitar la interpretación de la información y
  NO DEBEN usarse únicamente como decoración.

**Razón:** el sistema será utilizado por personal del gimnasio que necesita
consultar y registrar información rápidamente.

## Tecnologías y dependencias

- Frontend: React con Vite.
- Lenguaje principal: JavaScript.
- Backend: Node.js con Express.js, con ES Modules.
- Base de datos: MySQL 8 o MariaDB 10.4+ local (XAMPP), InnoDB, `utf8mb4`.
- Migraciones: scripts SQL numerados en `database/migrations/`.
- Estructura del repositorio: `frontend/`, `backend/` y `database/`.
- Autenticación: JWT.
- Hash de contraseñas: bcrypt.
- Pruebas: Node test runner y supertest en el backend; Vitest y Testing
  Library en el frontend.
- Reconocimiento facial: librería o tecnología compatible con JavaScript.
- Control de versiones: Git y GitHub.
- API: REST.

Se DEBEN priorizar herramientas gratuitas o de bajo costo. NO DEBEN agregarse
librerías o tecnologías que no sean necesarias para el funcionamiento del
sistema, y toda dependencia nueva DEBE justificarse antes de incorporarse
(ver principio I).

## Flujo de desarrollo

Cada feature DEBE seguir el flujo de Spec Kit: `/speckit-specify` →
(`/speckit-clarify`) → `/speckit-plan` → `/speckit-tasks` →
(`/speckit-analyze`) → `/speckit-implement`, con un commit por paso y por
grupo de tareas (principio VII).

Para implementar cada sprint, el equipo DEBE:

1. Revisar los requisitos y el alcance del proyecto.
2. Revisar las historias de usuario correspondientes.
3. Identificar las funcionalidades pendientes.
4. Definir las tareas del sprint.
5. Implementar únicamente el alcance acordado.
6. Probar las funcionalidades.
7. Corregir los errores encontrados.
8. Integrar los cambios al proyecto.
9. Actualizar la documentación cuando sea necesario.

Una funcionalidad se considera terminada cuando:

- Está implementada.
- Está integrada con el backend cuando corresponde.
- Los datos se almacenan y consultan correctamente.
- Se validan los permisos.
- Se validan los datos de entrada.
- Se manejan los errores previsibles.
- Sus reglas de negocio tienen pruebas automáticas y `npm test` pasa.
- Se realizó una prueba funcional.
- No contiene información sensible ni contraseñas.
- No afecta funcionalidades existentes.

Las ramas de feature DEBEN usar el formato de Spec Kit: número de tres dígitos
y nombre en minúsculas, con guiones y sin tildes ni eñes (por ejemplo
`004-reservas-clases`).

Los commits DEBEN seguir Conventional Commits, con tipo y alcance en inglés y
descripción en español (por ejemplo
`feat(memberships): agregar renovación encadenada de membresías (T012-T015)`).

## Decisiones pendientes

Estas decisiones PUEDEN definirse durante el desarrollo, pero DEBEN ser
aprobadas por el equipo antes de considerarse definitivas:

- Librería específica para reconocimiento facial.
- Diseño final de la interfaz.
- Librería de componentes para React.
- Estrategia de manejo de estado en React.
- Estructura definitiva de la API REST.
- Forma de almacenar las plantillas o características faciales.
- Estrategia para registrar fotografías o datos faciales.
- Forma de generar reportes.
- Implementación de gráficas para el módulo financiero.
- Método de despliegue del sistema.
- Servicio de hosting, en caso de realizar una demostración en línea.

## Gobernanza

- Esta constitución tiene prioridad sobre cualquier decisión de desarrollo que
  contradiga sus principios.
- Los principios marcados como NO NEGOCIABLES no admiten excepciones dentro de
  una feature; cambiarlos requiere enmendar esta constitución.
- Toda modificación importante al alcance, arquitectura, tecnologías, roles o
  reglas de negocio DEBE ser aprobada por el equipo y quedar documentada.
- La constitución DEBE mantener control de versiones con el siguiente criterio:
  - **MAJOR:** cambio incompatible o eliminación de un principio.
  - **MINOR:** incorporación de nuevos principios o secciones, o ampliación
    material de las reglas existentes.
  - **PATCH:** correcciones, aclaraciones o cambios menores de redacción.
- Cada `plan.md` DEBE incluir una revisión de cumplimiento de la constitución
  ("Verificación de la constitución") antes de la investigación y después del
  diseño.
- El cumplimiento de estas reglas DEBE revisarse durante cada sprint.
- Toda desviación DEBE justificarse en el `plan.md` y ser conocida por el
  equipo.

**Versión**: 2.1.0 | **Ratificada**: 2026-10-08 | **Última enmienda**: 2026-10-16
