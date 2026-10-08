---

description: "Lista de tareas del Sprint 1: base del sistema, autenticación, usuarios, roles y clientes"
---

# Tareas: Sprint 1 — Base del sistema, autenticación, usuarios, roles y clientes

**Entrada**: documentos de diseño en `specs/001-base-usuarios-clientes/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

**Pruebas**: se incluyen porque la constitución (principio X) exige probar autenticación, roles y
clientes antes de dar una función por terminada. Backend con `node:test` + `supertest`; frontend con
`vitest` + `@testing-library/react` (research R-12). Nombres de prueba y mensajes de aserción en
español.

**Organización**: las tareas se agrupan por historia de usuario para implementarlas y probarlas de
forma independiente.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]…[US6]**: historia de usuario de `spec.md` a la que pertenece la tarea.
- Cada descripción incluye la ruta exacta del archivo.

## Convenciones obligatorias para todas las tareas

- `backend/` y `database/` usan solo ES Modules (`import`/`export`); prohibido `require()` y
  `module.exports`. Las importaciones relativas llevan extensión `.js`.
- No crear carpetas `client/`, `server/` ni `dataBase/`.
- Identificadores, archivos, rutas y endpoints en inglés; comentarios, mensajes de la interfaz,
  mensajes de error y nombres de pruebas en español (`AGENTS (1).md`).
- Toda consulta SQL va en `backend/src/models/` con `pool.execute(sql, params)` (sentencias
  preparadas); nunca concatenar valores en el SQL.
- Las reglas de negocio van en `backend/src/services/`; los controladores solo leen la solicitud,
  llaman al servicio y responden.
- Respuestas: `{ "data": ... }` (más `meta` en listados) y errores
  `{ "error": { "code", "message", "details?" } }` según [contracts/api.md](./contracts/api.md).
- Nunca devolver la columna `password` en ninguna respuesta.

---

## Fase 1: Configuración inicial (infraestructura compartida)

**Propósito**: crear la estructura del repositorio y los paquetes.

- [X] T001 Crear la estructura de carpetas del plan: `frontend/src/{api,context,components,pages,styles,tests}`, `backend/src/{config,routes,controllers,services,models,middlewares,validators,utils}`, `backend/tests/helpers`, `database/{migrations,seeds,scripts}`
- [X] T002 [P] Crear `.gitignore` en la raíz con `node_modules/`, `.env`, `.env.*` (excepto `!.env.example`), `dist/`, `coverage/` y archivos de datos de MySQL (`*.ibd`, `mysql-data/`)
- [X] T003 [P] Crear `.env.example` en la raíz que explique en comentarios en español que cada paquete tiene su propio `.env.example` (`backend/`, `database/`, `frontend/`) y que nunca se suben archivos `.env`
- [X] T004 [P] Inicializar `database/package.json` con `"type": "module"`, `"private": true`, dependencias `mysql2`, `bcrypt`, `dotenv` y scripts `"db:migrate": "node scripts/migrate.js"`, `"db:seed": "node scripts/seed.js"`, `"db:reset": "node scripts/reset.js"`
- [X] T005 [P] Crear `database/.env.example` con `DB_HOST=localhost`, `DB_PORT=3306`, `DB_USER=`, `DB_PASSWORD=`, `DB_NAME=gym_access`, `DB_NAME_TEST=gym_access_test`, `NODE_ENV=development`, `ADMIN_NOMBRE=Administrador`, `ADMIN_CORREO=`, `ADMIN_PASSWORD=` (sin valores secretos)
- [X] T006 [P] Inicializar `backend/package.json` con `"type": "module"`, `"private": true`, dependencias `express`, `mysql2`, `jsonwebtoken`, `bcrypt`, `express-validator`, `helmet`, `cors`, `dotenv`, dependencia de desarrollo `supertest` y scripts `"dev": "node --watch src/server.js"`, `"start": "node src/server.js"`, `"test": "node --import ./tests/helpers/setup-env.js --test --test-concurrency=1 tests/"`
- [X] T007 [P] Crear `backend/.env.example` con `PORT=3000`, `NODE_ENV=development`, `DB_HOST=localhost`, `DB_PORT=3306`, `DB_USER=`, `DB_PASSWORD=`, `DB_NAME=gym_access`, `DB_NAME_TEST=gym_access_test`, `JWT_SECRET=` (comentario: mínimo 32 caracteres), `JWT_EXPIRES_IN=8h`, `CORS_ORIGIN=http://localhost:5173`
- [X] T008 [P] Crear el proyecto de `frontend/` con Vite + React en JavaScript: `frontend/package.json` (dependencias `react`, `react-dom`, `react-router-dom`; desarrollo `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`; scripts `dev`, `build`, `preview`, `"test": "vitest run"`), `frontend/index.html` con `lang="es"` y `frontend/vite.config.js` con el plugin de React y `test: { environment: 'jsdom', setupFiles: './src/tests/setup.js' }`
- [X] T009 [P] Crear `frontend/.env.example` con `VITE_API_URL=http://localhost:3000/api` y `frontend/src/tests/setup.js` que importe `@testing-library/jest-dom/vitest`
- [X] T010 [P] Crear `README.md` en la raíz, en español: descripción del proyecto, requisitos (Node.js 22+, MySQL Server 8.0+), estructura `frontend/`, `backend/`, `database/` y enlace a `specs/001-base-usuarios-clientes/quickstart.md`

---

## Fase 2: Fundamentos (prerrequisitos que bloquean todo)

**Propósito**: base de datos funcional, servidor con manejo de errores, autenticación por token y
esqueleto del frontend. Ninguna historia puede empezar sin esta fase.

### Base de datos

