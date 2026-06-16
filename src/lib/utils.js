// Limpia un número de WhatsApp para usarlo en una URL wa.me:
// saca espacios, guiones, paréntesis y el + inicial.
export function limpiarWhatsapp(numero) {
  if (!numero) return null
  return numero.replace(/[\s\-()+]/g, '')
}

// "hace 2 horas", "hace 3 días", "hace 1 mes"
export function tiempoRelativo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  const meses = Math.floor(dias / 30)
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  if (hrs < 24) return `hace ${hrs} h`
  if (dias < 30) return `hace ${dias} días`
  return `hace ${meses} meses`
}

export function saludo() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function formatFechaLarga(fecha) {
  return new Date(fecha).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Devuelve las iniciales (1-2 letras) a partir de uno o más textos.
// Ej: iniciales('Hotel Azul') -> 'HA'; iniciales('Agus', 'Pérez') -> 'AP'
export function iniciales(...partes) {
  const texto = partes.filter(Boolean).join(' ').trim()
  if (!texto) return '?'
  const palabras = texto.split(/\s+/)
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}
