import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  TbArrowLeft,
  TbGripVertical,
  TbTrash,
  TbPlus,
  TbX,
  TbSearch,
  TbRefresh,
  TbDownload,
  TbCopy,
  TbDeviceFloppy,
  TbSend,
  TbCheck,
  TbBike,
  TbPackage,
  TbCash,
  TbFileCheck,
} from 'react-icons/tb'
import {
  getCotizacion,
  updateCotizacion,
  duplicarCotizacion,
  deleteCotizacion,
  createItem,
  updateItem,
  deleteItem,
  getEmpresas,
  getContactos,
  getCategorias,
  getProductos,
  asignarCotizacionAOportunidad,
  marcarCotizacionCobrada,
} from '../lib/db'
import { ETAPA_MAP } from '../lib/crm'
import { supabase } from '../lib/supabase'
import AsignarOportunidadModal from '../components/AsignarOportunidadModal'
import Toast from '../components/Toast'
import { useDolar } from '../hooks/useDolar'
import { formatUSD, formatARS, haceCuanto, convertir } from '../lib/dolar'
import { ESTADOS_COT, ESTADOS_COT_LIST, subtotalItem, calcularTotales } from '../lib/cotizaciones'
import { iniciales } from '../lib/utils'
import { generarCotizacionPDF } from '../lib/generarPDF'
import { confirmDialog } from '../components/confirm'
import {
  STORAGE,
  DEFAULT_COT_COND_PAGO,
  DEFAULT_COT_COND_GENERALES,
  loadStr,
  saveStr,
} from '../lib/settings'
import { guardarConfig } from '../lib/config'

const uid = () => crypto.randomUUID?.() ?? `i_${Date.now()}_${Math.random().toString(36).slice(2)}`
const inputBase = 'rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

