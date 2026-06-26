import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confirmDialog } from '../components/confirm'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import {
  TbArrowLeft,
  TbPlus,
  TbSearch,
  TbClock,
  TbAlertCircle,
  TbCircleCheck,
  TbLayoutKanban,
  TbPencil,
  TbTrash,
  TbArrowRight,
  TbX,
} from 'react-icons/tb'
import {
  getTodasActividadesCRM,
  getOportunidades,
  toggleActividadCRM,
  deleteActividadCRM,
  updateActividadCRM,
} from '../lib/db'
import { TIPOS_ACTIVIDAD, TIPO_ACTIVIDAD_MAP, ESTADOS_ACTIVIDAD } from '../lib/campanas'
import { ETAPA_MAP } from '../lib/crm'
import { iniciales } from '../lib/utils'
import Toast from '../components/Toast'
import ActividadCRMModal from '../components/ActividadCRMModal'

const DIA = 86400000
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const ALTA = '[ALTA] '
const limpiaDesc = (d) => (d?.startsWith(ALTA) ? d.slice(ALTA.length) : d ?? '')
const esAlta = (d) => !!d?.startsWith(ALTA)

function infoFecha(act) {
  if (!act.fecha_vencimiento) return { txt: 'Sin fecha', vencida: false }
  const t = new Date(act.fecha_vencimiento).getTime()
  const hoy0 = startOfToday()
  const completada = act.estado === 'completada'
  const hora = new Date(act.fecha_vencimiento).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  if (t < hoy0 && !completada) {
    const dias = Math.floor((hoy0 - t) / DIA)
    return { txt: dias <= 0 ? 'Vencida hoy' : `Hace ${dias} día${dias === 1 ? '' : 's'}`, vencida: true }
  }
  if (t >= hoy0 && t < hoy0 + DIA) return { txt: `Hoy ${hora}`, vencida: false }
  if (t >= hoy0 + DIA && t < hoy0 + 2 * DIA) return { txt: `Mañana ${hora}`, vencida: false }
  const dias = Math.ceil((t - hoy0) / DIA)
  if (dias < 7) return { txt: `En ${dias} días`, vencida: false }
  return { txt: new Date(act.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }), vencida: false }
}

function grupoDe(act) {
  if (act.estado === 'completada') return 'completadas'
  if (!act.fecha_vencimiento) return 'sinfecha'
  const t = new Date(act.fecha_vencimiento).getTime()
  const hoy0 = startOfToday()
  if (t < hoy0) return 'vencidas'
  if (t < hoy0 + DIA) return 'hoy'
  if (t < hoy0 + 2 * DIA) return 'manana'
  if (t < hoy0 + 7 * DIA) return 'semana'
  return 'proximo'
}

const GRUPOS = [
  { key: 'vencidas', label: '⚠️ Vencidas', color: '#e24b4a' },
  { key: 'hoy', label: 'Hoy' },
  { key: 'manana', label: 'Mañana' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'proximo', label: 'Próximamente' },
  { key: 'sinfecha', label: 'Sin fecha asignada' },
  { key: 'completadas', label: 'Completadas' },
]

const ESTADO_COLS = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'completada', label: 'Completada' },
  { key: 'cancelada', label: 'Cancelada' },
]

