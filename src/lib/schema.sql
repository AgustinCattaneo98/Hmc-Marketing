-- ============================================================
-- HMC Marketing — Schema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- TABLA: empresas
CREATE TABLE empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  segmento TEXT CHECK (segmento IN ('hotel','inmobiliaria','hostel','corporativo','otro')),
  ciudad TEXT DEFAULT 'Córdoba',
  sitio_web TEXT,
  email TEXT,
  telefono TEXT,
  instagram TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: contactos
CREATE TABLE contactos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  cargo TEXT,
  email TEXT,
  whatsapp TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: campanas
CREATE TABLE campanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  asunto TEXT,
  segmento TEXT,
  remitente_nombre TEXT DEFAULT 'Agus — HMC Bicicletas',
  remitente_email TEXT DEFAULT 'hmcbicicletas@gmail.com',
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador','programada','enviada')),
  enviada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: campana_destinatarios (relación campaña ↔ contactos)
CREATE TABLE campana_destinatarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campana_id UUID REFERENCES campanas(id) ON DELETE CASCADE,
  contacto_id UUID REFERENCES contactos(id) ON DELETE CASCADE,
  email_enviado TEXT,
  abierto BOOLEAN DEFAULT FALSE,
  abierto_at TIMESTAMPTZ,
  UNIQUE(campana_id, contacto_id)
);

-- TABLA: bloques_email (bloques del editor por campaña)
CREATE TABLE bloques_email (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campana_id UUID REFERENCES campanas(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('titulo','texto','imagen','cta','separador','firma')),
  contenido TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FUNCIÓN: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS para updated_at
CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contactos_updated_at
  BEFORE UPDATE ON contactos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_campanas_updated_at
  BEFORE UPDATE ON campanas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: habilitar Row Level Security en todas las tablas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campana_destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloques_email ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: solo usuarios autenticados pueden operar
CREATE POLICY "auth_all" ON empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON contactos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON campanas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON campana_destinatarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON bloques_email FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- MIGRACIÓN: columnas para imágenes (logos / fotos)
-- Si ya creaste las tablas con la versión anterior del schema,
-- ejecutá solo estas dos líneas. IF NOT EXISTS las hace idempotentes.
-- ============================================================
ALTER TABLE empresas  ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS foto_url TEXT;
