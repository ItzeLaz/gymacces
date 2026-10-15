# Especificación de feature: Sprint 3 — Dashboard administrativo

**Rama de feature**: `003-dashboard-administrativo`

**Creada**: 2026-10-12

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Usa la descripción de @docs/sprint-3.md" (insumo:
`docs/sprint-3.md`, con `docs/project-context.md`, `docs/sprint-1.md`, `docs/sprint-2.md` y la
constitución como referencias). Alcance reducido al dashboard administrativo por decisión del
equipo (ver "Clarifications").

## Clarifications

### Session 2026-10-12

- Q: ¿El equipo autoriza ampliar el MVP con entrenadores, rutinas, objetivos y progreso, o el Sprint
  3 se limita a lo que ya está aprobado? → A: El Sprint 3 se limita al dashboard administrativo
  (`docs/project-context.md`, sección 7.8), que ya forma parte del MVP. Entrenadores, asignación de
  clientes, rutinas, objetivos, progreso y consulta de carga de trabajo (US-S3-01 a US-S3-05 y
  US-S3-07 de `docs/sprint-3.md`) quedan como mejoras futuras y no se enmienda la constitución.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 — Resumen general del gimnasio (Prioridad: P1)

Como administrador, quiero ver un resumen de clientes, membresías, pagos, ingresos y accesos para
tomar decisiones operativas.

Corresponde a US-S3-06 de `docs/sprint-3.md` y a la sección 7.8 de `docs/project-context.md`.

**Por qué esta prioridad**: es el objetivo completo del sprint y se apoya solo en información que
existe desde los Sprints 1 y 2.

**Prueba independiente**: con datos de prueba conocidos (clientes, membresías, pagos y accesos), el
administrador abre el dashboard y cada indicador coincide con el conteo manual.

**Escenarios de aceptación**:

1. **Dado** un administrador con sesión iniciada, **Cuando** abre el dashboard, **Entonces** ve:
   clientes activos e inactivos; clientes con membresía vigente, vencida y por vencer (FR-003);
   número de pagos e ingresos del periodo; adeudo total; y accesos autorizados y rechazados del
   periodo.
2. **Dado** el dashboard abierto, **Cuando** el administrador revisa los accesos, **Entonces** ve
   los 10 accesos rechazados más recientes con fecha y hora, cliente (o "No identificado") y motivo.
3. **Dado** el dashboard abierto, **Cuando** el administrador revisa las membresías por vencer,
   **Entonces** ve la lista de clientes con membresía por vencer (FR-003), con la fecha de fin, para
   poder contactarlos; los clientes que ya renovaron no aparecen.
4. **Dado** un gimnasio sin datos todavía, **Cuando** el administrador abre el dashboard,
   **Entonces** todos los indicadores muestran cero y las listas indican que no hay registros, sin
   errores.

---

### Historia de usuario 2 — Indicadores por periodo y tendencia (Prioridad: P2)

Como administrador, quiero cambiar el periodo de los indicadores y ver su evolución día por día
para comparar el rendimiento del gimnasio en el tiempo.

Corresponde a US-S3-06 de `docs/sprint-3.md` ("rendimiento del gimnasio").

**Por qué esta prioridad**: amplía el resumen con comparación en el tiempo, pero el resumen del día
ya aporta valor por sí solo.

**Prueba independiente**: con pagos y accesos en fechas distintas, el administrador elige "últimos 7
días" y después un rango personalizado; los totales y las gráficas diarias coinciden con lo
registrado en cada periodo.

**Escenarios de aceptación**:

1. **Dado** el dashboard, **Cuando** el administrador elige hoy, últimos 7 días, mes en curso o un
   rango de fechas, **Entonces** los indicadores de pagos, ingresos y accesos se recalculan para ese
   periodo.
2. **Dado** un periodo elegido, **Cuando** se muestran las tendencias, **Entonces** el administrador
   ve, día por día, los ingresos y los accesos autorizados y rechazados del periodo, con el valor de
   cada día disponible en texto.
