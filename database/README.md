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

La tabla `schema_migrations` guarda qué migraciones se aplicaron; ejecutar los comandos más de una
vez no duplica nada.

## Migraciones

| Migración | Tablas | Estado en el Sprint 1 |
|-----------|--------|-----------------------|
| `001_create_usuarios_clientes.sql` | `clientes`, `usuarios` | Funcionales |
| `002_create_membresias_pagos.sql` | `tipos_membresia`, `membresias`, `pagos` | Solo estructura para el Sprint 2 |

En `pagos`, los valores de `metodo_pago` y de `estado` (`pagado`, `pendiente`, `cancelado`) son
provisionales; el Sprint 2 los ajustará con una nueva migración si hace falta. Las tablas
`rostros`, `accesos` y `auditoria` se crearán en el Sprint 2.

Todas las llaves foráneas usan `ON DELETE RESTRICT ON UPDATE RESTRICT`: no se pueden borrar
clientes con información relacionada.

## Reglas

- Los cambios de estructura se hacen **solo** con nuevas migraciones numeradas
  (`003_descripcion.sql`, `004_...`). Nunca se modifica una migración ya aplicada.
- Las consultas del backend siempre son parametrizadas.
- No se suben al repositorio archivos `.env` ni archivos físicos de datos de MySQL.
