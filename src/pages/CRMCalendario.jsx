import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { confirmDialog } from '../components/confirm'
import CustomCheckbox from '../components/ui/CustomCheckbox'
import {
  format,
  parse,
  startOfWeek,
  endOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TbArrowLeft,
  TbChevronLeft,
  TbChevronRight,
  TbFilter,
  TbPlus,
  TbX,
  TbExternalLink,
  TbCheck,
  TbPencil,
  TbTrash,
} from 'react-icons/tb'
import {
  getActividadesCalendario,
  getActividadesCampanaCalendario,
  getOportunidades,
  createActividadCRM,
  updateActividadCRM,
  deleteActividadCRM,
  toggleActividadCRM,
  deleteActividad,
  toggleActividad,
} from '../lib/db'
import { TIPOS_ACTIVIDAD, TIPO_ACTIVIDAD_MAP, ESTADOS_ACTIVIDAD } from '../lib/campanas'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../styles/calendario.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
})

const MENSAJES = {
  next: 'Siguiente',
  previous: 'Anterior',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Actividad',
  noEventsInRange: 'Sin actividades en este período',
  showMore: (total) => `+ ${total} más`,
}

const VISTAS = [
  { v: 'month', l: 'Mes' },
  { v: 'week', l: 'Semana' },
  { v: 'day', l: 'Día' },
  { v: 'agenda', l: 'Agenda' },
]
const ESTADOS_FILTRO = ESTADOS_ACTIVIDAD.filter((e) => e.value !== 'cancelada')

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function rango(date, view) {
  if (view === 'week') return [startOfWeek(date, { locale: es }), endOfWeek(date, { locale: es })]
  if (view === 'day') return [startOfDay(date), endOfDay(date)]
  if (view === 'agenda') return [startOfDay(date), addDays(date, 30)]
  // month (con spill de semanas)
  return [startOfWeek(startOfMonth(date), { locale: es }), endOfWeek(endOfMonth(date), { locale: es })]
}

function tituloPeriodo(date, view) {
  if (view === 'week') {
    const s = startOfWeek(date, { locale: es })
    const e = endOfWeek(date, { locale: es })
    return `${format(s, 'd')} - ${format(e, "d 'de' MMM yyyy", { locale: es })}`
  }
  if (view === 'day') return cap(format(date, "EEEE d 'de' MMMM", { locale: es }))
  if (view === 'agenda') return 'Próximos 30 días'
  return cap(format(date, 'LLLL yyyy', { locale: es }))
}

function fechaRel(d) {
  const dias = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Ayer'
  if (dias > 1) return `En ${dias} días`
  return `Hace ${-dias} días`
}

function esVencida(ev) {
  return ev.estado !== 'completada' && ev.estado !== 'cancelada' && new Date(ev.start) < new Date()
}

