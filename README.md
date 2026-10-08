# Sistema de Gestión para Gimnasio

Proyecto académico: plataforma web para administrar clientes, membresías, pagos y accesos de un
gimnasio mediante reconocimiento facial. Este repositorio contiene el **Sprint 1**: base del
sistema, autenticación, usuarios, roles y clientes.

## Requisitos

- Node.js 22 LTS o superior y npm.
- MySQL Server 8.0+ o MariaDB 10.4+ en ejecución local (por ejemplo, el de XAMPP).

## Estructura

```text
frontend/   Aplicación web con React (Vite)
backend/    API REST con Node.js y Express (ES Modules)
database/   Migraciones SQL, semillas y scripts (ES Modules)
docs/       Documentación del proyecto
specs/      Especificaciones generadas con Spec Kit
```

## Puesta en marcha

1. Inicia MySQL o MariaDB (en XAMPP: panel de control → MySQL → Start).
2. En cada carpeta (`database/`, `backend/`, `frontend/`) copia `.env.example` como `.env`,
   complétalo y ejecuta `npm install`.
3. Crea la base y el administrador inicial:

   ```powershell
   cd database
   npm run db:migrate
   npm run db:seed
   ```

4. Arranca la API y la interfaz en dos terminales:

   ```powershell
   cd backend;  npm run dev    # http://localhost:3000/api
   cd frontend; npm run dev    # http://localhost:5173
   ```

5. Entra en <http://localhost:5173> con el correo y la contraseña de `ADMIN_CORREO` y
   `ADMIN_PASSWORD`.

## Pruebas

```powershell
cd backend;  npm test     # usa la base gym_access_test (se recrea en cada ejecución)
cd frontend; npm test
```

## Roles

| Rol | Puede |
|-----|-------|
| Administrador | Gestionar usuarios y roles; registrar, consultar y modificar clientes |
| Recepcionista | Registrar, consultar y modificar clientes |
| Entrenador | Consultar nombre, apellido y estado de los clientes |
| Cliente | Consultar su propia información |

La guía de validación completa está en
[`specs/001-base-usuarios-clientes/quickstart.md`](specs/001-base-usuarios-clientes/quickstart.md).
