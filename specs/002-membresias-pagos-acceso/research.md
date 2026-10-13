# Investigación (Fase 0): Sprint 2 — Membresías, pagos, reconocimiento facial y control de acceso

Cada decisión resuelve una incógnita del contexto técnico de [plan.md](./plan.md) o una decisión
pendiente de `docs/sprint-2.md` (sección 9). Las decisiones del Sprint 1 (R-01 a R-13 de
`specs/001-base-usuarios-clientes/research.md`) siguen vigentes y no se repiten.

## R-01. Librería de reconocimiento facial

- **Decisión**: `@vladmandic/human` en su versión exacta `3.3.6` (licencia MIT), ejecutada en el
  navegador dentro de `frontend/`. Se usan solo sus módulos de detección de rostro, descriptor
  facial (*embedding*), antisuplantación (*antispoof*) y verificación de presencia (*liveness*);
  el resto de módulos (cuerpo, manos, gestos, emociones, edad y género) se desactivan en la
  configuración.
- **Justificación**:
  - Es JavaScript puro, funciona con React y Vite sin compilación nativa y no necesita servicios
    externos: todo el procesamiento ocurre en el equipo del gimnasio (`docs/sprint-2.md`, sección
    1; constitución, principio III).
  - Genera un descriptor numérico por rostro, que es lo único que se necesita guardar (FR-029).
  - Incluye modelos gratuitos de antisuplantación y de presencia, que la especificación permite
    usar sin costo adicional (Supuestos) y que mitigan el caso límite de fotografías.
  - Licencia MIT, compatible con un proyecto académico. Fue la opción con publicación más reciente
    en npm al consultarse el 2026-10-12 (agosto de 2025).
- **Alternativas consideradas**:
  - `@vladmandic/face-api` 1.7.15 (MIT): API más sencilla, pero su última publicación es de
    febrero de 2025 y no incluye antisuplantación. Queda como alternativa de reemplazo si `human`
    diera problemas, porque comparte autor y formato de modelos.
  - `face-api.js` original: sin mantenimiento desde 2020 y con dependencias de TensorFlow.js
    antiguas.
  - MediaPipe Face Landmarker: detecta puntos del rostro, pero no genera descriptores para
    identificar personas.
  - Servicios en la nube (AWS Rekognition, Azure Face): requieren servicios externos no aprobados
    (`docs/sprint-2.md`, sección 8), envían datos biométricos fuera del gimnasio y tienen costo.
  - Librerías de Python (`face_recognition`, InsightFace): no son JavaScript y agregarían un
    cuarto componente al stack.
- **Riesgo**: el tamaño de los modelos (varios MB) alarga la primera carga de la estación; se
  mitiga cargándolos una sola vez al abrir la pantalla y sirviéndolos desde el propio frontend
  (R-03).

## R-02. Dónde se procesa el rostro y dónde se compara

- **Decisión**: el **navegador** captura el video, detecta el rostro, valida la calidad y genera el
  descriptor. El **backend** recibe solo el descriptor y hace la comparación contra los
  descriptores guardados, decide el acceso y registra el intento. Los descriptores guardados nunca
  salen del backend.
- **Justificación**:
  - Cumple FR-030 y "los datos biométricos no deberán exponerse": si la comparación se hiciera en
    el navegador, habría que enviarle los descriptores de todos los clientes.
  - Los modelos de TensorFlow.js aprovechan la tarjeta gráfica del navegador; ejecutarlos en
    Node.js obligaría a instalar `@tensorflow/tfjs-node`, con compilación nativa problemática en
    Windows.
  - La decisión de acceso (FR-033, FR-034) queda en el backend, como exige la constitución
    (principio II: la lógica de negocio no va en la interfaz).
  - Ninguna imagen viaja por la red ni se guarda (FR-029).
- **Alternativas consideradas**: todo en el navegador (expone los descriptores y deja la decisión
  en el cliente); todo en el backend enviando imágenes (transmite fotografías del rostro y
  necesita TensorFlow nativo en Node.js).
- **Riesgo aceptado**: un usuario con sesión de administrador o recepcionista podría enviar un
  descriptor fabricado. Para que coincida tendría que conocer el descriptor de un cliente, y estos
  nunca se exponen. Los intentos quedan registrados con el usuario de la estación.

## R-03. Distribución de los modelos

