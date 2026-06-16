import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TbPlus,
  TbSearch,
  TbEdit,
  TbCopy,
  TbDownload,
  TbTrash,
  TbFileInvoice,
  TbRefresh,
  TbX,
  TbLayoutKanban,
  TbCash,
} from 'react-icons/tb'
import {
  getCotizaciones,
  getCotizacion,
  getEmpresas,
  getContactos,
  createCotizacion,
  deleteCotizacion,
  duplicarCotizacion,
} from '../lib/db'
import { useDolar } from '../hooks/useDolar'
import { formatUSD, formatARS, haceCuanto } from '../lib/dolar'
import { ESTADOS_COT, ESTADOS_COT_LIST, diasRestantes } from '../lib/cotizaciones'
import { iniciales } from '../lib/utils'
import { generarCotizacionPDF } from '../lib/generarPDF'
import AsignarOportunidadModal from '../components/AsignarOportunidadModal'

function EstadoBadge({ estado }) {
  const e = ESTADOS_COT[estado] ?? ESTADOS_COT.borrador
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${e.color}22`, color: e.color }}>
      {e.label}
    </span>
  )
}

function itemsCount(c) {
  return c.cotizacion_items?.[0]?.count ?? 0
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Cotizaciones() {
  const navigate = useNavigate()
  const { cotizacion: dolar, loading: dolarLoading, refetch } = useDolar()

  const [cots, setCots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [estadoF, setEstadoF] = useState('')
  const [empresaF, setEmpresaF] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [modal, setModal] = useState(false)
  const [asignarCotId, setAsignarCotId] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await getCotizaciones()
    if (err) setError('No se pudieron cargar las cotizaciones: ' + err.message)
    else setCots(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    getEmpresas().then(({ data }) => setEmpresas(data ?? []))
  }, [])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cots.filter((c) => {
      const cliente = c.empresa?.nombre || `${c.contacto?.nombre ?? ''} ${c.contacto?.apellido ?? ''}` || c.cliente_nombre || ''
      const texto = `${c.numero} ${c.titulo} ${cliente}`.toLowerCase()
      if (q && !texto.includes(q)) return false
      if (estadoF && c.estado !== estadoF) return false
      if (empresaF && c.empresa_id !== empresaF) return false
      return true
    })
  }, [cots, search, estadoF, empresaF])

  async function handleDuplicar(c) {
    const { error: err } = await duplicarCotizacion(c.id)
    if (err) return setError('No se pudo duplicar: ' + err.message)
    load()
  }

  async function handleDelete(c) {
    if (!window.confirm(`¿Eliminar la cotización "${c.numero}"?`)) return
    const { error: err } = await deleteCotizacion(c.id)
    if (err) return setError('No se pudo eliminar: ' + err.message)
    load()
  }

  async function handlePDF(c) {
    const { data, error: err } = await getCotizacion(c.id)
    if (err) return setError('No se pudo generar el PDF: ' + err.message)
    const tc = data.dolar_venta || dolar?.venta
    await generarCotizacionPDF(data, tc)
  }

  function clienteNombre(c) {
    return c.empresa?.nombre || (c.contacto ? `${c.contacto.nombre ?? ''} ${c.contacto.apellido ?? ''}`.trim() : '') || c.cliente_nombre || ''
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-hmc-white">Cotizaciones</h1>
          <p className="mt-1 text-sm text-hmc-muted">Presupuestos y propuestas</p>
        </div>
        <button type="button" onClick={() => setModal(true)} className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">
          <TbPlus size={18} />
          Nueva cotización
        </button>
      </div>

      {/* Card dólar */}
      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-hmc-border bg-hmc-gray2 p-3">
        {dolarLoading && !dolar ? (
          <div className="h-6 w-40 animate-pulse rounded bg-hmc-gray3" />
        ) : dolar ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[10px] uppercase tracking-wide text-hmc-muted">Dólar {dolar.nombre}</span>
            <span className="font-semibold" style={{ color: '#44aa99' }}>Compra ${dolar.compra}</span>
            <span className="font-semibold" style={{ color: '#e24b4a' }}>Venta ${dolar.venta}</span>
            <span className="text-[10px] text-hmc-muted">{haceCuanto(dolar.timestamp)}</span>
          </div>
        ) : (
          <span className="text-sm text-hmc-muted">Sin cotización de dólar</span>
        )}
        <button type="button" onClick={refetch} className="rounded p-1.5 text-hmc-muted hover:text-hmc-white"><TbRefresh size={16} /></button>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <TbSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted" />
          <input type="text" placeholder="Buscar por número, título o cliente…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-9 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted" />
        </div>
        <select value={estadoF} onChange={(e) => setEstadoF(e.target.value)} className="rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white">
          <option value="">Todos los estados</option>
          {ESTADOS_COT_LIST.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select value={empresaF} onChange={(e) => setEmpresaF(e.target.value)} className="rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white">
          <option value="">Todas las empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      {error && <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</p>}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-hmc-muted">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-hmc-border bg-hmc-gray2 px-6 py-16 text-center">
          <TbFileInvoice size={40} className="mb-3 text-hmc-muted" />
          <p className="text-sm text-hmc-muted">No hay cotizaciones</p>
          <button type="button" onClick={() => setModal(true)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">
            <TbPlus size={16} />Nueva cotización
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtradas.map((c) => {
            const dias = diasRestantes(c)
            const cliente = clienteNombre(c)
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/cotizaciones/${c.id}`)}
                className={`cursor-pointer rounded-lg border bg-hmc-gray2 p-4 transition-colors hover:bg-hmc-gray3/40 active:scale-[0.99] ${c.cobrada ? '' : 'border-hmc-border hover:border-[#555]'}`}
                style={c.cobrada ? { borderColor: '#44aa99' } : undefined}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-hmc-muted">{c.numero}</p>
                    <p className="text-lg font-medium text-hmc-white">{c.titulo}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-hmc-muted">
                      {c.cobrada ? (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#4a990814', color: '#44aa99' }}>
                          <TbCash size={13} /> Cobrada
                        </span>
                      ) : (
                        <EstadoBadge estado={c.estado} />
                      )}
                      {cliente ? (
                        <span className="inline-flex items-center gap-1.5">
                          {c.empresa?.logo_url ? (
                            <img src={c.empresa.logo_url} alt="" className="h-4 w-4 rounded-sm object-cover" />
                          ) : (
                            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-hmc-gray3 text-[8px] text-hmc-white">{iniciales(cliente)}</span>
                          )}
                          {cliente}
                        </span>
                      ) : (
                        <span className="text-hmc-muted/70">Sin cliente asignado</span>
                      )}
                      <span>{itemsCount(c)} items</span>
                      <span>Creada {fmtFecha(c.created_at)}</span>
                      {dias != null && (dias >= 0 ? <span>Válida por {dias} días</span> : <span className="text-red-400">Vencida</span>)}
                      {c.oportunidad ? (
                        <span className="inline-flex items-center gap-1 rounded bg-hmc-gray3 px-1.5 py-0.5 text-[11px]">
                          <TbLayoutKanban size={12} />
                          {c.oportunidad.titulo}
                        </span>
                      ) : (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAsignarCotId(c.id) }} className="inline-flex items-center gap-1 text-hmc-muted hover:text-hmc-white">
                          <TbLayoutKanban size={12} />
                          Asignar a CRM
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="font-semibold text-hmc-white">{formatUSD(c.total_usd)}</p>
                      {c.total_ars > 0 && <p className="text-xs text-hmc-muted">{formatARS(c.total_ars)}</p>}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => navigate(`/cotizaciones/${c.id}`)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-hmc-white" title="Editar"><TbEdit size={16} /></button>
                      <button type="button" onClick={() => handleDuplicar(c)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-hmc-white" title="Duplicar"><TbCopy size={16} /></button>
                      <button type="button" onClick={() => handlePDF(c)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-hmc-white" title="Descargar PDF"><TbDownload size={16} /></button>
                      <button type="button" onClick={() => handleDelete(c)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-red-400" title="Eliminar"><TbTrash size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && <NuevaCotizacionModal onClose={() => setModal(false)} onCreated={(id) => navigate(`/cotizaciones/${id}`)} dolar={dolar} />}
      {asignarCotId && (
        <AsignarOportunidadModal
          cotizacionId={asignarCotId}
          onClose={() => setAsignarCotId(null)}
          onAsignada={() => {
            setAsignarCotId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

const inputClass = 'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

function NuevaCotizacionModal({ onClose, onCreated, dolar }) {
  const [titulo, setTitulo] = useState('')
  const [tipoCliente, setTipoCliente] = useState('sin') // empresa | contacto | sin
  const [empresaId, setEmpresaId] = useState('')
  const [contactoId, setContactoId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [validez, setValidez] = useState(7)
  const [notas, setNotas] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [contactos, setContactos] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getEmpresas().then(({ data }) => setEmpresas(data ?? []))
    getContactos().then(({ data }) => setContactos(data ?? []))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!titulo.trim()) return setError('El título es obligatorio.')

    const payload = {
      titulo: titulo.trim(),
      estado: 'borrador',
      validez_dias: Number(validez) || 7,
      notas: notas.trim() || null,
      moneda_display: 'ARS',
      dolar_venta: dolar?.venta ?? null,
      empresa_id: tipoCliente === 'empresa' ? empresaId || null : null,
      contacto_id: tipoCliente === 'contacto' ? contactoId || null : null,
      cliente_nombre: tipoCliente === 'sin' ? clienteNombre.trim() || null : null,
      cliente_email: tipoCliente === 'sin' ? clienteEmail.trim() || null : null,
    }

    setSaving(true)
    const { data, error: err } = await createCotizacion(payload)
    setSaving(false)
    if (err) return setError('No se pudo crear: ' + err.message)
    onCreated(data.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">Nueva cotización</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Título *</label>
              <input className={inputClass} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Flota 10 bicis Hotel X" autoFocus />
            </div>

            <div>
              <label className={labelClass}>Cliente</label>
              <div className="mb-2 flex gap-2">
                {[{ k: 'empresa', l: 'Empresa' }, { k: 'contacto', l: 'Contacto' }, { k: 'sin', l: 'Manual' }].map((o) => (
                  <button key={o.k} type="button" onClick={() => setTipoCliente(o.k)} className={`flex-1 rounded-md px-2 py-1.5 text-xs transition-colors ${tipoCliente === o.k ? 'bg-hmc-white text-hmc-black' : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'}`}>{o.l}</button>
                ))}
              </div>
              {tipoCliente === 'empresa' && (
                <select className={inputClass} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                  <option value="">Seleccionar empresa…</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              )}
              {tipoCliente === 'contacto' && (
                <select className={inputClass} value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
                  <option value="">Seleccionar contacto…</option>
                  {contactos.map((c) => <option key={c.id} value={c.id}>{[c.nombre, c.apellido].filter(Boolean).join(' ')}</option>)}
                </select>
              )}
              {tipoCliente === 'sin' && (
                <div className="flex flex-col gap-2">
                  <input className={inputClass} value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Nombre del cliente" />
                  <input className={inputClass} value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="Email (opcional)" />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Validez (días)</label>
              <input type="number" className={inputClass} value={validez} onChange={(e) => setValidez(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Notas iniciales</label>
              <textarea rows={2} className={`${inputClass} resize-none`} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">{saving ? 'Creando…' : 'Crear y editar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