- [X] T011 Crear `database/migrations/001_create_usuarios_clientes.sql` con `CREATE TABLE IF NOT EXISTS` para `clientes` y luego `usuarios`, ambas `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, exactamente como [data-model.md](./data-model.md): `clientes` (`id_cliente INT UNSIGNED AUTO_INCREMENT PK`, `nombre VARCHAR(80) NOT NULL`, `apellido VARCHAR(80) NOT NULL`, `correo VARCHAR(120) NULL UNIQUE`, `telefono VARCHAR(20) NOT NULL`, `direccion VARCHAR(200) NULL`, `fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`, `estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'`, `actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, `INDEX (apellido, nombre)`, `INDEX (estado)`) y `usuarios` (`id_usuario INT UNSIGNED AUTO_INCREMENT PK`, `nombre VARCHAR(120) NOT NULL`, `correo VARCHAR(120) NOT NULL UNIQUE`, `password CHAR(60) NOT NULL`, `rol ENUM('administrador','recepcionista','entrenador','cliente') NOT NULL`, `estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'`, `id_cliente INT UNSIGNED NULL UNIQUE` con FK a `clientes(id_cliente)` `ON DELETE RESTRICT ON UPDATE RESTRICT`, `creado_en`, `actualizado_en`, y `CHECK ((rol = 'cliente' AND id_cliente IS NOT NULL) OR (rol <> 'cliente' AND id_cliente IS NULL))`)
- [X] T012 Crear `database/scripts/connection.js` que cargue `database/.env` con `dotenv`, valide que existan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` y exporte `createConnection({ database, withoutDatabase })` usando `mysql2/promise` con `multipleStatements: true` y `charset: 'utf8mb4'`; si `NODE_ENV === 'test'` usa `DB_NAME_TEST`
- [X] T013 Crear `database/scripts/migrate.js`: crea la base si no existe (`CREATE DATABASE IF NOT EXISTS ... CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`), crea `schema_migrations (nombre VARCHAR(255) PK, aplicada_en DATETIME DEFAULT CURRENT_TIMESTAMP)`, lee `database/migrations/*.sql` en orden alfabético, aplica solo las no registradas, registra cada una y muestra en español qué aplicó; exporta `runMigrations(databaseName)` para reutilizarla en las pruebas y se ejecuta sola cuando se llama desde la línea de comandos
- [X] T014 Crear `database/seeds/001_admin_inicial.js` que exporte `seed(connection)`: lee `ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_PASSWORD`; falla con mensaje en español si faltan o si la contraseña no cumple "8-72 caracteres, al menos una letra y un número"; si ya existe un usuario con `rol = 'administrador'` no hace nada; si no, inserta el administrador con correo en minúsculas y `password` = `bcrypt.hash(password, 10)` (FR-016)
- [X] T015 Crear `database/scripts/seed.js` que ejecute en orden todos los archivos de `database/seeds/` llamando a su `seed(connection)` e informe el resultado en español
- [X] T016 Crear `database/scripts/reset.js` que se niegue a ejecutarse si `NODE_ENV === 'production'`, borre y recree la base configurada y llame a `runMigrations`
- [X] T017 Crear `database/README.md` en español: requisitos, cómo configurar `database/.env`, comandos `db:migrate`, `db:seed`, `db:reset`, regla de agregar cambios solo con nuevas migraciones numeradas (`003_...sql`) y prohibición de subir archivos físicos de datos de MySQL

### Backend: núcleo

- [X] T018 [P] Crear `backend/src/config/env.js` que cargue `backend/.env` con `dotenv`, valide al arrancar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `JWT_SECRET` (mínimo 32 caracteres), `JWT_EXPIRES_IN`, `CORS_ORIGIN`, termine el proceso con un mensaje claro en español si falta alguna y exporte un objeto `env` congelado; si `NODE_ENV === 'test'` usa `DB_NAME_TEST` como base
- [X] T019 Crear `backend/src/config/db.js` que exporte un `pool` de `mysql2/promise` (`connectionLimit: 10`, `charset: 'utf8mb4'`, `dateStrings: false`) y una función `withTransaction(callback)` que obtenga una conexión, haga `beginTransaction`, `commit` o `rollback` y la libere (depende de T018)
- [X] T020 [P] Crear `backend/src/utils/AppError.js` con la clase `AppError(status, code, message, details)` y fábricas `validationError`, `unauthenticated`, `invalidCredentials`, `forbidden`, `notFound`, `conflict` con los códigos de [contracts/api.md](./contracts/api.md)
- [X] T021 [P] Crear `backend/src/utils/roles.js` con las constantes `ROLES = { ADMIN: 'administrador', RECEPTIONIST: 'recepcionista', TRAINER: 'entrenador', CLIENT: 'cliente' }`, `ALL_ROLES` y `STAFF_ROLES`
- [X] T022 [P] Crear `backend/src/utils/response.js` con `sendData(res, data, status = 200)` y `sendList(res, data, { page, limit, total })`
- [X] T023 [P] Crear `backend/src/middlewares/errorHandler.js`: si el error es `AppError` responde su estado y `{ error: { code, message, details } }`; si es JSON mal formado responde 400 `VALIDATION_ERROR`; cualquier otro error se registra completo con `console.error` y responde 500 `INTERNAL_ERROR` con "Ocurrió un error inesperado. Intenta de nuevo más tarde." sin trazas ni SQL (FR-027)
- [X] T024 [P] Crear `backend/src/middlewares/notFound.js` que responda 404 `NOT_FOUND` con "La ruta solicitada no existe."
- [X] T025 [P] Crear `backend/src/middlewares/validate.js` que lea `validationResult` de `express-validator` y, si hay errores, lance `validationError` con `message: "Revisa los datos marcados."` y `details: [{ field, message }]`
- [X] T026 [P] Crear `backend/src/validators/common.js` con reglas reutilizables: `emailField` (trim, minúsculas, formato válido, máximo 120), `passwordField` ("8-72 caracteres, al menos una letra y un número"), `idParam` (entero positivo), `statusField` (`activo`/`inactivo`) y `paginationQuery` (`page` ≥ 1, `limit` 1-100, valores por defecto 1 y 20), todas con mensajes en español
- [X] T027 Crear `backend/src/models/user.model.js` con `findById(id)` y `findByEmail(correo)`; `findByEmail` incluye `password`, `findById` no (depende de T019)
- [X] T028 Crear `backend/src/middlewares/authenticate.js`: exige `Authorization: Bearer <token>`, lo verifica con `jsonwebtoken` y `env.JWT_SECRET`, vuelve a leer el usuario con `findById(sub)`, rechaza con 401 `UNAUTHENTICATED` ("Tu sesión no es válida o expiró. Inicia sesión de nuevo.") si falta, es inválido, expiró, el usuario no existe o `estado = 'inactivo'`, y guarda en `req.user` `{ id_usuario, nombre, correo, rol, estado, id_cliente }` leídos de la base (research R-04) (depende de T027)
- [X] T029 [P] Crear `backend/src/middlewares/authorize.js` que exporte `authorize(...roles)` y responda 403 `FORBIDDEN` ("No tienes permiso para realizar esta acción.") si `req.user.rol` no está en la lista (FR-006)
- [X] T030 Crear `backend/src/routes/index.js` con el router `/api`, la ruta `GET /health` → `{ data: { status: 'ok' } }` y el montaje (vacío por ahora) de `/auth`, `/users` y `/clients`
- [X] T031 Crear `backend/src/app.js` que exporte la app de Express con `helmet()`, `cors({ origin: env.CORS_ORIGIN })`, `express.json({ limit: '100kb' })`, el router de `/api`, `notFound` y `errorHandler` en ese orden; sin `listen` para poder probarla con `supertest`
- [X] T032 Crear `backend/src/server.js` que importe `app` y `env`, haga `app.listen(env.PORT)` y muestre en español la URL donde escucha