- **Decisión**: un script `frontend/scripts/copy-face-models.js` (ES Modules) copia los modelos
  necesarios desde `node_modules/@vladmandic/human/models/` a `frontend/public/models/`, y se ejecuta
  con `postinstall`. `frontend/public/models/` se agrega a `.gitignore`. La ruta se configura con
  `VITE_FACE_MODELS_URL` (por omisión `/models`).
- **Justificación**: los modelos se sirven desde el mismo origen, funcionan sin internet y no se
  suben al repositorio varios MB de archivos binarios.
- **Alternativas consideradas**: cargarlos desde un CDN (depende de internet y de un tercero);
  subirlos al repositorio (aumenta el tamaño del repositorio sin necesidad).

## R-04. Cámara y captura

- **Decisión**: captura con la API estándar del navegador (`getUserMedia`) a 640×480 desde una
  cámara web USB o integrada de al menos 720p. La aplicación se usa desde `http://localhost`, que
  el navegador considera un contexto seguro y permite usar la cámara. La cámara de pruebas es la
  webcam del equipo de recepción; su modelo se anota en la validación del quickstart.
- **Justificación**: no requiere dependencias adicionales y funciona en Chrome, Edge y Firefox de
  escritorio.
- **Condiciones mínimas de captura** (verificadas en el navegador antes de generar el
  descriptor): exactamente un rostro; confianza de detección ≥ 0.8; rostro de al menos 120 px de
  ancho; puntuación de antisuplantación ≥ 0.5 y de presencia ≥ 0.5. Si no se cumplen, la pantalla
  indica la causa ("acércate", "solo una persona", "mejora la iluminación"). Los valores son
  configurables y se ajustan en la calibración (R-06).

## R-05. Almacenamiento y protección de los descriptores

- **Decisión**:
  - Registro facial: 3 capturas válidas del mismo cliente; se guardan las 3 muestras.
  - Cada registro se guarda en `rostros.descriptor_cifrado` cifrado con **AES-256-GCM** (módulo
    nativo `node:crypto`), con un vector de inicialización aleatorio por registro y su etiqueta de
    autenticación. La llave de 32 bytes vive en la variable de entorno `FACE_DATA_KEY` (base64) y
    nunca en la base de datos ni en el repositorio.
  - Las respuestas de la API, los registros de auditoría y los registros de error nunca incluyen
    descriptores (FR-030, FR-042). Los modelos de la capa de datos seleccionan columnas
    explícitas y solo el servicio de comparación lee `descriptor_cifrado`.
  - No se guardan imágenes, ni siquiera temporales: el video se procesa en memoria en el navegador
    (FR-029).
- **Justificación**: el cifrado en reposo protege los datos biométricos aunque se copie la base o
  un respaldo; AES-GCM además detecta alteraciones. Usa el módulo nativo de Node.js, sin
  dependencias nuevas.
- **Alternativas consideradas**: guardar el descriptor en texto plano (no cumple el principio V de
  la constitución); guardar un *hash* del descriptor (no sirve, porque la comparación necesita
  medir distancias); cifrado de la base completa (depende de la configuración de MySQL o MariaDB de
  cada equipo).
- **Rotación de la llave**: fuera de alcance del sprint; perder `FACE_DATA_KEY` obliga a volver a
  registrar los rostros. Esto se documenta en `backend/.env.example` y en el `README.md`.

## R-06. Comparación, umbral y ambigüedad

- **Decisión**:
  - Medida: similitud coseno entre descriptores normalizados (0 a 1), calculada en
    `backend/src/utils/faceMatching.js` con aritmética simple, sin librerías.
  - Para cada cliente se toma la mejor similitud entre sus 3 muestras.
  - **Coincidencia válida** cuando la mejor similitud es ≥ `FACE_MATCH_THRESHOLD` (valor inicial
    `0.60`) **y** supera a la del segundo cliente más parecido por al menos `FACE_MATCH_MARGIN`
    (valor inicial `0.05`). Si no se cumple el margen, el caso es ambiguo y se trata como rostro
    no identificado (escenario 5 de la historia 5).
  - Al registrar un rostro, si alguna muestra alcanza el umbral con el registro activo de otro
    cliente, se rechaza (FR-027).
  - **Calibración**: el quickstart incluye una prueba con al menos 10 clientes y 20 personas no
    registradas; los valores se ajustan para cumplir SC-003 (≥ 95 % de aciertos) y SC-004 (0
    falsos aceptados), priorizando no aceptar a desconocidos.
- **Justificación**: la similitud coseno es la medida habitual para estos descriptores; el margen
  evita confundir a dos clientes parecidos. Los umbrales configurables reconocen que el resultado
  depende de la cámara y la iluminación (constitución, principio VIII).
