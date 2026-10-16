# Guía rápida de validación: Reservas de clases grupales

**Feature**: [spec.md](./spec.md) | **Contrato**: [contracts/api.md](./contracts/api.md) |
**Modelo**: [data-model.md](./data-model.md)

Esta guía comprueba de extremo a extremo que la feature funciona. No contiene código de
implementación.

## 1. Requisitos previos

- MySQL 8 o MariaDB 10.4+ en ejecución (por ejemplo, XAMPP).
- `backend/.env`, `database/.env` y `frontend/.env` configurados a partir de sus `.env.example`,
  con `APP_TIMEZONE=America/Mexico_City` (o la zona del gimnasio).
- Dependencias instaladas: `npm install` en `backend/`, `frontend/` y `database/`. Esta feature no
  agrega dependencias.

## 2. Preparar la base de datos

```bash
cd database
npm run db:migrate          # aplica 006_create_clases_reservas.sql
npm run db:seed             # administrador inicial
npm run db:check-encoding   # confirma utf8mb4 en las tablas nuevas
```

Comprobaciones:
- `SHOW TABLES` incluye `clases` y `reservas`.
- `SHOW CREATE TABLE reservas` muestra `ENGINE=InnoDB`, `utf8mb4_unicode_ci` y el índice único
  `uq_reservas_sesion_cliente_activa`.

## 3. Pruebas automáticas (deben pasar antes de cada commit de implementación)

```bash
cd backend && npm test     # node:test + supertest; incluye la prueba de concurrencia
cd frontend && npm test    # Vitest + Testing Library
```

Resultado esperado: todas las pruebas en verde, incluidas las nuevas:

| Archivo | Qué comprueba |
|---------|---------------|
| `backend/tests/sessions.unit.test.js` | Empalme semiabierto, estado de la sesión, ventana `[hoy, hoy + 7]`, fechas de sesión por día ISO |
| `backend/tests/classes.test.js` | US1, criterios 1 a 12 y 14 |
| `backend/tests/reservations.test.js` | US2, criterios 1 a 8, y US3, criterios 1 a 4 |
| `backend/tests/reservations-concurrency.test.js` | US2, criterio 9, y SC-001: 20 solicitudes simultáneas por el último lugar → exactamente 1 aceptada |
| `backend/tests/sessions.test.js` | US4, criterios 1 a 5 (lista, "Quedan X de Y lugares", canceladas excluidas, horario y "Llena") |
| `backend/tests/attendance.test.js` | US5, criterios 1 a 6 (con la hora fijada mediante `mock.timers`) |
| `backend/tests/classes-permissions.test.js` | US1-13, US2-10, US4-6, FR-011 y SC-006 para los cuatro roles |
| `backend/tests/database.test.js` | Las tablas nuevas existen con InnoDB y utf8mb4 |
| `frontend/src/tests/ClassForm.test.jsx`, `Schedule.test.jsx`, `SessionDetail.test.jsx` | Formularios, mensajes y etiquetas en español |

## 4. Recorrido manual

Inicia `backend` (`npm run dev`) y `frontend` (`npm run dev`). Prepara antes:

- Un usuario **entrenador** activo ("Carla Ruiz") y un usuario **recepcionista**, creados en
  Usuarios.
- Tres clientes activos (A, B y C) con membresía activa que cubra la próxima semana y un cliente D
  con la membresía vencida.

### Escenario 1 — Registrar el horario (US1)

1. Como administrador, abre **Clases → Nueva clase** y registra "Spinning", Carla Ruiz, el día de
   mañana, 07:00, 45 minutos, cupo **2**.
   → Mensaje "Clase registrada." y la clase aparece en **Horario** con "Quedan 2 de 2 lugares".
2. Intenta registrar otra clase de Carla el mismo día a las 07:30.
   → "El instructor ya tiene una clase en ese horario."
3. Intenta registrar una clase con duración 10 o cupo 0.
   → Mensajes de duración y de cupo del contrato.
4. Inicia sesión como recepcionista y comprueba que no aparece la opción **Clases** y que
   `POST /api/classes` responde 403.

### Escenario 2 — Reservar y llenar la clase (US2, US4)

1. Como recepcionista, abre **Horario → Spinning (mañana)** y reserva para el cliente A.
   → "Quedan 1 de 2 lugares".
2. Reserva otra vez para A → "El cliente ya tiene una reserva en esta clase."
3. Reserva para B → "Quedan 0 de 2 lugares" y la sesión aparece como **Llena** en el horario.
4. Reserva para C → "Clase llena."
5. Reserva para D en otra clase con lugares → "El cliente no tiene una membresía vigente para la
   fecha de la clase."
