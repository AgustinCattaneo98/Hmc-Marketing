// Comprime y redimensiona una imagen en el navegador antes de subirla a Storage.
// Reduce mucho el peso (y el tiempo de carga) sin diferencia visible.
// - Archivos que no son imagen, o SVG/GIF, se devuelven sin tocar.
// - El resto se redimensiona al lado máximo y se exporta a WebP.
export async function comprimirImagen(file, { maxLado = 1280, calidad = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  try {
    const dataUrl = await leerComoDataURL(file)
    const img = await cargarImagen(dataUrl)

    let { width, height } = img
    if (!width || !height) return file
    if (width > maxLado || height > maxLado) {
      const escala = maxLado / Math.max(width, height)
      width = Math.round(width * escala)
      height = Math.round(height * escala)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', calidad))
    // Si el navegador no soporta webp o no mejora el tamaño, dejamos el original.
    if (!blob || blob.size >= file.size) return file

    const base = (file.name || 'imagen').replace(/\.[^.]+$/, '')
    return new File([blob], `${base}.webp`, { type: 'image/webp' })
  } catch {
    return file // ante cualquier error, se sube el archivo original
  }
}

function leerComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
