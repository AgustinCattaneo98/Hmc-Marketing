-- ============================================================
-- HMC Marketing — Migración CRM v1
-- Pipeline comercial (oportunidades) + actividades.
-- Ejecutar en el SQL Editor de Supabase (después de schema.sql).
-- Requiere la función update_updated_at() ya creada en schema.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  valor_estimado NUMERIC(12,2),
  moneda TEXT DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  etapa TEXT DEFAULT 'oportunidad' CHECK (etapa IN (
    'oportunidad','en_proceso','propuesta_enviada',
    'cerrado_ganado','cerrado_perdido'
  )),
  probabilidad INTEGER DEFAULT 0
    CHECK (probabilidad >= 0 AND probabilidad <= 100),
  fecha_cierre_estimada DATE,
  -- Vinculación
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  campana_id UUID REFERENCES campanas(id) ON DELETE SET NULL,
  -- Metadata
  color TEXT DEFAULT '#7fb8e8',
  prioridad TEXT DEFAULT 'media'
    CHECK (prioridad IN ('baja','media','alta')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oportunidad_id UUID REFERENCES crm_oportunidades(id)
    ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'tarea' CHECK (tipo IN (
    'tarea','llamada','reunion','whatsapp','email','seguimiento'
  )),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente','en_proceso','completada','cancelada'
  )),
  fecha_vencimiento TIMESTAMPTZ,
  completada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_crm_oportunidades_updated_at
  BEFORE UPDATE ON crm_oportunidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_crm_actividades_updated_at
  BEFORE UPDATE ON crm_actividades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE crm_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON crm_oportunidades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON crm_actividades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
