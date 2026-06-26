import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TbCurrencyDollar, TbTargetArrow, TbFileInvoice, TbArrowRight } from 'react-icons/tb'
import { useDashboard } from '../hooks/useDashboard'
import { useDolar } from '../hooks/useDolar'
import { saludo, formatFechaLarga } from '../lib/utils'
import { formatUSD, formatARS } from '../lib/dolar'
import { ETAPA_MAP } from '../lib/crm'
import { TIPO_ACTIVIDAD_MAP } from '../lib/campanas'
import { STORAGE, DEFAULT_PERFIL, loadJSON, loadStr } from '../lib/settings'

const COVER_KEY = 'hmc_dashboard_cover'
const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'año', label: 'Año' },
]

const tituloSeccion = 'mb-3 text-xs font-semibold uppercase tracking-widest text-[#555]'

const TOOLTIP_STYLE = {
  backgroundColor: '#1e1e1e',
  border: '1px solid #2e2e2e',
  borderRadius: 6,
  color: '#f0f0ea',
  fontSize: 12,
}
const AXIS_TICK = { fill: '#777777', fontSize: 11 }

// Total del pipeline (oportunidades activas, no perdidas) en la moneda elegida.
function pipelineTotal(m, dolar, moneda) {
  const usdN = m?.pipelineUsd ?? 0
  const arsN = m?.pipelineArs ?? 0
  const venta = dolar?.venta
  if (moneda === 'USD') return formatUSD(usdN + (venta ? arsN / venta : 0))
  return formatARS(arsN + (venta ? usdN * venta : 0))
}

function diasDesde(fecha) {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000))
}

