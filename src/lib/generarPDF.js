// Genera el PDF de una cotización con identidad HMC: minimalista, blanco y
// negro, tipografía clara y bien espaciado. Layout basado en autoTable.
// Firma estable: generarCotizacionPDF(cotizacion, dolarVenta)
export async function generarCotizacionPDF(cotizacion, dolarVenta) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Configuración de marca desde localStorage (para el footer).
  let empresaCfg = {}
  try {
    empresaCfg = JSON.parse(localStorage.getItem('hmc_empresa') || '{}')
  } catch {
    empresaCfg = {}
  }

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentW = pageW - margin * 2

  // ── Paleta (sin colores de acento) ───────────────
  const NEGRO = [10, 10, 10]
  const BLANCO = [255, 255, 255]
  const GRIS = [100, 100, 100]
  const GRIS_CLARO = [240, 240, 234]
  const GRIS_TXT = [40, 40, 40]
  const GRIS_LUZ = [180, 180, 180] // gris claro legible sobre negro

  const FOOTER_H = 12

  // ── Formateadores ────────────────────────────────
  const fUSD = (n) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fARS = (n) => '$ ' + Math.round(Number(n || 0)).toLocaleString('es-AR')

  const fecha = (d) =>
    new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // ── Footer (se dibuja en todas las páginas al final) ──
  function addFooter(pageNum, totalPages) {
    const cy = pageH - FOOTER_H / 2 + 1.5
    doc.setFillColor(...NEGRO)
    doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_LUZ)
    const nombre = empresaCfg.nombre || 'HMC — Handmade Cycles'
    const email = empresaCfg.email || 'hmcbicicletas@gmail.com'
    const ig = empresaCfg.instagram || '@handmadecycles'
    doc.text(`${nombre} · Buenos Aires · ${email} · ${ig}`, pageW / 2, cy, { align: 'center' })
    doc.setTextColor(150, 150, 150)
    doc.text(`Pág. ${pageNum} de ${totalPages}`, pageW - margin, cy, { align: 'right' })
  }

  // Salto de página manual reutilizable (deja espacio para el footer).
  function nuevaPagina() {
    doc.addPage()
    return margin + 4
  }

  // ── 1. HEADER (negro) ─────────────────────────────
  const HEADER_H = 30
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, pageW, HEADER_H, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(32)
  doc.text('hmc', margin, 19)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS_LUZ)
  doc.setCharSpace(1.2)
  doc.text('HANDMADE CYCLES · BUENOS AIRES', margin, 25)
  doc.setCharSpace(0)

  doc.setFontSize(9)
  doc.setTextColor(...BLANCO)
  doc.text(cotizacion.numero || '', pageW - margin, 12, { align: 'right' })
  doc.setFontSize(7)
  doc.setTextColor(...GRIS_LUZ)
  doc.setCharSpace(1)
  doc.text('PRESUPUESTO', pageW - margin, 18, { align: 'right' })
  doc.setCharSpace(0)
  doc.text(fecha(cotizacion.created_at), pageW - margin, 23, { align: 'right' })

  // ── 2. FRANJA DELGADA (#F0F0EA) ───────────────────
  doc.setFillColor(...GRIS_CLARO)
  doc.rect(0, HEADER_H, pageW, 3, 'F')

  // ── 3. BLOQUE CLIENTE ─────────────────────────────
  const clienteNombre =
    cotizacion.empresa?.nombre ||
    `${cotizacion.contacto?.nombre || ''} ${cotizacion.contacto?.apellido || ''}`.trim() ||
    cotizacion.cliente_nombre ||
    '—'
  const clienteContacto =
    cotizacion.empresa?.email ||
    cotizacion.empresa?.telefono ||
    cotizacion.contacto?.email ||
    cotizacion.cliente_email ||
    ''

  let y = HEADER_H + 3 + 11

  // Columna izquierda
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.setCharSpace(1)
  doc.text('PARA:', margin, y)
  doc.setCharSpace(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NEGRO)
  doc.text(clienteNombre, margin, y + 7)
  if (clienteContacto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text(clienteContacto, margin, y + 12)
  }

  // Columna derecha
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.setCharSpace(1)
  doc.text('VÁLIDO POR:', pageW - margin, y, { align: 'right' })
  doc.setCharSpace(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NEGRO)
  doc.text(`${cotizacion.validez_dias || 0} días`, pageW - margin, y + 7, { align: 'right' })
  const fechaVence = fecha(
    new Date(cotizacion.created_at).getTime() + (cotizacion.validez_dias || 0) * 86400000
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(`Vence: ${fechaVence}`, pageW - margin, y + 12, { align: 'right' })

  y += 20

  // ── 4. TÍTULO ─────────────────────────────────────
  doc.setDrawColor(...NEGRO)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NEGRO)
  doc.text(cotizacion.titulo || 'Cotización', margin, y)
  y += 5
  if (cotizacion.notas) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    const notasLines = doc.splitTextToSize(cotizacion.notas, contentW).slice(0, 2)
    doc.text(notasLines, margin, y + 1)
    y += notasLines.length * 4 + 1
  }
  y += 5

  // ── 5. TABLA DE ÍTEMS ─────────────────────────────
  const mostrarARS =
    ['ARS', 'AMBAS'].includes(cotizacion.moneda_display || 'ARS') && !!dolarVenta
  const items = cotizacion.cotizacion_items || []

  const head = mostrarARS
    ? [['#', 'Descripción', 'Cant.', 'P. Unit. USD', 'Subtotal USD', 'P. Unit. ARS', 'Subtotal ARS']]
    : [['#', 'Descripción', 'Cant.', 'P. Unit. USD', 'Subtotal USD']]

  const body = items.map((item, i) => {
    const desc = Number(item.descuento_item_pct || 0)
    const pUnit = Number(item.precio_usd || 0) * (1 - desc / 100)
    const sub = pUnit * Number(item.cantidad || 0)
    // El detalle va en la misma celda de descripción, en una línea aparte.
    let descripcion = item.descripcion || 'Ítem'
    if (item.detalle) descripcion += '\n' + item.detalle
    const row = [String(i + 1), descripcion, String(item.cantidad ?? ''), fUSD(pUnit), fUSD(sub)]
    if (mostrarARS) row.push(fARS(pUnit * dolarVenta), fARS(sub * dolarVenta))
    return row
  })

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: margin, right: margin, bottom: FOOTER_H + 4 },
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: GRIS_TXT,
      cellPadding: 2,
      valign: 'middle',
      lineColor: [228, 228, 222],
      lineWidth: 0.1,
    },
    headStyles: { fillColor: NEGRO, textColor: BLANCO, fontSize: 8, fontStyle: 'bold', halign: 'left' },
    bodyStyles: { fontSize: 8, textColor: GRIS_TXT },
    alternateRowStyles: { fillColor: [248, 248, 244] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    // El detalle (línea extra de la celda 1) se muestra más chico y gris.
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const it = items[data.row.index]
        if (it?.detalle) data.cell.styles.fontSize = 7.5
      }
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // ── 6. BLOQUE DE TOTALES (no se corta entre páginas) ──
  const descuentoGlobal = Number(cotizacion.descuento_pct || 0)
  const totalUSD = Number(cotizacion.total_usd || 0)
  const subtotalBase = Number(cotizacion.subtotal_usd || totalUSD)
  const totalARS = mostrarARS ? totalUSD * dolarVenta : null

  if (pageH - y < 60) y = nuevaPagina()

  const boxW = 90
  const boxX = pageW - margin - boxW
  const padX = 6
  const boxH = 28 + (descuentoGlobal > 0 ? 6 : 0) + (totalARS ? 8 : 0)

  doc.setFillColor(...GRIS_CLARO)
  doc.rect(boxX, y, boxW, boxH, 'F')
  doc.setDrawColor(205, 205, 198)
  doc.setLineWidth(0.2)
  doc.rect(boxX, y, boxW, boxH, 'S')

  let ry = y + 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text('Subtotal:', boxX + padX, ry)
  doc.setTextColor(...GRIS_TXT)
  doc.text(`USD ${fUSD(subtotalBase)}`, boxX + boxW - padX, ry, { align: 'right' })
  ry += 6

  if (descuentoGlobal > 0) {
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text(`Descuento ${descuentoGlobal}%:`, boxX + padX, ry)
    doc.text(`- USD ${fUSD((subtotalBase * descuentoGlobal) / 100)}`, boxX + boxW - padX, ry, { align: 'right' })
    ry += 6
  }

  doc.setDrawColor(200, 200, 193)
  doc.setLineWidth(0.2)
  doc.line(boxX + padX, ry - 2, boxX + boxW - padX, ry - 2)
  ry += 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NEGRO)
  doc.text('TOTAL USD:', boxX + padX, ry + 2)
  doc.text(`USD ${fUSD(totalUSD)}`, boxX + boxW - padX, ry + 2, { align: 'right' })
  ry += 8

  if (totalARS) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    const arsTxt = `≈ ARS: ${fARS(totalARS)}`
    doc.setFontSize(9)
    if (doc.getTextWidth(arsTxt) > boxW - padX * 2) doc.setFontSize(7)
    const arsLines = doc.splitTextToSize(arsTxt, boxW - padX * 2)
    doc.text(arsLines, boxX + boxW - padX, ry, { align: 'right' })
  }

  // Tipo de cambio fuera del recuadro
  let belowY = y + boxH + 4
  if (dolarVenta) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text(`(dólar blue: $${dolarVenta})`, boxX + boxW - padX, belowY, { align: 'right' })
    belowY += 4
  }

  y = belowY + 4

  // ── 7. CONDICIONES DE PAGO ────────────────────────
  if (pageH - y < 36) y = nuevaPagina()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NEGRO)
  doc.setCharSpace(0.5)
  doc.text('CONDICIONES DE PAGO', margin, y)
  doc.setCharSpace(0)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  if (cotizacion.condiciones_pago) {
    const cpLines = doc.splitTextToSize(cotizacion.condiciones_pago, contentW)
    doc.text(cpLines, margin, y)
    y += cpLines.length * 4 + 1
  }
  const anticipo = totalUSD * 0.7
  const saldo = totalUSD * 0.3
  doc.text(
    `Anticipo (70%): USD ${fUSD(anticipo)}${mostrarARS ? `  ·  ≈ ${fARS(anticipo * dolarVenta)}` : ''}`,
    margin,
    y
  )
  y += 4
  doc.text(
    `Saldo contra entrega (30%): USD ${fUSD(saldo)}${mostrarARS ? `  ·  ≈ ${fARS(saldo * dolarVenta)}` : ''}`,
    margin,
    y
  )
  y += 8

  // ── 8. CONDICIONES ADICIONALES ────────────────────
  if (pageH - y < 30) y = nuevaPagina()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NEGRO)
  doc.setCharSpace(0.5)
  doc.text('CONDICIONES ADICIONALES', margin, y)
  doc.setCharSpace(0)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  const adicionales = []
  if (cotizacion.notas_internas) adicionales.push(cotizacion.notas_internas)
  adicionales.push('• Precios sujetos a cambio sin previo aviso')
  adicionales.push('• Plazo de producción: 30 días hábiles desde el pago del anticipo')
  adicionales.push('• Tipo de cambio de referencia: dólar blue')
  adicionales.push(`• Presupuesto válido por ${cotizacion.validez_dias || 0} días desde la emisión`)
  doc.text(doc.splitTextToSize(adicionales.join('\n'), contentW), margin, y)

  // ── 9. FOOTER en todas las páginas ────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    addFooter(p, totalPages)
  }

  doc.save(`${cotizacion.numero}_${(cotizacion.titulo || 'cotizacion').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
