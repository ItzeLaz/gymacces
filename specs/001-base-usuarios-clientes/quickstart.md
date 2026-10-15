# Guía de validación (quickstart): Sprint 1

Esta guía demuestra de extremo a extremo que el Sprint 1 funciona (SC-008). No contiene código de
implementación; los detalles están en [data-model.md](./data-model.md) y
[contracts/api.md](./contracts/api.md).

## Requisitos previos

- Node.js 22 LTS o superior y npm (`node -v`).
- MySQL Server 8.0+ o MariaDB 10.4+ en ejecución local. Con XAMPP basta con iniciar MySQL desde
  el panel de control (o `C:\xampp\mysql_start.bat`); MySQL Workbench solo es el cliente gráfico.
- Un usuario de MySQL con permiso para crear las bases `gym_access` y `gym_access_test` (en XAMPP,
  `root` sin contraseña de forma predeterminada).
- Nota: si pruebas la API con `curl` desde Git Bash en Windows, los textos con tildes pueden
  enviarse con otra codificación; usa un archivo JSON en UTF-8 con `--data-binary @archivo.json`.
- Navegador de escritorio actual.

## 1. Configuración

1. Copiar `database/.env.example` → `database/.env`, `backend/.env.example` → `backend/.env` y
   `frontend/.env.example` → `frontend/.env`, y completar credenciales de MySQL, `JWT_SECRET`
   (mínimo 32 caracteres) y `ADMIN_CORREO` / `ADMIN_PASSWORD`.
2. Verificar que `git status` no muestra ningún archivo `.env` (deben estar en `.gitignore`).
3. Instalar dependencias en cada carpeta: `npm install` dentro de `database/`, `backend/` y
   `frontend/`.

## 2. Base de datos

```powershell
cd database
npm run db:migrate     # aplica 001 y 002
npm run db:seed        # crea el administrador inicial
```

**Resultado esperado**:
- Existen las tablas `clientes`, `usuarios`, `tipos_membresia`, `membresias`, `pagos` y
  `schema_migrations`, todas InnoDB y `utf8mb4`.
- Volver a ejecutar ambos comandos no duplica nada ni falla.
- `npm run db:reset` seguido de migrar y sembrar reconstruye todo en menos de 5 minutos (SC-007).
- En la tabla `usuarios`, la columna `password` del administrador empieza con `$2b$` (hash bcrypt,
  SC-006).

## 3. Arranque

```powershell
cd backend;  npm run dev   # API en http://localhost:3000
cd frontend; npm run dev   # interfaz en http://localhost:5173
```

`GET http://localhost:3000/api/health` responde `{ "data": { "status": "ok" } }`.

## 4. Pruebas automáticas

```powershell
cd backend;  npm test
cd frontend; npm test
```

**Resultado esperado**: todas las pruebas pasan, incluida la matriz de permisos de los cuatro
roles (SC-004) y el aislamiento del cliente (SC-005).

## 5. Recorrido manual (flujo de `docs/sprint-1.md`, sección 4)

| # | Acción | Resultado esperado | Requisitos |
|---|--------|--------------------|------------|
| 1 | Iniciar sesión con el administrador inicial | Entra en menos de 30 s y ve Usuarios y Clientes | FR-001, FR-004, SC-001 |
| 2 | Iniciar sesión con contraseña incorrecta | Mensaje genérico "Correo o contraseña incorrectos." | FR-002 |
| 3 | Crear un usuario recepcionista y uno entrenador | Se crean activos; mensaje de éxito | FR-010, FR-026 |
| 4 | Intentar crear otro usuario con el mismo correo en mayúsculas | Rechazado por correo duplicado | FR-011 |
| 5 | Iniciar sesión como recepcionista y registrar un cliente con correo | Se guarda en menos de 2 min con fecha y estado activo | FR-017, FR-018, SC-002 |
| 6 | Registrar un cliente sin teléfono | No se guarda; se marca el campo | FR-025 |
| 7 | Modificar el teléfono del cliente | Cambio guardado y visible | FR-020 |
| 8 | Como recepcionista, abrir `/users` o llamar `GET /api/users` con su token | Pantalla bloqueada; la API responde 403 | FR-006, FR-010 |
| 9 | Iniciar sesión como entrenador y abrir un cliente | Solo ve nombre, apellido y estado; la respuesta de la API tampoco trae correo ni teléfono | FR-023 |
| 10 | Como administrador, crear un usuario con rol cliente vinculado al cliente del paso 5 | Se crea; un segundo vínculo al mismo cliente es rechazado | FR-013 |
| 11 | Iniciar sesión como ese cliente y abrir "Mi información" | Ve sus datos y "Disponible próximamente" para membresía y pagos | FR-024 |
| 12 | Con el token del cliente, llamar `GET /api/clients/<otro id>` | 403 | FR-024, SC-005 |
| 13 | Como administrador, desactivar al recepcionista mientras tiene sesión abierta | Pide confirmación; la siguiente acción del recepcionista responde 401 y vuelve al inicio de sesión | FR-003, FR-028 |
| 14 | Intentar desactivar al único administrador | Rechazado con mensaje claro | FR-014 |
| 15 | Con 500 clientes cargados, buscar por apellido | Resultados en menos de 10 s | FR-022, SC-003 |
| 16 | Revisar el menú y las rutas de todos los roles | No hay pantallas de membresías, pagos ni reconocimiento facial | FR-033, FR-034 |
| 17 | Detener MySQL y hacer cualquier operación | Mensaje genérico sin detalles técnicos | FR-027 |

## 6. Revisión de restricciones

- En `backend/` y `database/` no aparece `require(` ni `module.exports`, y ambos `package.json`
  tienen `"type": "module"`.
- No existen carpetas `client/`, `server/` ni `dataBase/`.
- `backend/package.json` no incluye ninguna librería de reconocimiento facial.
- Todos los textos de la interfaz y los mensajes de error están en español.
