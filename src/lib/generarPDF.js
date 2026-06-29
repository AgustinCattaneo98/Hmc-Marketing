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

  // Bloque derecho ordenado: label, número y fecha (sin letter-spacing para
  // que alineen perfecto a la derecha).
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS_LUZ)
  doc.text('PRESUPUESTO', pageW - margin, 12, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BLANCO)
  doc.text(cotizacion.numero || '', pageW - margin, 18, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS_LUZ)
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

  let y = HEADER_H + 3 + 9 // ~18px entre header y bloque PARA/VÁLIDO POR

  // Columna izquierda
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text('PARA:', margin, y)
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
  doc.text('VÁLIDO POR:', pageW - margin, y, { align: 'right' })
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

  y += 19 // ~14px entre bloque cliente y título

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
    ? [['#', 'Descripción', 'Cant.', 'P. Unit. USD', 'Subtotal USD', 'P. Unit. Pesos', 'Subtotal Pesos']]
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
      0: { cellWidth: 8, halign: 'center' }, // #
      1: { cellWidth: 'auto' }, // Descripción (flexible)
      2: { cellWidth: 14, halign: 'center' }, // Cant.
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
    // El detalle (línea extra de la celda 1) se muestra más chico y gris.
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const it = items[data.row.index]
        if (it?.detalle) data.cell.styles.fontSize = 7.5
      }
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 6 // ~10px entre tabla y totales

  // ── 6. BLOQUE DE TOTALES ──────────────────────────
  const descuentoGlobal = Number(cotizacion.descuento_pct || 0)
  const totalUSD = Number(cotizacion.total_usd || 0)
  const subtotalBase = Number(cotizacion.subtotal_usd || totalUSD)
  const totalARS = mostrarARS ? totalUSD * dolarVenta : null
  const hayDesc = descuentoGlobal > 0
  // Conversiones a ARS para mostrar subtotal y descuento en pesos (solo display).
  const subtotalARS = totalARS != null ? subtotalBase * dolarVenta : null
  const descMontoUSD = (subtotalBase * descuentoGlobal) / 100
  const descMontoARS = totalARS != null ? descMontoUSD * dolarVenta : null

  // Baselines de cada fila respecto del tope del recuadro.
  const oSub = 8
  const oDesc = oSub + 6
  const oSepCursor = (hayDesc ? oDesc : oSub) + 6
  const oTotal = oSepCursor + 5
  const oArs = oTotal + 6
  const boxH = (totalARS ? oArs : oTotal) + 5

  if (pageH - y < boxH + 24) y = nuevaPagina()

  const boxW = 85
  const boxX = pageW - margin - boxW
  const pad = 6
  const labX = boxX + pad
  const valX = boxX + boxW - pad

  // Recuadro
  doc.setFillColor(...GRIS_CLARO)
  doc.rect(boxX, y, boxW, boxH, 'F')
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(boxX, y, boxW, boxH, 'S')

  // Subtotal (misma tipografía y tamaño que Descuento; en pesos)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text('Subtotal:', labX, y + oSub)
  doc.setTextColor(...GRIS_TXT)
  doc.text(
    subtotalARS != null ? fARS(subtotalARS) : `USD ${fUSD(subtotalBase)}`,
    valX,
    y + oSub,
    { align: 'right' }
  )

  // Descuento (mismo estilo que Subtotal; en pesos; signo "-" ASCII)
  if (hayDesc) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text(`Descuento ${descuentoGlobal}%:`, labX, y + oDesc)
    doc.setTextColor(...GRIS_TXT)
    doc.text(
      descMontoARS != null ? `- ${fARS(descMontoARS)}` : `- USD ${fUSD(descMontoUSD)}`,
      valX,
      y + oDesc,
      { align: 'right' }
    )
  }

  // Línea separadora
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(labX, y + oSepCursor, valX, y + oSepCursor)

  // TOTAL principal en PESOS argentinos; USD secundario debajo.
  if (totalARS) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NEGRO)
    doc.text('TOTAL PESOS:', labX, y + oTotal)
    const pesosLines = doc.splitTextToSize(fARS(totalARS), boxW - pad * 2 - 26)
    doc.text(pesosLines, valX, y + oTotal, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text('Total USD:', labX, y + oArs)
    doc.text(`USD ${fUSD(totalUSD)}`, valX, y + oArs, { align: 'right' })
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NEGRO)
    doc.text('TOTAL USD:', labX, y + oTotal)
    doc.text(`USD ${fUSD(totalUSD)}`, valX, y + oTotal, { align: 'right' })
  }

  // Tipo de cambio, debajo del recuadro, alineado a la derecha
  let belowY = y + boxH + 5
  if (dolarVenta) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text(`(dólar blue: $${dolarVenta})`, valX, belowY, { align: 'right' })
    belowY += 4
  }

  y = belowY + 9 // ~18px entre totales y CONDICIONES DE PAGO

  // ── 7 y 8. CONDICIONES (texto editable por el usuario) ──
  // Bloque de condiciones legible: título + texto en negro tenue, bien espaciado.
  const COND_TXT = [45, 45, 45]
  function bloqueCondiciones(titulo, texto) {
    if (!texto || !texto.trim()) return
    const lineas = doc.splitTextToSize(texto.trim(), contentW)
    const alto = 7 + lineas.length * 4.8
    if (pageH - y < alto + 8) y = nuevaPagina()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...NEGRO)
    doc.setCharSpace(0.6)
    doc.text(titulo, margin, y)
    doc.setCharSpace(0)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...COND_TXT)
    doc.setLineHeightFactor(1.4)
    doc.text(lineas, margin, y)
    doc.setLineHeightFactor(1.15)
    y += lineas.length * 4.8 + 6
  }

  bloqueCondiciones('CONDICIONES DE PAGO', cotizacion.condiciones_pago)

  // Condiciones generales: usa el texto del usuario o, si está vacío, un estándar.
  const generales =
    cotizacion.condiciones_generales && cotizacion.condiciones_generales.trim()
      ? cotizacion.condiciones_generales
      : [
          '• Precios sujetos a cambio sin previo aviso.',
          '• Plazo de producción: 30 días hábiles desde el pago del anticipo.',
          '• Tipo de cambio de referencia: dólar blue.',
          `• Presupuesto válido por ${cotizacion.validez_dias || 0} días desde la emisión.`,
        ].join('\n')
  bloqueCondiciones('CONDICIONES GENERALES', generales)

  // ── 9. FOOTER en todas las páginas ────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    addFooter(p, totalPages)
  }

  doc.save(`${cotizacion.numero}_${(cotizacion.titulo || 'cotizacion').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
