import { supabase } from './supabase'

// Tablas a exportar (cada una como una hoja del Excel).
const TABLAS = [
  { tabla: 'empresas', hoja: 'Empresas' },
  { tabla: 'contactos', hoja: 'Contactos' },
  { tabla: 'productos', hoja: 'Productos' },
  { tabla: 'producto_categorias', hoja: 'Categorias' },
  { tabla: 'crm_oportunidades', hoja: 'CRM Oportunidades' },
  { tabla: 'crm_actividades', hoja: 'CRM Actividades' },
  { tabla: 'cotizaciones', hoja: 'Cotizaciones' },
  { tabla: 'cotizacion_items', hoja: 'Cotizacion Items' },
  { tabla: 'ventas', hoja: 'Ventas' },
]

// Convierte objetos/arrays (JSONB) a texto para que entren en una celda.
function planoFila(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v
  }
  return out
}

// Exporta una sola tabla a un Excel de una hoja. Devuelve { error }.
export async function exportarEntidad(tabla, hoja, nombreArchivo) {
  try {
    const XLSX = await import('xlsx')
    const { data, error } = await supabase.from(tabla).select('*')
    if (error) return { error: error.message }
    const filas = (data ?? []).map(planoFila)
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{}])
    XLSX.utils.book_append_sheet(wb, ws, (hoja || tabla).slice(0, 31))
    const fecha = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `${nombreArchivo || tabla}_${fecha}.xlsx`)
    return { error: null }
  } catch (e) {
    return { error: e.message }
  }
}

// Exporta las cotizaciones con campos legibles (número, cliente, estado,
// total ARS, total USD, fecha). Devuelve { error }.
export async function exportarCotizaciones(nombreArchivo = 'Cotizaciones') {
  try {
    const XLSX = await import('xlsx')
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(
        'numero, estado, total_usd, total_ars, created_at, cliente_nombre, empresa:empresa_id(nombre), contacto:contacto_id(nombre, apellido)'
      )
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    const filas = (data ?? []).map((c) => ({
      Número: c.numero ?? '',
      Cliente:
        c.empresa?.nombre ||
        (c.contacto ? `${c.contacto.nombre ?? ''} ${c.contacto.apellido ?? ''}`.trim() : '') ||
        c.cliente_nombre ||
        '',
      Estado: c.estado ?? '',
      'Total ARS': c.total_ars ?? '',
      'Total USD': c.total_usd ?? '',
      Fecha: c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{}])
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones')
    const fecha = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`)
    return { error: null }
  } catch (e) {
    return { error: e.message }
  }
}

// Genera y descarga un Excel con una hoja por tabla.
// Devuelve { error } si algo falla.
export async function exportarBaseDatos() {
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    let algunaConDatos = false

    for (const { tabla, hoja } of TABLAS) {
      const { data, error } = await supabase.from(tabla).select('*')
      if (error) continue // tabla inexistente / sin permiso → se omite
      const filas = (data ?? []).map(planoFila)
      if (filas.length) algunaConDatos = true
      const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{}])
      XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31))
    }

    if (!algunaConDatos) return { error: 'No hay datos para exportar (¿sesión iniciada?).' }

    const fecha = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `hmc_base_datos_${fecha}.xlsx`)
    return { error: null }
  } catch (e) {
    return { error: e.message }
  }
}
