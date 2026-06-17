import { supabase } from './supabase'

// Helpers de acceso a datos.
// Cada función retorna { data, error } (mismo contrato que supabase-js).

// ============================================================
// EMPRESAS
// ============================================================

export async function getEmpresas() {
  // Incluye el conteo de contactos relacionados (contactos[0].count) y los
  // segmentos (etiquetas) asignados vía la tabla puente empresa_segmentos.
  const { data, error } = await supabase
    .from('empresas')
    .select('*, contactos(count), empresa_segmentos(segmentos(id, nombre, color))')
    .order('created_at', { ascending: false })
  if (error) return { data: null, error }
  // Aplanamos empresa_segmentos -> empresa.segmentos = [{id, nombre, color}, ...]
  const normalizado = (data ?? []).map((e) => ({
    ...e,
    segmentos: (e.empresa_segmentos ?? []).map((r) => r.segmentos).filter(Boolean),
  }))
  return { data: normalizado, error: null }
}

export async function getEmpresa(id) {
  // Incluye los contactos vinculados y los segmentos (etiquetas) asignados.
  const { data, error } = await supabase
    .from('empresas')
    .select('*, contactos(*), empresa_segmentos(segmentos(id, nombre, color))')
    .eq('id', id)
    .single()
  if (error) return { data: null, error }
  return {
    data: {
      ...data,
      segmentos: (data.empresa_segmentos ?? []).map((r) => r.segmentos).filter(Boolean),
    },
    error: null,
  }
}

export function createEmpresa(empresa) {
  return supabase.from('empresas').insert(empresa).select().single()
}

export function updateEmpresa(id, cambios) {
  return supabase.from('empresas').update(cambios).eq('id', id).select().single()
}

export function deleteEmpresa(id) {
  return supabase.from('empresas').delete().eq('id', id)
}

// ============================================================
// CONTACTOS
// ============================================================

export function getContactos() {
  return supabase
    .from('contactos')
    .select('*, empresa:empresa_id(id, nombre, segmento)')
    .order('nombre', { ascending: true })
}

export function getContactosByEmpresa(empresaId) {
  return supabase
    .from('contactos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true })
}

export function getContacto(id) {
  return supabase
    .from('contactos')
    .select('*, empresa:empresas(id, nombre)')
    .eq('id', id)
    .single()
}

export function createContacto(contacto) {
  return supabase.from('contactos').insert(contacto).select().single()
}

export function updateContacto(id, cambios) {
  return supabase
    .from('contactos')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
}

export function deleteContacto(id) {
  return supabase.from('contactos').delete().eq('id', id)
}

// ============================================================
// CAMPANAS
// ============================================================

export function getCampanas() {
  // Incluye el conteo de clientes asignados (campana_clientes[0].count).
  return supabase
    .from('campanas')
    .select('*, campana_clientes(count)')
    .order('created_at', { ascending: false })
}

export function getCampana(id) {
  return supabase.from('campanas').select('*').eq('id', id).single()
}

export function createCampana(campana) {
  return supabase.from('campanas').insert(campana).select().single()
}

export function updateCampana(id, cambios) {
  return supabase.from('campanas').update(cambios).eq('id', id).select().single()
}

export function deleteCampana(id) {
  return supabase.from('campanas').delete().eq('id', id)
}

// ============================================================
// CAMPANA_CLIENTES (gestión comercial personalizada)
// ============================================================

export function getCampanaClientes(campanaId) {
  return supabase
    .from('campana_clientes')
    .select(
      `*,
       empresa:empresa_id(id, nombre, segmento, email, telefono, logo_url),
       contacto:contacto_id(id, nombre, apellido, cargo, email, whatsapp, foto_url, empresa:empresa_id(nombre))`
    )
    .eq('campana_id', campanaId)
    .order('created_at', { ascending: true })
}

export function addClienteEmpresa(campanaId, empresaId) {
  return supabase
    .from('campana_clientes')
    .insert({ campana_id: campanaId, tipo: 'empresa', empresa_id: empresaId })
    .select()
    .single()
}

export function addClienteContacto(campanaId, contactoId) {
  return supabase
    .from('campana_clientes')
    .insert({ campana_id: campanaId, tipo: 'contacto', contacto_id: contactoId })
    .select()
    .single()
}

export function removeCliente(id) {
  return supabase.from('campana_clientes').delete().eq('id', id)
}

export function updateClienteEmail(id, cambios) {
  // cambios: { email_asunto, email_bloques, email_estado }
  return supabase.from('campana_clientes').update(cambios).eq('id', id).select().single()
}

export function updateClienteWhatsapp(id, cambios) {
  // cambios: { whatsapp_texto, whatsapp_estado }
  return supabase.from('campana_clientes').update(cambios).eq('id', id).select().single()
}

export function updateClienteNotas(id, notas) {
  return supabase.from('campana_clientes').update({ notas }).eq('id', id).select().single()
}

// ============================================================
// CAMPANA_ACTIVIDADES
// ============================================================

export function getActividades(campanaClienteId) {
  return supabase
    .from('campana_actividades')
    .select('*')
    .eq('campana_cliente_id', campanaClienteId)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
}

// Todas las actividades CRM (con datos de la oportunidad), con filtros opcionales.
export function getTodasActividadesCRM(filtros = {}) {
  let q = supabase
    .from('crm_actividades')
    .select(
      `*,
       oportunidad:oportunidad_id(
         id, titulo, etapa, color,
         empresa:empresa_id(id, nombre, logo_url, segmento),
         contacto:contacto_id(id, nombre, apellido, foto_url)
       )`
    )
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })

  if (filtros.estado) q = q.eq('estado', filtros.estado)
  if (filtros.tipo) q = q.eq('tipo', filtros.tipo)
  if (filtros.oportunidad_id) q = q.eq('oportunidad_id', filtros.oportunidad_id)
  if (filtros.vencidas) {
    q = q.lt('fecha_vencimiento', new Date().toISOString()).neq('estado', 'completada')
  }
  return q
}

