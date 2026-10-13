-- Migración 003: hace operativas las membresías y los pagos (Sprint 2).
-- No modifica las migraciones 001 ni 002 (constitución, principio IV).

-- Membresías: monto acordado, motivo del último cambio de estado y trazabilidad
ALTER TABLE membresias
  ADD COLUMN monto DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER fecha_fin,
  ADD COLUMN motivo_estado VARCHAR(255) NULL AFTER estado,
  ADD COLUMN creado_por INT UNSIGNED NULL AFTER motivo_estado,
  ADD COLUMN actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en,
  ADD CONSTRAINT chk_membresias_monto CHECK (monto >= 0),
  ADD CONSTRAINT fk_membresias_creado_por FOREIGN KEY (creado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Las membresías anteriores toman el precio de su tipo
UPDATE membresias m
  JOIN tipos_membresia t ON t.id_tipo_membresia = m.id_tipo_membresia
  SET m.monto = t.precio;

-- Pagos: normaliza valores previos antes de restringir los ENUM
UPDATE pagos SET metodo_pago = 'efectivo'
  WHERE metodo_pago NOT IN ('efectivo', 'tarjeta', 'transferencia');
UPDATE pagos SET estado = 'pagado' WHERE estado = 'pendiente';

ALTER TABLE pagos
  MODIFY COLUMN metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL,
  MODIFY COLUMN estado ENUM('pagado', 'cancelado') NOT NULL DEFAULT 'pagado',
  ADD COLUMN registrado_por INT UNSIGNED NULL AFTER estado,
  ADD COLUMN motivo_anulacion VARCHAR(255) NULL AFTER registrado_por,
  ADD COLUMN anulado_por INT UNSIGNED NULL AFTER motivo_anulacion,
  ADD COLUMN anulado_en DATETIME NULL AFTER anulado_por,
  ADD KEY idx_pagos_membresia_estado (id_membresia, estado),
  ADD CONSTRAINT fk_pagos_registrado_por FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT fk_pagos_anulado_por FOREIGN KEY (anulado_por)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT;