export default function CRMActividades() {
  const navigate = useNavigate()
  const [acts, setActs] = useState([])
  const [ops, setOps] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lista')
  const [toast, setToast] = useState({ visible: false, mensaje: '' })
  const [modal, setModal] = useState(null) // { actividad, oportunidadId } | null

  // Filtros
  const [search, setSearch] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fOp, setFOp] = useState('')
  const [fPeriodo, setFPeriodo] = useState('')
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data } = await getTodasActividadesCRM()
    setActs(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    getOportunidades().then(({ data }) => setOps(data ?? []))
  }, [])

  const hayFiltros = search || fEstado || fTipo || fOp || fPeriodo
  function limpiarFiltros() {
    setSearch('')
    setFEstado('')
    setFTipo('')
    setFOp('')
    setFPeriodo('')
  }

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    const hoy0 = startOfToday()
    return acts.filter((a) => {
      if (q && !(a.titulo ?? '').toLowerCase().includes(q)) return false
      if (fEstado && a.estado !== fEstado) return false
      if (fTipo && a.tipo !== fTipo) return false
      if (fOp && a.oportunidad_id !== fOp) return false
      if (fPeriodo) {
        const t = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : null
        if (fPeriodo === 'vencidas') {
          if (!(t && t < hoy0 && a.estado !== 'completada')) return false
        } else if (fPeriodo === 'hoy') {
          if (!(t && t >= hoy0 && t < hoy0 + DIA)) return false
        } else if (fPeriodo === 'semana') {
          if (!(t && t >= hoy0 && t < hoy0 + 7 * DIA)) return false
        } else if (fPeriodo === 'mes') {
          if (!(t && t >= hoy0 && t < hoy0 + 30 * DIA)) return false
        }
      }
      return true
    })
  }, [acts, search, fEstado, fTipo, fOp, fPeriodo])

  const stats = useMemo(() => {
    const pend = acts.filter((a) => a.estado === 'pendiente' || a.estado === 'en_proceso').length
    const hoy0 = startOfToday()
    const venc = acts.filter((a) => a.fecha_vencimiento && new Date(a.fecha_vencimiento).getTime() < hoy0 && a.estado !== 'completada').length
    const ahora = new Date()
    const compMes = acts.filter((a) => {
      if (a.estado !== 'completada' || !a.completada_at) return false
      const d = new Date(a.completada_at)
      return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear()
    }).length
    const conteo = {}
    acts.forEach((a) => { conteo[a.tipo] = (conteo[a.tipo] ?? 0) + 1 })
    const tipoTop = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { pend, venc, compMes, tipoTop }
  }, [acts])

  async function toggle(a) {
    await toggleActividadCRM(a.id, a.estado !== 'completada')
    cargar()
  }
  async function eliminar(a) {
    if (!(await confirmDialog(`¿Eliminar la actividad "${a.titulo}"?`))) return
    await deleteActividadCRM(a.id)
    cargar()
  }
  async function moverEstado(id, estado) {
    setActs((prev) => prev.map((a) => (a.id === id ? { ...a, estado } : a)))
    await updateActividadCRM(id, estado === 'completada' ? { estado, completada_at: new Date().toISOString() } : { estado, completada_at: null })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate('/crm')} className="mb-2 inline-flex items-center gap-1.5 text-sm text-hmc-muted hover:text-hmc-white">
            <TbArrowLeft size={16} /> CRM
          </button>
          <h1 className="text-2xl font-semibold text-hmc-white">Actividades</h1>
          <p className="mt-1 text-sm text-hmc-muted">Gestión de tareas y seguimientos</p>
        </div>
        <button type="button" onClick={() => setModal({ actividad: null })} className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">
          <TbPlus size={18} /> Nueva actividad
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TbClock} color="#e8b87f" valor={stats.pend} label="Pendientes" />
        <StatCard icon={TbAlertCircle} color="#e24b4a" valor={stats.venc} label="Vencidas" alerta={stats.venc > 0} />
        <StatCard icon={TbCircleCheck} color="#44aa99" valor={stats.compMes} label="Completadas este mes" />
        <StatCard
          icon={stats.tipoTop ? TIPO_ACTIVIDAD_MAP[stats.tipoTop]?.icon : TbLayoutKanban}
          color={stats.tipoTop ? TIPO_ACTIVIDAD_MAP[stats.tipoTop]?.color : '#777'}
          valor={stats.tipoTop ? TIPO_ACTIVIDAD_MAP[stats.tipoTop]?.label : '—'}
          label="Tipo más frecuente"
          small
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <TbSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título…" className="w-full glass-input py-2 pl-9 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted" />
        </div>
        <Sel value={fEstado} onChange={setFEstado} placeholder="Estado" opts={ESTADOS_ACTIVIDAD.map((e) => ({ v: e.value, l: e.label }))} />
        <Sel value={fTipo} onChange={setFTipo} placeholder="Tipo" opts={TIPOS_ACTIVIDAD.map((t) => ({ v: t.value, l: t.label }))} />
        <Sel value={fOp} onChange={setFOp} placeholder="Oportunidad" opts={ops.map((o) => ({ v: o.id, l: o.titulo }))} />
        <Sel value={fPeriodo} onChange={setFPeriodo} placeholder="Período" opts={[{ v: 'hoy', l: 'Hoy' }, { v: 'semana', l: 'Esta semana' }, { v: 'mes', l: 'Este mes' }, { v: 'vencidas', l: 'Vencidas' }]} />
        {hayFiltros && (
          <button type="button" onClick={limpiarFiltros} className="text-xs text-hmc-muted hover:text-hmc-white">Limpiar filtros</button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-6 border-b border-hmc-border">
        {[{ k: 'lista', l: 'Lista' }, { k: 'oportunidad', l: 'Por oportunidad' }, { k: 'kanban', l: 'Kanban de estados' }].map((t) => (
          <button key={t.k} type="button" onClick={() => setTab(t.k)} className={`-mb-px border-b-2 px-1 py-2.5 text-sm transition-colors ${tab === t.k ? 'border-hmc-white text-hmc-white' : 'border-transparent text-hmc-muted hover:text-hmc-white'}`}>{t.l}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-hmc-muted">Cargando…</p>
      ) : tab === 'lista' ? (
        <TabLista
          actividades={filtradas}
          mostrarCompletadas={mostrarCompletadas}
          setMostrarCompletadas={setMostrarCompletadas}
          onToggle={toggle}
          onEdit={(a) => setModal({ actividad: a })}
          onEliminar={eliminar}
          onIr={(id) => navigate(`/crm/${id}`)}
        />
      ) : tab === 'oportunidad' ? (
        <TabPorOportunidad
          actividades={filtradas}
          ops={ops}
          onToggle={toggle}
          onEdit={(a) => setModal({ actividad: a })}
          onNueva={(opId) => setModal({ actividad: null, oportunidadId: opId })}
          onIr={(id) => navigate(`/crm/${id}`)}
        />
      ) : (
        <TabKanban actividades={filtradas} onMover={moverEstado} onEdit={(a) => setModal({ actividad: a })} onIr={(id) => navigate(`/crm/${id}`)} />
      )}

      {modal && (
        <ActividadCRMModal
          actividad={modal.actividad}
          oportunidadId={modal.oportunidadId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            cargar()
          }}
        />
      )}

      <Toast visible={toast.visible} mensaje={toast.mensaje} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  )
}

