import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  TbArrowLeft,
  TbPencil,
  TbTrash,
  TbPlus,
  TbX,
  TbMail,
  TbBrandWhatsapp,
  TbBuildingSkyscraper,
  TbFileInvoice,
  TbDownload,
} from 'react-icons/tb'
import {
  getOportunidad,
  updateOportunidad,
  getActividadesCRM,
  createActividadCRM,
  updateActividadCRM,
  deleteActividadCRM,
  toggleActividadCRM,
  getCotizacion,
} from '../lib/db'
import { iniciales, limpiarWhatsapp } from '../lib/utils'
import {
  ETAPAS,
  ETAPA_MAP,
  PRIORIDADES,
  formatMonto,
} from '../lib/crm'
import {
  TIPOS_ACTIVIDAD,
  TIPO_ACTIVIDAD_MAP,
  ESTADOS_ACTIVIDAD,
} from '../lib/campanas'
import { ESTADOS_COT } from '../lib/cotizaciones'
import { formatUSD, formatARS } from '../lib/dolar'
import { generarCotizacionPDF } from '../lib/generarPDF'
import { confirmDialog } from '../components/confirm'
import OportunidadModal from '../components/OportunidadModal'
import CotizacionDesdeCRMModal from '../components/CotizacionDesdeCRMModal'
import ActividadCRMModal from '../components/ActividadCRMModal'

const labelClass = 'text-xs uppercase tracking-wide text-hmc-muted'
const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'

function fmtFecha(iso, conHora = false) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}
function esVencida(act) {
  return (
    act.fecha_vencimiento &&
    act.estado !== 'completada' &&
    act.estado !== 'cancelada' &&
    new Date(act.fecha_vencimiento) < new Date()
  )
}
function isoToLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function localToIso(local) {
  return local ? new Date(local).toISOString() : null
}

