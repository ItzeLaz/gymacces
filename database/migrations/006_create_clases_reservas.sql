-- Migración 006: clases grupales semanales y reservas por sesión (feature 004, ampliación posterior al MVP).
-- No modifica las migraciones 001 a 005 (constitución, principio IV).
-- Las sesiones no tienen tabla: se identifican por (id_clase, fecha_sesion) (research R-01).

-- Actividad grupal que se repite cada semana (FR-001, FR-002)
CREATE TABLE IF NOT EXISTS clases (
  id_clase INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  id_instructor INT UNSIGNED NOT NULL,
  -- ISO 8601: 1 = lunes ... 7 = domingo
  dia_semana TINYINT UNSIGNED NOT NULL,
  hora_inicio TIME NOT NULL,
  duracion_minutos SMALLINT UNSIGNED NOT NULL,
  cupo_maximo SMALLINT UNSIGNED NOT NULL,
  estado ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
  creado_por INT UNSIGNED NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_clase),
  KEY idx_clases_dia_estado (dia_semana, estado, hora_inicio),
  KEY idx_clases_instructor_dia (id_instructor, dia_semana, estado),
  KEY idx_clases_creado_por (creado_por),
  CONSTRAINT chk_clases_nombre CHECK (CHAR_LENGTH(TRIM(nombre)) > 0),
  CONSTRAINT chk_clases_dia_semana CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT chk_clases_hora_inicio CHECK (hora_inicio >= '00:00:00' AND hora_inicio < '24:00:00'),
  CONSTRAINT chk_clases_duracion CHECK (duracion_minutos BETWEEN 15 AND 240),
  CONSTRAINT chk_clases_cupo CHECK (cupo_maximo BETWEEN 1 AND 100),
  -- La clase termina el mismo día en que empieza (US1, criterio 14; research R-06)
  CONSTRAINT chk_clases_mismo_dia CHECK (TIME_TO_SEC(hora_inicio) + duracion_minutos * 60 <= 86400),
  CONSTRAINT fk_clases_instructor FOREIGN KEY (id_instructor)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_clases_creado_por FOREIGN KEY (creado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lugar apartado para un cliente en una sesión; nunca se borra (FR-003 a FR-009)
CREATE TABLE IF NOT EXISTS reservas (
  id_reserva INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_clase INT UNSIGNED NOT NULL,
  fecha_sesion DATE NOT NULL,
  id_cliente INT UNSIGNED NOT NULL,
  estado ENUM('activa', 'cancelada') NOT NULL DEFAULT 'activa',
  asistencia ENUM('sin_registrar', 'presente') NOT NULL DEFAULT 'sin_registrar',
  registrada_en_curso TINYINT(1) NOT NULL DEFAULT 0,
  -- Solo vale 1 mientras la reserva está activa: máximo una activa por cliente y sesión (FR-005)
  clave_activa TINYINT UNSIGNED AS (IF(estado = 'activa', 1, NULL)) STORED,
  registrado_por INT UNSIGNED NOT NULL,
  -- El servicio envía las fechas desde Node; el valor por omisión es solo un respaldo (research R-05)
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelado_por INT UNSIGNED NULL,
  cancelado_en DATETIME NULL,
  asistencia_por INT UNSIGNED NULL,
  asistencia_en DATETIME NULL,
  PRIMARY KEY (id_reserva),
  UNIQUE KEY uq_reservas_sesion_cliente_activa (id_clase, fecha_sesion, id_cliente, clave_activa),
  KEY idx_reservas_cliente_fecha (id_cliente, fecha_sesion, estado),
  KEY idx_reservas_clase_fecha_estado (id_clase, fecha_sesion, estado),
  CONSTRAINT chk_reservas_en_curso CHECK (registrada_en_curso IN (0, 1)),
  CONSTRAINT chk_reservas_cancelacion CHECK (
    (estado = 'activa' AND cancelado_por IS NULL AND cancelado_en IS NULL)
    OR (estado = 'cancelada' AND cancelado_por IS NOT NULL AND cancelado_en IS NOT NULL)
  ),
  CONSTRAINT chk_reservas_asistencia CHECK (
    (asistencia = 'sin_registrar' AND asistencia_por IS NULL AND asistencia_en IS NULL)
    OR (asistencia = 'presente' AND asistencia_por IS NOT NULL AND asistencia_en IS NOT NULL)
  ),
  CONSTRAINT chk_reservas_cancelada_sin_asistencia CHECK (NOT (estado = 'cancelada' AND asistencia = 'presente')),
  CONSTRAINT fk_reservas_clases FOREIGN KEY (id_clase)
    REFERENCES clases (id_clase) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reservas_clientes FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reservas_registrado_por FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reservas_cancelado_por FOREIGN KEY (cancelado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reservas_asistencia_por FOREIGN KEY (asistencia_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
