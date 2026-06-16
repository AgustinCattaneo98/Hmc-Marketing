-- ============================================================
-- HMC Marketing — Migración Cotizaciones v2
-- Relación cotizaciones ↔ oportunidades CRM.
-- Ejecutar después de cotizaciones_v1.sql y crm_v1.sql.
-- ============================================================

ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS oportunidad_id UUID
  REFERENCES crm_oportunidades(id) ON DELETE SET NULL;

ALTER TABLE crm_oportunidades
  ADD COLUMN IF NOT EXISTS cotizacion_count INTEGER DEFAULT 0;
