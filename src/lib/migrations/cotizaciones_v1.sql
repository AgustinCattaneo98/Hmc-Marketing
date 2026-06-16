-- ============================================================
-- HMC Marketing — Migración Cotizaciones v1
-- Presupuestos / propuestas con items y totales en USD/ARS.
-- Ejecutar en el SQL Editor de Supabase (después de schema.sql,
-- productos_v1 y crm_v1). Requiere update_updated_at().
-- ============================================================

CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN (
    'borrador','enviada','aprobada','rechazada','vencida'
  )),
  -- Cliente (opcional)
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  cliente_nombre TEXT,
  cliente_email TEXT,
  -- Moneda y dólar
  dolar_venta NUMERIC(10,2),
  moneda_display TEXT DEFAULT 'ARS'
    CHECK (moneda_display IN ('ARS','USD','AMBAS')),
  -- Totales (calculados y guardados)
  subtotal_usd NUMERIC(12,2) DEFAULT 0,
  descuento_pct NUMERIC(5,2) DEFAULT 0,
  total_usd NUMERIC(12,2) DEFAULT 0,
  total_ars NUMERIC(14,2) DEFAULT 0,
  -- Configuración
  validez_dias INTEGER DEFAULT 7,
  notas TEXT,
  notas_internas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotizacion_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cotizacion_id UUID REFERENCES cotizaciones(id)
    ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id)
    ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  detalle TEXT,
  cantidad INTEGER DEFAULT 1,
  precio_usd NUMERIC(10,2) NOT NULL,
  descuento_item_pct NUMERIC(5,2) DEFAULT 0,
  subtotal_usd NUMERIC(12,2),
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_cotizaciones_updated_at
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON cotizaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON cotizacion_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Secuencia para número de cotización
CREATE SEQUENCE IF NOT EXISTS cotizacion_numero_seq START 1;