export default function CotizacionEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { cotizacion: dolar, loading: dolarLoading, refetch } = useDolar()

  const [cot, setCot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Campos editables
  const [titulo, setTitulo] = useState('')
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [items, setItems] = useState([])
  const [eliminados, setEliminados] = useState([])
  const [descuento, setDescuento] = useState(0)
  const [validez, setValidez] = useState(7)
  const [monedaDisplay, setMonedaDisplay] = useState('ARS')
  const [notas, setNotas] = useState('')
  const [condPago, setCondPago] = useState('')
  const [condGenerales, setCondGenerales] = useState('')
  const [tc, setTc] = useState(0)

  const [catModal, setCatModal] = useState(false)
  const [cliModal, setCliModal] = useState(false)
  const [opModal, setOpModal] = useState(false)
  const [confirmDesde, setConfirmDesde] = useState(null) // { id, titulo } | null
  const [cobroModal, setCobroModal] = useState(false)
  const [toast, setToast] = useState({ visible: false, mensaje: '' })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    setLoading(true)
    const { data, error: err } = await getCotizacion(id)
    if (err) {
      setError('No se pudo cargar la cotización: ' + err.message)
      setLoading(false)
      return
    }
    setCot(data)
    setTitulo(data.titulo ?? '')
    setDescuento(Number(data.descuento_pct ?? 0))
    setValidez(data.validez_dias ?? 7)
    setMonedaDisplay(data.moneda_display ?? 'ARS')
    setNotas(data.notas ?? '')
    // Condiciones: si la cotización ya las tiene, se usan; si no, se prellena
    // con el predeterminado guardado (o el default del sistema).
    setCondPago(
      data.condiciones_pago ?? (loadStr(STORAGE.cotCondPago) || DEFAULT_COT_COND_PAGO)
    )
    setCondGenerales(
      data.condiciones_generales ?? (loadStr(STORAGE.cotCondGenerales) || DEFAULT_COT_COND_GENERALES)
    )
    setTc(Number(data.dolar_venta) || 0)
    setItems(
      (data.cotizacion_items ?? [])
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((it) => ({
          _uid: uid(),
          id: it.id,
          producto_id: it.producto_id,
          foto_url: it.producto?.foto_url ?? null,
          descripcion: it.descripcion ?? '',
          detalle: it.detalle ?? '',
          cantidad: it.cantidad ?? 1,
          precio_usd: it.precio_usd ?? 0,
          descuento_item_pct: it.descuento_item_pct ?? 0,
        }))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Si no hay TC guardado, usar el dólar live cuando llegue.
  useEffect(() => {
    if (!tc && dolar?.venta) setTc(dolar.venta)
  }, [dolar, tc])

  // Si venimos desde una oportunidad CRM y la cotización aún no está
  // asignada, ofrecer asignarla.
  useEffect(() => {
    const st = location.state
    if (cot && st?.desde_oportunidad_id && !cot.oportunidad_id) {
      setConfirmDesde({ id: st.desde_oportunidad_id, titulo: st.desde_oportunidad_titulo })
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cot])

  async function asignarOportunidad(opId) {
    await asignarCotizacionAOportunidad(id, opId)
    setOpModal(false)
    setConfirmDesde(null)
    await load()
  }

  async function desvincularOportunidad() {
    await asignarCotizacionAOportunidad(id, null)
    await load()
  }

  const totales = useMemo(() => calcularTotales(items, descuento, tc), [items, descuento, tc])

  function updateItemCampo(_uid, campo, valor) {
    setItems((prev) => prev.map((it) => (it._uid === _uid ? { ...it, [campo]: valor } : it)))
  }
  function removeItem(_uid) {
    setItems((prev) => {
      const it = prev.find((x) => x._uid === _uid)
      if (it?.id) setEliminados((e) => [...e, it.id])
      return prev.filter((x) => x._uid !== _uid)
    })
  }
  function addItemLibre() {
    setItems((prev) => [
      ...prev,
      { _uid: uid(), id: null, producto_id: null, descripcion: '', detalle: '', cantidad: 1, precio_usd: 0, descuento_item_pct: 0 },
    ])
  }
  function agregarDesdeCatalogo(productos) {
    const nuevos = productos.map((p) => {
      // Convertir a USD si el producto está en ARS.
      const precioUsd = p.moneda === 'ARS' ? (tc ? Number(p.precio_usd) / tc : 0) : Number(p.precio_usd ?? 0)
      return {
        _uid: uid(),
        id: null,
        producto_id: p.id,
        foto_url: p.foto_url ?? null,
        descripcion: p.nombre,
        detalle: '',
        cantidad: 1,
        precio_usd: Math.round(precioUsd * 100) / 100,
        descuento_item_pct: 0,
      }
    })
    setItems((prev) => [...prev, ...nuevos])
    setCatModal(false)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldI = prev.findIndex((i) => i._uid === active.id)
      const newI = prev.findIndex((i) => i._uid === over.id)
      return arrayMove(prev, oldI, newI)
    })
  }

  async function guardar() {
    setSaving(true)
    setError('')
    setMsg('')
    // Persistir items en orden.
    for (const itemId of eliminados) await deleteItem(itemId)
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const payload = {
        cotizacion_id: id,
        producto_id: it.producto_id,
        descripcion: it.descripcion || 'Item',
        detalle: it.detalle || null,
        cantidad: Number(it.cantidad) || 1,
        precio_usd: Number(it.precio_usd) || 0,
        descuento_item_pct: Number(it.descuento_item_pct) || 0,
        subtotal_usd: subtotalItem(it),
        orden: i,
      }
      if (it.id) await updateItem(it.id, payload)
      else {
        const { data } = await createItem(payload)
        if (data) it.id = data.id
      }
    }
    setEliminados([])

    const { error: err } = await updateCotizacion(id, {
      titulo,
      descuento_pct: Number(descuento) || 0,
      validez_dias: Number(validez) || 7,
      moneda_display: monedaDisplay,
      notas: notas || null,
      condiciones_pago: condPago || null,
      condiciones_generales: condGenerales || null,
      dolar_venta: tc || null,
      subtotal_usd: totales.subtotalUsd,
      total_usd: totales.totalUsd,
      total_ars: totales.totalArs,
    })
    setSaving(false)
    if (err) return setError('No se pudo guardar: ' + err.message)

    // Las condiciones quedan como predeterminadas para las próximas cotizaciones.
    saveStr(STORAGE.cotCondPago, condPago)
    saveStr(STORAGE.cotCondGenerales, condGenerales)
    guardarConfig(STORAGE.cotCondPago, condPago)
    guardarConfig(STORAGE.cotCondGenerales, condGenerales)

    setMsg('Cambios guardados')
    await load()
  }

  async function cambiarEstado(estado) {
    await updateCotizacion(id, { estado })
    setCot((prev) => ({ ...prev, estado }))
  }

  async function descargarPDF() {
    // Genera con el estado actual en memoria.
    await generarCotizacionPDF(
      {
        ...cot,
        titulo,
        notas,
        condiciones_pago: condPago,
        condiciones_generales: condGenerales,
        validez_dias: validez,
        moneda_display: monedaDisplay,
        descuento_pct: descuento,
        total_usd: totales.totalUsd,
        cotizacion_items: items.map((it) => ({
          descripcion: it.descripcion,
          detalle: it.detalle,
          cantidad: it.cantidad,
          precio_usd: it.precio_usd,
          descuento_item_pct: it.descuento_item_pct,
        })),
      },
      tc
    )
  }

  async function duplicar() {
    const { data, error: err } = await duplicarCotizacion(id)
    if (err) return setError('No se pudo duplicar: ' + err.message)
    navigate(`/cotizaciones/${data.id}`)
  }

  async function eliminar() {
    if (!(await confirmDialog('¿Eliminar esta cotización?'))) return
    await deleteCotizacion(id)
    navigate('/cotizaciones')
  }

  async function asignarCliente(sel) {
    await updateCotizacion(id, {
      empresa_id: sel.empresa_id ?? null,
      contacto_id: sel.contacto_id ?? null,
      cliente_nombre: sel.cliente_nombre ?? null,
      cliente_email: sel.cliente_email ?? null,
    })
    setCliModal(false)
    await load()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hmc-border border-t-hmc-white" />
      </div>
    )
  }
  if (error && !cot) {
    return (
      <div>
        <Back onClick={() => navigate('/cotizaciones')} />
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</p>
      </div>
    )
  }
  if (!cot) return null

  const clienteNombre = cot.empresa?.nombre || (cot.contacto ? `${cot.contacto.nombre ?? ''} ${cot.contacto.apellido ?? ''}`.trim() : '') || cot.cliente_nombre || ''
  const clienteEmail = cot.empresa?.email || cot.contacto?.email || cot.cliente_email || ''

  return (
    <div className="mx-auto max-w-6xl">
      <Back onClick={() => navigate('/cotizaciones')} />

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-hmc-muted">{cot.numero}</p>
        <div className="flex flex-wrap items-center gap-3">
          {editandoTitulo ? (
            <input className="flex-1 rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-1.5 text-2xl font-semibold text-hmc-white outline-none focus:border-hmc-white" value={titulo} autoFocus onChange={(e) => setTitulo(e.target.value)} onBlur={() => setEditandoTitulo(false)} onKeyDown={(e) => e.key === 'Enter' && setEditandoTitulo(false)} />
          ) : (
            <button type="button" onClick={() => setEditandoTitulo(true)} className="text-2xl font-semibold text-hmc-white hover:underline">{titulo || 'Sin título'}</button>
          )}
          <EstadoBadge estado={cot.estado} />
        </div>
        <p className="mt-1 text-xs text-hmc-muted">Última modificación {haceCuanto(new Date(cot.updated_at).getTime())}</p>
      </div>

      {error && <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</p>}

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Columna izquierda */}
        <div className="min-w-0 flex-1">
          {/* Cliente */}
          <section className="mb-5 rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wide text-hmc-muted">Cliente</h2>
              <button type="button" onClick={() => setCliModal(true)} className="text-xs text-hmc-muted hover:text-hmc-white">{clienteNombre ? 'Cambiar' : 'Asignar cliente'}</button>
            </div>
            {clienteNombre ? (
              <div className="mt-2 flex items-center gap-3">
                {cot.empresa?.logo_url ? (
                  <img src={cot.empresa.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-hmc-gray3 text-sm font-medium text-hmc-white">{iniciales(clienteNombre)}</div>
                )}
                <div>
                  <p className="text-sm font-medium text-hmc-white">{clienteNombre}</p>
                  {clienteEmail && <p className="text-xs text-hmc-muted">{clienteEmail}</p>}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-hmc-muted">Sin cliente asignado</p>
            )}
          </section>

          {/* Items */}
          <section className="mb-5 rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs uppercase tracking-wide text-hmc-muted">Items de la cotización</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCatModal(true)} className="inline-flex items-center gap-1.5 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white hover:bg-hmc-gray3"><TbPlus size={14} />Del catálogo</button>
                <button type="button" onClick={addItemLibre} className="inline-flex items-center gap-1.5 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white hover:bg-hmc-gray3"><TbPlus size={14} />Item libre</button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-hmc-muted">Sin items. Agregá del catálogo o un item libre.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i._uid)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {items.map((it, i) => (
                      <ItemRow key={it._uid} item={it} num={i + 1} tc={tc} onCampo={updateItemCampo} onRemove={removeItem} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>

          {/* Notas */}
          <section className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
            <h2 className="mb-2 text-xs uppercase tracking-wide text-hmc-muted">Notas</h2>
            <textarea rows={6} value={notas} onChange={(e) => setNotas(e.target.value)} className={`${inputBase} w-full resize-y min-h-[120px]`} placeholder={'Notas internas o aclaraciones para el cliente…'} />
          </section>

          {/* Condiciones de pago */}
          <section className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
            <h2 className="mb-1 text-xs uppercase tracking-wide text-hmc-muted">Condiciones de pago</h2>
            <p className="mb-2 text-xs text-hmc-muted/70">Se guarda como predeterminado para próximas cotizaciones. Editable acá.</p>
            <textarea rows={4} value={condPago} onChange={(e) => setCondPago(e.target.value)} className={`${inputBase} w-full resize-y min-h-[90px]`} placeholder={'Ej: 50% de anticipo y 50% contra entrega. Transferencia o efectivo.'} />
          </section>

          {/* Condiciones generales */}
          <section className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
            <h2 className="mb-1 text-xs uppercase tracking-wide text-hmc-muted">Condiciones generales</h2>
            <p className="mb-2 text-xs text-hmc-muted/70">Se guarda como predeterminado para próximas cotizaciones. Editable acá.</p>
            <textarea rows={4} value={condGenerales} onChange={(e) => setCondGenerales(e.target.value)} className={`${inputBase} w-full resize-y min-h-[90px]`} placeholder={'Ej: Precios sujetos a cambio. Plazo de producción 30 días hábiles.'} />
          </section>
        </div>

        {/* Columna derecha */}
        <div className="w-full shrink-0 lg:w-[320px]">
          <div className="sticky top-4 flex flex-col gap-4">
            {/* Dólar */}
            <div className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
              {dolarLoading && !dolar ? (
                <div className="h-6 animate-pulse rounded bg-hmc-gray3" />
              ) : dolar ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-semibold" style={{ color: '#44aa99' }}>Compra ${dolar.compra}</span>{' '}
                    <span className="font-semibold" style={{ color: '#e24b4a' }}>Venta ${dolar.venta}</span>
                    <p className="text-[10px] text-hmc-muted">{haceCuanto(dolar.timestamp)}</p>
                  </div>
                  <button type="button" onClick={refetch} className="rounded p-1.5 text-hmc-muted hover:text-hmc-white"><TbRefresh size={16} /></button>
                </div>
              ) : (
                <span className="text-sm text-hmc-muted">Sin cotización</span>
              )}
              <div className="mt-3">
                <label className={labelClass}>Usar tipo de cambio</label>
                <div className="flex gap-2">
                  <input type="number" value={tc} onChange={(e) => setTc(Number(e.target.value))} className={`${inputBase} w-full`} />
                  {dolar && <button type="button" onClick={() => setTc(dolar.venta)} className="shrink-0 rounded-md border border-hmc-border px-2 text-xs text-hmc-muted hover:text-hmc-white">Usar actual</button>}
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="rounded-lg border border-hmc-border bg-hmc-gray3 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-hmc-muted">Subtotal</span>
                <span className="text-hmc-white">{formatUSD(totales.subtotalUsd)} <span className="text-hmc-muted">/ {formatARS(totales.subtotalUsd * tc)}</span></span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-hmc-muted">Descuento global %</span>
                <input type="number" min={0} max={100} value={descuento} onChange={(e) => setDescuento(e.target.value)} className="w-20 rounded-md border border-hmc-border bg-hmc-gray2 px-2 py-1 text-right text-sm text-hmc-white outline-none focus:border-hmc-white" />
              </div>
              {descuento > 0 && (
                <p className="mt-1 text-right text-xs" style={{ color: '#44aa99' }}>
                  Ahorro {formatUSD(totales.subtotalUsd * (Number(descuento) / 100))}
                </p>
              )}
              <div className="my-3 border-t border-hmc-border" />
              <div className="flex items-end justify-between">
                <span className="text-sm text-hmc-muted">TOTAL</span>
                <div className="text-right">
                  <p className="text-2xl font-bold text-hmc-white">{formatUSD(totales.totalUsd)}</p>
                  <p className="text-xl font-semibold" style={{ color: '#44aa99' }}>{formatARS(totales.totalArs)}</p>
                </div>
              </div>
              {tc > 0 && <p className="mt-1 text-right text-xs text-hmc-muted">al tipo de cambio: ${tc}</p>}
            </div>

            {/* Configuración */}
            <div className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
              <h2 className="mb-3 text-xs uppercase tracking-wide text-hmc-muted">Configuración</h2>
              <div className="mb-3">
                <label className={labelClass}>Validez (días)</label>
                <input type="number" value={validez} onChange={(e) => setValidez(e.target.value)} className={`${inputBase} w-full`} />
              </div>
              <div className="mb-3">
                <label className={labelClass}>Moneda en PDF</label>
                <div className="flex gap-2">
                  {['ARS', 'USD', 'AMBAS'].map((m) => (
                    <button key={m} type="button" onClick={() => setMonedaDisplay(m)} className={`flex-1 rounded-md px-2 py-1.5 text-xs transition-colors ${monedaDisplay === m ? 'bg-hmc-white text-hmc-black' : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select value={cot.estado} onChange={(e) => cambiarEstado(e.target.value)} className={`${inputBase} w-full`}>
                  {ESTADOS_COT_LIST.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* Oportunidad CRM */}
            <div className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
              <h2 className="mb-3 text-xs uppercase tracking-wide text-hmc-muted">Oportunidad CRM</h2>
              {cot.oportunidad ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => navigate(`/crm/${cot.oportunidad.id}`)} className="min-w-0 text-left text-sm font-medium text-hmc-white hover:underline">
                      <span className="block truncate">{cot.oportunidad.titulo}</span>
                    </button>
                    {ETAPA_MAP[cot.oportunidad.etapa] && (
                      <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${ETAPA_MAP[cot.oportunidad.etapa].color}22`, color: ETAPA_MAP[cot.oportunidad.etapa].color }}>{ETAPA_MAP[cot.oportunidad.etapa].label}</span>
                    )}
                  </div>
                  <button type="button" onClick={desvincularOportunidad} className="mt-2 text-xs text-hmc-muted hover:text-red-400">Desvincular</button>
                </div>
              ) : (
                <button type="button" onClick={() => setOpModal(true)} className="w-full rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Asignar a oportunidad CRM</button>
              )}
            </div>

            {/* Cobro */}
            <div className="rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
              <h2 className="mb-3 text-xs uppercase tracking-wide text-hmc-muted">Cobro</h2>
              {cot.cobrada ? (
                <div className="rounded-md p-3" style={{ backgroundColor: '#4a990814', border: '1px solid #4a990830' }}>
                  <p className="text-[13px] font-semibold" style={{ color: '#44aa99' }}>✓ Cobrada</p>
                  {cot.fecha_cobro && <p className="text-[11px] text-hmc-muted">el {new Date(cot.fecha_cobro).toLocaleDateString('es-AR')}</p>}
                  <p className="mt-2 font-bold text-hmc-white">{formatUSD(cot.total_usd)}</p>
                  {tc > 0 && <p className="text-[11px]" style={{ color: '#44aa99' }}>≈ {formatARS(Number(cot.total_usd) * tc)}</p>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCobroModal(true)}
                  className="w-full rounded-md py-2.5 text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#4a990814', color: '#44aa99', border: '1px solid #4a990840' }}
                >
                  💰 Marcar como cobrada
                </button>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2 rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
              <button type="button" onClick={guardar} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60"><TbDeviceFloppy size={16} />{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              {msg && <p className="text-center text-xs" style={{ color: '#44aa99' }}>{msg}</p>}
              <button type="button" onClick={descargarPDF} className="inline-flex items-center justify-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3"><TbDownload size={16} />Descargar PDF</button>
              <button type="button" onClick={duplicar} className="inline-flex items-center justify-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3"><TbCopy size={16} />Duplicar</button>
              <button type="button" onClick={() => cambiarEstado('enviada')} className="inline-flex items-center justify-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3"><TbSend size={16} />Marcar enviada</button>
              <button type="button" onClick={() => cambiarEstado('aprobada')} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm" style={{ borderColor: '#44aa9955', color: '#44aa99' }}><TbCheck size={16} />Marcar aprobada</button>
              <div className="my-1 border-t border-hmc-border" />
              <button type="button" onClick={eliminar} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-400 hover:bg-red-950/40"><TbTrash size={16} />Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      {catModal && <CatalogoModal tc={tc} onClose={() => setCatModal(false)} onAgregar={agregarDesdeCatalogo} />}
      {cliModal && <ClienteModal onClose={() => setCliModal(false)} onSave={asignarCliente} />}
      {opModal && (
        <AsignarOportunidadModal
          cotizacionId={id}
          onClose={() => setOpModal(false)}
          onAsignada={() => {
            setOpModal(false)
            load()
          }}
        />
      )}
      {confirmDesde && (
        <ConfirmarAsignacion
          titulo={confirmDesde.titulo}
          onSi={() => asignarOportunidad(confirmDesde.id)}
          onNo={() => setConfirmDesde(null)}
        />
      )}
      {cobroModal && (
        <ConfirmarCobroModal
          cot={cot}
          dolar={dolar}
          tcActual={tc}
          onClose={() => setCobroModal(false)}
          onConfirmado={async () => {
            setCobroModal(false)
            setToast({ visible: true, mensaje: '¡Venta registrada exitosamente! 🎉' })
            await load()
          }}
        />
      )}
      <Toast visible={toast.visible} mensaje={toast.mensaje} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  )
}