### Backend: infraestructura de pruebas

- [X] T033 Crear `backend/tests/helpers/setup-env.js` que asigne `process.env.NODE_ENV = 'test'` antes de cualquier importación (se carga con `--import`)
- [X] T034 Crear `backend/tests/helpers/db.js` con `resetTestDatabase()` (borra y recrea `DB_NAME_TEST` aplicando las migraciones mediante `runMigrations` importada de `../../../database/scripts/migrate.js`), `createUser({ nombre, correo, password, rol, estado, id_cliente })` que guarde el hash bcrypt, `createClient(datos)` y `closePool()`
- [X] T035 Crear `backend/tests/helpers/auth.js` con `loginAs(app, correo, password)` que devuelva el token y `tokenFor(usuario)` que firme un JWT de prueba con `env.JWT_SECRET`
- [X] T036 [P] Crear `backend/tests/health.test.js` con la prueba `responde_ok_en_health` y `ruta_inexistente_responde_404_sin_detalles_internos`

### Frontend: esqueleto

- [X] T037 [P] Crear `frontend/src/styles/global.css` con variables CSS (colores, espaciado, tipografía), estilos de formularios, botones, tablas, insignias de estado (`activo`/`inactivo`) y mensajes de éxito/error con contraste suficiente (principio XI)
- [X] T038 Crear `frontend/src/api/client.js` con `apiRequest(path, { method, body, token })` sobre `fetch` y `import.meta.env.VITE_API_URL`: envía JSON y `Authorization: Bearer`, devuelve `data`/`meta`, convierte las respuestas de error en un `ApiError` con `status`, `code`, `message` y `details`, y ante fallo de red lanza "No se pudo conectar con el servidor."
- [X] T039 [P] Crear `frontend/src/components/Message.jsx` (mensaje de éxito o error accesible con `role="status"`/`role="alert"`) y `frontend/src/components/ConfirmDialog.jsx` (diálogo de confirmación con botones "Confirmar" y "Cancelar")
- [X] T040 [P] Crear `frontend/src/pages/NotFound.jsx` con el texto "Página no encontrada" y enlace al inicio
- [X] T041 Crear `frontend/src/main.jsx` (monta `<App />` dentro de `BrowserRouter` e importa `global.css`) y `frontend/src/App.jsx` con la ruta `*` → `NotFound`

**Punto de control**: `npm run db:migrate` y `npm run db:seed` funcionan en `database/`, `npm test` pasa en `backend/` con `health.test.js` y el frontend arranca con `npm run dev`.

---

## Fase 3: Historia de usuario 1 — Inicio de sesión y acceso según el rol (Prioridad: P1) 🎯 MVP

**Objetivo**: cualquier usuario activo inicia sesión con correo y contraseña, ve solo el menú de su
rol y las funciones protegidas exigen una sesión válida.

**Prueba independiente**: con el administrador sembrado, iniciar sesión y ver su menú; una solicitud
sin token a una ruta protegida responde 401.

### Pruebas de la historia 1

- [X] T042 [P] [US1] Escribir `backend/tests/auth.test.js` con: `inicia_sesion_con_credenciales_validas_y_devuelve_token_y_usuario_sin_password`, `rechaza_contrasena_incorrecta_con_mensaje_generico`, `rechaza_correo_inexistente_con_el_mismo_mensaje_generico`, `rechaza_usuario_inactivo_con_contrasena_correcta`, `acepta_correo_con_mayusculas_y_espacios`, `rechaza_login_sin_correo_o_password_con_400`, `auth_me_devuelve_el_usuario_autenticado`, `auth_me_sin_token_responde_401`, `token_expirado_o_alterado_responde_401`, `usuario_desactivado_despues_de_iniciar_sesion_recibe_401`, `password_guardada_empieza_con_prefijo_bcrypt`
- [X] T043 [P] [US1] Escribir `frontend/src/tests/Login.test.jsx` (muestra error de campos vacíos, muestra el mensaje del servidor ante credenciales inválidas, redirige a `/` tras iniciar sesión) y `frontend/src/tests/ProtectedRoute.test.jsx` (sin sesión redirige a `/login`; con rol no permitido muestra "No tienes permiso para ver esta página")

