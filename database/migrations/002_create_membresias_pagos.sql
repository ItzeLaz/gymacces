-- Migración 002: estructura de membresías y pagos (Sprint 1, solo estructura).
-- Las funciones operativas se implementan en el Sprint 2.
-- metodo_pago y pagos.estado son provisionales y pueden ajustarse con una nueva migración.

CREATE TABLE IF NOT EXISTS tipos_membresia (
  id_tipo_membresia INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(255) NULL,
  duracion_dias SMALLINT UNSIGNED NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (id_tipo_membresia),
  UNIQUE KEY uq_tipos_membresia_nombre (nombre),
  CONSTRAINT chk_tipos_membresia_duracion CHECK (duracion_dias > 0),
  CONSTRAINT chk_tipos_membresia_precio CHECK (precio >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS membresias (
  id_membresia INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cliente INT UNSIGNED NOT NULL,
  id_tipo_membresia INT UNSIGNED NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado ENUM('activa', 'vencida', 'suspendida', 'cancelada') NOT NULL DEFAULT 'activa',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_membresia),
  KEY idx_membresias_cliente_estado (id_cliente, estado),
  CONSTRAINT fk_membresias_clientes FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_membresias_tipos FOREIGN KEY (id_tipo_membresia)
    REFERENCES tipos_membresia (id_tipo_membresia) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_membresias_fechas CHECK (fecha_fin >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos (
  id_pago INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cliente INT UNSIGNED NOT NULL,
  id_membresia INT UNSIGNED NULL,
  monto DECIMAL(10, 2) NOT NULL,
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo_pago VARCHAR(30) NOT NULL,
  estado ENUM('pagado', 'pendiente', 'cancelado') NOT NULL DEFAULT 'pagado',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pago),
  KEY idx_pagos_cliente_fecha (id_cliente, fecha_pago),
  CONSTRAINT fk_pagos_clientes FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pagos_membresias FOREIGN KEY (id_membresia)
    REFERENCES membresias (id_membresia) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_pagos_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
