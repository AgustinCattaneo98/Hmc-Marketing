// Detecta el formato de jsPDF a partir de un data URL.
function formatoDeDataURL(b64) {
  const m = /^data:image\/(\w+)/i.exec(b64 || '')
  const t = (m?.[1] || '').toLowerCase()
  if (t.includes('png')) return 'PNG'
  if (t.includes('webp')) return 'WEBP'
  return 'JPEG'
}

export async function generarCotizacionPDF(cotizacion, dolarVenta) {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Configuración de marca desde localStorage
  let empresa = {}
  let emailConfig = {}
  try {
    empresa = JSON.parse(localStorage.getItem('hmc_empresa') || '{}')
  } catch {
    empresa = {}
  }
  try {
    emailConfig = JSON.parse(localStorage.getItem('hmc_email_config') || '{}')
  } catch {
    emailConfig = {}
  }

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14

  // Carga una imagen (URL) y la convierte a data URL base64.
  async function loadImageAsBase64(url) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  function addImageSafe(b64, x, y, w, h) {
    try {
      doc.addImage(b64, formatoDeDataURL(b64), x, y, w, h, undefined, 'FAST')
      return true
    } catch {
      return false
    }
  }

  // Footer (mismo en todas las páginas)
  function addFooter(pageNum, totalPages) {
    const y = pageH - 8
    doc.setFillColor(10, 10, 10)
    doc.rect(0, pageH - 14, pageW, 14, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    const nombreMarca = empresa.nombre || 'HMC — Handmade Cycles'
    const emailMarca = empresa.email || 'hmcbicicletas@gmail.com'
    const igMarca = empresa.instagram || '@handmadecycles'
    doc.text(`${nombreMarca} · Buenos Aires, Argentina`, margin, y)
    doc.text(emailMarca, pageW / 2, y, { align: 'center' })
    doc.setTextColor(90, 90, 90)
    doc.text(`${igMarca}  ·  Pág. ${pageNum} de ${totalPages}`, pageW - margin, y, { align: 'right' })
  }

  // ── HEADER ──────────────────────────────────────
  let y = 0
  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, pageW, 52, 'F')

  doc.setTextColor(240, 240, 234)
  doc.setFontSize(30)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('hmc', margin, 22)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  doc.setCharSpace(2)
  doc.text('HANDMADE CYCLES', margin, 30)
  doc.setCharSpace(0)
  doc.setFontSize(6)
  doc.setTextColor(100, 100, 100)
  doc.text('Buenos Aires, Argentina', margin, 37)

  const clienteNombre =
    cotizacion.empresa?.nombre ||
    `${cotizacion.contacto?.nombre || ''} ${cotizacion.contacto?.apellido || ''}`.trim() ||
    cotizacion.cliente_nombre ||
    ''
  const clienteEmail = cotizacion.empresa?.email || cotizacion.contacto?.email || cotizacion.cliente_email || ''

  let logoClienteCargado = false
  if (cotizacion.empresa?.logo_url) {
    const logoBase64 = await loadImageAsBase64(cotizacion.empresa.logo_url)
    if (logoBase64 && addImageSafe(logoBase64, pageW - 50, 8, 36, 20)) {
      logoClienteCargado = true
      if (clienteNombre) {
        doc.setFontSize(8)
        doc.setTextColor(180, 180, 180)
        doc.setFont('helvetica', 'normal')
        doc.text(clienteNombre, pageW - margin, 34, { align: 'right' })
      }
    }
  }
  if (!logoClienteCargado && clienteNombre) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 240, 234)
    doc.text(clienteNombre, pageW - margin, 22, { align: 'right' })
    if (clienteEmail) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(136, 136, 136)
      doc.text(clienteEmail, pageW - margin, 30, { align: 'right' })
    }
  }

  y = 52

  // ── BLOQUE INFO COTIZACIÓN ───────────────────────
  doc.setFillColor(17, 17, 17)
  doc.rect(0, y, pageW, 22, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  doc.setCharSpace(1.5)
  doc.text('PRESUPUESTO', margin, y + 7)
  doc.setCharSpace(0)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(240, 240, 234)
  doc.text(cotizacion.numero || '', margin, y + 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  const fechaCreacion = new Date(cotizacion.created_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  doc.text(fechaCreacion, margin, y + 20)

  doc.setFontSize(7)
  doc.setTextColor(136, 136, 136)
  doc.setCharSpace(1.5)
  doc.text('VÁLIDO POR', pageW - margin, y + 7, { align: 'right' })
  doc.setCharSpace(0)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(240, 240, 234)
  doc.text(`${cotizacion.validez_dias} días`, pageW - margin, y + 14, { align: 'right' })

  const fechaVence = new Date(
    new Date(cotizacion.created_at).getTime() + (cotizacion.validez_dias || 0) * 86400000
  )
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  doc.text(`Vence: ${fechaVence.toLocaleDateString('es-AR')}`, pageW - margin, y + 20, { align: 'right' })

  y += 22

  doc.setDrawColor(51, 51, 51)
  doc.setLineWidth(0.3)
  doc.line(0, y, pageW, y)

  // ── TÍTULO ───────────────────────────────────────
  doc.setFillColor(240, 240, 234)
  doc.rect(0, y, pageW, 18, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(10, 10, 10)
  doc.text(cotizacion.titulo || 'Cotización', margin, y + 12)
  y += 18 + 6

  // ── ITEMS ────────────────────────────────────────
  const mostrarARS = ['ARS', 'AMBAS'].includes(cotizacion.moneda_display || 'ARS')
  const items = cotizacion.cotizacion_items || []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const descuento = Number(item.descuento_item_pct || 0)
    const precioFinal = Number(item.precio_usd) * (1 - descuento / 100)
    const subtotalUSD = precioFinal * Number(item.cantidad)
    const subtotalARS = dolarVenta ? subtotalUSD * dolarVenta : null

    if (y > pageH - 60) {
      doc.addPage()
      y = 14
    }

    // Header del item
    doc.setFillColor(26, 26, 26)
    doc.rect(margin - 4, y, pageW - margin * 2 + 8, 12, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`#${i + 1}`, margin, y + 8)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 240, 234)
    doc.text(item.descripcion || 'Item', margin + 8, y + 8)
    y += 12

    // Imagen del producto
    let imageWidth = 0
    if (item.producto?.foto_url) {
      const imgBase64 = await loadImageAsBase64(item.producto.foto_url)
      if (imgBase64 && addImageSafe(imgBase64, margin, y + 3, 28, 22)) imageWidth = 32
    }
    const textX = margin + imageWidth

    if (item.detalle) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text(item.detalle, textX, y + 8)
    }

    const precioY = y + (item.detalle ? 16 : 8)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(136, 136, 136)
    doc.text('Cant.', textX, precioY)
    doc.text('P. Unit.', textX + 20, precioY)
    if (mostrarARS && dolarVenta) doc.text('En ARS', textX + 55, precioY)
    doc.text('Subtotal', pageW - margin, precioY, { align: 'right' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 240, 234)
    doc.text(`${item.cantidad}`, textX, precioY + 6)

    if (descuento > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      const tachado = `USD ${Number(item.precio_usd).toFixed(2)}`
      doc.text(tachado, textX + 20, precioY + 4)
      doc.setLineWidth(0.3)
      doc.setDrawColor(100, 100, 100)
      doc.line(textX + 20, precioY + 3, textX + 20 + doc.getTextWidth(tachado), precioY + 3)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(240, 240, 234)
      doc.text(`USD ${precioFinal.toFixed(2)}`, textX + 20, precioY + 10)
      if (mostrarARS && dolarVenta) {
        doc.setFontSize(8)
        doc.setTextColor(100, 180, 100)
        doc.text(`$ ${Math.round(precioFinal * dolarVenta).toLocaleString('es-AR')}`, textX + 55, precioY + 10)
      }
    } else {
      doc.text(`USD ${precioFinal.toFixed(2)}`, textX + 20, precioY + 6)
      if (mostrarARS && dolarVenta) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 180, 100)
        doc.text(`$ ${Math.round(precioFinal * dolarVenta).toLocaleString('es-AR')}`, textX + 55, precioY + 6)
      }
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 240, 234)
    doc.text(`USD ${subtotalUSD.toFixed(2)}`, pageW - margin, precioY + 6, { align: 'right' })
    if (mostrarARS && subtotalARS) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 180, 100)
      doc.text(`$ ${Math.round(subtotalARS).toLocaleString('es-AR')}`, pageW - margin, precioY + 13, { align: 'right' })
    }

    y += Math.max(imageWidth > 0 ? 30 : 0, item.detalle ? 28 : 20)
    doc.setDrawColor(40, 40, 40)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageW - margin, y)
    y += 4
  }

  y += 6

  // ── TOTALES + CONDICIONES DE PAGO ────────────────
  const descuentoGlobal = Number(cotizacion.descuento_pct || 0)
  const totalUSD = Number(cotizacion.total_usd || 0)
  const totalARS = dolarVenta ? totalUSD * dolarVenta : null
  const subtotalBase = Number(cotizacion.subtotal_usd || totalUSD)

  let boxH = 30
  if (descuentoGlobal > 0) boxH += 10
  if (mostrarARS && totalARS) boxH += 12

  if (y > pageH - (boxH + 30)) {
    doc.addPage()
    y = 14
  }

  const boxW = 90
  const boxX = pageW - margin - boxW
  const boxY = y

  doc.setFillColor(20, 20, 20)
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'F')
  doc.setDrawColor(51, 51, 51)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S')

  let ty = boxY + 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  doc.text('Subtotal:', boxX + 6, ty)
  doc.setTextColor(200, 200, 200)
  doc.text(`USD ${subtotalBase.toFixed(2)}`, boxX + boxW - 6, ty, { align: 'right' })
  ty += 8

  if (descuentoGlobal > 0) {
    doc.setTextColor(136, 136, 136)
    doc.text(`Descuento ${descuentoGlobal}%:`, boxX + 6, ty)
    doc.setTextColor(100, 180, 100)
    doc.text(`- USD ${((subtotalBase * descuentoGlobal) / 100).toFixed(2)}`, boxX + boxW - 6, ty, { align: 'right' })
    ty += 8
    doc.setDrawColor(51, 51, 51)
    doc.line(boxX + 4, ty - 2, boxX + boxW - 4, ty - 2)
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(240, 240, 234)
  doc.text('TOTAL USD:', boxX + 6, ty + 6)
  doc.text(`USD ${totalUSD.toFixed(2)}`, boxX + boxW - 6, ty + 6, { align: 'right' })
  ty += 10

  if (mostrarARS && totalARS) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 180, 100)
    doc.text(`≈ $ ${Math.round(totalARS).toLocaleString('es-AR')}`, boxX + boxW - 6, ty + 4, { align: 'right' })
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text(`(dólar blue: $${dolarVenta})`, boxX + 6, ty + 4)
  }

  // Condiciones de pago (anticipo/saldo 70/30) a la izquierda del box
  const condX = margin
  const condW = boxX - margin - 8
  const anticipo70 = totalUSD * 0.7
  const saldo30 = totalUSD * 0.3

  doc.setFillColor(15, 26, 15)
  doc.roundedRect(condX, boxY, condW, boxH, 2, 2, 'F')
  doc.setDrawColor(40, 100, 40)
  doc.setLineWidth(0.3)
  doc.roundedRect(condX, boxY, condW, boxH, 2, 2, 'S')
  doc.setFillColor(74, 153, 74)
  doc.rect(condX, boxY, 2, boxH, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 180, 100)
  doc.setCharSpace(1)
  doc.text('CONDICIONES DE PAGO', condX + 6, boxY + 7)
  doc.setCharSpace(0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(240, 240, 234)
  doc.text(`Anticipo (70%): USD ${anticipo70.toFixed(2)}`, condX + 6, boxY + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(`Saldo contra entrega (30%): USD ${saldo30.toFixed(2)}`, condX + 6, boxY + 23)
  if (mostrarARS && dolarVenta) {
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(`≈ Anticipo ARS ${Math.round(anticipo70 * dolarVenta).toLocaleString('es-AR')}`, condX + 6, boxY + 30)
  }

  y = boxY + boxH + 10

  // ── NOTAS DEL CLIENTE ────────────────────────────
  if (cotizacion.notas) {
    if (y > pageH - 50) {
      doc.addPage()
      y = 14
    }
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(136, 136, 136)
    doc.setCharSpace(1.5)
    doc.text('CONDICIONES ADICIONALES', margin, y)
    doc.setCharSpace(0)
    y += 5
    const notasLines = doc.splitTextToSize(cotizacion.notas, pageW - margin * 2 - 16)
    const notasH = notasLines.length * 4 + 12
    doc.setFillColor(15, 15, 15)
    doc.roundedRect(margin, y, pageW - margin * 2, notasH, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text(notasLines, margin + 8, y + 8)
    y += notasH + 8
  }

  // ── CONDICIONES GENERALES ────────────────────────
  if (y > pageH - 40) {
    doc.addPage()
    y = 14
  }
  const textoCond =
    emailConfig.pie ||
    emailConfig.pie_email ||
    '• Precios sujetos a cambio sin previo aviso\n' +
      '• Plazo de producción: 30 días hábiles desde el pago del anticipo\n' +
      `• Tipo de cambio de referencia: dólar blue · Presupuesto válido por ${cotizacion.validez_dias} días desde la emisión`
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110, 110, 110)
  doc.text(doc.splitTextToSize(textoCond, pageW - margin * 2), margin, y)

  // ── FOOTER en todas las páginas ──────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    addFooter(p, totalPages)
  }

  doc.save(`${cotizacion.numero}_${(cotizacion.titulo || 'cotizacion').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