function ConfirmarCobroModal({ cot, dolar, tcActual, onClose, onConfirmado }) {
  const [tcCobro, setTcCobro] = useState(tcActual || dolar?.venta || Number(cot.dolar_venta) || 0)
  const [comprobante, setComprobante] = useState(null) // { url, nombre }
  const [previewImg, setPreviewImg] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [notas, setNotas] = useState('')
  const [moverOp, setMoverOp] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const fileRef = useRef(null)

  const clienteNombre = cot.empresa?.nombre || (cot.contacto ? `${cot.contacto.nombre ?? ''} ${cot.contacto.apellido ?? ''}`.trim() : '') || cot.cliente_nombre || ''
  const totalArs = Number(cot.total_usd ?? 0) * Number(tcCobro || 0)

  async function subirComprobante(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) return setError('El archivo supera los 10MB.')
    setSubiendo(true)
    try {
      const safe = file.name.replace(/[^\w.\-]/g, '_')
      const path = `comprobantes/${cot.id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { data, error: sErr } = await supabase.storage.from('comprobantes').createSignedUrl(path, 60 * 60 * 24 * 365)
      if (sErr) throw sErr
      setComprobante({ url: data.signedUrl, nombre: file.name })
      setPreviewImg(file.type.startsWith('image/') ? data.signedUrl : '')
    } catch (e2) {
      setError('No se pudo subir el comprobante: ' + e2.message)
    }
    setSubiendo(false)
  }

  function quitarComprobante() {
    setComprobante(null)
    setPreviewImg('')
  }

  async function confirmar() {
    setError('')
    setGuardando(true)
    const { error: err } = await marcarCotizacionCobrada(cot.id, {
      dolar_venta: Number(tcCobro) || 0,
      notas: notas.trim() || null,
      comprobante_url: comprobante?.url || null,
      comprobante_nombre: comprobante?.nombre || null,
      mover_oportunidad: moverOp,
    })
    setGuardando(false)
    if (err) return setError('No se pudo registrar el cobro: ' + err.message)
    onConfirmado()
  }

  const lbl = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
        style={{ borderTop: '2px solid #44aa99' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">Registrar cobro</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {/* Resumen */}
          <div className="rounded-md border border-hmc-border bg-hmc-black p-3">
            <p className="text-[11px] text-hmc-muted">{cot.numero}</p>
            <p className="text-sm font-medium text-hmc-white">{cot.titulo}</p>
            {clienteNombre && <p className="mt-0.5 text-xs text-hmc-muted">{clienteNombre}</p>}
            <p className="mt-2 text-lg font-bold" style={{ color: '#44aa99' }}>Total a cobrar: {formatUSD(cot.total_usd)}</p>
          </div>

          {/* Tipo de cambio */}
          <div className="mt-4">
            <label className={lbl}>Tipo de cambio al momento del cobro</label>
            <input type="number" value={tcCobro} onChange={(e) => setTcCobro(e.target.value)} className={`${inputBase} w-full`} />
            <p className="mt-1 text-xs" style={{ color: '#44aa99' }}>≈ {formatARS(totalArs)}</p>
            <p className="text-[11px] text-hmc-muted">Este valor queda registrado en la venta.</p>
          </div>

          {/* Comprobante */}
          <div className="mt-4">
            <label className={lbl}>Adjuntar comprobante (opcional)</label>
            <p className="mb-2 text-[11px] text-hmc-muted">Transferencia, recibo, captura, etc. Para verificación con Santi.</p>
            {comprobante ? (
              <div className="rounded-md border border-hmc-border bg-hmc-black p-2">
                {previewImg && <img src={previewImg} alt="" className="mb-2 max-h-[120px] rounded object-contain" />}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-hmc-white"><TbFileCheck size={14} style={{ color: '#7fb8e8' }} /><span className="truncate">{comprobante.nombre}</span></span>
                  <button type="button" onClick={quitarComprobante} className="shrink-0 text-hmc-muted hover:text-red-400"><TbX size={14} /></button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-hmc-border py-4 text-sm text-hmc-muted hover:text-hmc-white disabled:opacity-60">
                {subiendo ? 'Subiendo…' : 'Click para subir (imagen o PDF)'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={subirComprobante} />
          </div>

          {/* Notas */}
          <div className="mt-4">
            <label className={lbl}>Notas</label>
            <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Pago en cuotas, transferencia banco X, referencia #XXXX…" className={`${inputBase} w-full resize-none`} />
          </div>

          {cot.oportunidad_id && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-hmc-white">
              <input type="checkbox" checked={moverOp} onChange={(e) => setMoverOp(e.target.checked)} className="accent-hmc-white" />
              Mover oportunidad CRM a “Cerrado ganado”
            </label>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-hmc-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
          <button
            type="button"
            onClick={confirmar}
            disabled={subiendo || guardando}
            className="rounded-md px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#44aa99' }}
          >
            {guardando ? 'Registrando…' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmarAsignacion({ titulo, onSi, onNo }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onMouseDown={onNo}>
      <div className="w-full max-w-sm rounded-lg border border-hmc-border bg-hmc-gray2 p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-hmc-white">¿Asignar a oportunidad?</h2>
        <p className="mt-2 text-sm text-hmc-muted">
          Esta cotización fue creada desde la oportunidad “{titulo}”. ¿Querés asignarla?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onNo} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">No, solo crear</button>
          <button type="button" onClick={onSi} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">Sí, asignar</button>
        </div>
      </div>
    </div>
  )
}

function Back({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mb-6 inline-flex items-center gap-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white">
      <TbArrowLeft size={16} />
      Cotizaciones
    </button>
  )
}

function EstadoBadge({ estado }) {
  const e = ESTADOS_COT[estado] ?? ESTADOS_COT.borrador
  return <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${e.color}22`, color: e.color }}>{e.label}</span>
}