### Implementación de la historia 1

- [X] T044 [P] [US1] Crear `backend/src/validators/auth.validator.js` con `loginRules`: `correo` obligatorio con `emailField` y `password` obligatorio (sin validar formato, para no revelar la política)
- [X] T045 [US1] Crear `backend/src/services/auth.service.js` con `login(correo, password)`: busca con `findByEmail`; si no existe o `bcrypt.compare` falla lanza `invalidCredentials` con "Correo o contraseña incorrectos."; si la contraseña es correcta y `estado = 'inactivo'` lanza `invalidCredentials` con "Tu cuenta está desactivada. Contacta al administrador."; firma el JWT HS256 con `{ sub: id_usuario, rol }` y `expiresIn: env.JWT_EXPIRES_IN`; devuelve `{ token, expiresIn, user }` sin `password` (FR-001 a FR-004, FR-007)
- [X] T046 [US1] Crear `backend/src/controllers/auth.controller.js` con `login` (llama al servicio y responde 200) y `me` (responde `req.user`)
- [X] T047 [US1] Crear `backend/src/routes/auth.routes.js` con `POST /login` (`loginRules`, `validate`, `login`) y `GET /me` (`authenticate`, `me`) y montarlo en `/auth` dentro de `backend/src/routes/index.js`
- [X] T048 [P] [US1] Crear `frontend/src/api/auth.js` con `login(correo, password)` y `getMe(token)`
- [X] T049 [US1] Crear `frontend/src/context/AuthContext.jsx` con `AuthProvider` y `useAuth()`: guarda el token en `sessionStorage` (clave `gym_token`), al cargar recupera la sesión con `getMe`, expone `user`, `token`, `login`, `logout` y `loading`, y ante cualquier `ApiError` 401 borra el token y vuelve a `/login` (research R-04)
- [X] T050 [P] [US1] Crear `frontend/src/components/ProtectedRoute.jsx` que reciba `roles` opcionales: sin sesión redirige a `/login`; con rol no incluido muestra "No tienes permiso para ver esta página"
- [X] T051 [P] [US1] Crear `frontend/src/components/Layout.jsx` con encabezado (nombre y rol del usuario, botón "Cerrar sesión") y menú por rol: administrador → Inicio, Usuarios, Clientes; recepcionista → Inicio, Clientes; entrenador → Inicio, Clientes; cliente → Inicio, Mi información; sin enlaces de membresías, pagos ni reconocimiento facial (FR-004, FR-033)
- [X] T052 [US1] Crear `frontend/src/pages/Login.jsx` con formulario de correo y contraseña en español, validación de campos vacíos, botón deshabilitado mientras envía, mensaje de error del servidor y redirección a `/` tras iniciar sesión; si ya hay sesión redirige a `/`
- [X] T053 [P] [US1] Crear `frontend/src/pages/Home.jsx` con saludo "Hola, {nombre}", el rol actual y accesos directos a las secciones permitidas
- [X] T054 [US1] Actualizar `frontend/src/main.jsx` para envolver la app en `AuthProvider` y `frontend/src/App.jsx` con `/login` pública y `/` protegida dentro de `Layout`

**Punto de control**: las pruebas de T042 y T043 pasan; los cuatro roles pueden iniciar sesión (los que no sean administrador se crean con los helpers de prueba o con la historia 2).

---

## Fase 4: Historia de usuario 2 — Gestión de usuarios y asignación de roles (Prioridad: P1)

**Objetivo**: el administrador registra, consulta, modifica, activa y desactiva usuarios y les
asigna uno de los cuatro roles; nadie más puede hacerlo.

**Prueba independiente**: el administrador crea un recepcionista, este inicia sesión y solo ve sus
funciones; el administrador lo desactiva y ya no puede entrar.

### Pruebas de la historia 2

- [X] T055 [P] [US2] Escribir `backend/tests/users.test.js` con: `administrador_crea_usuario_recepcionista_activo`, `rechaza_correo_duplicado_aunque_cambien_mayusculas_con_409`, `rechaza_password_que_no_cumple_la_politica_con_400`, `rechaza_rol_inexistente_con_400`, `rol_cliente_exige_id_cliente_existente_sin_otra_cuenta_y_con_correo`, `rol_no_cliente_con_id_cliente_responde_400`, `lista_usuarios_paginados_sin_password_y_filtra_por_rol_estado_y_busqueda`, `cambiar_rol_aplica_los_nuevos_permisos_en_la_siguiente_solicitud`, `desactivar_usuario_impide_su_inicio_de_sesion_y_conserva_el_registro`, `no_permite_desactivar_ni_quitar_el_rol_al_ultimo_administrador_activo`, `administrador_no_puede_desactivarse_a_si_mismo`, `recepcionista_entrenador_y_cliente_reciben_403_en_todos_los_endpoints_de_usuarios`

### Implementación de la historia 2

