// Estados de una cotización con su color.
export const ESTADOS_COT = {
  borrador: { label: 'Borrador', color: '#777777' },
  enviada: { label: 'Enviada', color: '#7fb8e8' },
  aprobada: { label: 'Aprobada', color: '#44aa99' },
  rechazada: { label: 'Rechazada', color: '#e24b4a' },
  vencida: { label: 'Vencida', color: '#e8b87f' },
}

export const ESTADOS_COT_LIST = Object.entries(ESTADOS_COT).map(([value, v]) => ({
  value,
  label: v.label,
}))

// Subtotal de un item (cantidad * precio * (1 - desc%)).
export function subtotalItem(item) {
  const cant = Number(item.cantidad ?? 0)
  const precio = Number(item.precio_usd ?? 0)
  const desc = Number(item.descuento_item_pct ?? 0)
  return cant * precio * (1 - desc / 100)
}

// Calcula subtotal, total con descuento global y total ARS.
export function calcularTotales(items, descuentoPct, tc) {
  const subtotalUsd = items.reduce((acc, it) => acc + subtotalItem(it), 0)
  const totalUsd = subtotalUsd * (1 - Number(descuentoPct ?? 0) / 100)
  const totalArs = tc ? totalUsd * tc : 0
  return { subtotalUsd, totalUsd, totalArs }
}

// Días restantes de validez (puede ser negativo si venció).
export function diasRestantes(cotizacion) {
  if (!cotizacion.created_at || !cotizacion.validez_dias) return null
  const creada = new Date(cotizacion.created_at)
  const vence = new Date(creada.getTime() + cotizacion.validez_dias * 86400000)
  return Math.ceil((vence - new Date()) / 86400000)
}
