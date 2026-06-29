import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { confirmDialog } from '../components/confirm'
import CustomCheckbox from '../components/ui/CustomCheckbox'
import {
  TbArrowLeft,
  TbPencil,
  TbTrash,
  TbPlus,
  TbX,
  TbFileText,
  TbCopy,
  TbLayoutKanban,
  TbBike,
  TbRefresh,
} from 'react-icons/tb'
import {
  getProducto,
  createVariante,
  updateVariante,
  deleteVariante,
} from '../lib/db'
import { useDolar } from '../hooks/useDolar'
import { convertir, formatMonto, haceCuanto } from '../lib/dolar'
import ProductoModal from '../components/ProductoModal'

const inputClass =
  'w-full glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

export default function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cotizacion, loading: dolarLoading, refetch } = useDolar()

  const [prod, setProd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalEdit, setModalEdit] = useState(false)
  const [varModal, setVarModal] = useState(null) // { variante } | null

  const [seleccionados, setSeleccionados] = useState(() => new Set())
  const [cantidad, setCantidad] = useState(1)
  const [copiado, setCopiado] = useState(false)
  const [fotoActiva, setFotoActiva] = useState(0)

  const moneda = prod?.moneda ?? 'USD'
  const otraMoneda = moneda === 'USD' ? 'ARS' : 'USD'

  // Valor convertido a la otra moneda.
  function otra(valor) {
    const { usd, ars } = convertir(Number(valor), moneda, cotizacion)
    return moneda === 'USD' ? ars : usd
  }

  async function load() {
    setLoading(true)
    const { data, error: err } = await getProducto(id)
    if (err) setError('No se pudo cargar el producto: ' + err.message)
    else setProd(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const variantes = prod?.producto_variantes ?? []

  const calc = useMemo(() => {
    const base = Number(prod?.precio_usd ?? 0)
    const ups = variantes
      .filter((v) => seleccionados.has(v.id))
      .reduce((acc, v) => acc + Number(v.precio_usd ?? 0), 0)
    const subtotal = base + ups
    const total = subtotal * cantidad
    return { base, subtotal, total }
  }, [prod, variantes, seleccionados, cantidad])

  function toggleSel(vid) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(vid) ? next.delete(vid) : next.add(vid)
      return next
    })
  }

  async function handleSaveVar(payload) {
    const action = varModal?.variante
      ? updateVariante(varModal.variante.id, payload)
      : createVariante({ ...payload, producto_id: id })
    const { error: err } = await action
    if (err) return 'No se pudo guardar: ' + err.message
    setVarModal(null)
    await load()
    return null
  }

  async function handleDeleteVar(v) {
    if (!(await confirmDialog(`¿Eliminar la variante "${v.nombre}"?`))) return
    await deleteVariante(v.id)
    await load()
  }

  function fmtDual(valor) {
    const conv = otra(valor)
    return `${formatMonto(valor, moneda)} (${conv ? formatMonto(conv, otraMoneda) : `${otraMoneda} —`})`
  }

  function copiarPresupuesto() {
    const sel = variantes.filter((v) => seleccionados.has(v.id))
    const linea = '━━━━━━━━━━━━━━━━━━━━'
    const sub = '─────────────────────'
    const lineas = [
      linea,
      'PRESUPUESTO HMC',
      linea,
      `Producto: ${prod.nombre}`,
      `Cantidad: ${cantidad} unidades`,
      `Precio base: ${fmtDual(calc.base)}`,
      ...sel.map((v) => `${v.nombre}: + ${fmtDual(Number(v.precio_usd))}`),
      sub,
      `TOTAL: ${fmtDual(calc.total)}`,
      cotizacion ? `Dólar blue: $${cotizacion.venta}` : '',
      linea,
      'HMC Bicicletas · Córdoba',
    ].filter(Boolean)
    navigator.clipboard.writeText(lineas.join('\n')).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  function crearOportunidad() {
    navigate('/crm', {
      state: {
        nuevaOportunidad: {
          titulo: `${prod.nombre} (x${cantidad})`,
          valor_estimado: calc.total,
          moneda,
        },
      },
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hmc-border border-t-hmc-white" />
      </div>
    )
  }
  if (error && !prod) {
    return (
      <div>
        <Back onClick={() => navigate('/productos')} />
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</p>
      </div>
    )
  }
  if (!prod) return null

  const color = prod.categoria?.color ?? '#777777'
  const precioConv = otra(prod.precio_usd)
  const galeria = Array.isArray(prod.fotos) && prod.fotos.length
    ? prod.fotos
    : prod.foto_url
      ? [prod.foto_url]
      : []
  const fotoMostrada = galeria[fotoActiva] ?? galeria[0]

  return (
    <div className="mx-auto max-w-4xl">
      <Back onClick={() => navigate('/productos')} />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-5 sm:flex-row">
        <div className="w-full shrink-0 sm:w-[360px]">
          <div className="flex h-[300px] items-center justify-center overflow-hidden rounded-lg border border-hmc-border" style={{ backgroundColor: `${color}22` }}>
            {fotoMostrada ? <img src={fotoMostrada} alt="" className="h-full w-full object-cover" /> : <TbBike size={56} style={{ color }} />}
          </div>
          {galeria.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {galeria.map((url, i) => (
                <button key={url} type="button" onClick={() => setFotoActiva(i)} className={`h-14 w-14 overflow-hidden rounded-md border-2 ${i === fotoActiva ? 'border-hmc-white' : 'border-hmc-border'}`}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {prod.categoria && (
              <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>{prod.categoria.nombre}</span>
            )}
            {prod.linea && <span className="rounded bg-hmc-gray3 px-2 py-0.5 text-xs text-hmc-muted">{prod.linea}</span>}
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-hmc-white">{prod.nombre}</h1>
            <button type="button" onClick={() => setModalEdit(true)} className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3"><TbPencil size={16} />Editar</button>
          </div>
          {prod.precio_usd != null && (
            <>
              <p className="mt-2 text-2xl font-semibold text-hmc-white">{formatMonto(prod.precio_usd, moneda)}</p>
              <p className="text-xl" style={{ color: '#44aa99' }}>≈ {precioConv ? formatMonto(precioConv, otraMoneda) : `${otraMoneda} —`}</p>
              {cotizacion && (
                <p className="mt-0.5 text-xs text-hmc-muted">al dólar blue: ${cotizacion.venta} · actualizado {haceCuanto(cotizacion.timestamp)}</p>
              )}
            </>
          )}

          {prod.descripcion && <p className="mt-3 whitespace-pre-line text-sm text-hmc-white">{prod.descripcion}</p>}

          {prod.pdf_url && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={prod.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3"><TbFileText size={16} />Ver PDF</a>
            </div>
          )}
        </div>
      </div>

      {/* Card dólar compacta */}
      <div className="mb-6 flex items-center justify-between gap-4 glass-card p-3">
        {dolarLoading && !cotizacion ? (
          <div className="h-6 w-40 animate-pulse rounded bg-hmc-gray3" />
        ) : cotizacion ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[10px] uppercase tracking-wide text-hmc-muted">Dólar {cotizacion.nombre}</span>
            <span className="font-semibold" style={{ color: '#44aa99' }}>Compra ${cotizacion.compra}</span>
            <span className="font-semibold" style={{ color: '#e24b4a' }}>Venta ${cotizacion.venta}</span>
            {cotizacion.desactualizado && <span className="rounded px-2 py-0.5 text-[10px]" style={{ backgroundColor: '#ca410', color: '#ca4' }}>Desactualizado</span>}
          </div>
        ) : (
          <span className="text-sm text-hmc-muted">Sin cotización</span>
        )}
        <button type="button" onClick={refetch} className="rounded p-1.5 text-hmc-muted hover:text-hmc-white" title="Actualizar"><TbRefresh size={16} /></button>
      </div>

      {/* Variantes */}
      <section className="mb-6 glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide text-hmc-muted">Variantes</h2>
          <button type="button" onClick={() => setVarModal({ variante: null })} className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white hover:bg-hmc-gray3"><TbPlus size={16} />Agregar variante</button>
        </div>
        {variantes.length === 0 ? (
          <p className="py-4 text-center text-sm text-hmc-muted">Sin variantes cargadas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {variantes.map((v) => {
              const vConv = otra(v.precio_usd)
              const totalVar = Number(prod.precio_usd ?? 0) + Number(v.precio_usd ?? 0)
              const totalConv = otra(totalVar)
              return (
                <div key={v.id} className="group flex items-center gap-4 rounded-md border border-hmc-border bg-hmc-black px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-hmc-white">{v.nombre}</p>
                    <p className="text-xs text-hmc-muted">+{formatMonto(v.precio_usd, moneda)} {vConv ? `(${formatMonto(vConv, otraMoneda)})` : ''}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm" style={{ color: '#44aa99' }}>Total {formatMonto(totalVar, moneda)}</p>
                    {totalConv && <p className="text-[11px] text-hmc-muted">{formatMonto(totalConv, otraMoneda)}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => setVarModal({ variante: v })} className="rounded p-1 text-hmc-muted hover:text-hmc-white"><TbPencil size={14} /></button>
                    <button type="button" onClick={() => handleDeleteVar(v)} className="rounded p-1 text-hmc-muted hover:text-red-400"><TbTrash size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Calculadora */}
      <section className="rounded-lg border border-hmc-border bg-hmc-gray3 p-6">
        <h2 className="mb-4 text-sm uppercase tracking-wide text-hmc-muted">Calculadora de presupuesto</h2>

        <div className="flex items-center justify-between text-sm">
          <span className="text-hmc-muted">Precio base</span>
          <span className="text-hmc-white">{formatMonto(calc.base, moneda)} <span className="text-hmc-muted">({otra(calc.base) ? formatMonto(otra(calc.base), otraMoneda) : `${otraMoneda} —`})</span></span>
        </div>

        {variantes.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {variantes.map((v) => (
              <label key={v.id} className="flex cursor-pointer items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-hmc-white">
                  <CustomCheckbox checked={seleccionados.has(v.id)} onChange={() => toggleSel(v.id)} />
                  {v.nombre}
                </span>
                <span className="text-hmc-muted">+{formatMonto(v.precio_usd, moneda)}</span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4">
          <label className={labelClass}>Cantidad</label>
          <select value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white">
            {Array.from({ length: 500 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="my-4 border-t border-hmc-border" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-hmc-muted">Subtotal (unidad)</span>
          <span className="text-hmc-white">{formatMonto(calc.subtotal, moneda)} <span className="text-hmc-muted">({otra(calc.subtotal) ? formatMonto(otra(calc.subtotal), otraMoneda) : `${otraMoneda} —`})</span></span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-hmc-muted">TOTAL</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-hmc-white">{formatMonto(calc.total, moneda)}</p>
            <p className="text-sm font-semibold" style={{ color: '#44aa99' }}>{otra(calc.total) ? formatMonto(otra(calc.total), otraMoneda) : `${otraMoneda} —`}</p>
          </div>
        </div>
        {cotizacion && <p className="mt-1 text-right text-xs text-hmc-muted">Calculado al dólar blue venta: ${cotizacion.venta}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={copiarPresupuesto} className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray2"><TbCopy size={16} />{copiado ? '¡Copiado!' : 'Copiar presupuesto'}</button>
          <button type="button" onClick={crearOportunidad} className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black hover:opacity-90"><TbLayoutKanban size={16} />Crear oportunidad CRM</button>
        </div>
      </section>

      {modalEdit && (
        <ProductoModal producto={prod} cotizacion={cotizacion} onClose={() => setModalEdit(false)} onSaved={() => { setModalEdit(false); load() }} />
      )}
      {varModal && (
        <VarianteModal variante={varModal.variante} moneda={moneda} cotizacion={cotizacion} onClose={() => setVarModal(null)} onSave={handleSaveVar} />
      )}
    </div>
  )
}

function Back({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mb-6 inline-flex items-center gap-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white">
      <TbArrowLeft size={16} />
      Productos
    </button>
  )
}

function VarianteModal({ variante, moneda, cotizacion, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: variante?.nombre ?? '',
    descripcion: variante?.descripcion ?? '',
    precio_usd: variante?.precio_usd ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const otraMoneda = moneda === 'USD' ? 'ARS' : 'USD'
  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    const err = await onSave({
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio_usd: form.precio_usd === '' ? null : Number(form.precio_usd),
    })
    setSaving(false)
    if (err) setError(err)
  }
  const conv = convertir(Number(form.precio_usd), moneda, cotizacion)
  const convVal = moneda === 'USD' ? conv.ars : conv.usd

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md glass-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">{variante ? 'Editar variante' : 'Nueva variante'}</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white" aria-label="Cerrar"><TbX size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input className={inputClass} value={form.nombre} onChange={(e) => update('nombre', e.target.value)} autoFocus />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <input className={inputClass} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Precio ({moneda})</label>
              <input type="number" step="0.01" className={inputClass} value={form.precio_usd} onChange={(e) => update('precio_usd', e.target.value)} placeholder="0.00" />
              {form.precio_usd !== '' && <p className="mt-1 text-xs text-hmc-muted">≈ {convVal ? formatMonto(convVal, otraMoneda) : `${otraMoneda} —`}</p>}
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