6. Crea "Yoga" el mismo día a las 07:30 con otro entrenador y reserva para A.
   → "El cliente ya tiene una reserva en una clase que se empalma con este horario."

### Escenario 3 — Cancelar y cambiar el cupo (US3, US1)

1. Como administrador, intenta cambiar el cupo de Spinning a 1.
   → "El cupo no puede ser menor que las reservas existentes (2)."
2. Intenta desactivar Spinning → "No se puede desactivar una clase con reservas activas."
3. Como recepcionista, cancela la reserva de B (confirmando el diálogo).
   → "Quedan 1 de 2 lugares" y B ya no aparece en la lista.
4. Reserva para C → se acepta.

### Escenario 4 — Asistencia y reserva durante la clase (US5, US2-8)

Para no esperar a mañana, registra una clase de prueba para hoy que haya empezado hace 5 minutos
y dure 60 minutos (la sesión queda en curso):

1. En la sesión en curso, reserva para A → la reserva aparece con asistencia **Presente**.
2. Desmarca la asistencia de A → "Sin registrar". Márcala de nuevo → "Presente".
3. Intenta cancelar la reserva de A → "No se puede cancelar una reserva de una clase que ya
   empezó."
4. En la sesión de mañana, intenta marcar asistencia → "La asistencia solo se puede registrar a
   partir de la hora de inicio de la clase."
5. Al día siguiente, abre la sesión de prueba: las reservas sin asistencia aparecen como **No
   asistió** y marcar asistencia responde "La asistencia solo se puede registrar el mismo día de la
   clase."

### Escenario 5 — Auditoría

```sql
SELECT accion, entidad, id_registro, descripcion
FROM auditoria
WHERE accion LIKE 'clase.%' OR accion LIKE 'reserva.%'
ORDER BY id_auditoria;
```

→ Aparecen `clase.crear`, `reserva.registrar` y `reserva.cancelar` con el usuario que hizo cada
acción, sin datos sensibles.

## 5. Criterios de éxito

| SC | Cómo se comprueba |
|----|-------------------|
| SC-001 | `reservations-concurrency.test.js` |
| SC-002 | Escenario 2, paso 1: menos de 1 minuto desde que se abre el horario |
| SC-003 | El horario muestra los lugares de todas las sesiones sin abrir cada una (< 10 s) |
| SC-004 | Cada rechazo de los escenarios 2 y 3 muestra el mensaje exacto del contrato |
| SC-005 | Marcar 20 reservas en el detalle de la sesión (un clic por cliente) en menos de 2 minutos |
| SC-006 | `classes-permissions.test.js` y el escenario 1, paso 4 |

## 6. Resultados de validación

### T104 — Recorrido manual (2026-10-16)

- **Quién**: la autora de la rama, con sesión de administradora (y de entrenador para la captura 10).
- **Dónde**: base de desarrollo `gym_access`, con la migración 006 aplicada y los datos de prueba
  creados desde la aplicación (capturas `00a` a `00f`).
- **Evidencia**: capturas en `specs/004-reservas-clases/evidencias/capturas/`.
- **Resultado**: todo lo que se probó a mano pasó; ningún escenario falló.

#### Probado a mano

| Captura | Qué se comprobó | Criterio | Resultado |
|---------|-----------------|----------|-----------|
| `01-clase-registrada-US1.png` | Registrar una clase: "Clase registrada." | US1-1 | ✅ |
| `02-clase-debe-terminar-mismo-dia-US1.png` | Una clase que cruza la medianoche se rechaza | US1-14 | ✅ |
| `04-horario-lugares-US4.png` | Horario con "Quedan X de Y lugares" | US4-4 | ✅ |
| `05-reserva-registrada-US2.png` | Reservar un lugar para un cliente | US2-1 | ✅ |
| `06-funcional-llena-US4.png` | Sesión con la etiqueta "Llena" | US4-5 | ✅ |
| `06b-clase-llena-US2.png` | Reserva rechazada con "Clase llena." | US2-2 | ✅ |
| `07-membresia-no-vigente-US2.png` | Reserva rechazada por membresía no vigente | US2-3 | ✅ |
| `08a-confirmar-cancelacion-US3.png`, `08b-reserva-cancelada-US3.png` | Cancelar con confirmación y liberar el lugar | US3-1 | ✅ |
| `09-asistencia-presente-US5.png` | Marcar asistencia en una sesión en curso | US5-1 | ✅ |
| `10-menu-entrenador-sin-horario-FR011.png` | El menú del entrenador no muestra "Clases" ni "Horario" | FR-011 | ✅ |
| `12-menu-corregido.png` | Menú del administrador en dos líneas, sin tapar el contenido | Hallazgo | ✅ (captura pendiente de agregar a la carpeta) |

