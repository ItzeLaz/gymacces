# Sistema de Gestión para Gimnasio

Proyecto académico: plataforma web para administrar clientes, membresías, pagos y accesos de un
gimnasio mediante reconocimiento facial. Este repositorio contiene:

- **Sprint 1**: base del sistema, autenticación, usuarios, roles y clientes.
- **Sprint 2**: tipos de membresía, asignación y renovación de membresías, pagos y adeudos,
  registro facial, estación de acceso con reconocimiento facial y consulta de accesos.

## Requisitos

- Node.js 22 LTS o superior y npm.
- MySQL Server 8.0+ o MariaDB 10.4+ en ejecución local (por ejemplo, el de XAMPP).
- Para el reconocimiento facial: una cámara web (720p o más) y Chrome o Edge de escritorio con la
  aceleración por hardware activada.

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
   complétalo y ejecuta `npm install`. En `frontend/`, la instalación copia además los modelos de
   reconocimiento facial a `frontend/public/models/` (carpeta excluida del repositorio).
3. Crea la base, aplica las migraciones y carga el administrador inicial:

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

## Reconocimiento facial

### Llave de cifrado (`FACE_DATA_KEY`)

Los descriptores faciales se guardan cifrados con AES-256-GCM; la llave vive solo en
`backend/.env`. El backend no arranca sin ella. Genera una llave nueva con:

```powershell
node -e "import('node:crypto').then((c) => console.log(c.randomBytes(32).toString('base64')))"
```

Resguárdala fuera del repositorio. **Si se pierde o se cambia, los rostros ya registrados dejan de
servir** y hay que volver a registrarlos.

### Variables del backend

| Variable | Valor inicial | Uso |
|----------|---------------|-----|
| `FACE_DATA_KEY` | — (obligatoria) | Llave AES-256 en base64 (32 bytes) |
| `FACE_MATCH_THRESHOLD` | `0.60` | Similitud mínima para aceptar una coincidencia |
| `FACE_MATCH_MARGIN` | `0.05` | Ventaja mínima frente al segundo cliente más parecido |
| `ACCESS_DEDUP_SECONDS` | `10` | Segundos en los que no se repite el registro de un mismo intento |
| `APP_TIMEZONE` | `America/Mexico_City` | Zona horaria para decidir la vigencia de las membresías |

En `frontend/.env`, `VITE_FACE_MODELS_URL` indica de dónde se cargan los modelos (por omisión
`/models`).

### Cámara y estación de acceso

- La aplicación debe abrirse desde `http://localhost`: el navegador solo permite usar la cámara en
  un contexto seguro.
- La **estación de acceso** (`/access/station`) la abre un administrador o recepcionista con su
  sesión. Funciona de forma continua: identifica al cliente, valida su membresía, muestra el
  resultado y registra cada intento.
- El sistema solo guarda descriptores numéricos cifrados, nunca fotografías, y los usa únicamente
  para el control de acceso.

### Calibración

Los valores de `FACE_MATCH_THRESHOLD` y `FACE_MATCH_MARGIN` dependen de la cámara y la
iluminación. Ajústalos con la sección 5 de
[`specs/002-membresias-pagos-acceso/quickstart.md`](specs/002-membresias-pagos-acceso/quickstart.md)
(al menos 10 clientes registrados y 20 personas no registradas), priorizando que ninguna persona no
registrada obtenga acceso. Anota aquí los valores finales y el modelo de cámara usado.

## Pruebas

```powershell
cd backend;  npm test     # usa la base gym_access_test (se recrea en cada ejecución)
cd frontend; npm test
```

Las pruebas faciales del backend usan descriptores sintéticos y no necesitan cámara.

## Roles

| Rol | Puede |
|-----|-------|
| Administrador | Todo lo anterior, más usuarios y roles, tipos de membresía, cambios de estado de membresías, historial general de pagos, adeudos y anulación de pagos |
| Recepcionista | Clientes, asignar y renovar membresías, registrar pagos, registrar información facial, abrir la estación de acceso y consultar accesos |
| Entrenador | Consultar clientes, estado de sus membresías y accesos, sin información financiera |
| Cliente | Consultar su información, su membresía, sus pagos, su adeudo y sus accesos |

Guías de validación:
[Sprint 1](specs/001-base-usuarios-clientes/quickstart.md) ·
[Sprint 2](specs/002-membresias-pagos-acceso/quickstart.md).