// Actividades CRM dentro de un rango de fechas (para el calendario).
export function getActividadesCalendario(desde, hasta) {
  return supabase
    .from('crm_actividades')
    .select(
      `*,
       oportunidad:oportunidad_id(
         id, titulo, color,
         empresa:empresa_id(nombre, logo_url),
         contacto:contacto_id(nombre, apellido)
       )`
    )
    .gte('fecha_vencimiento', desde.toISOString())
    .lte('fecha_vencimiento', hasta.toISOString())
    .order('fecha_vencimiento', { ascending: true })
}

// Actividades de campañas dentro de un rango (para el calendario).
export function getActividadesCampanaCalendario(desde, hasta) {
  return supabase
    .from('campana_actividades')
    .select(
      `*,
       campana_cliente:campana_cliente_id(
         tipo,
         empresa:empresa_id(nombre),
         contacto:contacto_id(nombre, apellido),
         campana:campana_id(nombre)
       )`
    )
    .gte('fecha_vencimiento', desde.toISOString())
    .lte('fecha_vencimiento', hasta.toISOString())
    .order('fecha_vencimiento', { ascending: true })
}

export function getTodasActividades(campanaId) {
  return supabase
    .from('campana_actividades')
    .select(
      `*,
       campana_cliente:campana_cliente_id(
         tipo,
         empresa:empresa_id(nombre),
         contacto:contacto_id(nombre, apellido)
       )`
    )
    .eq('campana_id', campanaId)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
}

export function createActividad(payload) {
  return supabase.from('campana_actividades').insert(payload).select().single()
}

export function updateActividad(id, payload) {
  return supabase.from('campana_actividades').update(payload).eq('id', id).select().single()
}

export function deleteActividad(id) {
  return supabase.from('campana_actividades').delete().eq('id', id)
}

