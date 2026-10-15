# Investigación (Fase 0): Sprint 1 — Base del sistema, usuarios y clientes

Cada decisión resuelve una incógnita del contexto técnico de [plan.md](./plan.md) o una decisión
pendiente de `docs/project-context.md` (sección 18) que afecta al Sprint 1. Las decisiones del
Sprint 2 (librería facial, pagos parciales, etc.) no se resuelven aquí.

## R-01. Motor de base de datos

- **Decisión**: MySQL 8.0+ o MariaDB 10.4+ en local (compatible con MySQL), InnoDB, `utf8mb4`
  con collation `utf8mb4_unicode_ci`. Las llaves foráneas usan `ON DELETE RESTRICT ON UPDATE
  RESTRICT`.
- **Justificación**: decisión del equipo del 2026-10-08 (FR-035) y exigencia de
  `docs/project-context.md`, `docs/sprint-1.md` y `docs/sprint-2.md`. La collation
  `utf8mb4_unicode_ci` compara sin distinguir mayúsculas, lo que hace cumplir el caso límite de
  correos duplicados con distinta capitalización. MySQL 8.0.16+ y MariaDB 10.2+ aplican
  restricciones `CHECK`.
- **Ajuste durante la implementación (2026-10-08)**: el equipo de desarrollo tiene XAMPP con
  MariaDB 10.4, que no incluye `utf8mb4_0900_ai_ci`; por eso se usa `utf8mb4_unicode_ci`, que
  existe en ambos motores. También se cambió `ON UPDATE CASCADE` por `ON UPDATE RESTRICT`, porque
  MySQL 8 no permite una restricción `CHECK` sobre una columna usada en una acción referencial
  (`usuarios.id_cliente`); los identificadores nunca se modifican, así que no hay pérdida
  funcional.
- **Alternativas consideradas**: MongoDB (constitución v1.0.0), descartada por la decisión del
  equipo; PostgreSQL, descartada porque no figura en la documentación.

## R-02. Acceso a MySQL desde Node.js

- **Decisión**: driver `mysql2` con su API de promesas (`mysql2/promise`), un pool de conexiones y
  consultas con `pool.execute(sql, params)` (sentencias preparadas). Una capa `models/` por tabla
  contiene todo el SQL.
- **Justificación**: resuelve "driver de MySQL" y "driver directo, query builder u ORM". Con cinco
  tablas, el SQL directo es fácil de leer para el equipo, las sentencias preparadas cumplen la regla
  de consultas parametrizadas y no hace falta aprender un ORM. Soporta ES Modules.
- **Alternativas consideradas**: Sequelize o Prisma (ORM), descartados porque añaden su propio
  sistema de migraciones, que choca con la regla de scripts SQL versionados en `database/`; Knex
  (query builder), descartado por ser una dependencia más sin beneficio claro a esta escala.

## R-03. Migraciones y carga inicial

- **Decisión**: archivos SQL numerados en `database/migrations/` (`001_...sql`, `002_...sql`)
  aplicados en orden por `database/scripts/migrate.js`, que registra los aplicados en una tabla de
  control `schema_migrations`. La carga del administrador inicial es una semilla JavaScript
  (`database/seeds/001_admin_inicial.js`) que lee `ADMIN_NOMBRE`, `ADMIN_CORREO` y
  `ADMIN_PASSWORD` del entorno, genera el hash con bcrypt y no hace nada si ya existe un
  administrador. `database/scripts/reset.js` borra y recrea la base solo si `NODE_ENV` no es
  `production`.
- **Justificación**: cumple "scripts SQL versionados", "nuevos scripts numerados" y FR-016 (las
  credenciales del primer administrador no viven en el código). La semilla debe ser JavaScript
  porque el hash bcrypt no se puede calcular en SQL. Todos los scripts usan ES Modules
  (`database/package.json` con `"type": "module"`).
- **Alternativas consideradas**: un único `schema.sql` (no permite cambios incrementales);
  herramientas como Flyway (requiere Java) o `db-migrate` (dependencia extra).

## R-04. Autenticación y sesión

- **Decisión**: `jsonwebtoken` con HS256, secreto `JWT_SECRET` (mínimo 32 caracteres) y
  `JWT_EXPIRES_IN=8h`. El token incluye solo `sub` (id de usuario) y `rol`. El frontend lo guarda en
  `sessionStorage` y lo envía en `Authorization: Bearer <token>`. El middleware `authenticate`
  verifica el token **y vuelve a leer el usuario en la base en cada solicitud**; si está inactivo o
  no existe, responde 401, y los permisos se evalúan con el rol leído de la base. Cerrar sesión
  consiste en borrar el token en el cliente.
