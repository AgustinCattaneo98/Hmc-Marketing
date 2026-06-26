import { useEffect, useMemo, useState } from 'react'
import { TbX, TbSearch } from 'react-icons/tb'
import { getOportunidades, asignarCotizacionAOportunidad } from '../lib/db'
import { ETAPA_MAP } from '../lib/crm'

// Asigna una cotización a una oportunidad CRM.
// Props: cotizacionId, onClose, onAsignada(oportunidad)
export default function AsignarOportunidadModal({ cotizacionId, onClose, onAsignada }) {
  const [ops, setOps] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getOportunidades().then(({ data }) => {
      setOps(data ?? [])
      setLoading(false)
    })
  }, [])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ops
    return ops.filter((o) => (o.titulo ?? '').toLowerCase().includes(q))
  }, [ops, search])

  async function asignar(op) {
    setGuardando(true)
    const { error } = await asignarCotizacionAOportunidad(cotizacionId, op.id)
    setGuardando(false)
    if (!error) onAsignada(op)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden glass-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">Asignar a oportunidad CRM</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>
        <div className="border-b border-hmc-border px-6 py-3">
          <div className="relative">
            <TbSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar oportunidad…" className="w-full glass-input py-2 pl-9 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted" />
          </div>
        </div>
        <div className="max-h-60 flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-hmc-muted">Cargando…</p>
          ) : filtradas.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-hmc-muted">No hay oportunidades.</p>
          ) : (
            filtradas.map((op) => {
              const etapa = ETAPA_MAP[op.etapa]
              return (
                <button key={op.id} type="button" disabled={guardando} onClick={() => asignar(op)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-hmc-gray3 disabled:opacity-60">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-hmc-white">{op.titulo}</p>
                    {op.empresa?.nombre && <p className="truncate text-xs text-hmc-muted">{op.empresa.nombre}</p>}
                  </div>
                  {etapa && <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${etapa.color}22`, color: etapa.color }}>{etapa.label}</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
