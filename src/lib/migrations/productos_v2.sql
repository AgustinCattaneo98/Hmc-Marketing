-- ============================================================
-- HMC Marketing — Migración Productos v2
-- Soporte de múltiples fotos por producto.
-- Ejecutar en el SQL Editor de Supabase (después de productos_v1.sql).
-- ============================================================

-- Galería de fotos (array de URLs). foto_url se mantiene como portada.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb;