function ItemRow({ item, num, tc, onCampo, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._uid })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const sub = subtotalItem(item)
  const precioArs = tc ? Number(item.precio_usd) * tc : 0
  const subArs = tc ? sub * tc : 0
  const conDescuento = Number(item.descuento_item_pct) > 0
  const precioBase = Number(item.cantidad) * Number(item.precio_usd)

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border border-hmc-border bg-hmc-black p-2.5 hover:bg-hmc-gray3/40">
      <div className="flex items-start gap-3">
        <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab text-hmc-muted hover:text-hmc-white" title="Arrastrar"><TbGripVertical size={16} /></button>
        {item.foto_url ? (
          <img src={item.foto_url} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-hmc-gray3">
            <TbPackage size={16} className="text-hmc-muted" />
          </div>
        )}
        <span className="mt-1.5 text-xs text-hmc-muted">#{num}</span>
        <div className="min-w-0 flex-1">
          <input value={item.descripcion} onChange={(e) => onCampo(item._uid, 'descripcion', e.target.value)} placeholder="Descripción" className="w-full border-b border-transparent bg-transparent py-1 text-sm text-hmc-white outline-none placeholder:text-hmc-muted focus:border-hmc-border" />
          <input value={item.detalle} onChange={(e) => onCampo(item._uid, 'detalle', e.target.value)} placeholder="Detalle (opcional)" className="w-full border-b border-transparent bg-transparent py-0.5 text-xs text-hmc-muted outline-none placeholder:text-hmc-muted focus:border-hmc-border" />

          <div className="mt-2 flex flex-wrap items-start gap-3">
            <div className="flex flex-col">
              <label className="mb-1 block h-3 text-[10px] uppercase leading-3 text-hmc-muted">Cant.</label>
              <input type="number" min={1} value={item.cantidad} onChange={(e) => onCampo(item._uid, 'cantidad', e.target.value)} className="h-8 w-16 rounded border border-hmc-border bg-hmc-gray2 px-2 text-sm text-hmc-white outline-none focus:border-hmc-white" />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 block h-3 text-[10px] uppercase leading-3 text-hmc-muted">P. unit USD</label>
              <input type="number" step="0.01" value={item.precio_usd} onChange={(e) => onCampo(item._uid, 'precio_usd', e.target.value)} className="h-8 w-24 rounded border border-hmc-border bg-hmc-gray2 px-2 text-sm text-hmc-white outline-none focus:border-hmc-white" />
              {tc > 0 && <span className="mt-0.5 block text-[10px] text-hmc-muted">{formatARS(precioArs)}</span>}
            </div>
            <div className="flex flex-col">
              <label className="mb-1 block h-3 text-[10px] uppercase leading-3 text-hmc-muted">Desc. %</label>
              <input type="number" min={0} max={100} value={item.descuento_item_pct} onChange={(e) => onCampo(item._uid, 'descuento_item_pct', e.target.value)} className="h-8 w-16 rounded border border-hmc-border bg-hmc-gray2 px-2 text-sm text-hmc-white outline-none focus:border-hmc-white" />
            </div>
            <div className="ml-auto flex flex-col text-right">
              <label className="mb-1 block h-3 text-[10px] uppercase leading-3 text-hmc-muted">Subtotal</label>
              <span className="flex h-8 items-center justify-end text-sm font-semibold text-hmc-white">{formatUSD(sub)}</span>
              {conDescuento && <span className="block text-[10px] text-hmc-muted line-through">{formatUSD(precioBase)}</span>}
              {tc > 0 && <span className="block text-[10px] text-hmc-muted">{formatARS(subArs)}</span>}
            </div>
            <div className="flex flex-col">
              <span className="mb-1 block h-3" />
              <button type="button" onClick={() => onRemove(item._uid)} className="flex h-8 items-center rounded px-1 text-hmc-muted hover:text-red-400"><TbTrash size={15} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Catálogo modal ----