- **Justificación**: JWT es obligatorio por la constitución. Releer el usuario cumple los casos
  límite "usuario desactivado con sesión abierta" y "cambio de rol durante la sesión" sin una lista
  negra de tokens; con la escala del proyecto, el costo de una consulta por solicitud es mínimo.
  `sessionStorage` cierra la sesión al cerrar la pestaña, adecuado para equipos compartidos de
  recepción; 8 h coincide con la duración de un turno (FR-007).
- **Alternativas consideradas**: cookie `httpOnly` (más robusta frente a XSS, pero exige manejar
  CSRF y CORS con credenciales; se puede adoptar más adelante); token de actualización (refresh
  token), innecesario para sesiones de un turno; `localStorage` (la sesión sobrevive al cierre del
  navegador en equipos compartidos).

## R-05. Protección de contraseñas

- **Decisión**: paquete `bcrypt` con costo 10. Política de contraseña: mínimo 8 caracteres, al
  menos una letra y un número, máximo 72 bytes (límite de bcrypt).
- **Justificación**: bcrypt es obligatorio por la constitución. Costo 10 tarda unos 60-100 ms por
  verificación, rápido para el inicio de sesión y suficiente para el contexto académico. `bcrypt`
  publica binarios precompilados para Windows x64 y Node.js actual.
- **Alternativas consideradas**: `bcryptjs` (JavaScript puro, más lento; se usará como sustituto
  solo si `bcrypt` no compila en algún equipo, ya que su API es compatible); argon2 (no indicado
  en la documentación).
- **Gestión de contraseñas**: el administrador fija la contraseña inicial y la restablece con
  `PATCH /users/:id`; los usuarios no pueden cambiar la suya en este sprint. La pregunta 2 de
  `/speckit-clarify` (permitir que cada usuario cambie su contraseña, con o sin cambio obligatorio
  en el primer inicio de sesión) quedó sin responder; si se aprueba, se agregaría
  `PATCH /auth/password` y una pantalla en el perfil, sin cambios en el modelo de datos.

## R-06. Validación de datos de entrada

- **Decisión**: `express-validator` con un archivo por recurso en `backend/src/validators/` y un
  middleware `validate` que convierte los errores en una respuesta 400 con la lista de campos y
  mensajes en español. Se recortan espacios (`trim`) y los correos se normalizan a minúsculas.
- **Justificación**: resuelve "estrategia de validación de formularios" en el servidor (FR-025),
  encaja con la separación por carpetas de la constitución y es la opción más documentada para
  Express. El frontend repite validaciones simples (campos obligatorios, formato de correo) solo
  para dar retroalimentación inmediata; la validación válida es la del backend.
- **Alternativas consideradas**: `zod` o `joi` (válidos, pero exigen escribir el puente a Express);
  validación manual (más código repetido y propenso a errores).

## R-07. Seguridad HTTP y manejo de errores

- **Decisión**: `helmet` para cabeceras de seguridad, `cors` limitado al origen definido en
  `CORS_ORIGIN`, límite de 100 kB en el cuerpo JSON. Una clase `AppError` (código HTTP, código
  interno, mensaje en español) y un manejador de errores central que registra el error completo en
  la consola del servidor y devuelve al cliente solo `{ error: { code, message, details? } }`; los
  errores no previstos responden 500 con un mensaje genérico.
- **Justificación**: principios V y IX (no revelar información interna, manejo centralizado).
  `helmet` y `cors` son dependencias pequeñas y estándar; la API y el frontend corren en puertos
  distintos, así que CORS es imprescindible.
- **Alternativas consideradas**: limitar intentos de inicio de sesión con `express-rate-limit`;
  la especificación no lo exige (solo pide un mensaje genérico) y se deja como mejora futura.

## R-08. Modelo de roles

- **Decisión**: el rol es una columna `ENUM('administrador','recepcionista','entrenador','cliente')`
  en `usuarios`; los permisos viven en el backend en `utils/roles.js` y se aplican con el
  middleware `authorize(...roles)`. Un usuario con rol `cliente` tiene `id_cliente` obligatorio y
  único; los demás roles lo tienen nulo (restricción `CHECK`).
- **Justificación**: FR-009 fija exactamente cuatro roles y `docs/project-context.md` define `rol`
  como campo de `usuarios`. Una tabla de roles y permisos configurable sería complejidad sin uso
  en el MVP.
