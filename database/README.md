# Base de datos

Scripts de la base de datos del sistema de gimnasio. Funcionan con **MySQL 8.0+** o **MariaDB
10.4+** en local (por ejemplo, el de XAMPP). Todas las tablas usan InnoDB y `utf8mb4` con la
collation `utf8mb4_unicode_ci`, disponible en ambos motores.

## Configuración

1. Copia `.env.example` como `.env` y completa la conexión y los datos del administrador inicial.
2. Instala las dependencias: `npm install`.

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run db:migrate` | Crea la base si no existe y aplica las migraciones pendientes en orden. |
| `npm run db:seed` | Crea el administrador inicial si todavía no existe ninguno. |
| `npm run db:reset` | Borra y recrea la base aplicando todas las migraciones. Prohibido con `NODE_ENV=production`. |
| `npm run db:check-encoding` | Lista los textos guardados con `�` (tildes o ñ perdidas). Termina con código 1 si encuentra alguno. |

La tabla `schema_migrations` guarda qué migraciones se aplicaron; ejecutar los comandos más de una
vez no duplica nada.

## Migraciones

| Migración | Contenido | Sprint |
|-----------|-----------|--------|
| `001_create_usuarios_clientes.sql` | `clientes`, `usuarios` | 1 |
| `002_create_membresias_pagos.sql` | `tipos_membresia`, `membresias`, `pagos` (estructura) | 1 |
| `003_ajustar_membresias_pagos.sql` | Monto, motivo y trazabilidad en `membresias`; métodos de pago (`efectivo`, `tarjeta`, `transferencia`), estados (`pagado`, `cancelado`) y datos de anulación en `pagos` | 2 |
| `004_create_rostros_accesos_auditoria.sql` | `rostros`, `accesos`, `auditoria` | 2 |
| `005_indices_dashboard.sql` | Índices por fecha en `pagos` y `membresias` para el dashboard | 3 |
| `006_create_clases_reservas.sql` | `clases` (horario semanal con cupo) y `reservas` (lugar de un cliente en una sesión, cancelación y asistencia) | 4 |

`rostros` guarda los descriptores faciales **cifrados** con la llave `FACE_DATA_KEY` del backend.
Una copia de la base no sirve para identificar a nadie sin esa misma llave: si la llave se pierde o
se cambia, hay que volver a registrar los rostros. Nunca se guardan fotografías.

Las clases grupales no guardan sesiones: una sesión es el par `(id_clase, fecha_sesion)` y se
calcula al consultar. El índice único `uq_reservas_sesion_cliente_activa` usa la columna generada
`clave_activa` (1 si la reserva está activa, `NULL` si está cancelada) para impedir dos reservas
activas del mismo cliente en la misma sesión sin bloquear las canceladas. El cupo se controla en el
backend con una transacción que bloquea la fila de la clase.

Todas las llaves foráneas usan `ON DELETE RESTRICT ON UPDATE RESTRICT`: no se pueden borrar
clientes con información relacionada.

## Codificación

La base, las tablas, las columnas y las conexiones (backend y scripts) usan `utf8mb4`. El backend
rechaza con 400 cualquier cuerpo JSON que no esté en UTF-8, porque de lo contrario las tildes y la
ñ se guardarían como `�` sin aviso. Ojo con `Invoke-RestMethod` de Windows PowerShell 5.1: envía
el cuerpo en Latin-1; usa `-Body ([System.Text.Encoding]::UTF8.GetBytes($json))` o PowerShell 7.

Un `�` guardado no se puede revertir de forma automática porque el carácter original se perdió:
`db:check-encoding` indica qué registros corregir a mano.

## Reglas

- Los cambios de estructura se hacen **solo** con nuevas migraciones numeradas
  (`003_descripcion.sql`, `004_...`). Nunca se modifica una migración ya aplicada.
- Las consultas del backend siempre son parametrizadas.
- No se suben al repositorio archivos `.env` ni archivos físicos de datos de MySQL.
