// Etapas del pipeline (orden = flujo del kanban).
export const ETAPAS = [
  { key: 'oportunidad', label: 'Oportunidad', color: '#7fb8e8' },
  { key: 'en_proceso', label: 'En proceso', color: '#e8b87f' },
  { key: 'propuesta_enviada', label: 'Propuesta enviada', color: '#c8a8e8' },
  { key: 'cerrado_ganado', label: 'Cerrado ganado', color: '#44aa99' },
  { key: 'cerrado_perdido', label: 'Cerrado perdido', color: '#e24b4a' },
]

export const ETAPA_MAP = Object.fromEntries(ETAPAS.map((e) => [e.key, e]))

export const PRIORIDADES = {
  alta: { label: 'Alta', color: '#e24b4a' },
  media: { label: 'Media', color: '#ccaa44' },
  baja: { label: 'Baja', color: '#777777' },
}

export const COLORES_CARD = [
  '#7fb8e8',
  '#a8d88a',
  '#e8b87f',
  '#c8a8e8',
  '#e24b4a',
  '#f0f0ea',
]

export const MONEDAS = ['ARS', 'USD']

// Formatea un monto con su moneda (es-AR).
export function formatMonto(valor, moneda = 'ARS') {
  if (valor == null || valor === '') return null
  const n = Number(valor)
  if (Number.isNaN(n)) return null
  return `${moneda} ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
