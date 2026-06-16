-- ============================================================
-- HMC Marketing — Migración Campañas v2
-- Modelo de gestión comercial personalizada por cliente.
-- Ejecutar en el SQL Editor de Supabase (después de schema.sql).
-- Requiere la función update_updated_at() ya creada en schema.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS campana_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campana_id UUID REFERENCES campanas(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('empresa','contacto')) NOT NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  contacto_id UUID REFERENCES contactos(id) ON DELETE CASCADE,
  -- Email personalizado
  email_asunto TEXT,
  email_bloques JSONB DEFAULT '[]',
  email_plantilla_id UUID,
  email_estado TEXT DEFAULT 'sin_crear'
    CHECK (email_estado IN ('sin_crear','borrador','listo')),
  -- WhatsApp personalizado
  whatsapp_texto TEXT,
  whatsapp_estado TEXT DEFAULT 'sin_crear'
    CHECK (whatsapp_estado IN ('sin_crear','borrador','listo','enviado')),
  -- Notas generales
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campana_actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campana_id UUID REFERENCES campanas(id) ON DELETE CASCADE,
  campana_cliente_id UUID REFERENCES campana_clientes(id)
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

CREATE TABLE IF NOT EXISTS plantillas_email (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  bloques JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers de updated_at
CREATE TRIGGER trg_campana_clientes_updated_at
  BEFORE UPDATE ON campana_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_campana_actividades_updated_at
  BEFORE UPDATE ON campana_actividades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_plantillas_updated_at
  BEFORE UPDATE ON plantillas_email
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE campana_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campana_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON campana_clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON campana_actividades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON plantillas_email
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
