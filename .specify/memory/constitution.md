<!--
Reporte de impacto de la sincronización

- Cambio de versión: (plantilla sin completar) → 1.0.0
- Origen del contenido: docs/reglas.md (borrador del equipo, redactado el 2026-10-06).
- Principios definidos (todos nuevos):
  I. Alcance, MVP y fuente de verdad (NO NEGOCIABLE)
  II. Arquitectura con responsabilidades separadas (NO NEGOCIABLE)
  III. Stack tecnológico
  IV. Base de datos y persistencia (NO NEGOCIABLE)
  V. Seguridad y protección de información (NO NEGOCIABLE)
  VI. Roles y permisos
  VII. Integridad de las reglas de negocio (NO NEGOCIABLE)
  VIII. Reconocimiento facial y control de acceso
  IX. API y manejo de errores
  X. Pruebas
  XI. UX/UI profesional y sencilla
- Secciones añadidas: "Tecnologías y dependencias", "Flujo de desarrollo",
  "Decisiones pendientes" y "Gobernanza".
- Secciones eliminadas: ninguna.
- Pendientes:
  - TODO(RATIFICATION_DATE): el equipo aún no ratifica la constitución.
  - Revisar la convención de nombres de rama (feature/..., fix/...) frente a la
    convención de Spec Kit (001-nombre-de-feature) definida en AGENTS.md.
-->

# Constitución del Sistema de Gestión para Gimnasio

El Sistema de Gestión para Gimnasio es un proyecto académico cuyo objetivo es
desarrollar una plataforma web para administrar clientes, membresías, pagos y
accesos mediante reconocimiento facial.

El sistema centraliza la información del gimnasio, controla el estado de las
membresías, registra pagos y valida el acceso de los clientes. Cuenta con
diferentes roles que limitan el acceso a las funciones según las
responsabilidades de cada usuario.

El detalle de los requisitos, módulos, entidades, reglas de negocio y sprints
se encuentra en la documentación del proyecto (`docs/`), que constituye la
fuente de verdad para el desarrollo.

## Principios fundamentales

### I. Alcance, MVP y fuente de verdad (NO NEGOCIABLE)

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

**Justificación:** un alcance definido permite entregar un sistema funcional y
evita que el proyecto crezca de manera innecesaria.

### II. Arquitectura con responsabilidades separadas (NO NEGOCIABLE)

- El proyecto DEBE separar frontend, backend y base de datos.
- El frontend DEBE encargarse de la interfaz y de la interacción con el usuario.
- El backend DEBE encargarse de la lógica de negocio, autenticación,
  autorización y comunicación con la base de datos.
- La base de datos DEBE almacenar la información necesaria para el
  funcionamiento del sistema.
- La lógica de negocio NO DEBE concentrarse en los componentes de la interfaz.
- El backend DEBE organizarse de manera modular, separando rutas,
  controladores, modelos, servicios, middlewares y utilidades.
- El reconocimiento facial y el control de acceso DEBEN mantenerse como módulos
  independientes, aunque puedan comunicarse entre ellos.

**Justificación:** separar responsabilidades facilita el mantenimiento, las
pruebas y las modificaciones futuras del sistema.

### III. Stack tecnológico

- Frontend: React con JavaScript.
- Backend: Node.js con Express y JavaScript.
- Base de datos: MongoDB.
- El backend DEBE utilizar una tecnología compatible con MongoDB para las
  operaciones de persistencia.
- La comunicación entre frontend y backend DEBE realizarse mediante una API REST.
- La autenticación DEBE utilizar JWT.
- Las contraseñas DEBEN almacenarse con un algoritmo de hash seguro, como bcrypt.
- El reconocimiento facial DEBE utilizar una tecnología compatible con
  aplicaciones web y JavaScript.
- El sistema DEBE utilizar variables de entorno para configurar conexiones y
  credenciales.
- NO DEBEN agregarse tecnologías o dependencias innecesarias; toda dependencia
  nueva DEBE justificarse antes de incorporarse al proyecto.

