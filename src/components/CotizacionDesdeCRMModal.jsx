import { useEffect, useMemo, useState } from 'react'
import { TbX, TbSearch } from 'react-icons/tb'
import {
  createCotizacion,
  asignarCotizacionAOportunidad,
  getCotizaciones,
} from '../lib/db'
import { ESTADOS_COT } from '../lib/cotizaciones'
import { formatUSD } from '../lib/dolar'

// Crea una cotización nueva (y la asigna) o asigna una existente a la oportunidad.
// Props: oportunidad, onClose, onCreada(cotizacionId), onAsignada(cotizacion)
export default function CotizacionDesdeCRMModal({ oportunidad, onClose, onCreada, onAsignada }) {
  const [tab, setTab] = useState('nueva')
  const [titulo, setTitulo] = useState(`Cotización — ${oportunidad.titulo}`)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [existentes, setExistentes] = useState([])
  const [search, setSearch] = useState('')

  const clienteNombre =
    oportunidad.empresa?.nombre ||
    (oportunidad.contacto ? `${oportunidad.contacto.nombre ?? ''} ${oportunidad.contacto.apellido ?? ''}`.trim() : '') ||
    ''

  useEffect(() => {
    if (tab !== 'existente') return
    getCotizaciones().then(({ data }) => {
      const recientes = (data ?? [])
        .filter((c) => ['borrador', 'enviada'].includes(c.estado))
        .slice(0, 10)
      setExistentes(recientes)
    })
  }, [tab])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return existentes
    return existentes.filter((c) => `${c.numero} ${c.titulo}`.toLowerCase().includes(q))
  }, [existentes, search])

  async function crear() {
    setError('')
    if (!titulo.trim()) return setError('El título es obligatorio.')
    setSaving(true)
    const { data, error: err } = await createCotizacion({
      titulo: titulo.trim(),
      estado: 'borrador',
      empresa_id: oportunidad.empresa_id ?? null,
      contacto_id: oportunidad.contacto_id ?? null,
      moneda_display: 'ARS',
    })
    if (err) {
      setSaving(false)
      return setError('No se pudo crear: ' + err.message)
    }
    await asignarCotizacionAOportunidad(data.id, oportunidad.id)
    setSaving(false)
    onCreada(data.id)
  }

  async function asignar(c) {
    setSaving(true)
    await asignarCotizacionAOportunidad(c.id, oportunidad.id)
    setSaving(false)
    onAsignada(c)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-base font-semibold text-hmc-white">Cotización para {oportunidad.titulo}</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>

        <div className="flex gap-2 border-b border-hmc-border px-6 py-3">
          {[{ k: 'nueva', l: 'Nueva cotización' }, { k: 'existente', l: 'Asignar existente' }].map((t) => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)} className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${tab === t.k ? 'bg-hmc-white text-hmc-black' : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'}`}>{t.l}</button>
          ))}
        </div>

        {tab === 'nueva' ? (
          <div className="px-6 py-5">
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted">Título</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white" autoFocus />
            {clienteNombre && (
              <p className="mt-3 text-xs text-hmc-muted">Cliente: <span className="text-hmc-white">{clienteNombre}</span> <span className="text-hmc-muted">(de la oportunidad)</span></p>
            )}
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
              <button type="button" onClick={crear} disabled={saving} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">{saving ? 'Creando…' : 'Crear cotización'}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-hmc-border px-6 py-3">
              <div className="relative">
                <TbSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-9 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted" />
              </div>
            </div>
            <div className="max-h-60 flex-1 overflow-y-auto px-3 py-2">
              {filtradas.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-hmc-muted">Sin cotizaciones recientes en borrador/enviada.</p>
              ) : (
                filtradas.map((c) => {
                  const e = ESTADOS_COT[c.estado] ?? ESTADOS_COT.borrador
                  return (
                    <button key={c.id} type="button" disabled={saving} onClick={() => asignar(c)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-hmc-gray3 disabled:opacity-60">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-hmc-muted">{c.numero}</p>
                        <p className="truncate text-sm text-hmc-white">{c.titulo}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${e.color}22`, color: e.color }}>{e.label}</span>
                        <p className="mt-0.5 text-xs text-hmc-white">{formatUSD(c.total_usd)}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
