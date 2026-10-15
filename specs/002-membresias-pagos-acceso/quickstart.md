# Guía de validación (quickstart): Sprint 2

Esta guía demuestra de extremo a extremo que el Sprint 2 funciona (SC-011). No contiene código de
implementación; los detalles están en [data-model.md](./data-model.md),
[contracts/api.md](./contracts/api.md) y [research.md](./research.md).

## Requisitos previos

- Todo lo del quickstart del Sprint 1 (`specs/001-base-usuarios-clientes/quickstart.md`) funcionando:
  base migrada, administrador inicial, backend y frontend en marcha.
- Una cámara web de al menos 720p conectada al equipo de recepción, con buena iluminación frontal.
  Anota el modelo de la cámara usada (research R-04).
- Chrome o Edge de escritorio (aceleración por hardware activada, para que los modelos usen la
  tarjeta gráfica).
- Personas de prueba que acepten registrar su rostro **solo para la prueba** (consentimiento
  verbal), y al menos 20 capturas de personas no registradas para SC-004.

## 1. Configuración

1. Agregar a `backend/.env` las variables nuevas de research R-14. Generar `FACE_DATA_KEY` con:
   `node -e "import('node:crypto').then((c) => console.log(c.randomBytes(32).toString('base64')))"`.
2. Verificar que el backend **no arranca** si falta `FACE_DATA_KEY` o si no mide 32 bytes, y que
   muestra un mensaje en español.
3. `npm install` en `frontend/`: el `postinstall` copia los modelos a `frontend/public/models/`.
   Verificar que `git status` no muestra esa carpeta ni ningún `.env`.

## 2. Base de datos

```powershell
cd database
npm run db:migrate     # aplica 003 y 004 sobre la base del Sprint 1
```

**Resultado esperado**:
- Existen `rostros`, `accesos` y `auditoria`; `membresias` tiene `monto`, `motivo_estado`,
  `creado_por`, `actualizado_en`; `pagos.metodo_pago` es un `ENUM` de tres valores.
- `npm run db:reset` + migrar + sembrar reconstruye todo desde cero sin errores (FR-049).
- `001` y `002` no cambiaron (`git diff` vacío en esos archivos).

## 3. Pruebas automáticas

```powershell
cd backend;  npm test
cd frontend; npm test
```

**Resultado esperado**: todas las pruebas pasan, incluidas la matriz de permisos del Sprint 2 en los
cuatro roles (SC-009), la tabla de decisión de acceso (SC-005), el cálculo de saldos (SC-008) y la
prueba que recorre las respuestas buscando descriptores (SC-007).

## 4. Recorrido manual (flujo de `docs/sprint-2.md`, sección 4)

Usuarios: el administrador inicial y el recepcionista y el cliente del Sprint 1.