**Justificación:** un conjunto de tecnologías conocido y basado en JavaScript
facilita el desarrollo y el mantenimiento del sistema.

### IV. Base de datos y persistencia (NO NEGOCIABLE)

La base de datos DEBE desarrollarse en dos sprints.

#### Sprint 1 — Información principal y financiera

La primera etapa DEBE incluir las colecciones:

- `usuarios`
- `clientes`
- `tipos_membresia`
- `membresias`
- `pagos`

Estas colecciones permiten administrar los usuarios del sistema, registrar
clientes, definir los tipos de membresía, controlar la vigencia de las
membresías y registrar los pagos realizados.

#### Sprint 2 — Reconocimiento, acceso y auditoría

La segunda etapa DEBE incluir las colecciones:

- `rostros`
- `accesos`
- `auditoria`

Estas colecciones permiten almacenar la información necesaria para el
reconocimiento facial, registrar los accesos y mantener un historial de las
acciones importantes realizadas dentro del sistema.

#### Reglas de persistencia

- Los datos DEBEN mantener relaciones lógicas mediante identificadores.
- El frontend NUNCA DEBE conectarse directamente a MongoDB; únicamente el
  backend DEBE tener acceso a la base de datos.
- Los cambios en la estructura de la base de datos DEBEN quedar documentados.
- La información facial DEBE tratarse como información sensible y almacenarse
  con las medidas de seguridad correspondientes.

**Justificación:** separar la base de datos en dos etapas permite construir
primero la estructura principal e integrar después el reconocimiento facial,
el control de acceso y la auditoría.

### V. Seguridad y protección de información (NO NEGOCIABLE)

- Las contraseñas NUNCA DEBEN almacenarse en texto plano.
- Los secretos, contraseñas y credenciales DEBEN manejarse mediante variables
  de entorno.
- El archivo `.env` NO DEBE subirse al repositorio.
- DEBE existir un archivo `.env.example` sin información sensible.
- Los permisos de cada rol DEBEN validarse en el backend; ocultar una opción en
  la interfaz NO es una medida de seguridad suficiente.
- Las entradas de los usuarios DEBEN validarse en el backend.
- El sistema NO DEBE mostrar información técnica interna ni errores que puedan
  comprometer la seguridad.
- La información de reconocimiento facial DEBE protegerse y solo PUEDE
  utilizarse para las funciones establecidas dentro del sistema.

**Justificación:** el sistema maneja información personal, financiera y
biométrica de los clientes.

### VI. Roles y permisos

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

**Justificación:** la separación de roles evita accesos innecesarios y protege
la información de los usuarios.

### VII. Integridad de las reglas de negocio (NO NEGOCIABLE)

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

**Justificación:** estas reglas mantienen la consistencia de la información y
permiten conocer el historial real de clientes, pagos y accesos.

### VIII. Reconocimiento facial y control de acceso

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

**Justificación:** el reconocimiento facial es una de las funciones principales
del sistema y debe utilizarse únicamente para el propósito establecido.

### IX. API y manejo de errores

- Las rutas de la API DEBEN mantener una estructura consistente.
- Las respuestas DEBEN utilizar formato JSON.
- DEBEN utilizarse códigos HTTP apropiados.
- DEBE existir un middleware de autenticación.
- DEBE existir un middleware de autorización que valide los roles.
- Los datos recibidos por la API DEBEN validarse antes de procesarse.
- El manejo de errores DEBE estar centralizado.
- Los mensajes de error DEBEN ser claros para el usuario sin revelar
  información interna del sistema.

**Justificación:** una API organizada facilita la comunicación entre React y
Node.js y mantiene el sistema ordenado.

### X. Pruebas

- Las funciones principales DEBEN probarse antes de considerarse terminadas.
- Las pruebas DEBEN cubrir como mínimo:
  - Registro y modificación de clientes.
  - Registro y renovación de membresías.
  - Registro de pagos.
  - Consulta de adeudos.
  - Autenticación.
  - Validación de roles.
  - Reconocimiento facial.
  - Autorización y rechazo de accesos.
  - Registro de accesos.
  - Generación de reportes.