- [X] T056 [US2] Ampliar `backend/src/models/user.model.js` con `list({ search, rol, estado, limit, offset })` (búsqueda `LIKE` parametrizada en `nombre` y `correo`, orden por `nombre`) y `count(filtros)`, `create(datos)`, `update(id, campos)` (solo columnas permitidas: `nombre`, `correo`, `password`, `rol`, `id_cliente`, `estado`), `findByClientId(id_cliente)` y `lockActiveAdmins(connection)` con `SELECT id_usuario FROM usuarios WHERE rol = 'administrador' AND estado = 'activo' FOR UPDATE`; ninguna función de listado devuelve `password`
- [X] T057 [P] [US2] Crear `backend/src/models/client.model.js` con `findById(id)` (todas las columnas de `clientes`); la historia 3 lo amplía
- [X] T058 [P] [US2] Crear `backend/src/validators/users.validator.js` con `createUserRules` (`nombre` 1-120 con trim; `correo` con `emailField`, obligatorio salvo para rol cliente; `password` con `passwordField`; `rol` dentro de `ALL_ROLES`; `id_cliente` entero positivo obligatorio solo si `rol = 'cliente'` y prohibido en otro caso), `updateUserRules` (los mismos campos opcionales), `statusRules` y `listUsersRules` (`search`, `rol`, `estado`, paginación)
- [X] T059 [US2] Crear `backend/src/services/users.service.js` con `listUsers`, `getUser` (404 si no existe), `createUser` (correo duplicado → 409 "Ya existe un usuario con ese correo."; para rol cliente: cliente inexistente → 404, cliente con cuenta → 409 "Este cliente ya tiene una cuenta.", cliente sin correo → 409 "El cliente necesita un correo registrado para tener cuenta.", y el correo del usuario se toma del cliente; hash con `bcrypt.hash(password, 10)`), `updateUser` (mismas reglas; si el nuevo rol no es cliente pone `id_cliente` en nulo) y `changeUserStatus`; los cambios de rol y de estado se hacen dentro de `withTransaction` con `lockActiveAdmins` y lanzan 409 "Debe existir al menos un administrador activo." si dejarían cero administradores activos, y 409 "No puedes desactivar tu propia cuenta." si el administrador intenta desactivarse (FR-009 a FR-015, research R-09)
- [X] T060 [US2] Crear `backend/src/controllers/users.controller.js` con `list`, `getById`, `create` (201), `update` y `changeStatus`, usando `sendData`/`sendList`
- [X] T061 [US2] Crear `backend/src/routes/users.routes.js` con `authenticate` y `authorize(ROLES.ADMIN)` en todo el router: `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `PATCH /:id/status`, y montarlo en `/users` en `backend/src/routes/index.js`
- [X] T062 [P] [US2] Crear `frontend/src/api/users.js` con `listUsers(params)`, `getUser(id)`, `createUser(datos)`, `updateUser(id, datos)` y `changeUserStatus(id, estado)`
- [X] T063 [US2] Crear `frontend/src/pages/Users.jsx`: tabla con nombre, correo, rol y estado (insignia), búsqueda, filtros por rol y estado, paginación, botón "Nuevo usuario", enlace a editar y botón "Desactivar"/"Activar" que abre `ConfirmDialog` antes de llamar a la API y muestra `Message` con el resultado (FR-026, FR-028)
- [X] T064 [US2] Crear `frontend/src/pages/UserForm.jsx` para `/users/new` y `/users/:id`: campos nombre, correo, contraseña (obligatoria al crear, opcional al editar con el texto "Déjala vacía para no cambiarla"), rol; si el rol es cliente oculta el correo y muestra un selector de clientes sin cuenta (por búsqueda); muestra los errores por campo devueltos en `details`
- [X] T065 [US2] Agregar a `frontend/src/App.jsx` las rutas `/users`, `/users/new` y `/users/:id` dentro de `ProtectedRoute roles={['administrador']}`

**Punto de control**: las pruebas de T055 pasan y el recorrido de los pasos 3, 4, 8, 13 y 14 de [quickstart.md](./quickstart.md) funciona.

---

## Fase 5: Historia de usuario 3 — Registro y modificación de clientes (Prioridad: P2)

**Objetivo**: el administrador y el recepcionista registran clientes, corrigen sus datos y los
activan o desactivan sin borrarlos.

**Prueba independiente**: un recepcionista registra un cliente válido, modifica su teléfono y el
cambio se conserva.

### Pruebas de la historia 3

- [X] T066 [P] [US3] Escribir `backend/tests/clients-write.test.js` con: `recepcionista_registra_cliente_con_fecha_y_estado_activo`, `administrador_registra_cliente_sin_correo_ni_direccion`, `rechaza_cliente_sin_nombre_apellido_o_telefono_indicando_los_campos`, `rechaza_telefono_con_formato_invalido`, `rechaza_correo_de_cliente_duplicado_con_409`, `recorta_espacios_y_guarda_correo_en_minusculas`, `modifica_datos_del_cliente`, `ignora_o_rechaza_cambios_a_fecha_registro_y_estado_en_patch`, `cambia_estado_a_inactivo_sin_borrar_el_registro`, `registrar_cliente_no_crea_cuenta_de_usuario`, `entrenador_y_cliente_reciben_403_al_registrar_modificar_o_cambiar_estado`
- [X] T067 [P] [US3] Escribir `frontend/src/tests/ClientForm.test.jsx` (marca los campos obligatorios vacíos, muestra los errores por campo de `details`, muestra mensaje de éxito tras guardar)

### Implementación de la historia 3

- [X] T068 [US3] Ampliar `backend/src/models/client.model.js` con `create(datos)`, `update(id, campos)` (solo `nombre`, `apellido`, `correo`, `telefono`, `direccion`), `updateStatus(id, estado)` y `findByEmail(correo)`
- [X] T069 [P] [US3] Crear `backend/src/validators/clients.validator.js` con `createClientRules` (`nombre` y `apellido` obligatorios "1-80 caracteres tras recortar espacios"; `telefono` obligatorio "10-15 dígitos; se permiten espacios, guiones y `+` inicial"; `correo` opcional con `emailField`; `direccion` opcional "hasta 200 caracteres"; rechaza `fecha_registro`, `estado` e `id_cliente` en el cuerpo), `updateClientRules` (mismos campos, todos opcionales) y `statusRules`
- [X] T070 [US3] Crear `backend/src/services/clients.service.js` con `createClient` (409 "Ya existe un cliente con ese correo." si el correo se repite), `updateClient` (404 si no existe; misma regla de correo excluyendo al propio cliente) y `changeClientStatus` (FR-017 a FR-021); nunca crea usuarios (FR-013)
- [X] T071 [US3] Crear `backend/src/controllers/clients.controller.js` con `create` (201), `update` y `changeStatus`
- [X] T072 [US3] Crear `backend/src/routes/clients.routes.js` con `authenticate` en todo el router y `authorize(ROLES.ADMIN, ROLES.RECEPTIONIST)` en `POST /`, `PATCH /:id` y `PATCH /:id/status`, y montarlo en `/clients` en `backend/src/routes/index.js`
- [X] T073 [P] [US3] Crear `frontend/src/api/clients.js` con `createClient(datos)`, `updateClient(id, datos)` y `changeClientStatus(id, estado)`
- [X] T074 [US3] Crear `frontend/src/pages/ClientForm.jsx` para `/clients/new` y `/clients/:id/edit`: campos nombre, apellido, teléfono, correo (opcional) y dirección (opcional), validación inmediata de obligatorios y formato, errores por campo del servidor, mensaje de éxito y regreso al detalle o al listado
- [X] T075 [US3] Agregar a `frontend/src/App.jsx` las rutas `/clients/new` y `/clients/:id/edit` dentro de `ProtectedRoute roles={['administrador','recepcionista']}`

**Punto de control**: las pruebas de T066 y T067 pasan y los pasos 5, 6 y 7 de [quickstart.md](./quickstart.md) funcionan.

---

## Fase 6: Historia de usuario 4 — Consulta de clientes por el personal (Prioridad: P2)

**Objetivo**: administrador, recepcionista y entrenador consultan y buscan clientes; el entrenador
solo recibe la información básica.

**Prueba independiente**: con varios clientes, un recepcionista busca por nombre y un entrenador
consulta el mismo cliente viendo solo nombre, apellido y estado.

### Pruebas de la historia 4

- [X] T076 [P] [US4] Escribir `backend/tests/clients-read.test.js` con: `recepcionista_lista_clientes_con_todos_los_campos_ordenados_por_apellido_y_nombre`, `busca_por_nombre_apellido_o_correo_parcial`, `filtra_por_estado`, `busqueda_sin_resultados_devuelve_lista_vacia_con_200`, `pagina_resultados_con_limit_maximo_100`, `entrenador_recibe_solo_id_nombre_apellido_y_estado_en_listado_y_detalle`, `detalle_de_cliente_inexistente_responde_404`, `usuario_cliente_recibe_403_en_listado_y_detalle`

### Implementación de la historia 4

- [X] T077 [US4] Ampliar `backend/src/models/client.model.js` con `list({ search, estado, limit, offset })` (búsqueda `LIKE` parametrizada en `nombre`, `apellido` y `correo`, orden `apellido, nombre`) y `count(filtros)`
- [X] T078 [US4] Ampliar `backend/src/services/clients.service.js` con `listClients(filtros, rol)` y `getClient(id, rol)` (404 si no existe) que apliquen la proyección por rol: para `entrenador` solo `id_cliente`, `nombre`, `apellido`, `estado`; para administrador y recepcionista todos los campos (FR-022, FR-023, research R-10)
- [X] T079 [US4] Agregar `listClientsRules` (`search` hasta 120 caracteres, `estado`, paginación) a `backend/src/validators/clients.validator.js`, las acciones `list` y `getById` a `backend/src/controllers/clients.controller.js` y las rutas `GET /` y `GET /:id` con `authorize(ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.TRAINER)` en `backend/src/routes/clients.routes.js`
- [X] T080 [P] [US4] Agregar `listClients(params)` y `getClient(id)` a `frontend/src/api/clients.js`
- [X] T081 [US4] Crear `frontend/src/pages/Clients.jsx`: caja de búsqueda, filtro por estado, paginación, tabla que muestra solo las columnas que llegan de la API, mensaje "No se encontraron clientes con esa búsqueda." si no hay resultados y, solo para administrador y recepcionista, botón "Nuevo cliente"
- [X] T082 [US4] Crear `frontend/src/pages/ClientDetail.jsx` para `/clients/:id`: muestra los campos recibidos, insignia de estado y, solo para administrador y recepcionista, botones "Editar" y "Desactivar"/"Activar" con `ConfirmDialog` y `Message`
- [X] T083 [US4] Agregar a `frontend/src/App.jsx` las rutas `/clients` y `/clients/:id` dentro de `ProtectedRoute roles={['administrador','recepcionista','entrenador']}`, declaradas después de `/clients/new` para que no la capture `:id`

**Punto de control**: las pruebas de T076 pasan y los pasos 9 y 15 de [quickstart.md](./quickstart.md) funcionan.

---

## Fase 7: Historia de usuario 5 — Consulta de información propia del cliente (Prioridad: P3)

**Objetivo**: un usuario con rol cliente ve solo sus propios datos y no puede consultar a nadie más.

**Prueba independiente**: un cliente vinculado inicia sesión y ve su perfil; con su token,
`GET /api/clients/<otro id>` responde 403.

### Pruebas de la historia 5

- [X] T084 [P] [US5] Escribir `backend/tests/profile.test.js` con: `cliente_consulta_su_perfil_con_membresia_y_pagos_en_null`, `el_perfil_usa_el_id_cliente_del_token_e_ignora_parametros_enviados`, `cliente_recibe_403_al_consultar_otro_cliente_por_id`, `personal_recibe_403_en_clients_me`, `cliente_vinculado_a_cliente_inactivo_puede_consultar_su_perfil`
- [X] T085 [P] [US5] Escribir `frontend/src/tests/Profile.test.jsx` (muestra los datos del cliente y el texto "Disponible próximamente" para membresía y pagos)

### Implementación de la historia 5

- [X] T086 [US5] Agregar `getOwnProfile(user)` a `backend/src/services/clients.service.js`: usa siempre `user.id_cliente` del usuario autenticado y devuelve `{ cliente, membresia: null, pagos: null }` (FR-024, RN-14)
- [X] T087 [US5] Agregar la acción `me` a `backend/src/controllers/clients.controller.js` y la ruta `GET /me` con `authorize(ROLES.CLIENT)` en `backend/src/routes/clients.routes.js`, declarada **antes** de `GET /:id`
- [X] T088 [P] [US5] Agregar `getMyProfile()` a `frontend/src/api/clients.js`
- [X] T089 [US5] Crear `frontend/src/pages/Profile.jsx` con "Mi información" (nombre, apellido, correo, teléfono, dirección, fecha de registro con formato local en español y estado) y las secciones "Membresía" y "Pagos" con el texto "Disponible próximamente", sin datos ficticios
- [X] T090 [US5] Agregar a `frontend/src/App.jsx` la ruta `/profile` dentro de `ProtectedRoute roles={['cliente']}`

**Punto de control**: las pruebas de T084 y T085 pasan y los pasos 10, 11 y 12 de [quickstart.md](./quickstart.md) funcionan.

---

## Fase 8: Historia de usuario 6 — Base de datos preparada para el Sprint 2 (Prioridad: P3)

**Objetivo**: las tablas de tipos de membresía, membresías y pagos existen con sus relaciones, sin
ninguna función operativa.

**Prueba independiente**: reconstruir la base desde cero y comprobar que las cinco tablas existen y
que la base rechaza referencias a clientes inexistentes.

### Pruebas de la historia 6

- [X] T091 [P] [US6] Escribir `backend/tests/database.test.js` con: `existen_las_cinco_tablas_del_sprint_con_innodb_y_utf8mb4` (consulta `information_schema.TABLES`), `rechaza_membresia_con_cliente_inexistente`, `rechaza_membresia_con_tipo_inexistente`, `rechaza_pago_con_cliente_inexistente`, `rechaza_fecha_fin_anterior_a_fecha_inicio`, `rechaza_monto_cero_o_negativo`, `no_permite_borrar_un_cliente_con_membresias`, `aplicar_migraciones_dos_veces_no_falla`, `no_existen_tablas_rostros_accesos_ni_auditoria`

### Implementación de la historia 6

- [X] T092 [US6] Crear `database/migrations/002_create_membresias_pagos.sql` con `InnoDB`, `utf8mb4` y `utf8mb4_unicode_ci`, exactamente como [data-model.md](./data-model.md): `tipos_membresia` (`id_tipo_membresia` PK, `nombre VARCHAR(80) NOT NULL UNIQUE`, `descripcion VARCHAR(255) NULL`, `duracion_dias SMALLINT UNSIGNED NOT NULL CHECK (duracion_dias > 0)`, `precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0)`, `estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'`); `membresias` (`id_membresia` PK, `id_cliente` FK → `clientes`, `id_tipo_membresia` FK → `tipos_membresia`, `fecha_inicio DATE NOT NULL`, `fecha_fin DATE NOT NULL`, `CHECK (fecha_fin >= fecha_inicio)`, `estado ENUM('activa','vencida','suspendida','cancelada') NOT NULL DEFAULT 'activa'`, `creado_en`, `INDEX (id_cliente, estado)`); `pagos` (`id_pago` PK, `id_cliente` FK → `clientes` NOT NULL, `id_membresia` FK → `membresias` NULL, `monto DECIMAL(10,2) NOT NULL CHECK (monto > 0)`, `fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`, `metodo_pago VARCHAR(30) NOT NULL`, `estado ENUM('pagado','pendiente','cancelado') NOT NULL DEFAULT 'pagado'`, `creado_en`, `INDEX (id_cliente, fecha_pago)`); todas las FK con `ON DELETE RESTRICT ON UPDATE RESTRICT`
- [X] T093 [US6] Agregar a `database/README.md` la descripción de las tablas de la migración 002, aclarando que son solo estructura para el Sprint 2 y que `metodo_pago` y `pagos.estado` son provisionales
- [X] T094 [US6] Verificar que no existen modelos, servicios, rutas ni pantallas de membresías, pagos o reconocimiento facial en `backend/src/` y `frontend/src/`, y que ningún `package.json` incluye librerías de reconocimiento facial (FR-033, FR-034)