- **Alternativas consideradas**: tablas `roles` y `permisos` (RBAC configurable), descartadas por
  el alcance.

## R-09. Protección del último administrador

- **Decisión**: al desactivar un usuario o cambiarle el rol, el servicio abre una transacción,
  bloquea los administradores activos con `SELECT ... FOR UPDATE` y rechaza el cambio con 409 si
  dejaría cero administradores activos.
- **Justificación**: FR-014. La transacción evita que dos administradores se desactiven
  mutuamente a la vez.
- **Alternativas consideradas**: disparador (trigger) en MySQL, descartado porque oculta la regla
  de negocio fuera de `services/` (principio II).

## R-10. Datos visibles por rol

- **Decisión**: el servicio de clientes devuelve una proyección según el rol: el entrenador recibe
  solo `id_cliente`, `nombre`, `apellido` y `estado`; administrador y recepcionista reciben todos
  los campos; el cliente solo accede a `GET /api/clients/me`, que usa el `id_cliente` de su
  usuario y nunca un identificador enviado por el cliente.
- **Justificación**: FR-023 y FR-024 (RN-14). Filtrar en el servidor evita que los datos lleguen al
  navegador aunque la interfaz no los muestre.
- **Alternativas consideradas**: ocultar los campos solo en la interfaz (prohibido por el
  principio V).

## R-11. Frontend

- **Decisión**: React 18 o superior con Vite, `react-router-dom` para las rutas, un `AuthContext`
  para la sesión (sin librería de estado global), `fetch` nativo con un pequeño cliente en
  `src/api/client.js`, CSS propio con variables y sin librería de componentes.
- **Justificación**: resuelve provisionalmente "librería de componentes" y "manejo de estado" para
  el Sprint 1 con el mínimo de dependencias (constitución, sección "Tecnologías y dependencias").
  El estado global se limita a la sesión; Context es suficiente. Vite es la herramienta estándar
  actual para crear proyectos React.
- **Alternativas consideradas**: Create React App (obsoleto); Redux o Zustand (innecesarios con un
  solo estado global); Material UI o Bootstrap (se puede decidir en el Sprint 2 junto con el
  diseño final; queda en "Decisiones pendientes" de la constitución).

## R-12. Estrategia de pruebas

- **Decisión**: backend con `node:test` (incluido en Node.js) y `supertest`, ejecutados contra una
  base de pruebas `gym_access_test` que `tests/helpers` recrea con las mismas migraciones. Se
  prueban: inicio de sesión (válido, inválido, usuario inactivo), matriz de permisos de los cuatro
  roles en todos los endpoints, último administrador, registro/modificación/búsqueda de clientes,
  proyección del entrenador y aislamiento del cliente. Frontend con `vitest` y
  `@testing-library/react` para el formulario de inicio de sesión y `ProtectedRoute`. Nombres de
  prueba en español (`AGENTS (1).md`).
- **Justificación**: resuelve "herramienta o estrategia para realizar pruebas" y cubre los mínimos
  del principio X que aplican al Sprint 1. `node:test` evita una dependencia; `vitest` comparte la
  configuración de Vite.
- **Alternativas consideradas**: Jest (su soporte de ES Modules sigue siendo experimental y exige
  configuración extra); pruebas de navegador con Playwright (se cubren de forma manual con
  `quickstart.md` en este sprint).

## R-13. Configuración y variables de entorno

- **Decisión**: cada paquete carga su `.env` con `dotenv`. `backend/.env.example` define `PORT`,
  `NODE_ENV`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_NAME_TEST`,
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`. `database/.env.example` define las variables
  `DB_*` y `ADMIN_*`. `frontend/.env.example` define `VITE_API_URL`. El backend valida al arrancar
  que las variables obligatorias existan y se detiene con un mensaje claro si falta alguna.
- **Justificación**: principio V y sección 21 de `docs/project-context.md`. Validar al arrancar
  evita fallos confusos en tiempo de ejecución.
- **Alternativas consideradas**: un único `.env` en la raíz compartido por los tres paquetes;
  posible, pero mezcla secretos del backend con variables públicas del frontend.

## Asuntos que no se resuelven en este sprint

Quedan para el Sprint 2 o para decisión del equipo: librería de reconocimiento facial y
almacenamiento de descriptores, métodos de pago y pagos parciales, política de membresías
suspendidas y tolerancia de vencimiento, diseño final de la interfaz, dashboard, reportes y
auditoría. Los valores de `metodo_pago` y `estado` de `pagos` del modelo de datos son provisionales
y se pueden ajustar en el Sprint 2 con una nueva migración.