function relativoFuturo(fecha) {
  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  const dias = Math.round((d - inicioHoy) / 86400000)
  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('mes')
  const [moneda, setMoneda] = useState('ARS')
  const cover = loadStr(COVER_KEY)
  const { data, loading } = useDashboard(periodo)
  const { cotizacion: dolar } = useDolar()

  const perfil = loadJSON(STORAGE.perfil, DEFAULT_PERFIL)
  const nombre = perfil.nombre || 'Agustín'
  const rol = perfil.rol || 'Representante HMC · Córdoba'
  const fechaLarga = formatFechaLarga(new Date())
  const fechaCap = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)

  const m = data?.metricas ?? {}
  const pendientes = data?.pendientes ?? []
  const oportunidades = data?.oportunidadesActivas ?? []
  const cotizaciones = data?.cotizacionesEnviadas ?? []

  // Actividades de HOY / vencidas y PRÓXIMAS (a partir de los pendientes ya cargados)
  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  const finHoy = new Date()
  finHoy.setHours(23, 59, 59, 999)
  const hoyYVencidas = pendientes.filter(
    (a) => a.fecha_vencimiento && new Date(a.fecha_vencimiento) <= finHoy
  )
  const proximas = pendientes
    .filter((a) => a.fecha_vencimiento && new Date(a.fecha_vencimiento) > finHoy)
    .slice(0, 3)

  function ActividadRow({ a, badge }) {
    const tipo = TIPO_ACTIVIDAD_MAP[a.tipo] ?? TIPO_ACTIVIDAD_MAP.tarea
    const Icon = tipo.icon
    return (
      <button
        type="button"
        onClick={() => navigate('/crm/calendario')}
        className="flex w-full items-start gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-white/5"
      >
        <Icon size={16} style={{ color: tipo.color }} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white">{a.titulo}</p>
          {a.oportunidad?.titulo && <p className="truncate text-xs text-[#666]">{a.oportunidad.titulo}</p>}
        </div>
        {badge}
      </button>
    )
  }

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
      <div className="p-6">
        {/* Selector de moneda */}
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

        {/* ZONA 1 — Métricas (3 cards) */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card p-5">
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">Pipeline total</p>
              <TbCurrencyDollar size={18} className="text-[#555]" />
            </div>
            <p className="mt-3 text-[26px] font-bold leading-none text-white">
              {loading ? '—' : pipelineTotal(m, dolar, moneda)}
            </p>
            <p className="mt-1.5 text-[11px] text-[#666]">en oportunidades activas</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="glass-card p-5 text-left transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">Oportunidades activas</p>
              <TbTargetArrow size={18} className="text-[#555]" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-white">{loading ? '—' : oportunidades.length}</p>
            <p className="mt-1.5 text-[11px] text-[#666]">en curso</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/cotizaciones')}
            className="glass-card p-5 text-left transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">Cotizaciones sin respuesta</p>
              <TbFileInvoice size={18} className="text-[#555]" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-white">{loading ? '—' : cotizaciones.length}</p>
            <p className="mt-1.5 text-[11px] text-[#666]">esperando respuesta</p>
          </button>
        </div>

        {/* ZONA 2 — Dos columnas */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row">
          {/* Izquierda 60% — HOY / PRÓXIMAS */}
          <div className="lg:w-3/5">
            <div className="glass-card p-5">
              <h2 className={tituloSeccion}>Hoy</h2>
              {hoyYVencidas.length === 0 ? (
                <div className="py-1">
                  <p className="text-sm text-[#666]">Sin actividades para hoy</p>
                  <button
                    type="button"
                    onClick={() => navigate('/crm/calendario')}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-white transition-opacity hover:opacity-80"
                  >
                    Ver calendario <TbArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {hoyYVencidas.map((a) => {
                    const vencida = new Date(a.fecha_vencimiento) < inicioHoy
                    return (
                      <ActividadRow
                        key={a.id}
                        a={a}
                        badge={
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              vencida ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {vencida ? 'VENCIDA' : 'HOY'}
                          </span>
                        }
                      />
                    )
                  })}
                </div>
              )}

              {proximas.length > 0 && (
                <>
                  <hr className="my-4 border-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                  <h2 className={tituloSeccion}>Próximas</h2>
                  <div className="flex flex-col">
                    {proximas.map((a) => (
                      <ActividadRow
                        key={a.id}
                        a={a}
                        badge={<span className="shrink-0 text-[11px] text-[#888]">{relativoFuturo(a.fecha_vencimiento)}</span>}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Gráfico actividad del período */}
            <div className="glass-card mt-6 p-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#555]">Actividad del período</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.actividad ?? []} margin={{ left: -10, right: 10, top: 5 }}>
                  <CartesianGrid stroke="#2e2e2e" />
                  <XAxis dataKey="label" tick={AXIS_TICK} stroke="#2e2e2e" />
                  <YAxis tick={AXIS_TICK} stroke="#2e2e2e" allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="empresas" stroke="#7fb8e8" strokeWidth={2} dot={false} name="Empresas" />
                  <Line type="monotone" dataKey="contactos" stroke="#a8d88a" strokeWidth={2} dot={false} name="Contactos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Derecha 40% — OPORTUNIDADES EN CURSO */}
          <div className="lg:w-2/5">
            <div className="glass-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#555]">Oportunidades en curso</h2>
                {oportunidades.length > 6 && (
                  <button
                    type="button"
                    onClick={() => navigate('/crm')}
                    className="text-[11px] text-[#888] transition-colors hover:text-white"
                  >
                    Ver todas →
                  </button>
                )}
              </div>
              {oportunidades.length === 0 ? (
                <p className="py-2 text-sm text-[#666]">Sin oportunidades activas</p>
              ) : (
                <div className="flex flex-col">
                  {oportunidades.slice(0, 6).map((op) => {
                    const etapa = ETAPA_MAP[op.etapa]
                    const valor =
                      op.valor_estimado != null
                        ? `${op.moneda || 'USD'} ${Number(op.valor_estimado).toLocaleString('es-AR')}`
                        : ''
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => navigate(`/crm/${op.id}`)}
                        className="flex w-full items-start gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{op.titulo}</p>
                          {op.empresa?.nombre && <p className="truncate text-xs text-[#666]">{op.empresa.nombre}</p>}
                          {etapa && (
                            <span
                              className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: `${etapa.color}22`, color: etapa.color }}
                            >
                              {etapa.label}
                            </span>
                          )}
                        </div>
                        {valor && <span className="shrink-0 pt-0.5 text-xs text-[#aaa]">{valor}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