function CatalogoModal({ tc, onClose, onAgregar }) {
  const [categorias, setCategorias] = useState([])
  const [catActiva, setCatActiva] = useState(null)
  const [productos, setProductos] = useState([])
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(() => new Map())

  useEffect(() => {
    getCategorias().then(({ data }) => setCategorias(data ?? []))
    getProductos().then(({ data }) => setProductos(data ?? []))
  }, [])

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    return productos.filter((p) => {
      if (catActiva && p.categoria_id !== catActiva) return false
      if (q && !(p.nombre ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [productos, catActiva, search])

  function toggle(p) {
    setSel((prev) => {
      const next = new Map(prev)
      next.has(p.id) ? next.delete(p.id) : next.set(p.id, p)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">Agregar del catálogo</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>
        <div className="border-b border-hmc-border px-6 py-3">
          <div className="relative">
            <TbSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-9 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="w-[160px] shrink-0 overflow-y-auto border-r border-hmc-border p-2">
            <button type="button" onClick={() => setCatActiva(null)} className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${catActiva === null ? 'bg-hmc-gray3 text-hmc-white' : 'text-hmc-muted hover:text-hmc-white'}`}>Todas</button>
            {categorias.map((c) => (
              <button key={c.id} type="button" onClick={() => setCatActiva(c.id)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${catActiva === c.id ? 'bg-hmc-gray3 text-hmc-white' : 'text-hmc-muted hover:text-hmc-white'}`}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="truncate">{c.nombre}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtrados.map((p) => {
                const seleccionado = sel.has(p.id)
                const ars = p.moneda === 'ARS' ? Number(p.precio_usd) : (tc ? Number(p.precio_usd) * tc : null)
                return (
                  <button key={p.id} type="button" onClick={() => toggle(p)} className={`overflow-hidden rounded-md border text-left ${seleccionado ? 'border-hmc-white' : 'border-hmc-border'}`}>
                    <div className="flex aspect-video items-center justify-center bg-hmc-gray3">
                      {p.foto_url ? <img src={p.foto_url} alt="" className="h-full w-full object-cover" /> : <TbBike size={22} className="text-hmc-muted" />}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium text-hmc-white">{p.nombre}</p>
                      <p className="text-[11px] text-hmc-white">{p.moneda === 'ARS' ? formatARS(p.precio_usd) : formatUSD(p.precio_usd)}</p>
                      {ars != null && p.moneda !== 'ARS' && <p className="text-[10px] text-hmc-muted">{formatARS(ars)}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-hmc-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
          <button type="button" onClick={() => onAgregar([...sel.values()])} disabled={sel.size === 0} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">Agregar {sel.size} productos</button>
        </div>
      </div>
    </div>
  )
}

// ---- Cliente modal ----
function ClienteModal({ onClose, onSave }) {
  const [tipo, setTipo] = useState('empresa')
  const [empresaId, setEmpresaId] = useState('')
  const [contactoId, setContactoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [contactos, setContactos] = useState([])

  useEffect(() => {
    getEmpresas().then(({ data }) => setEmpresas(data ?? []))
    getContactos().then(({ data }) => setContactos(data ?? []))
  }, [])

  function guardar() {
    if (tipo === 'empresa') onSave({ empresa_id: empresaId || null })
    else if (tipo === 'contacto') onSave({ contacto_id: contactoId || null })
    else onSave({ cliente_nombre: nombre.trim() || null, cliente_email: email.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">Asignar cliente</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="mb-3 flex gap-2">
            {[{ k: 'empresa', l: 'Empresa' }, { k: 'contacto', l: 'Contacto' }, { k: 'manual', l: 'Manual' }].map((o) => (
              <button key={o.k} type="button" onClick={() => setTipo(o.k)} className={`flex-1 rounded-md px-2 py-1.5 text-xs ${tipo === o.k ? 'bg-hmc-white text-hmc-black' : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'}`}>{o.l}</button>
            ))}
          </div>
          {tipo === 'empresa' && (
            <select className={`${inputBase} w-full`} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
              <option value="">Seleccionar empresa…</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          )}
          {tipo === 'contacto' && (
            <select className={`${inputBase} w-full`} value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
              <option value="">Seleccionar contacto…</option>
              {contactos.map((c) => <option key={c.id} value={c.id}>{[c.nombre, c.apellido].filter(Boolean).join(' ')}</option>)}
            </select>
          )}
          {tipo === 'manual' && (
            <div className="flex flex-col gap-2">
              <input className={`${inputBase} w-full`} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" />
              <input className={`${inputBase} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-hmc-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
          <button type="button" onClick={guardar} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">Asignar</button>
        </div>
      </div>
    </div>
  )
}