export default function CRMDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [op, setOp] = useState(null)
  const [acts, setActs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [tituloTmp, setTituloTmp] = useState('')
  const [notasTmp, setNotasTmp] = useState('')
  const [modalOp, setModalOp] = useState(false)
  const [filtroAct, setFiltroAct] = useState('todos')
  const [actModal, setActModal] = useState(null) // { actividad } | null
  const [cotModal, setCotModal] = useState(false)

  async function descargarCotPDF(cotId) {
    const { data } = await getCotizacion(cotId)
    if (data) await generarCotizacionPDF(data, data.dolar_venta || null)
  }

  async function loadOp() {
    const { data, error: err } = await getOportunidad(id)
    if (err) {
      setError('No se pudo cargar la oportunidad: ' + err.message)
      return null
    }
    setOp(data)
    setTituloTmp(data.titulo ?? '')
    setNotasTmp(data.notas ?? '')
    return data
  }
  async function loadActs() {
    const { data } = await getActividadesCRM(id)
    setActs(data ?? [])
  }
  async function loadAll() {
    setLoading(true)
    await Promise.all([loadOp(), loadActs()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function guardarCampo(campo, valor) {
    await updateOportunidad(id, { [campo]: valor })
    setOp((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSaveOp(payload) {
    const { error: err } = await updateOportunidad(id, payload)
    if (err) return 'No se pudo guardar: ' + err.message
    setModalOp(false)
    await loadOp()
    return null
  }

  async function toggleAct(act) {
    await toggleActividadCRM(act.id, act.estado !== 'completada')
    await loadActs()
  }
  async function deleteAct(act) {
    if (!(await confirmDialog(`¿Eliminar la actividad "${act.titulo}"?`))) return
    await deleteActividadCRM(act.id)
    await loadActs()
  }

  const actsFiltradas = useMemo(() => {
    if (filtroAct === 'pendientes') return acts.filter((a) => a.estado !== 'completada')
    if (filtroAct === 'completadas') return acts.filter((a) => a.estado === 'completada')
    return acts
  }, [acts, filtroAct])

  // Historial simulado (sin tabla real).
  const historial = useMemo(() => {
    if (!op) return []
    const items = [{ texto: 'Oportunidad creada', fecha: op.created_at }]
    acts
      .filter((a) => a.estado === 'completada' && a.completada_at)
      .forEach((a) =>
        items.push({ texto: `Actividad completada: ${a.titulo}`, fecha: a.completada_at })
      )
    items.push({
      texto: `Etapa actual: ${ETAPA_MAP[op.etapa]?.label ?? op.etapa}`,
      fecha: op.updated_at,
    })
    return items.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  }, [op, acts])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hmc-border border-t-hmc-white" />
      </div>
    )
  }
  if (error && !op) {
    return (
      <div>
        <Back onClick={() => navigate('/crm')} />
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      </div>
    )
  }
  if (!op) return null

  const prioridad = PRIORIDADES[op.prioridad] ?? PRIORIDADES.media
  const monto = formatMonto(op.valor_estimado, op.moneda)

  return (
    <div className="mx-auto max-w-4xl">
      <Back onClick={() => navigate('/crm')} />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editandoTitulo ? (
            <input
              className="w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-1.5 text-xl font-semibold text-hmc-white outline-none focus:border-hmc-white"
              value={tituloTmp}
              autoFocus
              onChange={(e) => setTituloTmp(e.target.value)}
              onBlur={() => {
                setEditandoTitulo(false)
                if (tituloTmp.trim() && tituloTmp !== op.titulo) guardarCampo('titulo', tituloTmp.trim())
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoTitulo(true)}
              className="text-2xl font-semibold text-hmc-white hover:underline"
            >
              {op.titulo}
            </button>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Etapa inline */}
            <select
              value={op.etapa}
              onChange={(e) => guardarCampo('etapa', e.target.value)}
              className="rounded border border-hmc-border bg-hmc-gray2 px-2 py-1 text-xs text-hmc-white outline-none focus:border-hmc-white"
              style={{ color: ETAPA_MAP[op.etapa]?.color }}
            >
              {ETAPAS.map((e) => (
                <option key={e.key} value={e.key} style={{ color: '#fff' }}>
                  {e.label}
                </option>
              ))}
            </select>
            <span
              className="rounded px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${prioridad.color}22`, color: prioridad.color }}
            >
              {prioridad.label}
            </span>
            {monto && (
              <span className="rounded bg-hmc-gray3 px-2 py-0.5 text-xs text-hmc-white">
                {monto}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOp(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
        >
          <TbPencil size={16} />
          Editar
        </button>
      </div>

      {/* Info */}
      <section className="mb-6 rounded-lg border border-hmc-border bg-hmc-gray2 p-6">
        <h2 className="mb-4 text-sm uppercase tracking-wide text-hmc-muted">Info</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {/* Empresa */}
          <div>
            <p className={labelClass}>Empresa</p>
            {op.empresa ? (
              <button
                type="button"
                onClick={() => navigate(`/empresas/${op.empresa.id}`)}
                className="mt-1 inline-flex items-center gap-2 text-sm text-hmc-white hover:underline"
              >
                {op.empresa.logo_url ? (
                  <img src={op.empresa.logo_url} alt="" className="h-5 w-5 rounded-sm object-cover" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-hmc-gray3 text-[9px]">
                    {iniciales(op.empresa.nombre)}
                  </span>
                )}
                {op.empresa.nombre}
              </button>
            ) : (
              <p className="mt-1 text-sm text-hmc-muted">—</p>
            )}
          </div>

          {/* Contacto */}
          <div>
            <p className={labelClass}>Contacto</p>
            {op.contacto ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-hmc-white">
                <span>{[op.contacto.nombre, op.contacto.apellido].filter(Boolean).join(' ')}</span>
                {op.contacto.email && (
                  <a
                    href={`mailto:${op.contacto.email}`}
                    className="text-hmc-muted hover:text-hmc-white"
                    title="Email"
                  >
                    <TbMail size={15} />
                  </a>
                )}
                {op.contacto.whatsapp && (
                  <a
                    href={`https://wa.me/${limpiarWhatsapp(op.contacto.whatsapp)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-hmc-muted hover:text-[#25d366]"
                    title="WhatsApp"
                  >
                    <TbBrandWhatsapp size={15} />
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-hmc-muted">—</p>
            )}
          </div>

          {/* Campaña */}
          <div>
            <p className={labelClass}>Campaña</p>
            {op.campana ? (
              <button
                type="button"
                onClick={() => navigate(`/campanas/${op.campana.id}`)}
                className="mt-1 text-sm text-hmc-white hover:underline"
              >
                {op.campana.nombre}
              </button>
            ) : (
              <p className="mt-1 text-sm text-hmc-muted">—</p>
            )}
          </div>

          {/* Probabilidad */}
          <div>
            <p className={labelClass}>Probabilidad</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-hmc-gray3">
                <div className="h-full bg-hmc-white" style={{ width: `${op.probabilidad}%` }} />
              </div>
              <span className="text-xs text-hmc-muted">{op.probabilidad}%</span>
            </div>
          </div>

          <div>
            <p className={labelClass}>Cierre estimado</p>
            <p className="mt-1 text-sm text-hmc-white">{fmtFecha(op.fecha_cierre_estimada)}</p>
          </div>
          <div>
            <p className={labelClass}>Creada</p>
            <p className="mt-1 text-sm text-hmc-white">{fmtFecha(op.created_at)}</p>
          </div>

          {/* Notas inline */}
          <div className="sm:col-span-2">
            <p className={labelClass}>Notas</p>
            <textarea
              rows={2}
              className={`${inputClass} mt-1 resize-none`}
              value={notasTmp}
              onChange={(e) => setNotasTmp(e.target.value)}
              onBlur={() => notasTmp !== (op.notas ?? '') && guardarCampo('notas', notasTmp || null)}
              placeholder="Agregar notas…"
            />
          </div>
        </div>
      </section>

      {/* Cotizaciones */}
      <section className="mb-6 rounded-lg border border-hmc-border bg-hmc-gray2 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wide text-hmc-muted">Cotizaciones</h2>
          <button type="button" onClick={() => setCotModal(true)} className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white hover:bg-hmc-gray3"><TbPlus size={16} />Nueva cotización</button>
        </div>
        {(op.cotizaciones ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-hmc-muted">Sin cotizaciones asignadas</p>
        ) : (
          <div className="flex flex-col gap-2">
            {op.cotizaciones.map((c) => {
              const e = ESTADOS_COT[c.estado] ?? ESTADOS_COT.borrador
              return (
                <div key={c.id} className="flex items-center gap-4 rounded-md border border-hmc-border bg-hmc-black px-3 py-2.5 hover:bg-hmc-gray3/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-hmc-muted">{c.numero}</p>
                    <p className="truncate text-sm font-medium text-hmc-white">{c.titulo}</p>
                  </div>
                  <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${e.color}22`, color: e.color }}>{e.label}</span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-hmc-white">{formatUSD(c.total_usd)}</p>
                    {c.total_ars > 0 && <p className="text-[11px] text-hmc-muted">{formatARS(c.total_ars)}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => navigate(`/cotizaciones/${c.id}`)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-hmc-white" title="Abrir"><TbFileInvoice size={16} /></button>
                    <button type="button" onClick={() => descargarCotPDF(c.id)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-hmc-white" title="Descargar PDF"><TbDownload size={16} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Actividades */}
      <section className="mb-6 rounded-lg border border-hmc-border bg-hmc-gray2 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wide text-hmc-muted">Actividades</h2>
          <button
            type="button"
            onClick={() => setActModal({ actividad: null })}
            className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
          >
            <TbPlus size={16} />
            Nueva actividad
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {[
            { key: 'todos', label: 'Todas' },
            { key: 'pendientes', label: 'Pendientes' },
            { key: 'completadas', label: 'Completadas' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltroAct(f.key)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                filtroAct === f.key
                  ? 'bg-hmc-white text-hmc-black'
                  : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {actsFiltradas.length === 0 ? (
          <p className="py-6 text-center text-sm text-hmc-muted">Sin actividades.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {actsFiltradas.map((a) => (
              <ActRow key={a.id} act={a} onToggle={toggleAct} onEdit={(act) => setActModal({ actividad: act })} onDelete={deleteAct} />
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      <section className="rounded-lg border border-hmc-border bg-hmc-gray2 p-6">
        <h2 className="mb-4 text-sm uppercase tracking-wide text-hmc-muted">Historial</h2>
        <div className="flex flex-col gap-3">
          {historial.map((h, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hmc-muted" />
              <div>
                <p className="text-hmc-white">{h.texto}</p>
                <p className="text-xs text-hmc-muted">{fmtFecha(h.fecha, true)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modalOp && (
        <OportunidadModal
          oportunidad={op}
          onClose={() => setModalOp(false)}
          onSave={handleSaveOp}
        />
      )}
      {actModal && (
        <ActividadCRMModal
          actividad={actModal.actividad}
          oportunidadId={id}
          onClose={() => setActModal(null)}
          onSaved={() => {
            setActModal(null)
            loadActs()
          }}
        />
      )}
      {cotModal && (
        <CotizacionDesdeCRMModal
          oportunidad={op}
          onClose={() => setCotModal(false)}
          onCreada={(cotId) =>
            navigate(`/cotizaciones/${cotId}`, {
              state: { desde_oportunidad_id: op.id, desde_oportunidad_titulo: op.titulo },
            })
          }
          onAsignada={() => {
            setCotModal(false)
            loadOp()
          }}
        />
      )}
    </div>
  )
}

function Back({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white"
    >
      <TbArrowLeft size={16} />
      CRM
    </button>
  )
}

function ActRow({ act, onToggle, onEdit, onDelete }) {
  const tipo = TIPO_ACTIVIDAD_MAP[act.tipo] ?? TIPO_ACTIVIDAD_MAP.tarea
  const Icon = tipo.icon
  const completada = act.estado === 'completada'
  const vencida = esVencida(act)
  return (
    <div
      onClick={() => onEdit(act)}
      className="group flex cursor-pointer items-center gap-3 rounded-md border border-hmc-border bg-hmc-black px-3 py-2 transition-colors hover:bg-hmc-gray3/40 active:scale-[0.99]"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(act) }}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          completada ? 'border-hmc-white bg-hmc-white' : 'border-hmc-border'
        }`}
      >
        {completada && <span className="text-[10px] text-hmc-black">✓</span>}
      </button>
      <Icon size={15} style={{ color: tipo.color }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <span className={`text-sm ${completada ? 'text-hmc-muted line-through opacity-60' : 'text-hmc-white'}`}>
          {act.titulo}
        </span>
        {act.descripcion && <p className="truncate text-xs text-hmc-muted">{act.descripcion}</p>}
      </div>
      {act.fecha_vencimiento && (
        <span className={`shrink-0 text-xs ${vencida ? 'text-red-400' : 'text-hmc-muted'}`}>
          {fmtFecha(act.fecha_vencimiento, true)}
        </span>
      )}
      <span className="shrink-0 rounded bg-hmc-gray3 px-1.5 py-0.5 text-[10px] text-hmc-muted">
        {act.estado}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onEdit(act)} className="rounded p-1 text-hmc-muted hover:text-hmc-white" title="Editar">
          <TbPencil size={14} />
        </button>
        <button type="button" onClick={() => onDelete(act)} className="rounded p-1 text-hmc-muted hover:text-red-400" title="Eliminar">
          <TbTrash size={14} />
        </button>
      </div>
    </div>
  )
}