- **Rendimiento**: con 1 000 clientes y 3 muestras de 1 024 valores, descifrar y comparar toma del
  orden de decenas de milisegundos, muy por debajo de los 3 s de SC-002. No se usa caché en memoria
  para no mantener datos biométricos descifrados más tiempo del necesario.

## R-07. Funcionamiento de la estación de acceso

- **Decisión** (aclaración confirmada el 2026-10-12): pantalla `/access/station` en el frontend,
  abierta con la sesión de un administrador o recepcionista. Funciona en ciclo continuo:
  1. Detecta un rostro que cumpla las condiciones de R-04 y lo mantiene durante ~1 s.
  2. Envía el descriptor a `POST /api/access/attempts`.
  3. Muestra el resultado unos 4 s (verde con el nombre si fue autorizado; rojo con "Acude a
     recepción" si fue rechazado, sin datos personales ni financieros, FR-036).
  4. No vuelve a evaluar hasta que no haya ningún rostro frente a la cámara (FR-038).
  - Si durante 5 s hay un rostro presente pero ninguna captura cumple las condiciones de calidad,
    la estación registra un intento sin descriptor, que el backend rechaza con
    `rostro_no_identificado` (caso límite de iluminación).
  - El backend además ignora un segundo intento del mismo cliente con el mismo resultado dentro de
    `ACCESS_DEDUP_SECONDS` (por omisión 10 s), devolviendo el resultado ya registrado.
- **Intentos fallidos**: no hay bloqueo por número de intentos, porque la estación no identifica a
  quien falla. Cada fallo se registra y el mensaje invita a acudir a recepción.
- **Alternativas consideradas**: terminal autónoma con credencial propia (agrega un rol fuera de
  los 4 fijos); captura activada manualmente por cliente (más lenta).

## R-08. Estado efectivo de la membresía y zona horaria

- **Decisión**: la columna `membresias.estado` guarda solo los estados que decide una persona
  (`activa`, `suspendida`, `cancelada`). El estado mostrado (**estado efectivo**) se calcula al
  consultar: `vencida` si `fecha_fin` es anterior a hoy y el estado no es `cancelada`; si no, el
  estado guardado. La membresía es **vigente** si su estado efectivo es `activa` y
  `fecha_inicio ≤ hoy ≤ fecha_fin` (FR-012). El valor `vencida` se mantiene en el `ENUM` por
  compatibilidad, pero el sistema no lo escribe.
- "Hoy" se calcula en el backend con la zona horaria `APP_TIMEZONE` (por omisión
  `America/Mexico_City`) y se pasa como parámetro a las consultas, para no depender de la zona
  horaria del servidor MySQL.
- **Justificación**: no requiere tareas programadas para vencer membresías y siempre es exacto
  (FR-008, caso límite "la fecha de fin coincide con hoy").
- **Alternativas consideradas**: tarea programada diaria que marque vencidas (puede fallar si el
  equipo estaba apagado); usar `CURDATE()` de MySQL (depende de la configuración del servidor).

## R-09. Concurrencia en asignaciones y pagos

- **Decisión**: las operaciones que verifican y escriben en una misma transacción bloquean la fila
  padre con `SELECT ... FOR UPDATE`: la fila del cliente al asignar o renovar (evita periodos
  traslapados, FR-007) y la fila de la membresía al registrar un pago (evita saldos negativos,
  caso límite de pagos simultáneos). La auditoría se escribe en la misma transacción.
- **Justificación**: InnoDB garantiza el bloqueo; es la solución más simple sin dependencias.
- **Alternativas consideradas**: restricciones únicas en la base (no expresan "sin traslape" ni
  "saldo ≥ 0"); bloqueos en memoria en Node.js (no protegen si hay más de un proceso).

## R-10. Pagos parciales, montos y métodos de pago

- **Decisión** (aclaración confirmada el 2026-10-12): se permiten abonos. Cada membresía guarda
  su `monto` copiado del precio del tipo al asignarse (FR-004, FR-006). El saldo es
  `monto − SUM(pagos con estado 'pagado')`, calculado en SQL al consultar, sin columna guardada.
  Los métodos son un `ENUM('efectivo','tarjeta','transferencia')`. Los montos se manejan como
  `DECIMAL(10,2)` en la base y como texto decimal en la API, para evitar errores de redondeo de
  JavaScript al comparar contra el saldo.
- Un tipo con precio 0 (por ejemplo, cortesía) genera una membresía sin saldo y no admite pagos.
- **Alternativas consideradas**: columna `saldo` actualizada en cada pago (riesgo de quedar
  desincronizada); un solo pago por membresía (descartada por la aclaración).

## R-11. Auditoría

- **Decisión**: tabla `auditoria` con usuario, acción, entidad, identificador del registro,
  descripción breve sin datos sensibles y fecha. Un servicio `audit.service.js` recibe la conexión
  de la transacción activa para que la auditoría y la acción se confirmen o se reviertan juntas.
  Acciones del sprint: las de FR-042. La consulta de la auditoría en pantalla se deja para un
  sprint posterior (Supuestos de la especificación).
- **Alternativas consideradas**: *triggers* de MySQL (no conocen al usuario de la aplicación);
  registro en archivos (no se consulta fácilmente).

## R-12. Diseño de la API para el sprint

- **Decisión**: se mantienen las convenciones del Sprint 1 (`{ data }`, `{ data, meta }`, `{ error }`,
  códigos HTTP, `authenticate` + `authorize` por ruta). Nuevos recursos: `/membership-types`,
  `/clients/:id/memberships`, `/memberships`, `/payments`, `/debts`, `/clients/:id/face` y
  `/access`. El límite del cuerpo JSON se mantiene en 100 kb: un intento de acceso pesa unos 20 kb
  y un registro facial con 3 muestras unos 60 kb. Detalle en [contracts/api.md](./contracts/api.md).
- **Proyección por rol**: los servicios devuelven campos distintos según el rol (como el Sprint 1
  hace con el entrenador): el entrenador nunca recibe montos ni saldos, y nadie recibe
  descriptores.

## R-13. Estrategia de pruebas

- **Backend** (`node:test` + `supertest`, base `gym_access_test`): tipos de membresía,
  asignación, renovación encadenada, estados efectivos según la fecha, pagos y abonos, anulación,
  adeudos, permisos de los cuatro roles, registro facial y decisión de acceso. Las pruebas
  faciales usan **descriptores sintéticos** (vectores generados en la prueba), así que no
  necesitan cámara. Pruebas unitarias de `faceMatching.js` (umbral, margen, ambigüedad) y del
  cifrado (ida y vuelta, alteración detectada). Una prueba recorre todas las respuestas de la API
  facial y de accesos y verifica que ninguna contiene descriptores (SC-007).
- **Frontend** (`vitest` + Testing Library): formularios de tipo de membresía, asignación y pago,
  y la pantalla de la estación con el módulo facial simulado (*mock*), comprobando los mensajes de
  autorizado y rechazado.
- **Manual**: la identificación real con cámara, la calibración del umbral (SC-003, SC-004) y el
  tiempo de respuesta (SC-002) se validan con [quickstart.md](./quickstart.md).

## R-14. Configuración nueva

| Variable | Carpeta | Uso |
|----------|---------|-----|
| `FACE_DATA_KEY` | `backend/` | Llave AES-256 en base64 (32 bytes). Obligatoria; el servidor no arranca sin ella. |
| `FACE_MATCH_THRESHOLD` | `backend/` | Similitud mínima (por omisión `0.60`). |
| `FACE_MATCH_MARGIN` | `backend/` | Margen frente al segundo candidato (por omisión `0.05`). |
| `ACCESS_DEDUP_SECONDS` | `backend/` | Ventana anti-duplicados (por omisión `10`). |
| `APP_TIMEZONE` | `backend/` | Zona horaria del gimnasio (por omisión `America/Mexico_City`). |
| `VITE_FACE_MODELS_URL` | `frontend/` | Ruta de los modelos (por omisión `/models`). |

`.env.example` documenta cada variable sin valores secretos, con el comando para generar la llave:
`node -e "import('node:crypto').then((c) => console.log(c.randomBytes(32).toString('base64')))"`.

## Decisiones pendientes que no bloquean el plan

- ~~Confirmación del equipo de las tres aclaraciones provisionales~~: confirmadas tal cual el
  2026-10-12 (T002).
- Aprobación del equipo de R-01 (librería `@vladmandic/human` 3.3.6), R-02 (procesamiento en el
  navegador y comparación en el backend) y R-05 (descriptores cifrados con AES-256-GCM, sin
  imágenes): **aprobadas el 2026-10-12** (T003).
- Valores finales de `FACE_MATCH_THRESHOLD` y `FACE_MATCH_MARGIN`, que salen de la calibración.
- Modelo exacto de la cámara de pruebas.