export function toggleActividad(id, completada) {
  return supabase
    .from('campana_actividades')
    .update({
      estado: completada ? 'completada' : 'pendiente',
      completada_at: completada ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()
}

// ============================================================
// PLANTILLAS_EMAIL
// ============================================================

export function getPlantillas() {
  return supabase
    .from('plantillas_email')
    .select('*')
    .order('created_at', { ascending: false })
}

export function createPlantilla(payload) {
  return supabase.from('plantillas_email').insert(payload).select().single()
}

export function updatePlantilla(id, payload) {
  return supabase.from('plantillas_email').update(payload).eq('id', id).select().single()
}

export function deletePlantilla(id) {
  return supabase.from('plantillas_email').delete().eq('id', id)
}

// ============================================================
// BLOQUES_EMAIL (legacy — no usado por el modelo v2)
// ============================================================

export function getBloquesByCampana(campanaId) {
  return supabase
    .from('bloques_email')
    .select('*')
    .eq('campana_id', campanaId)
    .order('orden', { ascending: true })
}

// Inserta o actualiza un bloque. Si trae `id` actualiza, si no, crea.
export function upsertBloque(bloque) {
  return supabase.from('bloques_email').upsert(bloque).select().single()
}

export function deleteBloque(id) {
  return supabase.from('bloques_email').delete().eq('id', id)
}

// ============================================================
// CRM — OPORTUNIDADES
// ============================================================

export function getOportunidades() {
  return supabase
    .from('crm_oportunidades')
    .select(
      `*,
       empresa:empresa_id(id, nombre, segmento, logo_url, telefono, email),
       contacto:contacto_id(id, nombre, apellido, foto_url, whatsapp, email),
       campana:campana_id(id, nombre),
       crm_actividades(*),
       cotizaciones(count)`
    )
    .order('created_at', { ascending: false })
}

export function getOportunidad(id) {
  return supabase
    .from('crm_oportunidades')
    .select(
      `*,
       empresa:empresa_id(id, nombre, segmento, logo_url),
       contacto:contacto_id(id, nombre, apellido, cargo, email, whatsapp, foto_url),
       campana:campana_id(id, nombre),
       crm_actividades(*),
       cotizaciones(id, numero, titulo, estado, total_usd, total_ars)`
    )
    .eq('id', id)
    .single()
}

export function createOportunidad(payload) {
  return supabase.from('crm_oportunidades').insert(payload).select().single()
}

export function updateOportunidad(id, payload) {
  return supabase.from('crm_oportunidades').update(payload).eq('id', id).select().single()
}

export function deleteOportunidad(id) {
  return supabase.from('crm_oportunidades').delete().eq('id', id)
}

// ============================================================
// CRM — ACTIVIDADES
// ============================================================

export function getActividadesCRM(oportunidadId) {
  return supabase
    .from('crm_actividades')
    .select('*')
    .eq('oportunidad_id', oportunidadId)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
}

export function createActividadCRM(payload) {
  return supabase.from('crm_actividades').insert(payload).select().single()
}

export function updateActividadCRM(id, payload) {
  return supabase.from('crm_actividades').update(payload).eq('id', id).select().single()
}

export function deleteActividadCRM(id) {
  return supabase.from('crm_actividades').delete().eq('id', id)
}

export function toggleActividadCRM(id, completada) {
  return supabase
    .from('crm_actividades')
    .update({
      estado: completada ? 'completada' : 'pendiente',
      completada_at: completada ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()
}

// ============================================================
// PRODUCTOS — CATEGORÍAS
// ============================================================

export function getCategorias() {
  return supabase
    .from('producto_categorias')
    .select('*, productos(count)')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })
}

export function createCategoria(payload) {
  return supabase.from('producto_categorias').insert(payload).select().single()
}

export function updateCategoria(id, payload) {
  return supabase.from('producto_categorias').update(payload).eq('id', id).select().single()
}

export function deleteCategoria(id) {
  return supabase.from('producto_categorias').delete().eq('id', id)
}

// ============================================================
// PRODUCTOS
// ============================================================

export function getProductos(categoriaId) {
  let query = supabase
    .from('productos')
    .select('*, categoria:categoria_id(id, nombre, color), producto_variantes(*)')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })
  if (categoriaId) query = query.eq('categoria_id', categoriaId)
  return query
}

export function getProducto(id) {
  return supabase
    .from('productos')
    .select('*, categoria:categoria_id(*), producto_variantes(*)')
    .eq('id', id)
    .single()
}

export function createProducto(payload) {
  return supabase.from('productos').insert(payload).select().single()
}

