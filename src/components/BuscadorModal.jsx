import { useEffect, useMemo, useState } from 'react'
import { TbX, TbSearch, TbCheck } from 'react-icons/tb'
import { getEmpresas, getContactos } from '../lib/db'
import { iniciales } from '../lib/utils'

// Busca empresas o contactos para agregar a una campaña.
// Props: tipo ('empresa'|'contacto'), excluir (array de ids ya agregados),
//        onAgregar(ids[]), onClose
export default function BuscadorModal({ tipo, excluir = [], onAgregar, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(() => new Set())
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const fn = tipo === 'empresa' ? getEmpresas : getContactos
    fn().then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [tipo])

  const excluirSet = useMemo(() => new Set(excluir), [excluir])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (excluirSet.has(it.id)) return false
      if (!q) return true
      const texto =
        tipo === 'empresa'
          ? it.nombre ?? ''
          : `${it.nombre ?? ''} ${it.apellido ?? ''}`
      return texto.toLowerCase().includes(q)
    })
  }, [items, search, excluirSet, tipo])

  function toggle(id) {
    setSel((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function agregar() {
    if (sel.size === 0) return
    setGuardando(true)
    await onAgregar([...sel])
    setGuardando(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">
            Agregar {tipo === 'empresa' ? 'empresas' : 'contactos'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-hmc-muted transition-colors hover:text-hmc-white"
            aria-label="Cerrar"
          >
            <TbX size={20} />
          </button>
        </div>

        <div className="border-b border-hmc-border px-6 py-3">
          <div className="relative">
            <TbSearch
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted"
            />
            <input
              autoFocus
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-10 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-hmc-muted">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-hmc-muted">
              No hay resultados disponibles.
            </p>
          ) : (
            filtered.map((it) => {
              const seleccionado = sel.has(it.id)
              const nombre =
                tipo === 'empresa'
                  ? it.nombre
                  : [it.nombre, it.apellido].filter(Boolean).join(' ')
              const secundario =
                tipo === 'empresa'
                  ? it.segmento || it.email || ''
                  : it.empresa?.nombre || it.cargo || it.email || ''
              const foto = tipo === 'empresa' ? it.logo_url : it.foto_url
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggle(it.id)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-hmc-gray3"
                >
                  {foto ? (
                    <img
                      src={foto}
                      alt=""
                      className={`h-9 w-9 shrink-0 border border-hmc-border object-cover ${
                        tipo === 'empresa' ? 'rounded-md' : 'rounded-full'
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center border border-hmc-border bg-hmc-gray3 text-xs font-medium text-hmc-white ${
                        tipo === 'empresa' ? 'rounded-md' : 'rounded-full'
                      }`}
                    >
                      {iniciales(nombre)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-hmc-white">{nombre}</p>
                    {secundario && (
                      <p className="truncate text-xs text-hmc-muted">{secundario}</p>
                    )}
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      seleccionado
                        ? 'border-hmc-white bg-hmc-white text-hmc-black'
                        : 'border-hmc-border'
                    }`}
                  >
                    {seleccionado && <TbCheck size={14} />}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-hmc-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={agregar}
            disabled={sel.size === 0 || guardando}
            className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Agregando…' : `Agregar ${sel.size} seleccionados`}
          </button>
        </div>
      </div>
    </div>
  )
}