**Punto de control**: las pruebas de T091 pasan y `npm run db:reset` + `npm run db:seed` reconstruyen todo en menos de 5 minutos (SC-007).

---

## Fase 9: Pulido y aspectos transversales

**Propósito**: verificaciones que afectan a varias historias.

- [X] T095 [P] Buscar `require(` y `module.exports` en `backend/` y `database/` (excluyendo `node_modules/`) y corregir cualquier aparición; confirmar `"type": "module"` en `backend/package.json` y `database/package.json`
- [X] T096 [P] Revisar que todos los textos de `frontend/src/` y los mensajes de `backend/src/` estén en español con tildes correctas y que identificadores y rutas estén en inglés
- [X] T097 [P] Revisar accesibilidad básica en `frontend/src/pages/` y `frontend/src/components/`: cada campo con `<label>`, foco visible, navegación con teclado en `ConfirmDialog` y mensajes anunciados con `role`
- [X] T098 Revisar seguridad: ninguna respuesta incluye `password`, los errores 500 no exponen detalles, `.env` está ignorado por Git, no hay secretos en ningún `.env.example` ni en el código, y todas las consultas de `backend/src/models/` son parametrizadas
- [X] T099 Cargar 500 clientes de prueba con un script temporal fuera del repositorio o en `database/scripts/` marcado solo para desarrollo, y medir la búsqueda en `frontend/src/pages/Clients.jsx` (objetivo SC-003: menos de 10 s)
- [X] T100 Actualizar `README.md` con los comandos finales de instalación, migración, arranque y pruebas de los tres paquetes
- [X] T101 Ejecutar el recorrido completo de [quickstart.md](./quickstart.md) (secciones 1 a 6) y anotar en `specs/001-base-usuarios-clientes/quickstart.md` cualquier ajuste necesario

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Configuración (Fase 1)**: sin dependencias.
- **Fundamentos (Fase 2)**: depende de la Fase 1 y **bloquea todas las historias**.
- **Historia 1 (Fase 3)**: depende de la Fase 2. Es el MVP: sin inicio de sesión no se puede probar
  ninguna otra pantalla.
