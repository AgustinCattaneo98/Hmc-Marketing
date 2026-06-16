-- ============================================================
-- HMC Marketing — Migración Ubicación
-- Campos de ubicación para empresas y contactos.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Argentina';

ALTER TABLE contactos ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Argentina';
