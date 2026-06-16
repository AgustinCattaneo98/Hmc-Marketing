-- ============================================================
-- HMC Marketing — Migración Productos v1
-- Catálogo con categorías dinámicas, precios en USD y variantes.
-- Ejecutar en el SQL Editor de Supabase (después de schema.sql).
-- Requiere la función update_updated_at() ya creada en schema.sql.
--
-- NOTA: si ejecutaste una versión anterior de este archivo (con la
-- columna `categoria` y la tabla `producto_upgrades`), primero corré:
--   DROP TABLE IF EXISTS producto_upgrades;
--   DROP TABLE IF EXISTS productos;
-- ============================================================

CREATE TABLE IF NOT EXISTS producto_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT DEFAULT 'TbPackage',
  color TEXT DEFAULT '#7fb8e8',
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_id UUID REFERENCES producto_categorias(id)
    ON DELETE SET NULL,
  linea TEXT,
  descripcion TEXT,
  precio_usd NUMERIC(10,2),
  activo BOOLEAN DEFAULT TRUE,
  foto_url TEXT,
  pdf_url TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_variantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_usd NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_producto_categorias_updated_at
  BEFORE UPDATE ON producto_categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE producto_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_variantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON producto_categorias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON productos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON producto_variantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Categorías de ejemplo para HMC
INSERT INTO producto_categorias (nombre, descripcion, color) VALUES
  ('Bicicletas', 'Bicicletas urbanas personalizadas', '#7fb8e8'),
  ('Bicicleteros', 'Soportes y sistemas de estacionamiento', '#a8d88a'),
  ('Accesorios', 'Accesorios para bicicletas', '#e8b87f'),
  ('Componentes', 'Componentes y upgrades', '#c8a8e8');