export function updateProducto(id, payload) {
  return supabase.from('productos').update(payload).eq('id', id).select().single()
}

export function deleteProducto(id) {
  return supabase.from('productos').delete().eq('id', id)
}

// Variantes / upgrades
export function createVariante(payload) {
  return supabase.from('producto_variantes').insert(payload).select().single()
}

export function updateVariante(id, payload) {
  return supabase.from('producto_variantes').update(payload).eq('id', id).select().single()
}

export function deleteVariante(id) {
  return supabase.from('producto_variantes').delete().eq('id', id)
}

// ============================================================
// COTIZACIONES
// ============================================================

export function getCotizaciones() {
  return supabase
    .from('cotizaciones')
    .select(
      `*,
       empresa:empresa_id(id, nombre, logo_url),
       contacto:contacto_id(id, nombre, apellido),
       oportunidad:oportunidad_id(id, titulo),
       cotizacion_items(count)`
    )
    .order('created_at', { ascending: false })
}

export function getCotizacion(id) {
  return supabase
    .from('cotizaciones')
    .select(
      `*,
       empresa:empresa_id(id, nombre, logo_url, email),
       contacto:contacto_id(id, nombre, apellido, email),
       oportunidad:oportunidad_id(id, titulo, etapa),
       cotizacion_items(*, producto:producto_id(id, nombre, foto_url))`
    )
    .eq('id', id)
    .single()
}