- **Historias 2 a 5 (Fases 4 a 7)**: dependen de la Fase 2 y, para usar la interfaz, del inicio de
  sesión de la historia 1 (`AuthContext`, `Layout`, `ProtectedRoute`). Sus pruebas de backend se
  pueden escribir sin la historia 1 usando `tokenFor` de los helpers.
- **Historia 6 (Fase 8)**: depende solo de la Fase 2; se puede hacer en paralelo con cualquier otra.
- **Pulido (Fase 9)**: depende de todas las historias.

### Dependencias entre historias

- **US1 (P1)**: ninguna.
- **US2 (P1)**: el alta de usuarios con rol cliente necesita clientes registrados; se puede probar
  con `createClient` de los helpers y no depende de la interfaz de la historia 3.
- **US3 (P2)**: ninguna además de la Fase 2 (amplía `client.model.js`, creado en T057; si la
  historia 2 no se ha hecho, crear primero T057).
- **US4 (P2)**: comparte `client.model.js`, `clients.service.js`, `clients.controller.js` y
  `clients.routes.js` con la historia 3, así que va después de ella para evitar conflictos en los
  mismos archivos.
- **US5 (P3)**: comparte los mismos archivos de clientes; va después de la historia 4. Necesita
  usuarios con rol cliente (historia 2 o helpers de prueba).