| # | Acción | Resultado esperado | Requisitos |
|---|--------|--------------------|------------|
| 1 | Admin crea los tipos "Mensual" (30 días, 450.00) y "Semanal" (7 días, 150.00) | Aparecen activos; un segundo "mensual" es rechazado | FR-001, FR-002 |
| 2 | Recepcionista intenta crear un tipo, o llama `POST /api/membership-types` | Pantalla sin opción; la API responde 403 | FR-001, SC-009 |
| 3 | Recepcionista asigna "Mensual" al cliente A con inicio hoy | Fin = hoy + 29 días; estado activa; monto 450.00; tiempo < 2 min junto con el paso 4 | FR-005, FR-006, SC-001 |
| 4 | Recepcionista registra un abono de 200.00 en efectivo | Saldo 250.00, estado de pago "parcial"; el pago muestra quién lo registró | FR-015, FR-017, FR-024 |
| 5 | Intenta pagar 300.00 | Rechazado: "El monto supera el saldo pendiente de 250.00." | FR-018 |
| 6 | Admin cambia el precio de "Mensual" a 500.00 | La membresía del cliente A conserva 450.00 | FR-004 |
| 7 | Intentar asignar otra membresía al cliente A | Rechazado; indica usar la renovación | FR-007 |
| 8 | Renovar la membresía del cliente A | Nueva membresía que inicia el día siguiente al fin de la actual; ambas en el historial | FR-010, FR-011 |
| 9 | Recepcionista abre `/clients/A/face`, confirma el consentimiento y toma 3 capturas | "Información facial registrada"; la ficha solo muestra "Registrada" y la fecha | FR-025, FR-030 |
| 10 | Intentar registrar el mismo rostro para el cliente B | Rechazado: "Este rostro ya está registrado para otro cliente." | FR-027 |
| 11 | Probar capturas con dos personas, sin rostro y a contraluz | Cada una se rechaza con una indicación para repetirla | FR-026 |
| 12 | Abrir `/access/station` como recepcionista; el cliente A se presenta | Verde, "¡Bienvenido, <nombre>!" en menos de 3 s | FR-032, FR-034, SC-002 |
| 13 | El cliente A permanece frente a la cámara 15 s | No se generan registros adicionales | FR-038 |
| 14 | Una persona no registrada se presenta | Rojo, "Acude a recepción", sin datos personales | FR-035, FR-036 |
| 15 | Admin suspende la membresía del cliente A (con motivo); el cliente A se presenta | Rechazado; motivo "Membresía suspendida" en la consulta | FR-009, FR-034 |
| 16 | Cliente C con membresía vencida (insertada directamente con SQL con fechas pasadas, porque la interfaz no permite fechas anteriores a hoy) | Rechazado: "Membresía vencida" | FR-034, SC-005 |
| 17 | Cliente D con rostro y sin membresía; cliente E con membresía cancelada; cliente F inactivo | Rechazados con "Sin membresía vigente", "Membresía cancelada" y "Cliente inactivo" | FR-035, SC-005 |
| 18 | Cliente G con membresía vigente y saldo pendiente | Autorizado; la estación no menciona el adeudo | FR-037 |
| 19 | Recepcionista abre `/access` y filtra "rechazados" de hoy | Ve todos los intentos de los pasos 12 a 18 con su motivo en < 10 s | FR-040, SC-006, SC-010 |
| 20 | Entrenador abre `/access` y la ficha de un cliente | Ve accesos y estado de membresía, sin montos, saldos ni similitud | FR-013, FR-040 |
| 21 | Admin abre `/payments` y `/debts` | Ve el abono del paso 4 y al cliente A con su adeudo; los totales coinciden con el cálculo manual | FR-020, FR-021, SC-008 |
| 22 | Admin anula el abono del paso 4 con motivo | Sigue en el historial como "cancelado"; el saldo vuelve a 450.00; no existe opción de borrar | FR-019, FR-046 |
| 23 | Cliente A inicia sesión y abre "Mi información" | Ve su membresía, sus pagos, su adeudo y sus accesos; nunca los de otro cliente | FR-014, FR-023, FR-040 |
| 24 | Admin desactiva la información facial del cliente A; el cliente A se presenta | "Rostro no identificado" | FR-028 |
| 25 | Desconectar la cámara con la estación abierta; detener el backend | Mensajes claros; ningún acceso autorizado | FR-041 |
| 26 | Revisar la tabla `auditoria` | Hay un registro por cada acción de los pasos 1–24 incluida en FR-042, sin descriptores | FR-042 |

## 5. Calibración del reconocimiento (SC-003, SC-004)

1. Registrar el rostro de al menos 10 clientes de prueba.
2. Cada cliente se presenta 2 veces en la estación; anotar los aciertos en el primer o segundo
   intento. Meta: ≥ 95 %.
3. Presentar al menos 20 personas no registradas. Meta: 0 autorizadas.
4. Revisar la columna `similitud` en `/access` (como administrador). Si hay falsos aceptados, subir
   `FACE_MATCH_THRESHOLD`; si hay muchos rechazos de clientes registrados, mejorar la iluminación
   antes de bajarlo. Anotar los valores finales en `backend/.env.example` y en el `README.md`.
5. Presentar una fotografía impresa y una foto en un celular del cliente A. Anotar el resultado;
   se espera rechazo por la verificación de presencia, aunque el sprint no lo garantiza (Supuestos
   de la especificación).

## 6. Revisión de seguridad y restricciones

- Con las herramientas de desarrollo del navegador, revisar las respuestas de `/clients/:id/face`,
  `/access`, `/access/attempts` y `/clients/me`: ninguna contiene arreglos de números
  (descriptores) (SC-007).
- En la base de datos, `rostros.descriptor_cifrado` no se puede leer como números; cambiar
  `FACE_DATA_KEY` hace que la identificación falle sin que el backend se caiga (lo registra como
  rostro no identificado y escribe un error genérico en la consola del servidor, sin datos
  biométricos).
- No existe ninguna carpeta ni archivo con imágenes de rostros en el proyecto ni en el servidor.
- En `backend/`, `database/` y `frontend/scripts/` no aparece `require(` ni `module.exports`.
- `@vladmandic/human` está en `frontend/package.json` con versión exacta y no está en
  `backend/package.json`.
- No existen carpetas `client/`, `server/` ni `dataBase/`.
- Todos los textos nuevos de la interfaz y los mensajes de error están en español.