- Una funcionalidad NO DEBE considerarse terminada solo porque exista su
  interfaz visual.
- Cuando una funcionalidad dependa del backend y la base de datos, DEBE
  comprobarse su funcionamiento de extremo a extremo.

**Justificación:** las pruebas permiten detectar errores antes de la
presentación final del sistema.

### XI. UX/UI profesional y sencilla

- La interfaz DEBE ser clara, sencilla y fácil de utilizar.
- El diseño DEBE mantener una apariencia consistente en todos los módulos.
- Las acciones principales DEBEN ser fáciles de identificar.
- Las operaciones de eliminación DEBEN solicitar confirmación.
- El sistema DEBE mostrar mensajes de éxito o error después de cada operación.
- Los estados de las membresías y de los accesos DEBEN mostrarse de forma clara.
- Los elementos visuales DEBEN facilitar la interpretación de la información y
  NO DEBEN usarse únicamente como decoración.

**Justificación:** el sistema será utilizado por personal del gimnasio que
necesita consultar y registrar información rápidamente.

## Tecnologías y dependencias

- Frontend: React.
- Lenguaje principal: JavaScript.
- Backend: Node.js.
- Framework backend: Express.js.
- Base de datos: MongoDB.
- Autenticación: JWT.
- Hash de contraseñas: bcrypt.
- Reconocimiento facial: librería o tecnología compatible con JavaScript.
- Control de versiones: Git y GitHub.
- API: REST.

Se DEBEN priorizar herramientas gratuitas o de bajo costo. NO DEBEN agregarse
librerías o tecnologías que no sean necesarias para el funcionamiento del
sistema, y toda dependencia nueva DEBE justificarse antes de incorporarse.

## Flujo de desarrollo

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
- Se realizó una prueba funcional.
- No contiene información sensible ni contraseñas.
- No afecta funcionalidades existentes.

Las ramas del proyecto DEBEN usar nombres relacionados con la funcionalidad,
por ejemplo:

- `feature/clientes`
- `feature/membresias`
- `feature/pagos`
- `feature/reconocimiento-facial`
- `fix/error-acceso`

Los commits DEBEN ser pequeños y describir claramente el cambio realizado.

## Decisiones pendientes

Estas decisiones PUEDEN definirse durante el desarrollo, pero DEBEN ser
aprobadas por el equipo antes de considerarse definitivas:

- Librería específica para reconocimiento facial.
- Diseño final de la interfaz.
- Librería de componentes para React.
- Estrategia de manejo de estado en React.
- Estructura definitiva de la API REST.
- Herramienta o estrategia de pruebas.
- Forma de almacenar las plantillas o características faciales.
- Estrategia para registrar fotografías o datos faciales.
- Forma de generar reportes.
- Implementación de gráficas para el módulo financiero.
- Método de despliegue del sistema.
- Servicio de hosting, en caso de realizar una demostración en línea.

## Gobernanza

- Esta constitución tiene prioridad sobre cualquier decisión de desarrollo que
  contradiga sus principios.
- Toda modificación importante al alcance, arquitectura, tecnologías, roles o
  reglas de negocio DEBE ser aprobada por el equipo y quedar documentada.
- La constitución DEBE mantener control de versiones con el siguiente criterio:
  - **MAJOR:** cambio o eliminación de un principio importante.
  - **MINOR:** incorporación de nuevos principios o secciones.
  - **PATCH:** correcciones, aclaraciones o cambios menores de redacción.
- El cumplimiento de estas reglas DEBE revisarse durante cada sprint.
- Toda desviación DEBE justificarse y ser conocida por el equipo.

**Versión**: 1.0.0 | **Ratificada**: TODO(RATIFICATION_DATE): pendiente de aprobación del equipo | **Última enmienda**: 2026-10-08