export default function CRMCalendario() {
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null) // evento seleccionado
  const [modal, setModal] = useState(null) // { fecha } | { actividad }
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  const [fuentes, setFuentes] = useState(() => new Set(['crm', 'campana']))
  const [tipos, setTipos] = useState(() => new Set(TIPOS_ACTIVIDAD.map((t) => t.value)))
  const [estados, setEstados] = useState(() => new Set(['pendiente', 'en_proceso']))

  const cargar = useCallback(async () => {
    setLoading(true)
    const [desde, hasta] = rango(date, view)
    const [crm, camp] = await Promise.all([
      getActividadesCalendario(desde, hasta),
      getActividadesCampanaCalendario(desde, hasta),
    ])
    const evCrm = (crm.data ?? [])
      .filter((a) => a.fecha_vencimiento)
      .map((a) => ({
        id: a.id,
        title: a.titulo,
        start: new Date(a.fecha_vencimiento),
        end: new Date(a.fecha_vencimiento),
        tipo: a.tipo,
        estado: a.estado,
        oportunidad: a.oportunidad,
        fuente: 'crm',
        raw: a,
      }))
    const evCamp = (camp.data ?? [])
      .filter((a) => a.fecha_vencimiento)
      .map((a) => ({
        id: 'camp_' + a.id,
        title: a.titulo,
        start: new Date(a.fecha_vencimiento),
        end: new Date(a.fecha_vencimiento),
        tipo: a.tipo,
        estado: a.estado,
        cliente: a.campana_cliente,
        campanaId: a.campana_id,
        fuente: 'campana',
        raw: a,
      }))
    setEventos([...evCrm, ...evCamp])
    setLoading(false)
  }, [date, view])

  useEffect(() => {
    cargar()
  }, [cargar])

  const eventosFiltrados = useMemo(
    () => eventos.filter((e) => fuentes.has(e.fuente) && tipos.has(e.tipo) && estados.has(e.estado)),
    [eventos, fuentes, tipos, estados]
  )

  const proximas = useMemo(
    () => eventosFiltrados.filter((e) => new Date(e.start) >= startOfDay(new Date())).sort((a, b) => a.start - b.start).slice(0, 5),
    [eventosFiltrados]
  )
  const vencidas = useMemo(() => eventosFiltrados.filter(esVencida), [eventosFiltrados])

  function navegar(dir) {
    if (view === 'week') setDate((d) => (dir < 0 ? subWeeks(d, 1) : addWeeks(d, 1)))
    else if (view === 'day') setDate((d) => addDays(d, dir))
    else setDate((d) => (dir < 0 ? subMonths(d, 1) : addMonths(d, 1)))
  }

  function toggleSet(setFn, value) {
    setFn((prev) => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  async function completar(ev) {
    if (ev.fuente === 'crm') await toggleActividadCRM(ev.raw.id, ev.estado !== 'completada')
    else await toggleActividad(ev.raw.id, ev.estado !== 'completada')
    setPanel(null)
    cargar()
  }
  async function eliminar(ev) {
    if (!(await confirmDialog(`¿Eliminar la actividad "${ev.title}"?`))) return
    if (ev.fuente === 'crm') await deleteActividadCRM(ev.raw.id)
    else await deleteActividad(ev.raw.id)
    setPanel(null)
    cargar()
  }
  function editar(ev) {
    if (ev.fuente === 'crm') {
      setPanel(null)
      setModal({ actividad: ev.raw })
    } else {
      navigate(`/campanas/${ev.campanaId}`)
    }
  }
  function verVinculo(ev) {
    if (ev.fuente === 'crm' && ev.oportunidad) navigate(`/crm/${ev.oportunidad.id}`)
    else if (ev.fuente === 'campana') navigate(`/campanas/${ev.campanaId}`)
  }

  const eventPropGetter = useCallback((event) => {
    const color = TIPO_ACTIVIDAD_MAP[event.tipo]?.color ?? '#777777'
    const venc = esVencida(event)
    return {
      style: {
        backgroundColor: `${color}33`,
        borderLeft: `3px solid ${venc ? '#e24b4a' : color}`,
        color: '#f0f0ea',
        opacity: event.estado === 'completada' ? 0.45 : 1,
        textDecoration: event.estado === 'completada' ? 'line-through' : 'none',
      },
    }
  }, [])

  return (
    <div className="-m-8 flex h-[calc(100vh-0px)] flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-hmc-border px-6 py-4">
        <button type="button" onClick={() => navigate('/crm')} className="inline-flex items-center gap-1.5 text-sm text-hmc-muted hover:text-hmc-white">
          <TbArrowLeft size={16} /> CRM
        </button>
        <h1 className="text-lg font-semibold text-hmc-white">Calendario de actividades</h1>

        <div className="relative ml-auto">
          <button type="button" onClick={() => setFiltrosOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white hover:bg-hmc-gray3">
            <TbFilter size={16} /> Filtros
          </button>
          {filtrosOpen && (
            <FiltrosDropdown
              fuentes={fuentes} setFuentes={setFuentes}
              tipos={tipos} setTipos={setTipos}
              estados={estados} setEstados={setEstados}
              toggleSet={toggleSet}
              onClose={() => setFiltrosOpen(false)}
            />
          )}
        </div>
        <button type="button" onClick={() => setModal({ fecha: new Date() })} className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-3 py-1.5 text-sm font-semibold text-hmc-black hover:opacity-90">
          <TbPlus size={16} /> Nueva actividad
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Panel izquierdo */}
        <div className="hidden w-[200px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-hmc-border bg-hmc-gray p-3 lg:flex">
          <MiniCalendario date={date} setDate={setDate} eventos={eventosFiltrados} />

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-hmc-muted">Próximas actividades</p>
            <div className="flex flex-col gap-2">
              {proximas.length === 0 ? (
                <p className="text-xs text-hmc-muted">Sin próximas</p>
              ) : (
                proximas.map((ev) => {
                  const tipo = TIPO_ACTIVIDAD_MAP[ev.tipo]
                  const Icon = tipo?.icon
                  return (
                    <button key={ev.id} type="button" onClick={() => setDate(new Date(ev.start))} className="text-left">
                      <p className="text-[10px] text-hmc-muted">{fechaRel(ev.start)}</p>
                      <p className="flex items-center gap-1.5 text-xs text-hmc-white">
                        {Icon && <Icon size={12} style={{ color: tipo.color }} />}
                        <span className="truncate">{ev.title}</span>
                      </p>
                      {ev.oportunidad?.titulo && <p className="truncate text-[10px] text-hmc-muted">{ev.oportunidad.titulo}</p>}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {vencidas.length > 0 && (
            <div className="rounded-md border border-red-900/40 bg-red-950/20 p-2.5">
              <p className="text-sm font-semibold text-red-400">{vencidas.length} vencidas</p>
              <button type="button" onClick={() => setEstados(new Set(['pendiente', 'en_proceso']))} className="text-[11px] text-hmc-muted hover:text-hmc-white">Ver todas</button>
            </div>
          )}
        </div>

        {/* Calendario */}
        <div className="relative flex min-w-0 flex-1 flex-col p-4">
          {/* Toolbar propia */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => navegar(-1)} className="rounded-md border border-hmc-border p-1.5 text-hmc-muted hover:text-hmc-white"><TbChevronLeft size={16} /></button>
            <button type="button" onClick={() => navegar(1)} className="rounded-md border border-hmc-border p-1.5 text-hmc-muted hover:text-hmc-white"><TbChevronRight size={16} /></button>
            <span className="px-2 text-sm font-medium text-hmc-white">{tituloPeriodo(date, view)}</span>
            <button type="button" onClick={() => setDate(new Date())} className="rounded-md border border-hmc-border px-3 py-1 text-xs text-hmc-white hover:bg-hmc-gray3">Hoy</button>
            <div className="ml-auto flex gap-1">
              {VISTAS.map((vv) => (
                <button key={vv.v} type="button" onClick={() => setView(vv.v)} className={`rounded-md px-3 py-1 text-xs transition-colors ${view === vv.v ? 'bg-hmc-white text-hmc-black' : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'}`}>{vv.l}</button>
              ))}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-hmc-border">
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-4">
                <span className="rounded-full bg-hmc-gray2 px-3 py-1 text-xs text-hmc-muted">Cargando…</span>
              </div>
            )}
            <Calendar
              localizer={localizer}
              culture="es"
              events={eventosFiltrados}
              date={date}
              view={view}
              onNavigate={setDate}
              onView={setView}
              views={['month', 'week', 'day', 'agenda']}
              messages={MENSAJES}
              selectable
              onSelectEvent={(ev) => setPanel(ev)}
              onSelectSlot={(slot) => setModal({ fecha: slot.start })}
              eventPropGetter={eventPropGetter}
              components={{ event: EventoCalendario }}
              popup
              style={{ height: '100%' }}
            />
          </div>

          {/* Leyenda */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {TIPOS_ACTIVIDAD.map((t) => (
              <span key={t.value} className="inline-flex items-center gap-1.5 text-[11px] text-hmc-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Panel de evento (slide-in) */}
      <PanelEvento ev={panel} onClose={() => setPanel(null)} onCompletar={completar} onEditar={editar} onEliminar={eliminar} onVer={verVinculo} />

      {modal && (
        <ActividadCalModal
          actividad={modal.actividad}
          fechaInicial={modal.fecha}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function EventoCalendario({ event }) {
  const tipo = TIPO_ACTIVIDAD_MAP[event.tipo]
  const Icon = tipo?.icon
  return (
    <span className="flex items-center gap-1 truncate">
      {Icon && <Icon size={10} className="shrink-0" />}
      <span className="truncate">{event.title}</span>
    </span>
  )
}

function FiltrosDropdown({ fuentes, setFuentes, tipos, setTipos, estados, setEstados, toggleSet, onClose }) {
  const Check = ({ checked, onChange, label, color }) => (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-hmc-white">
      <CustomCheckbox checked={checked} onChange={onChange} />
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </label>
  )
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 z-30 mt-2 w-56 glass-card p-3 shadow-xl">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-hmc-muted">Fuente</p>
        <Check checked={fuentes.has('crm')} onChange={() => toggleSet(setFuentes, 'crm')} label="CRM" />
        <Check checked={fuentes.has('campana')} onChange={() => toggleSet(setFuentes, 'campana')} label="Campañas" />
        <div className="my-2 border-t border-hmc-border" />
        <p className="mb-1 text-[10px] uppercase tracking-wide text-hmc-muted">Tipos</p>
        {TIPOS_ACTIVIDAD.map((t) => (
          <Check key={t.value} checked={tipos.has(t.value)} onChange={() => toggleSet(setTipos, t.value)} label={t.label} color={t.color} />
        ))}
        <div className="my-2 border-t border-hmc-border" />
        <p className="mb-1 text-[10px] uppercase tracking-wide text-hmc-muted">Estados</p>
        {ESTADOS_FILTRO.map((e) => (
          <Check key={e.value} checked={estados.has(e.value)} onChange={() => toggleSet(setEstados, e.value)} label={e.label} />
        ))}
      </div>
    </>
  )
}

function MiniCalendario({ date, setDate, eventos }) {
  const [mes, setMes] = useState(startOfMonth(date))
  useEffect(() => setMes(startOfMonth(date)), [date])

  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mes), { locale: es }),
    end: endOfWeek(endOfMonth(mes), { locale: es }),
  })
  const diasConEventos = useMemo(() => {
    const s = new Set()
    eventos.forEach((e) => s.add(startOfDay(new Date(e.start)).getTime()))
    return s
  }, [eventos])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setMes((m) => subMonths(m, 1))} className="text-hmc-muted hover:text-hmc-white"><TbChevronLeft size={14} /></button>
        <span className="text-xs font-medium text-hmc-white">{cap(format(mes, 'LLLL yyyy', { locale: es }))}</span>
        <button type="button" onClick={() => setMes((m) => addMonths(m, 1))} className="text-hmc-muted hover:text-hmc-white"><TbChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-hmc-muted">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {dias.map((d) => {
          const sel = isSameDay(d, date)
          const fueraMes = !isSameMonth(d, mes)
          const tiene = diasConEventos.has(startOfDay(d).getTime())
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setDate(d)}
              className={`relative flex h-6 items-center justify-center rounded text-[10px] transition-colors ${
                sel ? 'bg-hmc-white text-hmc-black' : fueraMes ? 'text-hmc-muted/40 hover:bg-hmc-gray2' : 'text-hmc-white hover:bg-hmc-gray2'
              }`}
            >
              {format(d, 'd')}
              {tiene && !sel && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#7fb8e8]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PanelEvento({ ev, onClose, onCompletar, onEditar, onEliminar, onVer }) {
  const tipo = ev ? TIPO_ACTIVIDAD_MAP[ev.tipo] : null
  const Icon = tipo?.icon
  const completada = ev?.estado === 'completada'
  const cli = ev?.fuente === 'campana' ? ev.cliente : null
  const cliNombre = cli
    ? cli.tipo === 'empresa'
      ? cli.empresa?.nombre
      : [cli.contacto?.nombre, cli.contacto?.apellido].filter(Boolean).join(' ')
    : null

  return (
    <div
      className="fixed right-0 top-0 z-40 h-full w-[300px] border-l border-hmc-border bg-hmc-gray2 shadow-2xl transition-transform duration-200"
      style={{ transform: ev ? 'translateX(0)' : 'translateX(100%)' }}
    >
      {ev && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-hmc-border px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-hmc-muted">Actividad</span>
            <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <h3 className={`text-base font-semibold ${completada ? 'text-hmc-muted line-through' : 'text-hmc-white'}`}>{ev.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {tipo && (
                <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5" style={{ backgroundColor: `${tipo.color}22`, color: tipo.color }}>
                  {Icon && <Icon size={12} />} {tipo.label}
                </span>
              )}
              <span className="rounded bg-hmc-gray3 px-2 py-0.5 text-hmc-muted">{ev.estado}</span>
              <span className="rounded bg-hmc-gray3 px-2 py-0.5 text-hmc-muted">{ev.fuente === 'crm' ? 'CRM' : 'Campaña'}</span>
            </div>
            <p className="mt-3 text-sm text-hmc-white">{cap(format(new Date(ev.start), "EEEE d 'de' MMMM, HH:mm", { locale: es }))}</p>

            {ev.fuente === 'crm' && ev.oportunidad && (
              <p className="mt-3 text-xs text-hmc-muted">Oportunidad: <span className="text-hmc-white">{ev.oportunidad.titulo}</span></p>
            )}
            {cliNombre && <p className="mt-3 text-xs text-hmc-muted">Cliente: <span className="text-hmc-white">{cliNombre}</span></p>}
            {ev.raw?.descripcion && <p className="mt-3 whitespace-pre-line text-sm text-hmc-muted">{ev.raw.descripcion}</p>}
          </div>
          <div className="flex flex-col gap-2 border-t border-hmc-border p-4">
            <button type="button" onClick={() => onCompletar(ev)} className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: '#44aa9955', color: '#44aa99' }}>
              <TbCheck size={15} /> {completada ? 'Marcar pendiente' : 'Marcar completada'}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => onEditar(ev)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-hmc-border px-3 py-2 text-sm text-hmc-white hover:bg-hmc-gray3"><TbPencil size={15} /> Editar</button>
              <button type="button" onClick={() => onEliminar(ev)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40"><TbTrash size={15} /> Eliminar</button>
            </div>
            {((ev.fuente === 'crm' && ev.oportunidad) || ev.fuente === 'campana') && (
              <button type="button" onClick={() => onVer(ev)} className="inline-flex items-center justify-center gap-2 rounded-md bg-hmc-white px-3 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">
                <TbExternalLink size={15} /> {ev.fuente === 'crm' ? 'Ver oportunidad' : 'Ver campaña'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputCal = 'w-full glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted'
const lblCal = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

function toLocalInput(d) {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(0, 16)
}

function ActividadCalModal({ actividad, fechaInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: actividad?.titulo ?? '',
    tipo: actividad?.tipo ?? 'tarea',
    descripcion: actividad?.descripcion ?? '',
    estado: actividad?.estado ?? 'pendiente',
    fecha: toLocalInput(actividad?.fecha_vencimiento ? new Date(actividad.fecha_vencimiento) : fechaInicial ?? new Date()),
    oportunidad_id: actividad?.oportunidad_id ?? '',
  })
  const [ops, setOps] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOportunidades().then(({ data }) => setOps(data ?? []))
  }, [])

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!form.titulo.trim()) return setError('El título es obligatorio.')
    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      descripcion: form.descripcion.trim() || null,
      estado: form.estado,
      fecha_vencimiento: form.fecha ? new Date(form.fecha).toISOString() : null,
      oportunidad_id: form.oportunidad_id || null,
    }
    setSaving(true)
    const { error: err } = actividad
      ? await updateActividadCRM(actividad.id, payload)
      : await createActividadCRM(payload)
    setSaving(false)
    if (err) return setError('No se pudo guardar: ' + err.message)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md glass-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">{actividad ? 'Editar actividad' : 'Nueva actividad'}</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>
        <form onSubmit={guardar} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className={lblCal}>Título *</label>
              <input className={inputCal} value={form.titulo} onChange={(e) => update('titulo', e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lblCal}>Tipo</label>
                <select className={inputCal} value={form.tipo} onChange={(e) => update('tipo', e.target.value)}>
                  {TIPOS_ACTIVIDAD.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lblCal}>Estado</label>
                <select className={inputCal} value={form.estado} onChange={(e) => update('estado', e.target.value)}>
                  {ESTADOS_ACTIVIDAD.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={lblCal}>Vencimiento</label>
              <input type="datetime-local" className={inputCal} value={form.fecha} onChange={(e) => update('fecha', e.target.value)} />
            </div>
            <div>
              <label className={lblCal}>Oportunidad</label>
              <select className={inputCal} value={form.oportunidad_id} onChange={(e) => update('oportunidad_id', e.target.value)}>
                <option value="">Sin oportunidad</option>
                {ops.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
              </select>
            </div>
            <div>
              <label className={lblCal}>Descripción</label>
              <textarea rows={2} className={`${inputCal} resize-none`} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} />
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