3. **Dado** un rango de fechas inválido (inicio posterior al fin o más de 366 días), **Cuando** el
   administrador lo aplica, **Entonces** el sistema lo rechaza con un mensaje claro y conserva el
   periodo anterior.
4. **Dado** un periodo sin pagos ni accesos, **Cuando** se consulta, **Entonces** los indicadores y
   las tendencias muestran cero.

---

### Historia de usuario 3 — Dashboard seguro según el rol (Prioridad: P1)

Como administrador, quiero que solo yo pueda ver el dashboard y que muestre únicamente información
resumida para proteger los datos financieros y personales de los clientes.

Corresponde a las reglas de `docs/sprint-3.md` (sección 6) sobre permisos del dashboard.

**Por qué esta prioridad**: el dashboard concentra información financiera; exponerla a otros roles
violaría la constitución (principios V y VI).

**Prueba independiente**: con los cuatro roles, se intenta abrir el dashboard desde la interfaz y
pidiendo sus datos directamente; solo el administrador lo consigue.

**Escenarios de aceptación**:

1. **Dado** un recepcionista, entrenador o cliente, **Cuando** intenta abrir el dashboard o pedir
   sus datos directamente, **Entonces** el sistema lo rechaza y la opción no aparece en su menú.
2. **Dado** el dashboard del administrador, **Cuando** se muestran los indicadores y las listas,
   **Entonces** no aparecen datos de contacto de los clientes, información facial, similitud del
   reconocimiento ni montos pagados por cada cliente.

---

### Casos límite

- Un pago anulado no cuenta como ingreso ni como pago del periodo.
- Una membresía cancelada no cuenta como vigente, vencida ni por vencer.
- Una membresía que termina hoy cuenta como vigente y como "por vencer"; mañana cuenta como vencida,
  salvo que el cliente ya tenga registrada la renovación.
- Un cliente cuya única membresía empieza en el futuro no cuenta como vigente, vencido ni por
  vencer.
- Un cliente con varias membresías vencidas cuenta una sola vez en "clientes con membresía vencida".
- Los accesos repetidos que el sistema ya deduplica (Sprint 2) no se cuentan dos veces.
- El cambio de día se calcula con la zona horaria del gimnasio, igual que la vigencia de las
  membresías.
- Si la consulta del dashboard falla, se muestra un mensaje claro y ningún indicador a medias.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: Solo el administrador DEBE poder consultar el dashboard; el sistema DEBE validarlo en
  el servidor y ocultar la opción a los demás roles.
- **FR-002**: El dashboard DEBE mostrar el número de clientes activos e inactivos.
- **FR-003**: El dashboard DEBE mostrar, contando a cada cliente una sola vez y sin considerar las
  membresías canceladas:
  - **Clientes con membresía vigente**: al menos una membresía vigente hoy.
  - **Clientes con membresía vencida**: al menos una membresía, ninguna vigente y ninguna que
    empiece después de hoy (su última membresía ya terminó).
  - **Clientes con membresía por vencer**: membresía vigente cuya fecha de fin está entre hoy y 6
    días después, ambos incluidos, y sin otra membresía que empiece después (los clientes que ya
    renovaron no cuentan).
- **FR-004**: El dashboard DEBE listar hasta 20 de los clientes con membresía por vencer definidos
  en FR-003 (sin incluir a quienes ya renovaron), ordenados por fecha de fin y apellido, con nombre,
  tipo de membresía y fecha de fin.
- **FR-005**: El dashboard DEBE mostrar el número de pagos y el total de ingresos del periodo,
  considerando solo pagos no anulados, y el adeudo total vigente.
- **FR-006**: El dashboard DEBE mostrar el número de accesos autorizados y rechazados del periodo, y
  la distribución de los rechazos por motivo.
- **FR-007**: El dashboard DEBE listar los 10 accesos rechazados más recientes, sin importar el
  periodo elegido, con fecha y hora, nombre del cliente (o "No identificado") y motivo.
