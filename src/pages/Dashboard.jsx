import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  TbBuilding,
  TbUsers,
  TbTrophyFilled,
  TbCurrencyDollar,
  TbFileInvoice,
  TbCheckbox,
  TbCircleCheck,
  TbAlertCircle,
  TbCash,
} from 'react-icons/tb'
import { useDashboard } from '../hooks/useDashboard'
import { useDolar } from '../hooks/useDolar'
import { toggleActividadCRM } from '../lib/db'
import { iniciales, saludo, formatFechaLarga, tiempoRelativo } from '../lib/utils'
import { formatUSD, formatARS } from '../lib/dolar'
import { ETAPA_MAP } from '../lib/crm'
import { TIPO_ACTIVIDAD_MAP } from '../lib/campanas'
import { ESTADOS_COT } from '../lib/cotizaciones'
import { STORAGE, DEFAULT_PERFIL, loadJSON, loadStr } from '../lib/settings'
import { SegmentoPills } from '../components/SegmentoPill'

const COVER_KEY = 'hmc_dashboard_cover'
const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'año', label: 'Año' },
]

const TOOLTIP_STYLE = {
  backgroundColor: '#1e1e1e',
  border: '1px solid #2e2e2e',
  borderRadius: 6,
  color: '#f0f0ea',
  fontSize: 12,
}
const AXIS_TICK = { fill: '#777777', fontSize: 11 }