function nuevoNumero() {
  return `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
}

export function createCotizacion(payload) {
  return supabase
    .from('cotizaciones')
    .insert({ ...payload, numero: payload.numero ?? nuevoNumero() })
    .select()
    .single()
}

export function updateCotizacion(id, payload) {
  return supabase.from('cotizaciones').update(payload).eq('id', id).select().single()
}

export function deleteCotizacion(id) {
  return supabase.from('cotizaciones').delete().eq('id', id)
}

// Duplica una cotización con sus items (estado borrador, número nuevo).
export async function duplicarCotizacion(id) {
  const { data: orig, error: err } = await getCotizacion(id)
  if (err) return { data: null, error: err }

  const { data: nueva, error: insErr } = await supabase
    .from('cotizaciones')
    .insert({
      numero: nuevoNumero(),
      titulo: `${orig.titulo} (copia)`,
      estado: 'borrador',
      empresa_id: orig.empresa_id,
      contacto_id: orig.contacto_id,
      cliente_nombre: orig.cliente_nombre,
      cliente_email: orig.cliente_email,
      dolar_venta: orig.dolar_venta,
      moneda_display: orig.moneda_display,
      subtotal_usd: orig.subtotal_usd,
      descuento_pct: orig.descuento_pct,
      total_usd: orig.total_usd,
      total_ars: orig.total_ars,
      validez_dias: orig.validez_dias,
      notas: orig.notas,
      notas_internas: orig.notas_internas,
    })
    .select()
    .single()
  if (insErr) return { data: null, error: insErr }

  const items = orig.cotizacion_items ?? []
  if (items.length) {
    const rows = items.map((it) => ({
      cotizacion_id: nueva.id,
      producto_id: it.producto_id,
      descripcion: it.descripcion,
      detalle: it.detalle,
      cantidad: it.cantidad,
      precio_usd: it.precio_usd,
      descuento_item_pct: it.descuento_item_pct,
      subtotal_usd: it.subtotal_usd,
      orden: it.orden,
    }))
    await supabase.from('cotizacion_items').insert(rows)
  }
  return { data: nueva, error: null }
}

export function getCotizacionesByOportunidad(oportunidadId) {
  return supabase
    .from('cotizaciones')
    .select('*, cotizacion_items(count)')
    .eq('oportunidad_id', oportunidadId)
    .order('created_at', { ascending: false })
}

export function asignarCotizacionAOportunidad(cotizacionId, oportunidadId) {
  return supabase
    .from('cotizaciones')
    .update({ oportunidad_id: oportunidadId })
    .eq('id', cotizacionId)
    .select()
    .single()
}

// Items
export function createItem(payload) {
  return supabase.from('cotizacion_items').insert(payload).select().single()
}

export function updateItem(id, payload) {
  return supabase.from('cotizacion_items').update(payload).eq('id', id).select().single()
}

export function deleteItem(id) {
  return supabase.from('cotizacion_items').delete().eq('id', id)
}

// Actualiza el campo orden de varios items.
export async function reordenarItems(items) {
  for (let i = 0; i < items.length; i++) {
    await supabase.from('cotizacion_items').update({ orden: i }).eq('id', items[i].id)
  }
  return { error: null }
}

// ============================================================
// VENTAS
// ============================================================

// Marca una cotización como cobrada: registra la venta, actualiza la
// cotización y (opcional) mueve la oportunidad a cerrado_ganado.
export async function marcarCotizacionCobrada(cotizacionId, payload) {
  const { data: cot, error: e1 } = await getCotizacion(cotizacionId)
  if (e1) return { data: null, error: e1 }

  const totalArs = Number(cot.total_usd ?? 0) * Number(payload.dolar_venta ?? 0)
  const ahora = new Date().toISOString()

  const { data: venta, error: e2 } = await supabase
    .from('ventas')
    .insert({
      cotizacion_id: cotizacionId,
      oportunidad_id: cot.oportunidad_id,
      empresa_id: cot.empresa_id,
      contacto_id: cot.contacto_id,
      titulo: cot.titulo,
      total_usd: cot.total_usd,
      total_ars: totalArs,
      dolar_venta: payload.dolar_venta,
      comprobante_url: payload.comprobante_url || null,
      comprobante_nombre: payload.comprobante_nombre || null,
      fecha_cobro: ahora,
      notas: payload.notas || null,
    })
    .select()
    .single()
  if (e2) return { data: null, error: e2 }

  await supabase
    .from('cotizaciones')
    .update({ cobrada: true, fecha_cobro: ahora, estado: 'aprobada', venta_id: venta.id })
    .eq('id', cotizacionId)

  if (cot.oportunidad_id && payload.mover_oportunidad !== false) {
    await updateOportunidad(cot.oportunidad_id, { etapa: 'cerrado_ganado' })
  }

  return { data: venta, error: null }
}

export function getVenta(id) {
  return supabase
    .from('ventas')
    .select(
      `*,
       cotizacion:cotizacion_id(numero, titulo),
       empresa:empresa_id(nombre, logo_url),
       contacto:contacto_id(nombre, apellido)`
    )
    .eq('id', id)
    .single()
}

export function getVentas() {
  return supabase
    .from('ventas')
    .select(
      `*,
       cotizacion:cotizacion_id(numero, titulo),
       empresa:empresa_id(nombre, logo_url),
       contacto:contacto_id(nombre, apellido)`
    )
    .order('fecha_cobro', { ascending: false })
}

// ============================================================
// SEGMENTOS (etiquetas dinámicas de empresas)
// Nota: estas funciones lanzan el error (throw) en vez de devolver
// { data, error }, por eso los consumidores usan try/catch.
// ============================================================

export async function getSegmentos() {
  const { data, error } = await supabase
    .from('segmentos')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export async function createSegmento(nombre) {
  // Paleta de colores que rota automáticamente según cuántos haya.
  const colores = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981',
                   '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16']
  const { data: existing } = await supabase.from('segmentos').select('id').order('created_at')
  const color = colores[(existing?.length ?? 0) % colores.length]
  const { data, error } = await supabase
    .from('segmentos')
    .insert({ nombre: nombre.trim(), color })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEmpresaSegmentos(empresa_id) {
  const { data, error } = await supabase
    .from('empresa_segmentos')
    .select('segmento_id, segmentos(id, nombre, color)')
    .eq('empresa_id', empresa_id)
  if (error) throw error
  return data.map((r) => r.segmentos)
}

export async function setEmpresaSegmentos(empresa_id, segmento_ids) {
  // Reemplaza todos los segmentos de la empresa.
  await supabase.from('empresa_segmentos').delete().eq('empresa_id', empresa_id)
  if (!segmento_ids.length) return
  const rows = segmento_ids.map((sid) => ({ empresa_id, segmento_id: sid }))
  const { error } = await supabase.from('empresa_segmentos').insert(rows)
  if (error) throw error
}
