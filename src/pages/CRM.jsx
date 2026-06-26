import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { confirmDialog } from '../components/confirm'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { TbPlus, TbSearch, TbPencil, TbTrash, TbCheckbox, TbMail, TbBrandWhatsapp, TbFileInvoice, TbCalendar } from 'react-icons/tb'
import {
  getOportunidades,
  createOportunidad,
  updateOportunidad,
  deleteOportunidad,
} from '../lib/db'
import { iniciales, limpiarWhatsapp } from '../lib/utils'
import { ETAPAS, PRIORIDADES, formatMonto } from '../lib/crm'
import OportunidadModal from '../components/OportunidadModal'
import CotizacionDesdeCRMModal from '../components/CotizacionDesdeCRMModal'
import Toast from '../components/Toast'

function actividadesCount(op) {
  return op.crm_actividades?.length ?? 0
}

// Suma los valores de un grupo de cards por moneda y devuelve el label
// formateado ("ARS 1.500.000 · USD 5.000"), o '' si no hay valores.
function montoColumna(cards) {
  const sumas = { ARS: 0, USD: 0 }
  cards.forEach((o) => {
    if (o.valor_estimado != null && o.valor_estimado !== '') {
      sumas[o.moneda] = (sumas[o.moneda] ?? 0) + Number(o.valor_estimado)
    }
  })
  return [
    sumas.ARS ? formatMonto(sumas.ARS, 'ARS') : null,
    sumas.USD ? formatMonto(sumas.USD, 'USD') : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function fmtFechaCorta(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function esVencida(fecha) {
  if (!fecha) return false
  return new Date(fecha) < new Date(new Date().toDateString())
}

export default function CRM() {
  const navigate = useNavigate()
  const location = useLocation()
  const [ops, setOps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // { oportunidad, etapaInicial } | null
  const [activeCard, setActiveCard] = useState(null)
  const [toast, setToast] = useState({ visible: false, mensaje: '' })
  const [cotizarOp, setCotizarOp] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await getOportunidades()
    if (err) setError('No se pudieron cargar las oportunidades: ' + err.message)
    else setOps(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Precarga desde otra página (ej. "Crear oportunidad CRM" en Productos).
  useEffect(() => {
    const pre = location.state?.nuevaOportunidad
    if (pre) {
      setModal({ oportunidad: null, valores: pre })
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ops
    return ops.filter((o) => (o.titulo ?? '').toLowerCase().includes(q))
  }, [ops, search])

  const stats = useMemo(() => {
    const total = ops.length
    const sumas = { ARS: 0, USD: 0 }
    ops.forEach((o) => {
      if (o.valor_estimado && o.etapa !== 'cerrado_perdido') {
        sumas[o.moneda] = (sumas[o.moneda] ?? 0) + Number(o.valor_estimado)
      }
    })
    const ahora = new Date()
    const ganadasMes = ops.filter((o) => {
      if (o.etapa !== 'cerrado_ganado') return false
      const d = new Date(o.updated_at)
      return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear()
    }).length
    const ganadasTotal = ops.filter((o) => o.etapa === 'cerrado_ganado').length
    const tasa = total ? Math.round((ganadasTotal / total) * 100) : 0
    return { total, sumas, ganadasMes, tasa }
  }, [ops])

  async function handleSave(payload) {
    const action = modal?.oportunidad
      ? updateOportunidad(modal.oportunidad.id, payload)
      : createOportunidad(payload)
    const { error: err } = await action
    if (err) return 'No se pudo guardar: ' + err.message
    setModal(null)
    await load()
    return null
  }

  async function handleDelete(op) {
    if (!(await confirmDialog(`¿Eliminar la oportunidad "${op.titulo}"?`))) return
    const { error: err } = await deleteOportunidad(op.id)
    if (err) {
      setError('No se pudo eliminar: ' + err.message)
      return
    }
    await load()
  }

  // ---- Drag & drop ----
  function handleDragStart(event) {
    const { active } = event
    setActiveCard(ops.find((o) => o.id === active.id) ?? null)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const oportunidadId = active.id
    const nuevaEtapa = over.id
    const oportunidad = ops.find((o) => o.id === oportunidadId)
    if (!oportunidad || oportunidad.etapa === nuevaEtapa) return

    const etapaPrevia = oportunidad.etapa
    // Actualización optimista.
    setOps((prev) =>
      prev.map((o) => (o.id === oportunidadId ? { ...o, etapa: nuevaEtapa } : o))
    )

    const { error: err } = await updateOportunidad(oportunidadId, { etapa: nuevaEtapa })
    if (err) {
      // Revertir y avisar.
      setOps((prev) =>
        prev.map((o) => (o.id === oportunidadId ? { ...o, etapa: etapaPrevia } : o))
      )
      setToast({ visible: true, mensaje: 'No se pudo mover la oportunidad: ' + err.message })
    }
  }

  const pipelineLabel =
    [
      stats.sumas.ARS ? formatMonto(stats.sumas.ARS, 'ARS') : null,
      stats.sumas.USD ? formatMonto(stats.sumas.USD, 'USD') : null,
    ]
      .filter(Boolean)
      .join(' · ') || '—'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-hmc-white">CRM</h1>
          <p className="mt-1 text-sm text-hmc-muted">Pipeline comercial</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/crm/actividades')}
            className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray2"
          >
            <TbCheckbox size={18} />
            Actividades
          </button>
          <button
            type="button"
            onClick={() => navigate('/crm/calendario')}
            className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray2"
          >
            <TbCalendar size={18} />
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setModal({ oportunidad: null })}
            className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
          >
            <TbPlus size={18} />
            Nueva oportunidad
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard valor={stats.total} label="Oportunidades" />
        <StatCard valor={pipelineLabel} label="Pipeline" small />
        <StatCard valor={stats.ganadasMes} label="Ganadas este mes" />
        <StatCard valor={`${stats.tasa}%`} label="Tasa de cierre" />
      </div>

      {/* Búsqueda */}
      <div className="relative mb-5 max-w-sm">
        <TbSearch
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted"
        />
        <input
          type="text"
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full glass-input py-2 pl-10 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted"
        />
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Kanban */}
      {loading ? (
        <p className="text-sm text-hmc-muted">Cargando…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {ETAPAS.map((etapa) => (
              <KanbanColumna
                key={etapa.key}
                etapa={etapa}
                cards={filtradas.filter((o) => o.etapa === etapa.key)}
                onOpen={(op) => navigate(`/crm/${op.id}`)}
                onEdit={(op) => setModal({ oportunidad: op })}
                onDelete={handleDelete}
                onCotizar={(op) => setCotizarOp(op)}
                onAgregar={() => setModal({ oportunidad: null, etapaInicial: etapa.key })}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? <CardOverlay card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {modal && (
        <OportunidadModal
          oportunidad={modal.oportunidad}
          etapaInicial={modal.etapaInicial}
          valoresIniciales={modal.valores}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {cotizarOp && (
        <CotizacionDesdeCRMModal
          oportunidad={cotizarOp}
          onClose={() => setCotizarOp(null)}
          onCreada={(cotId) =>
            navigate(`/cotizaciones/${cotId}`, {
              state: { desde_oportunidad_id: cotizarOp.id, desde_oportunidad_titulo: cotizarOp.titulo },
            })
          }
          onAsignada={(c) => {
            setCotizarOp(null)
            setToast({ visible: true, mensaje: `Cotización ${c.numero} asignada a ${cotizarOp.titulo}` })
            load()
          }}
        />
      )}

      <Toast
        visible={toast.visible}
        mensaje={toast.mensaje}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  )
}

function StatCard({ valor, label, small }) {
  return (
    <div className="glass-card px-4 py-3">
      <div className={`font-semibold text-hmc-white ${small ? 'text-base' : 'text-2xl'}`}>
        {valor}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-hmc-muted">{label}</div>
    </div>
  )
}

function KanbanColumna({ etapa, cards, onOpen, onEdit, onDelete, onCotizar, onAgregar }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.key })
  const totalEtapa = montoColumna(cards)

  return (
    <div className="flex w-[320px] min-w-[320px] shrink-0 flex-col glass-card">
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: etapa.color }} />
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-hmc-white">
            {etapa.label}
          </span>
          <span className="rounded bg-hmc-gray3 px-1.5 py-0.5 text-xs text-hmc-muted">
            {cards.length}
          </span>
        </div>
        {totalEtapa ? (
          <div className="mt-1 text-sm font-semibold" style={{ color: '#44aa99' }}>
            {totalEtapa}
          </div>
        ) : (
          <div className="mt-1 text-sm text-hmc-muted">—</div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2 px-2 pb-2"
        style={{
          background: isOver ? 'rgba(255,255,255,0.03)' : undefined,
          transition: 'background 0.15s',
        }}
      >
        {cards.map((op) => (
          <KanbanCard
            key={op.id}
            op={op}
            onOpen={() => onOpen(op)}
            onEdit={() => onEdit(op)}
            onDelete={() => onDelete(op)}
            onCotizar={() => onCotizar(op)}
          />
        ))}

        <button
          type="button"
          onClick={onAgregar}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-hmc-border py-2 text-xs text-hmc-muted transition-colors hover:text-hmc-white"
        >
          <TbPlus size={14} />
          Agregar
        </button>
      </div>
    </div>
  )
}

function KanbanCard({ op, onOpen, onEdit, onDelete, onCotizar }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: op.id,
  })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grabbing',
      }
    : { cursor: 'grab' }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className="group relative cursor-pointer transition-transform active:scale-[0.99]"
    >
      {/* Acciones hover (no inician drag) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-1.5 top-1.5 z-20 hidden items-center gap-0.5 group-hover:flex"
      >
        <button
          type="button"
          onClick={onEdit}
          className="rounded bg-hmc-gray2 p-1 text-hmc-muted hover:text-hmc-white"
          title="Editar"
        >
          <TbPencil size={13} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded bg-hmc-gray2 p-1 text-hmc-muted hover:text-red-400"
          title="Eliminar"
        >
          <TbTrash size={13} />
        </button>
      </div>

      <CardInner op={op} onOpen={onOpen} quick onCotizar={onCotizar} />
    </div>
  )
}

// Visual de la card, compartido entre KanbanCard y el DragOverlay.
function CardInner({ op, onOpen, quick, onCotizar }) {
  const ganado = op.etapa === 'cerrado_ganado'
  const perdido = op.etapa === 'cerrado_perdido'
  const prioridad = PRIORIDADES[op.prioridad] ?? PRIORIDADES.media
  const monto = formatMonto(op.valor_estimado, op.moneda)
  const empresa = op.empresa
  const contacto = op.contacto

  const waNum = contacto?.whatsapp || empresa?.telefono
  const email = contacto?.email || empresa?.email
  const nombreCli = contacto
    ? [contacto.nombre, contacto.apellido].filter(Boolean).join(' ')
    : empresa?.nombre || op.titulo
  const tieneCotizacion = (op.cotizaciones?.[0]?.count ?? 0) > 0
  const stop = (e) => e.stopPropagation()

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-hmc-border bg-hmc-black transition-colors group-hover:border-[#555] ${
        perdido ? 'opacity-70' : ''
      } ${ganado ? 'border-l-2 border-l-[#44aa99]' : ''}`}
    >
      <div className="absolute left-0 top-0 h-full w-0.5" style={{ backgroundColor: op.color }} />
      <div className="p-2.5 pl-3">
        <div className="text-sm font-medium text-hmc-white group-hover:underline">{op.titulo}</div>

        {/* Empresa / contacto */}
        {empresa && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-hmc-muted">
            <span className="inline-flex items-center gap-1">
              {empresa.logo_url ? (
                <img src={empresa.logo_url} alt="" className="h-4 w-4 rounded-sm object-cover" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-hmc-gray3 text-[8px] text-hmc-white">
                  {iniciales(empresa.nombre)}
                </span>
              )}
              <span className="truncate">{empresa.nombre}</span>
            </span>
          </div>
        )}
        {contacto && (
          <p className="mt-0.5 truncate text-xs text-hmc-muted">
            {[contacto.nombre, contacto.apellido].filter(Boolean).join(' ')}
          </p>
        )}

        {/* Badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {monto && (
            <span className="rounded bg-hmc-gray3 px-1.5 py-0.5 text-[11px] text-hmc-white">
              {monto}
            </span>
          )}
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${prioridad.color}22`, color: prioridad.color }}
          >
            {prioridad.label}
          </span>
        </div>

        {/* Footer meta */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-hmc-muted">
          <span className="inline-flex items-center gap-1">
            <TbCheckbox size={12} />
            {actividadesCount(op)}
          </span>
          {op.fecha_cierre_estimada && (
            <span className={esVencida(op.fecha_cierre_estimada) && !ganado ? 'text-red-400' : ''}>
              {fmtFechaCorta(op.fecha_cierre_estimada)}
            </span>
          )}
          {op.campana && (
            <span className="inline-flex items-center gap-1">
              <TbMail size={12} />
              {op.campana.nombre}
            </span>
          )}
        </div>

        {/* Accesos rápidos (solo en card interactiva) */}
        {quick && (
          <div
            onPointerDown={stop}
            onClick={stop}
            className="mt-1.5 flex items-center gap-1 border-t border-hmc-border pt-1.5"
          >
            {waNum && (
              <a
                href={`https://wa.me/${limpiarWhatsapp(waNum)}`}
                target="_blank"
                rel="noreferrer"
                onClick={stop}
                title={`WhatsApp ${nombreCli}`}
                className="flex h-6 w-6 items-center justify-center rounded border border-hmc-border text-hmc-muted transition-colors hover:border-[#25d36640] hover:text-[#25d366]"
              >
                <TbBrandWhatsapp size={14} />
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                onClick={stop}
                title={`Email ${nombreCli}`}
                className="flex h-6 w-6 items-center justify-center rounded border border-hmc-border text-hmc-muted transition-colors hover:border-[#7fb8e840] hover:text-[#7fb8e8]"
              >
                <TbMail size={14} />
              </a>
            )}
            <button
              type="button"
              onClick={(e) => {
                stop(e)
                onCotizar?.()
              }}
              title={tieneCotizacion ? 'Cotización asignada' : 'Crear cotización'}
              className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                tieneCotizacion
                  ? 'border-[#e8b87f40] text-[#e8b87f]'
                  : 'border-hmc-border text-hmc-muted hover:border-[#e8b87f40] hover:text-[#e8b87f]'
              }`}
            >
              <TbFileInvoice size={14} />
            </button>
          </div>
        )}

        {op.crm_actividades?.length > 0 && (
          <div style={{ borderTop: '0.5px solid var(--hmc-border)', marginTop: '8px', paddingTop: '8px' }}>
            {op.crm_actividades
              .filter((a) => a.estado !== 'completada' && a.estado !== 'cancelada')
              .slice(0, 3)
              .map((actividad) => (
                <div
                  key={actividad.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '11px', color: 'var(--hmc-muted)' }}
                >
                  <span style={{ fontSize: '10px' }}>
                    {actividad.tipo === 'llamada'
                      ? '📞'
                      : actividad.tipo === 'reunion'
                        ? '📅'
                        : actividad.tipo === 'whatsapp'
                          ? '💬'
                          : actividad.tipo === 'email'
                            ? '✉️'
                            : actividad.tipo === 'seguimiento'
                              ? '🔄'
                              : '☐'}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {actividad.titulo}
                  </span>
                  {actividad.fecha_vencimiento && (
                    <span
                      style={{
                        fontSize: '9px',
                        color: new Date(actividad.fecha_vencimiento) < new Date() ? '#e24b4a' : 'var(--hmc-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {new Date(actividad.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            {op.crm_actividades.filter((a) => a.estado !== 'completada' && a.estado !== 'cancelada').length > 3 && (
              <div style={{ fontSize: '9px', color: 'var(--hmc-muted)', marginTop: '2px' }}>
                +{' '}
                {op.crm_actividades.filter((a) => a.estado !== 'completada' && a.estado !== 'cancelada').length - 3} más
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Card flotante mientras se arrastra.
function CardOverlay({ card }) {
  return (
    <div
      className="w-[300px] cursor-grabbing"
      style={{
        transform: 'rotate(2deg)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        opacity: 0.95,
        pointerEvents: 'none',
      }}
    >
      <div className="rounded-md border" style={{ borderColor: '#555' }}>
        <CardInner op={card} />
      </div>
    </div>
  )
}