function venceTexto(fecha) {
  const diff = new Date(fecha).getTime() - Date.now()
  const vencida = diff < 0
  const h = Math.abs(Math.floor(diff / 3600000))
  const d = Math.abs(Math.floor(diff / 86400000))
  const txt = vencida
    ? d > 0 ? `Vencida hace ${d} días` : `Vencida hace ${h} h`
    : d > 0 ? `Vence en ${d} días` : `Vence en ${h} h`
  return { txt, vencida }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('mes')
  const [moneda, setMoneda] = useState('ARS')
  const cover = loadStr(COVER_KEY)
  const { data, loading, error, refetch } = useDashboard(periodo)
  const { cotizacion: dolar } = useDolar()

  const perfil = loadJSON(STORAGE.perfil, DEFAULT_PERFIL)
  const nombre = perfil.nombre || 'Agustín'
  const rol = perfil.rol || 'Representante HMC · Córdoba'

  async function toggleActividad(act) {
    await toggleActividadCRM(act.id, act.estado !== 'completada')
    refetch()
  }

  const fechaLarga = formatFechaLarga(new Date())
  const fechaCap = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)

  return (
    <div className="-m-8">
      {/* HERO */}
      <div className="relative h-[220px] overflow-hidden">
        <div
          className="absolute inset-0"
          style={
            cover
              ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)' }
          }
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 flex h-full flex-col justify-between px-8 pb-6 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] text-white/70">{saludo()}</p>
              <h1 className="text-[32px] font-bold leading-tight text-white">{nombre}</h1>
              <p className="text-[13px] text-white/60">{rol}</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-white/60">{fechaCap}</p>
              {dolar && (
                <p className="mt-2 inline-flex items-center gap-2 text-[12px] text-white/80">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  Dólar blue · Compra ${dolar.compra} · Venta ${dolar.venta}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriodo(p.value)}
                className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                  periodo === p.value ? 'bg-white text-black' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex flex-col gap-6 p-6">
        {error && (
          <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
            No se pudieron cargar algunos datos del dashboard.
          </p>
        )}

        {/* Selector de moneda (afecta Valor Pipeline y Ventas cobradas) */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <span className="text-xs text-hmc-muted">Moneda</span>
          <div className="inline-flex overflow-hidden rounded-md border border-hmc-border">
            {['ARS', 'USD'].map((mon) => (
              <button
                key={mon}
                type="button"
                onClick={() => setMoneda(mon)}
                className={`px-3.5 py-1 text-xs font-semibold transition-colors ${
                  moneda === mon ? 'bg-hmc-white text-hmc-black' : 'text-hmc-muted hover:text-hmc-white'
                }`}
              >
                {mon}
              </button>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <Metricas data={data} loading={loading} dolar={dolar} moneda={moneda} />

        {/* Dos columnas */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <Card titulo="Pipeline CRM" badge={PERIODOS.find((p) => p.value === periodo)?.label}>
              {loading ? (
                <SkeletonBox h={200} />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.pipeline ?? []} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid stroke="#2e2e2e" horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} stroke="#2e2e2e" allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={AXIS_TICK} stroke="#2e2e2e" width={110} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#2a2a2a55' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {(data?.pipeline ?? []).map((e) => (
                        <Cell key={e.etapa} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card titulo="Actividad del período">
              {loading ? (
                <SkeletonBox h={180} />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data?.actividad ?? []} margin={{ left: -10, right: 10, top: 5 }}>
                    <CartesianGrid stroke="#2e2e2e" />
                    <XAxis dataKey="label" tick={AXIS_TICK} stroke="#2e2e2e" />
                    <YAxis tick={AXIS_TICK} stroke="#2e2e2e" allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="empresas" stroke="#7fb8e8" strokeWidth={2} dot={false} name="Empresas" />
                    <Line type="monotone" dataKey="contactos" stroke="#a8d88a" strokeWidth={2} dot={false} name="Contactos" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Pendientes data={data} loading={loading} onToggle={toggleActividad} onIr={(id) => navigate(`/crm/${id}`)} />
            <EnProceso data={data} loading={loading} onIr={(id) => navigate(`/crm/${id}`)} />
          </div>
        </div>

        {/* Fila inferior */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UltimasEmpresas data={data} loading={loading} onVerTodas={() => navigate('/empresas')} onIr={(id) => navigate(`/empresas/${id}`)} />
          <CotizacionesRecientes data={data} loading={loading} onIr={(id) => navigate(`/cotizaciones/${id}`)} />
          <ResumenProductos data={data} loading={loading} onVer={() => navigate('/productos')} />
        </div>
      </div>
    </div>
  )
}

// ---------- Componentes ----------
// Estilo de card tipo iOS: esquinas muy redondeadas, degradado sutil,
// hairline claro (ring) y sombra suave en vez del borde duro.
const cardClass = 'glass-card p-5'

function Card({ titulo, badge, children, accion }) {
  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-hmc-white">{titulo}</h2>
        {badge && <span className="rounded bg-hmc-gray3 px-2 py-0.5 text-[10px] uppercase tracking-wide text-hmc-muted">{badge}</span>}
        {accion}
      </div>
      {children}
    </div>
  )
}

function SkeletonBox({ h }) {
  return <div className="w-full animate-pulse rounded bg-hmc-gray3" style={{ height: h }} />
}

const METRICAS_CFG = [
  { key: 'empresas', label: 'Nuevas empresas', icon: TbBuilding, color: '#7fb8e8', sub: () => 'empresas registradas' },
  { key: 'contactos', label: 'Nuevos contactos', icon: TbUsers, color: '#a8d88a', sub: () => 'contactos agregados' },
  { key: 'ganadas', label: 'Oportunidades cerradas', icon: TbTrophyFilled, color: '#44aa99', sub: () => 'ventas cerradas' },
  { key: 'pipeline', label: 'Valor pipeline', icon: TbCurrencyDollar, color: '#e8b87f', sub: () => 'en oportunidades activas' },
  { key: 'cotizaciones', label: 'Cotizaciones enviadas', icon: TbFileInvoice, color: '#c8a8e8', sub: () => 'presupuestos enviados' },
  {
    key: 'pendientes',
    label: 'Actividades pendientes',
    icon: TbCheckbox,
    color: (v) => (v > 0 ? '#e24b4a' : '#44aa99'),
    sub: (v) => (v > 0 ? '¡Tenés tareas vencidas!' : 'Al día 🎉'),
  },
  { key: 'ventas', label: 'Ventas cobradas', icon: TbCash, color: '#44aa99' },
]

// Total del pipeline convertido a la moneda elegida.
function pipelineTotal(m, dolar, moneda) {
  const usdN = m.pipelineUsd ?? 0
  const arsN = m.pipelineArs ?? 0
  const venta = dolar?.venta
  if (moneda === 'USD') {
    return formatUSD(usdN + (venta ? arsN / venta : 0))
  }
  return formatARS(arsN + (venta ? usdN * venta : 0))
}

function Metricas({ data, loading, dolar, moneda }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={cardClass}>
            <div className="h-10 animate-pulse rounded bg-hmc-gray3" />
          </div>
        ))}
      </div>
    )
  }
  const m = data?.metricas ?? {}
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {METRICAS_CFG.map((cfg) => {
        const esPipeline = cfg.key === 'pipeline'
        const esVentas = cfg.key === 'ventas'
        const valor = esPipeline || esVentas ? null : m[cfg.key] ?? 0
        const color = typeof cfg.color === 'function' ? cfg.color(valor) : cfg.color
        const Icon = cfg.icon
        return (
          <div key={cfg.key} className={`relative ${cardClass}`}>
            <Icon size={28} style={{ color }} className="absolute right-3 top-3 opacity-80" />
            <p className="text-[10px] uppercase tracking-wide text-hmc-muted">{cfg.label}</p>

            {esVentas ? (
              <>
                <p className="mt-1 text-[28px] font-bold leading-none text-hmc-white">
                  {moneda === 'USD'
                    ? (m.ventasUsd ?? 0) > 0
                      ? formatUSD(m.ventasUsd)
                      : '—'
                    : (m.ventasArs ?? 0) > 0
                      ? formatARS(m.ventasArs)
                      : '—'}
                </p>
                <p className="mt-1.5 text-[11px] text-hmc-muted">{m.ventasCount ?? 0} cobros</p>
              </>
            ) : esPipeline ? (
              <>
                <p className="mt-1 text-[26px] font-bold leading-none text-hmc-white">
                  {pipelineTotal(m, dolar, moneda)}
                </p>
                <p className="mt-1.5 text-[11px] text-hmc-muted">Valor estimado</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-[28px] font-bold leading-none text-hmc-white">{valor}</p>
                <p className="mt-1.5 text-[11px] text-hmc-muted">{cfg.sub(valor)}</p>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Pendientes({ data, loading, onToggle, onIr }) {
  const lista = data?.pendientes ?? []
  return (
    <Card titulo="Pendientes hoy" badge={loading ? undefined : String(lista.length)}>
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} h={28} />)}
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <TbCircleCheck size={32} className="mb-2 text-[#44aa99]" />
          <p className="text-sm text-hmc-muted">¡Todo al día! Sin pendientes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((a) => {
            const tipo = TIPO_ACTIVIDAD_MAP[a.tipo] ?? TIPO_ACTIVIDAD_MAP.tarea
            const Icon = tipo.icon
            const completada = a.estado === 'completada'
            const v = a.fecha_vencimiento ? venceTexto(a.fecha_vencimiento) : null
            return (
              <div key={a.id} className="flex items-start gap-2.5 text-sm">
                <button
                  type="button"
                  onClick={() => onToggle(a)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${completada ? 'border-hmc-white bg-hmc-white' : 'border-hmc-border'}`}
                >
                  {completada && <span className="text-[10px] text-hmc-black">✓</span>}
                </button>
                <Icon size={15} style={{ color: tipo.color }} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${completada ? 'text-hmc-muted line-through' : 'text-hmc-white'}`}>{a.titulo}</p>
                  {a.oportunidad && (
                    <button type="button" onClick={() => onIr(a.oportunidad.id)} className="truncate text-xs text-hmc-muted hover:text-hmc-white">
                      {a.oportunidad.titulo}
                    </button>
                  )}
                  {v && <p className={`text-[11px] ${v.vencida ? 'text-red-400' : 'text-hmc-muted'}`}>{v.txt}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function EnProceso({ data, loading, onIr }) {
  const lista = data?.enProceso ?? []
  return (
    <Card titulo="En proceso" badge={loading ? undefined : String(lista.length)}>
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} h={40} />)}
        </div>
      ) : lista.length === 0 ? (
        <p className="py-4 text-center text-sm text-hmc-muted">Sin oportunidades en proceso</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((op) => {
            const etapa = ETAPA_MAP[op.etapa]
            const cli = op.empresa?.nombre || (op.contacto ? `${op.contacto.nombre ?? ''} ${op.contacto.apellido ?? ''}`.trim() : '')
            const acts = op.crm_actividades ?? []
            const ult = acts.length ? Math.max(...acts.map((x) => new Date(x.updated_at).getTime())) : new Date(op.updated_at).getTime()
            const diasSin = Math.floor((Date.now() - ult) / 86400000)
            return (
              <div key={op.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: etapa?.color }} />
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onIr(op.id)} className="block truncate text-left text-sm font-medium text-hmc-white hover:underline">{op.titulo}</button>
                  {cli && <p className="truncate text-xs text-hmc-muted">{cli}</p>}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-hmc-muted">
                    {op.valor_estimado != null && <span>{op.moneda} {Number(op.valor_estimado).toLocaleString('es-AR')}</span>}
                    {etapa && <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: `${etapa.color}22`, color: etapa.color }}>{etapa.label}</span>}
                    {diasSin > 7 && <span className="text-[#ccaa44]">Hace {diasSin} días sin actividad</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function VerTodas({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] text-hmc-muted transition-colors hover:text-hmc-white">
      Ver todas →
    </button>
  )
}

function UltimasEmpresas({ data, loading, onVerTodas, onIr }) {
  const lista = data?.ultimasEmpresas ?? []
  return (
    <Card titulo="Nuevas empresas" accion={<VerTodas onClick={onVerTodas} />}>
      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} h={28} />)}</div>
      ) : lista.length === 0 ? (
        <p className="py-4 text-center text-sm text-hmc-muted">Sin empresas</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {lista.map((e) => (
            <button key={e.id} type="button" onClick={() => onIr(e.id)} className="flex items-center gap-2.5 text-left">
              {e.logo_url ? (
                <img src={e.logo_url} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-hmc-gray3 text-[10px] text-hmc-white">{iniciales(e.nombre)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-hmc-white">{e.nombre}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <SegmentoPills segmentos={e.segmentos} max={2} />
                  <span className="text-[11px] text-hmc-muted">{tiempoRelativo(e.created_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function CotizacionesRecientes({ data, loading, onIr }) {
  const lista = data?.cotizaciones ?? []
  return (
    <Card titulo="Cotizaciones recientes">
      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} h={28} />)}</div>
      ) : lista.length === 0 ? (
        <p className="py-4 text-center text-sm text-hmc-muted">Sin cotizaciones</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {lista.map((c) => {
            const e = ESTADOS_COT[c.estado] ?? ESTADOS_COT.borrador
            return (
              <button key={c.id} type="button" onClick={() => onIr(c.id)} className="flex items-center justify-between gap-2 text-left">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-hmc-muted">{c.numero}</p>
                  <p className="truncate text-sm text-hmc-white">{c.titulo}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${e.color}22`, color: e.color }}>{e.label}</span>
                  <p className="mt-0.5 text-xs text-hmc-white">{formatUSD(c.total_usd)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function ResumenProductos({ data, loading, onVer }) {
  const p = data?.productos
  return (
    <Card titulo="Catálogo" accion={<VerTodas onClick={onVer} />}>
      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} h={20} />)}</div>
      ) : !p ? (
        <p className="py-4 text-center text-sm text-hmc-muted">Sin datos</p>
      ) : (
        <div>
          <p className="text-[28px] font-bold leading-none text-hmc-white">{p.activos}</p>
          <p className="mb-3 text-[11px] text-hmc-muted">productos activos</p>
          <div className="flex flex-col gap-1.5">
            {p.porCategoria.map((c) => (
              <div key={c.nombre} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-hmc-white">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.nombre}
                </span>
                <span className="text-hmc-muted">{c.count}</span>
              </div>
            ))}
          </div>
          {p.ultimo && <p className="mt-3 text-[11px] text-hmc-muted">Último: {p.ultimo.nombre}</p>}
        </div>
      )}
    </Card>
  )
}