- **US6 (P3)**: independiente.

### Dentro de cada historia

- Escribir primero las pruebas y comprobar que fallan.
- Modelos → validadores → servicios → controladores → rutas → API del frontend → páginas → rutas
  del frontend.
- `frontend/src/App.jsx` lo tocan varias historias: integrar sus cambios de forma secuencial.

### Oportunidades de paralelismo

- Fase 1: T002 a T010 en paralelo después de T001.
- Fase 2: T018, T020 a T026 en paralelo; T036, T037, T039 y T040 en paralelo.
- Las pruebas marcadas [P] de cada historia se pueden escribir a la vez que los validadores y la API
  del frontend de la misma historia.
- La historia 6 completa puede avanzar en paralelo con las historias 1 a 5.
- Las historias 2 y 3 pueden avanzar en paralelo si T057 se hace primero.

---

## Ejemplo de paralelismo: historia de usuario 1

```text
# Pruebas de la historia 1 a la vez:
Tarea: "T042 Escribir backend/tests/auth.test.js"
Tarea: "T043 Escribir frontend/src/tests/Login.test.jsx y ProtectedRoute.test.jsx"

# Piezas independientes de la historia 1 a la vez:
Tarea: "T044 Crear backend/src/validators/auth.validator.js"
Tarea: "T048 Crear frontend/src/api/auth.js"
Tarea: "T050 Crear frontend/src/components/ProtectedRoute.jsx"
Tarea: "T051 Crear frontend/src/components/Layout.jsx"
```

## Ejemplo de paralelismo: historia de usuario 2

```text
Tarea: "T055 Escribir backend/tests/users.test.js"
Tarea: "T057 Crear backend/src/models/client.model.js"
Tarea: "T058 Crear backend/src/validators/users.validator.js"
Tarea: "T062 Crear frontend/src/api/users.js"
```

---

## Estrategia de implementación

### Primero el MVP (solo la historia 1)

1. Completar la Fase 1 (configuración).
2. Completar la Fase 2 (fundamentos; bloquea todo).
3. Completar la Fase 3 (historia 1).
4. **Detenerse y validar**: el administrador sembrado inicia sesión, ve su menú y las rutas
   protegidas rechazan solicitudes sin token.

### Entrega incremental

1. Configuración + fundamentos → base lista.
2. Historia 1 → inicio de sesión (MVP).
3. Historia 2 → el administrador crea al personal y a las cuentas de clientes.
4. Historia 3 → registro y modificación de clientes.
5. Historia 4 → consulta y búsqueda de clientes.
6. Historia 5 → perfil del cliente.
7. Historia 6 → estructura del Sprint 2 (se puede intercalar en cualquier momento).
8. Pulido y recorrido completo de `quickstart.md`.

### Estrategia para un equipo

1. Todo el equipo completa juntos las Fases 1 y 2.
2. Después:
   - Persona A: historia 1 y luego historia 2.
   - Persona B: historia 3, luego 4 y luego 5 (comparten archivos de clientes).
   - Persona C: historia 6 y luego la Fase 9.

---

## Notas

- Antes de empezar: enmendar la constitución para que diga MySQL en lugar de MongoDB (ver
  "Seguimiento de complejidad" en [plan.md](./plan.md)) y crear el repositorio Git con la rama
  `feature/base-usuarios-clientes`.
- Commits pequeños con Conventional Commits en español, por ejemplo
  `feat(auth): agregar inicio de sesión con jwt`.
- Detenerse en cada punto de control para validar la historia por separado.
- Evitar: tareas vagas, cambios simultáneos en el mismo archivo y dependencias entre historias que
  rompan su independencia.