function Sel({ value, onChange, placeholder, opts }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white">
      <option value="">{placeholder}: todos</option>
      {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function StatCard({ icon: Icon, color, valor, label, alerta, small }) {
  return (
    <div className="relative glass-card p-4" style={alerta ? { backgroundColor: '#e24b4a0d' } : {}}>
      <Icon size={26} style={{ color }} className="absolute right-3 top-3 opacity-80" />
      <p className={`font-bold leading-none text-hmc-white ${small ? 'text-lg' : 'text-2xl'}`}>{valor}</p>
      <p className="mt-1.5 text-[11px] uppercase tracking-wide text-hmc-muted">{label}</p>
    </div>
  )
}

// Fila de actividad reutilizable
function ActRow({ act, onToggle, onEdit, onEliminar, onIr, compacta }) {
  const tipo = TIPO_ACTIVIDAD_MAP[act.tipo] ?? TIPO_ACTIVIDAD_MAP.tarea
  const Icon = tipo.icon
  const completada = act.estado === 'completada'
  const f = infoFecha(act)
  const op = act.oportunidad
  const etapa = op ? ETAPA_MAP[op.etapa] : null
  const cli = op?.empresa || op?.contacto
  const cliNombre = op?.empresa?.nombre || (op?.contacto ? [op.contacto.nombre, op.contacto.apellido].filter(Boolean).join(' ') : '')
  const cliFoto = op?.empresa?.logo_url || op?.contacto?.foto_url
  const alta = esAlta(act.descripcion)
  const vencidaGrp = !completada && f.vencida

  return (
    <div
      onClick={() => onEdit(act)}
      className={`group flex cursor-pointer items-start gap-3 glass-card px-3.5 py-3 transition-colors hover:border-[#555] hover:bg-hmc-gray3/40 ${completada ? 'opacity-50' : ''}`}
      style={vencidaGrp ? { borderLeft: '2px solid #e24b4a' } : grupoDe(act) === 'hoy' ? { borderLeft: '2px solid #e8b87f' } : {}}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(act) }}
        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-colors"
        style={{ border: `1.5px solid ${completada ? '#44aa99' : '#2e2e2e'}`, backgroundColor: completada ? '#44aa99' : 'transparent' }}
        title={completada ? 'Marcar pendiente' : 'Completar'}
      >
        {completada && <span className="text-[11px] text-white">✓</span>}
      </button>

      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${tipo.color}22` }}>
        <Icon size={15} style={{ color: tipo.color }} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {alta && <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ backgroundColor: '#e24b4a22', color: '#e24b4a' }}>ALTA</span>}
          <span className={`truncate text-[13px] font-medium ${completada ? 'text-hmc-muted line-through' : 'text-hmc-white'}`}>{act.titulo}</span>
        </div>
        {limpiaDesc(act.descripcion) && <p className="truncate text-[11px] text-hmc-muted">{limpiaDesc(act.descripcion)}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {op && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onIr(op.id) }} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ backgroundColor: `${etapa?.color ?? '#777'}22`, color: etapa?.color ?? '#777' }}>
              <TbLayoutKanban size={11} /> {op.titulo}
            </button>
          )}
          <span className={f.vencida ? 'text-red-400' : 'text-hmc-muted'}>{f.txt}</span>
          <span className="rounded bg-hmc-gray3 px-1.5 py-0.5 text-hmc-muted">{act.estado}</span>
          {cliNombre && !compacta && (
            <span className="inline-flex items-center gap-1 text-hmc-muted">
              {cliFoto ? <img src={cliFoto} alt="" className="h-4 w-4 rounded-sm object-cover" /> : <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-hmc-gray3 text-[8px] text-hmc-white">{iniciales(cliNombre)}</span>}
              {cliNombre}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onEdit(act)} className="rounded p-1.5 text-hmc-muted hover:text-hmc-white" title="Editar"><TbPencil size={15} /></button>
        <button type="button" onClick={() => onEliminar(act)} className="rounded p-1.5 text-hmc-muted hover:text-red-400" title="Eliminar"><TbTrash size={15} /></button>
        {op && <button type="button" onClick={() => onIr(op.id)} className="rounded p-1.5 text-hmc-muted hover:text-hmc-white" title="Ir a la oportunidad"><TbArrowRight size={15} /></button>}
      </div>
    </div>
  )
}

// ---------------- TAB LISTA ----------------
function TabLista({ actividades, mostrarCompletadas, setMostrarCompletadas, onToggle, onEdit, onEliminar, onIr }) {
  const visibles = mostrarCompletadas ? actividades : actividades.filter((a) => a.estado !== 'completada')
  const porGrupo = useMemo(() => {
    const g = {}
    visibles.forEach((a) => {
      const k = grupoDe(a)
      ;(g[k] = g[k] || []).push(a)
    })
    return g
  }, [visibles])

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-hmc-white">
          <input type="checkbox" checked={mostrarCompletadas} onChange={(e) => setMostrarCompletadas(e.target.checked)} className="accent-hmc-white" />
          Mostrar completadas
        </label>
      </div>

      {visibles.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center text-sm text-hmc-muted">No hay actividades.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {GRUPOS.filter((g) => porGrupo[g.key]?.length).map((g) => (
            <div key={g.key}>
              <p className="mb-2 border-b border-hmc-border pb-1 text-xs uppercase tracking-wide" style={{ color: g.color ?? '#777' }}>{g.label} ({porGrupo[g.key].length})</p>
              <div className="flex flex-col gap-2">
                {porGrupo[g.key].map((a) => (
                  <ActRow key={a.id} act={a} onToggle={onToggle} onEdit={onEdit} onEliminar={onEliminar} onIr={onIr} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- TAB POR OPORTUNIDAD ----------------
function TabPorOportunidad({ actividades, ops, onToggle, onEdit, onNueva, onIr }) {
  const porOp = useMemo(() => {
    const m = new Map()
    actividades.forEach((a) => {
      if (!a.oportunidad_id) return
      if (!m.has(a.oportunidad_id)) m.set(a.oportunidad_id, { op: a.oportunidad, acts: [] })
      m.get(a.oportunidad_id).acts.push(a)
    })
    return m
  }, [actividades])

  const sinActividades = ops.filter(
    (o) => !porOp.has(o.id) && o.etapa !== 'cerrado_ganado' && o.etapa !== 'cerrado_perdido'
  )

  return (
    <div className="flex flex-col gap-4">
      {[...porOp.values()].map(({ op, acts }) => (
        <OportunidadGrupo key={op?.id ?? Math.random()} op={op} acts={acts} onToggle={onToggle} onEdit={onEdit} onNueva={onNueva} onIr={onIr} />
      ))}

      {sinActividades.length > 0 && (
        <div className="rounded-lg border p-4" style={{ borderColor: '#ccaa4440', backgroundColor: '#ccaa440a' }}>
          <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: '#ccaa44' }}>Oportunidades sin actividades</p>
          <div className="flex flex-wrap gap-2">
            {sinActividades.map((o) => (
              <button key={o.id} type="button" onClick={() => onNueva(o.id)} className="inline-flex items-center gap-1.5 rounded-md border border-hmc-border px-3 py-1.5 text-xs text-hmc-white hover:bg-hmc-gray3">
                <TbPlus size={12} /> {o.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OportunidadGrupo({ op, acts, onToggle, onEdit, onNueva, onIr }) {
  const pendientes = acts.filter((a) => a.estado !== 'completada').length
  const completadas = acts.length - pendientes
  const [abierto, setAbierto] = useState(pendientes > 0)
  const etapa = op ? ETAPA_MAP[op.etapa] : null
  const cliNombre = op?.empresa?.nombre || (op?.contacto ? [op.contacto.nombre, op.contacto.apellido].filter(Boolean).join(' ') : '')
  const pct = acts.length ? Math.round((completadas / acts.length) * 100) : 0

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={() => setAbierto((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            {etapa && <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${etapa.color}22`, color: etapa.color }}>{etapa.label}</span>}
            <span className="truncate text-sm font-medium text-hmc-white">{op?.titulo ?? 'Sin oportunidad'}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-hmc-muted">
            {cliNombre && <span className="truncate">{cliNombre}</span>}
            <span>·</span>
            <span>{pendientes} pendientes · {completadas} completadas</span>
          </div>
          <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded bg-hmc-border">
            <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: '#44aa99' }} />
          </div>
        </button>
        <button type="button" onClick={() => onNueva(op?.id)} className="shrink-0 rounded-md border border-hmc-border p-1.5 text-hmc-muted hover:text-hmc-white" title="Agregar actividad"><TbPlus size={16} /></button>
      </div>
      {abierto && (
        <div className="flex flex-col gap-2 border-t border-hmc-border p-3">
          {acts.map((a) => (
            <ActRow key={a.id} act={a} onToggle={onToggle} onEdit={onEdit} onEliminar={() => {}} onIr={onIr} compacta />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- TAB KANBAN ----------------
function TabKanban({ actividades, onMover, onEdit, onIr }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  function handleDragEnd({ active, over }) {
    if (!over) return
    const a = actividades.find((x) => x.id === active.id)
    if (a && a.estado !== over.id) onMover(active.id, over.id)
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ESTADO_COLS.map((col) => {
          const cards = actividades.filter((a) => a.estado === col.key)
          return <KanbanCol key={col.key} col={col} cards={cards} onEdit={onEdit} onIr={onIr} />
        })}
      </div>
    </DndContext>
  )
}

function KanbanCol({ col, cards, onEdit, onIr }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  return (
    <div className="flex w-[230px] min-w-[230px] shrink-0 flex-col glass-card">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-hmc-white">{col.label}</span>
        <span className="rounded bg-hmc-gray3 px-1.5 py-0.5 text-xs text-hmc-muted">{cards.length}</span>
      </div>
      <div ref={setNodeRef} className="flex min-h-[60px] flex-1 flex-col gap-2 px-2 pb-2" style={{ background: isOver ? 'rgba(255,255,255,0.03)' : undefined }}>
        {cards.map((a) => <KanbanCard key={a.id} act={a} onEdit={onEdit} onIr={onIr} />)}
      </div>
    </div>
  )
}

function KanbanCard({ act, onEdit, onIr }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: act.id })
  const tipo = TIPO_ACTIVIDAD_MAP[act.tipo] ?? TIPO_ACTIVIDAD_MAP.tarea
  const Icon = tipo.icon
  const op = act.oportunidad
  const etapa = op ? ETAPA_MAP[op.etapa] : null
  const f = infoFecha(act)
  const cliFoto = op?.empresa?.logo_url || op?.contacto?.foto_url
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, opacity: isDragging ? 0.4 : 1, cursor: 'grabbing' } : { cursor: 'grab' }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={() => onEdit(act)} className="rounded-md border border-hmc-border bg-hmc-black p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon size={13} style={{ color: tipo.color }} className="shrink-0" />
        <span className="truncate text-xs font-medium text-hmc-white">{act.titulo}</span>
      </div>
      {op && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onIr(op.id) }} className="mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${etapa?.color ?? '#777'}22`, color: etapa?.color ?? '#777' }}>
          <TbLayoutKanban size={10} /> <span className="max-w-[140px] truncate">{op.titulo}</span>
        </button>
      )}
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        <span className={f.vencida ? 'text-red-400' : 'text-hmc-muted'}>{f.txt}</span>
        {cliFoto && <img src={cliFoto} alt="" className="h-4 w-4 rounded-sm object-cover" />}
      </div>
    </div>
  )
}
