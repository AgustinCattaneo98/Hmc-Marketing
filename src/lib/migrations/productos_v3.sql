-- ============================================================
-- HMC Marketing — Migración Productos v3
-- Moneda del precio por producto (USD o ARS).
-- Ejecutar en el SQL Editor de Supabase (después de productos_v1/v2).
-- ============================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'USD'
  CHECK (moneda IN ('USD','ARS'));
