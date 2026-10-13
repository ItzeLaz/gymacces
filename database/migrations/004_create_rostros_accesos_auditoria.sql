-- Migración 004: reconocimiento facial, control de acceso y auditoría (Sprint 2).

-- Información facial cifrada; nunca se guardan imágenes (FR-029, research R-05)
CREATE TABLE IF NOT EXISTS rostros (
  id_rostro INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cliente INT UNSIGNED NOT NULL,
  descriptor_cifrado MEDIUMBLOB NOT NULL,
  iv VARBINARY(12) NOT NULL,
  auth_tag VARBINARY(16) NOT NULL,
  version_modelo VARCHAR(40) NOT NULL,
  consentimiento TINYINT(1) NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  -- Solo vale el id del cliente cuando el registro está activo: máximo uno activo por cliente (FR-028)
  id_cliente_activo INT UNSIGNED AS (IF(estado = 'activo', id_cliente, NULL)) STORED,
  registrado_por INT UNSIGNED NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  desactivado_en DATETIME NULL,
  PRIMARY KEY (id_rostro),
  UNIQUE KEY uq_rostros_cliente_activo (id_cliente_activo),
  KEY idx_rostros_cliente (id_cliente),
  CONSTRAINT chk_rostros_consentimiento CHECK (consentimiento = 1),
  CONSTRAINT fk_rostros_clientes FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_rostros_registrado_por FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada intento de acceso, autorizado o rechazado (FR-038, FR-039)
CREATE TABLE IF NOT EXISTS accesos (
  id_acceso BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha_hora DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  id_cliente INT UNSIGNED NULL,
  id_membresia INT UNSIGNED NULL,
  resultado ENUM('autorizado', 'rechazado') NOT NULL,
  motivo ENUM(
    'rostro_no_identificado',
    'cliente_inactivo',
    'sin_membresia_vigente',
    'membresia_vencida',
    'membresia_suspendida',
    'membresia_cancelada'
  ) NULL,
  similitud DECIMAL(5, 4) NULL,
  registrado_por INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_acceso),
  KEY idx_accesos_fecha (fecha_hora),
  KEY idx_accesos_cliente_fecha (id_cliente, fecha_hora),
  KEY idx_accesos_resultado_fecha (resultado, fecha_hora),
  CONSTRAINT chk_accesos_motivo CHECK (
    (resultado = 'autorizado' AND motivo IS NULL) OR (resultado = 'rechazado' AND motivo IS NOT NULL)
  ),
  CONSTRAINT fk_accesos_clientes FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_accesos_membresias FOREIGN KEY (id_membresia)
    REFERENCES membresias (id_membresia) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_accesos_registrado_por FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Acciones importantes del sistema; nunca contiene datos biométricos (FR-042)
CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NOT NULL,
  accion VARCHAR(60) NOT NULL,
  entidad VARCHAR(40) NOT NULL,
  id_registro BIGINT UNSIGNED NOT NULL,
  descripcion VARCHAR(500) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_auditoria),
  KEY idx_auditoria_entidad (entidad, id_registro),
  KEY idx_auditoria_usuario_fecha (id_usuario, creado_en),
  CONSTRAINT fk_auditoria_usuarios FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
