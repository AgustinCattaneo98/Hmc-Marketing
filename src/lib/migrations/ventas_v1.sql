-- ============================================================
-- HMC Marketing — Migración Ventas v1
-- Registro de cobros + comprobantes a partir de cotizaciones.
-- Ejecutar después de cotizaciones_v1/v2 y crm_v1.
-- ============================================================

CREATE TABLE IF NOT EXISTS ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
  oportunidad_id UUID REFERENCES crm_oportunidades(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  total_usd NUMERIC(12,2),
  total_ars NUMERIC(14,2),
  dolar_venta NUMERIC(10,2),
  comprobante_url TEXT,
  comprobante_nombre TEXT,
  fecha_cobro TIMESTAMPTZ DEFAULT NOW(),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON ventas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS cobrada BOOLEAN DEFAULT FALSE;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS fecha_cobro TIMESTAMPTZ;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS venta_id UUID
  REFERENCES ventas(id) ON DELETE SET NULL;

-- ============================================================
-- Storage: bucket 'comprobantes' (PRIVADO — NO marcar Public).
-- Crear el bucket desde el panel y luego correr esta policy:
-- ============================================================
-- CREATE POLICY "auth_comprobantes" ON storage.objects
--   FOR ALL TO authenticated
--   USING (bucket_id = 'comprobantes')
--   WITH CHECK (bucket_id = 'comprobantes');