- **FR-008**: El administrador DEBE poder elegir el periodo de los indicadores de pagos, ingresos y
  accesos: hoy, últimos 7 días, mes en curso o un rango de fechas de hasta 366 días; por omisión, el
  mes en curso.
- **FR-009**: El dashboard DEBE mostrar, para el periodo elegido, la evolución diaria de los
  ingresos y de los accesos autorizados y rechazados.
- **FR-010**: Los indicadores DEBEN calcularse con la información registrada en el momento de la
  consulta, usando la zona horaria del gimnasio para delimitar los días.
- **FR-011**: Cada indicador y cada gráfica DEBEN presentar su valor también en texto, con etiquetas
  en español, de modo que se entiendan sin depender solo del color.
- **FR-012**: El dashboard NO DEBE mostrar datos de contacto de los clientes, información facial,
  similitud del reconocimiento ni montos individuales por cliente.
- **FR-013**: El dashboard DEBE mostrar un mensaje claro y en español cuando no haya datos o cuando
  la consulta falle, sin revelar información técnica.
- **FR-014**: El dashboard DEBE ser la pantalla de inicio del administrador después de iniciar
  sesión, sin cambiar la pantalla de inicio de los demás roles.

### Entidades clave

- **Indicadores del dashboard** *(datos calculados, no se capturan ni se almacenan)*: totales y
  agregados sobre las entidades existentes de los Sprints 1 y 2 — Cliente, Membresía, Pago y
  Registro de acceso — para un periodo dado.
- **Periodo**: rango de fechas (inicio y fin, ambos incluidos) en la zona horaria del gimnasio,
  elegido por el administrador.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El administrador ve todos los indicadores del dashboard en menos de 5 segundos con al
  menos 1 000 clientes, 5 000 pagos y 10 000 accesos registrados.
- **SC-002**: En una prueba con datos conocidos, el 100 % de los indicadores y de los valores
  diarios coincide con el conteo manual.
- **SC-003**: Cambiar el periodo actualiza todos los indicadores en menos de 3 segundos.
- **SC-004**: El 100 % de los intentos de recepcionistas, entrenadores y clientes de abrir el
  dashboard o pedir sus datos son rechazados en las pruebas.
- **SC-005**: Ninguna respuesta del dashboard contiene datos de contacto, información facial,
  similitud ni montos individuales por cliente.
- **SC-006**: Un administrador identifica los clientes cuya membresía vence en la semana en menos de
  30 segundos desde que inicia sesión.

## Supuestos

- Se reutilizan sin cambios la autenticación, los roles, los clientes, las membresías, los pagos,
  los adeudos y los accesos de los Sprints 1 y 2; el dashboard solo lee esa información.
- No se necesitan tablas nuevas: los indicadores se calculan al consultar. La tabla
  `estadisticas_dashboard` de `docs/sprint-3.md` no se crea mientras se cumpla SC-001.
- "Rendimiento del gimnasio" se interpreta como ingresos, pagos, accesos y estado de membresías en
  el periodo; no incluye indicadores de entrenamiento, porque esa parte quedó fuera del sprint.
- Quedan fuera de este sprint: entrenadores, asignación de clientes, rutinas, objetivos, progreso,
  consulta de carga de trabajo, reportes exportables, consulta de la auditoría en pantalla y las
  funciones de `docs/project-context.md` sección 5.
- La constitución pide registrar en la documentación los cambios de alcance; `docs/sprint-3.md`
  todavía describe el alcance original y debe actualizarse antes de cerrar el sprint.
- Restricciones del proyecto que la planificación DEBE respetar (constitución y `docs/sprint-3.md`,
  sección 1): carpetas `frontend/`, `backend/` y `database/`; ES Modules sin CommonJS; la interfaz
  solo se comunica con el servidor mediante su API; consultas parametrizadas; y toda dependencia
  nueva (por ejemplo, para gráficas) justificada antes de incorporarse.
