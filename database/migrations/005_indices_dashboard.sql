-- Migración 005: índices por fecha para el dashboard administrativo (Sprint 3, research R-04).
-- No crea tablas: el dashboard calcula sus indicadores al consultar.

ALTER TABLE pagos ADD KEY idx_pagos_fecha_estado (fecha_pago, estado);

ALTER TABLE membresias ADD KEY idx_membresias_fecha_fin (fecha_fin);