#### No probado a mano: cubierto solo por pruebas automáticas

| Escenario | Prueba automática |
|-----------|-------------------|
| Empalme del instructor (US1-5; escenario 1, paso 2) | `backend/tests/classes.test.js` → `rechaza_clase_si_el_instructor_tiene_otra_que_se_empalma`; `frontend/src/tests/ClassForm.test.jsx` → `muestra_el_mensaje_de_error_del_servidor` |
| Reducción de cupo por debajo de las reservas (US1-9; escenario 3, paso 1) | `backend/tests/classes.test.js` → `rechaza_reducir_cupo_por_debajo_de_las_reservas_existentes` |
| Desactivar una clase con reservas (US1-11; escenario 3, paso 2) | `backend/tests/classes.test.js` → `rechaza_desactivar_clase_con_reservas_activas` |
| Auditoría (FR-012; escenario 5) | `backend/tests/classes.test.js` → `registra_auditoria_al_crear_modificar_y_desactivar_clases`; `backend/tests/reservations.test.js` → `registra_auditoria_al_reservar` y `cancelar_reserva_de_sesion_pendiente_libera_el_lugar_y_la_conserva` (`reserva.cancelar`) |

Otros pasos de `quickstart.md` que tampoco tienen captura y quedan cubiertos por pruebas
automáticas:

- Reserva duplicada (US2-5): `rechaza_reserva_duplicada_del_mismo_cliente_en_la_sesion`.
- Empalme del cliente (US2-6): `rechaza_reserva_que_se_empalma_con_otra_del_cliente_el_mismo_dia`.
- Reserva durante la clase (US2-8): `reserva_en_sesion_en_curso_queda_con_asistencia_presente`.
- Cancelar una clase que ya empezó (US3-2): `rechaza_cancelar_reserva_de_clase_que_ya_empezo`.
- Desmarcar asistencia (US5-5): `desmarcar_asistencia_el_mismo_dia_regresa_a_sin_registrar`.
- Asistencia antes del inicio y después del día (US5-2, US5-3), y "No asistió" (US5-6):
  `backend/tests/attendance.test.js`.
- 403 de la recepcionista al registrar clases (escenario 1, paso 4):
  `backend/tests/classes-permissions.test.js`.

Las pruebas de US2 y US3 están en `backend/tests/reservations.test.js`.

#### Criterios de éxito medidos

| SC | Meta | Resultado |
|----|------|-----------|
| SC-001 | 20 reservas simultáneas por el último lugar: solo 1 aceptada | ✅ Automático (`reservations-concurrency.test.js`, estable en 3 de 3 ejecuciones adicionales) |
| SC-002 | Reservar en menos de 1 minuto | ✅ Unos 20 segundos |
| SC-003 | Ver los lugares de la semana en menos de 10 s | ✅ El horario carga en menos de 2 segundos |
| SC-004 | Cada rechazo muestra su mensaje exacto | ✅ Capturas 02, 06b y 07, más las pruebas automáticas de mensajes |
| SC-005 | Asistencia de 20 reservados en menos de 2 minutos | ⚠️ No se midió con 20 clientes por falta de datos; se comprobó que basta un clic por cliente (captura 09 y `marcar_asistencia_con_un_clic_por_cliente`) |
| SC-006 | Entrenadores y clientes rechazados | ✅ Automático (`classes-permissions.test.js`) y captura 10 |

#### Hallazgo

- **El menú del administrador ocultaba opciones** (captura `11-bug-menu-oculta-clases-horario.png`).
  Con 9 opciones, el menú se desplazaba en horizontal con la barra oculta y no se veían
  "Dashboard", "Horario" ni "Entrenamiento".
- **Por qué no lo detectaron las pruebas automáticas**: jsdom no calcula el diseño de la página.
- **Corrección**: commit `ebd1591`. El menú pasa a una segunda línea (`flex-wrap: wrap`) y
  `Layout.jsx` ajusta el margen superior a la altura real de la barra.
- **Pruebas de regresión**: `el_menu_pasa_a_otra_linea_en_lugar_de_ocultar_opciones` y
  `el_contenido_se_desplaza_segun_la_altura_real_del_menu`.
- **Verificación a mano**: correcta (captura 12).
