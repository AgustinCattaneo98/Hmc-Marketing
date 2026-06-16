const CACHE_KEY = 'hmc_dolar_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export async function getCotizacionDolar() {
  // Intentar desde cache primero
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
  } catch {
    // cache inválido, se ignora
  }

  // APIs en orden de prioridad (todas públicas, sin auth)
  const apis = [
    {
      url: 'https://dolarapi.com/v1/dolares/blue',
      parse: (d) => ({ compra: d.compra, venta: d.venta, nombre: 'Blue', fuente: 'dolarapi.com' }),
    },
    {
      url: 'https://api.bluelytics.com.ar/v2/latest',
      parse: (d) => ({
        compra: d.blue.value_buy,
        venta: d.blue.value_sell,
        nombre: 'Blue',
        fuente: 'bluelytics.com.ar',
      }),
    },
  ]

  for (const api of apis) {
    try {
      const res = await fetch(api.url)
      if (!res.ok) continue
      const data = await res.json()
      const result = { ...api.parse(data), timestamp: Date.now() }
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }))
      return result
    } catch {
      // probar siguiente API
    }
  }

  // Fallback: último valor cacheado aunque esté vencido
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached) return { ...cached.data, desactualizado: true }
  } catch {
    // sin cache
  }

  return null
}

export function usdToArs(usd, cotizacion) {
  if (!usd || !cotizacion) return null
  return usd * cotizacion.venta
}

export function arsToUsd(ars, cotizacion) {
  if (!ars || !cotizacion) return null
  return ars / cotizacion.venta
}

// Devuelve { usd, ars } a partir de un valor en su moneda de origen.
export function convertir(valor, moneda, cotizacion) {
  const v = Number(valor)
  if (!v) return { usd: 0, ars: 0 }
  if (moneda === 'ARS') return { ars: v, usd: arsToUsd(v, cotizacion) }
  return { usd: v, ars: usdToArs(v, cotizacion) }
}

// Formatea un valor en la moneda indicada.
export function formatMonto(valor, moneda) {
  return moneda === 'ARS' ? formatARS(valor) : formatUSD(valor)
}

export function formatARS(valor) {
  if (!valor) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatUSD(valor) {
  if (!valor) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(valor)
}

// "hace X min" a partir de un timestamp.
export function haceCuanto(timestamp) {
  if (!timestamp) return ''
  const min = Math.floor((Date.now() - timestamp) / 60000)
  if (min < 1) return 'hace instantes'
  if (min === 1) return 'hace 1 min'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return h === 1 ? 'hace 1 h' : `hace ${h} h`
}
