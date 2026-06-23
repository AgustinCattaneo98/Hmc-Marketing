import { useEffect, useMemo, useState } from 'react'
import {
  TbPlus,
  TbPencil,
  TbTrash,
  TbSearch,
  TbMail,
  TbBrandWhatsapp,
  TbUsers,
  TbFileImport,
  TbFileSpreadsheet,
  TbCopy,
  TbX,
} from 'react-icons/tb'
import { exportarEntidad } from '../lib/exportar'
import {
  getContactos,
  getEmpresas,
  getSegmentos,
  createContacto,
  updateContacto,
  deleteContacto,
} from '../lib/db'
import { iniciales, limpiarWhatsapp } from '../lib/utils'
import { SegmentoPills } from '../components/SegmentoPill'
import { confirmDialog } from '../components/confirm'
import ContactoModal from '../components/ContactoModal'
import ImportModal from '../components/ImportModal'

const filtroSelectClass =
  'rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white'

export default function Contactos() {
  const [contactos, setContactos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [segmentosCatalogo, setSegmentosCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [segmentoFiltro, setSegmentoFiltro] = useState('')
  const [empresaFiltro, setEmpresaFiltro] = useState('')
  const [datoFiltro, setDatoFiltro] = useState('') // '' | email | whatsapp
  const [orden, setOrden] = useState('nombre') // nombre | empresa | recientes
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  async function loadContactos() {
    setLoading(true)
    setError('')
    const { data, error: err } = await getContactos()
    if (err) {
      setError('No se pudieron cargar los contactos: ' + err.message)
      setContactos([])
    } else {
      setContactos(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadContactos()
    getEmpresas().then(({ data }) => setEmpresas(data ?? []))
    getSegmentos()
      .then((data) => setSegmentosCatalogo(data ?? []))
      .catch(() => {})
  }, [])

  // Mapa empresa_id -> segmentos asignados (para filtrar contactos por etiqueta).
  const empresaSegmentos = useMemo(() => {
    const map = {}
    for (const e of empresas) map[e.id] = e.segmentos ?? []
    return map
  }, [empresas])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const arr = contactos.filter((c) => {
      const nombreCompleto = `${c.nombre ?? ''} ${c.apellido ?? ''}`.toLowerCase()
      const matchSearch = !q || nombreCompleto.includes(q)
      const segs = empresaSegmentos[c.empresa_id] ?? []
      const matchSegmento = !segmentoFiltro || segs.some((s) => s.id === segmentoFiltro)
      const matchEmpresa = !empresaFiltro || c.empresa_id === empresaFiltro
      const matchDato =
        !datoFiltro ||
        (datoFiltro === 'email' ? !!c.email : datoFiltro === 'whatsapp' ? !!c.whatsapp : true)
      return matchSearch && matchSegmento && matchEmpresa && matchDato
    })
    arr.sort((a, b) => {
      if (orden === 'empresa')
        return (a.empresa?.nombre || '').localeCompare(b.empresa?.nombre || '')
      if (orden === 'recientes') return new Date(b.created_at) - new Date(a.created_at)
      return `${a.nombre ?? ''} ${a.apellido ?? ''}`.localeCompare(`${b.nombre ?? ''} ${b.apellido ?? ''}`)
    })
    return arr
  }, [contactos, search, segmentoFiltro, empresaFiltro, datoFiltro, orden, empresaSegmentos])

  const hayFiltros =
    !!(search || segmentoFiltro || empresaFiltro || datoFiltro) || orden !== 'nombre'

  function limpiarFiltros() {
    setSearch('')
    setSegmentoFiltro('')
    setEmpresaFiltro('')
    setDatoFiltro('')
    setOrden('nombre')
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(contacto) {
    setEditing(contacto)
    setModalOpen(true)
  }

  // Devuelve mensaje de error si falla, o null si OK (lo usa el modal).
  async function handleSave(payload) {
    const action = editing
      ? updateContacto(editing.id, payload)
      : createContacto(payload)
    const { error: err } = await action
    if (err) return 'No se pudo guardar: ' + err.message
    setModalOpen(false)
    setEditing(null)
    await loadContactos()
    return null
  }

  async function handleDelete(contacto) {
    const nombre = [contacto.nombre, contacto.apellido].filter(Boolean).join(' ')
    if (!(await confirmDialog(`¿Eliminar el contacto "${nombre}"?`))) return
    const { error: err } = await deleteContacto(contacto.id)
    if (err) {
      setError('No se pudo eliminar: ' + err.message)
      return
    }
    await loadContactos()
  }

  // Importa filas (ya mapeadas) de a una. Devuelve { exitosos, errores }.
  async function handleImport(filas, onProgress) {
    let exitosos = 0
    const errores = []
    for (let i = 0; i < filas.length; i++) {
      const { error: err } = await createContacto(filas[i].data)
      if (err) errores.push({ fila: filas[i].fila, motivo: err.message })
      else exitosos++
      onProgress(i + 1, filas.length)
    }
    await loadContactos()
    return { exitosos, errores }
  }

  // ---- Selección múltiple ----
  const filteredIds = filtered.map((c) => c.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id))
  const someSelected = filteredIds.some((id) => selected.has(id))

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filteredIds))
  }

  function clearSeleccion() {
    setSelected(new Set())
  }

  async function bulkBorrar() {
    const ids = [...selected]
    if (!ids.length) return
    if (!(await confirmDialog(`¿Eliminar ${ids.length} contacto${ids.length === 1 ? '' : 's'}? Esta acción no se puede deshacer.`))) return
    setBulkBusy(true)
    setError('')
    let fallidos = 0
    for (const id of ids) {
      const { error: err } = await deleteContacto(id)
      if (err) fallidos++
    }
    setBulkBusy(false)
    clearSeleccion()
    await loadContactos()
    if (fallidos) setError(`No se pudieron eliminar ${fallidos} contacto(s).`)
  }

  async function bulkDuplicar() {
    const ids = [...selected]
    if (!ids.length) return
    setBulkBusy(true)
    setError('')
    let fallidos = 0
    for (const id of ids) {
      const c = contactos.find((x) => x.id === id)
      if (!c) {
        fallidos++
        continue
      }
      // Excluye claves que no son columnas insertables (relación / sistema).
      const { id: _id, created_at, empresa, ...cols } = c
      const { error: err } = await createContacto({
        ...cols,
        nombre: `${cols.nombre ?? ''} (copia)`.trim(),
      })
      if (err) fallidos++
    }
    setBulkBusy(false)
    clearSeleccion()
    await loadContactos()
    if (fallidos) setError(`No se pudieron duplicar ${fallidos} contacto(s).`)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-hmc-white">Contactos</h1>
          <p className="mt-1 text-sm text-hmc-muted">Personas de contacto</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const { error: err } = await exportarEntidad('contactos', 'Contactos')
              if (err) setError('No se pudo exportar: ' + err)
            }}
            className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray2"
          >
            <TbFileSpreadsheet size={18} />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray2"
          >
            <TbFileImport size={18} />
            Importar
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
          >
            <TbPlus size={18} />
            Nuevo contacto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <TbSearch
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted"
            />
            <input
              type="text"
              placeholder="Buscar por nombre o apellido…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-10 pr-3 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted"
            />
          </div>
          <select
            value={segmentoFiltro}
            onChange={(e) => setSegmentoFiltro(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="">Todos los segmentos</option>
            {segmentosCatalogo.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <select
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="">Todas las empresas</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre}
              </option>
            ))}
          </select>
          <select
            value={datoFiltro}
            onChange={(e) => setDatoFiltro(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="">Email y WhatsApp</option>
            <option value="email">Con email</option>
            <option value="whatsapp">Con WhatsApp</option>
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="nombre">Nombre (A-Z)</option>
            <option value="empresa">Empresa (A-Z)</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-hmc-muted">
          <span>
            {filtered.length} de {contactos.length} contacto{contactos.length === 1 ? '' : 's'}
          </span>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1 transition-colors hover:text-hmc-white"
            >
              <TbX size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Barra de selección / acciones masivas */}
      {!loading && filtered.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-hmc-muted">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected
              }}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer accent-hmc-white"
            />
            {selected.size > 0
              ? `${selected.size} seleccionado${selected.size === 1 ? '' : 's'}`
              : 'Seleccionar todos'}
          </label>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={bulkDuplicar}
                disabled={bulkBusy}
                className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-60"
              >
                <TbCopy size={16} />
                Duplicar
              </button>
              <button
                type="button"
                onClick={bulkBorrar}
                disabled={bulkBusy}
                className="inline-flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-60"
              >
                <TbTrash size={16} />
                Borrar
              </button>
              <button
                type="button"
                onClick={clearSeleccion}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white disabled:opacity-60"
              >
                <TbX size={16} />
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState hasContactos={contactos.length > 0} onCreate={openCreate} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => openEdit(c)}
              className={`flex cursor-pointer items-center gap-4 rounded-lg border bg-hmc-gray2 p-4 transition-colors hover:bg-hmc-gray3/60 active:scale-[0.99] ${
                selected.has(c.id) ? 'border-hmc-white/40 bg-hmc-gray3/40' : 'border-hmc-border'
              }`}
            >
              {/* Checkbox de selección */}
              <span className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleOne(c.id)}
                  className="h-4 w-4 cursor-pointer accent-hmc-white"
                  aria-label="Seleccionar contacto"
                />
              </span>

              {/* Avatar */}
              {c.foto_url ? (
                <img
                  src={c.foto_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full border border-hmc-border object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-hmc-border bg-hmc-gray3 text-sm font-semibold text-hmc-white">
                  {iniciales(c.nombre, c.apellido)}
                </div>
              )}

              {/* Datos principales */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-hmc-white">
                  {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                </p>
                {c.cargo && (
                  <p className="truncate text-xs text-hmc-muted">{c.cargo}</p>
                )}
                <div className="mt-1.5">
                  {c.empresa ? (
                    <span className="inline-flex items-center gap-2 text-xs text-hmc-muted">
                      <span className="truncate">{c.empresa.nombre}</span>
                      <SegmentoPills segmentos={empresaSegmentos[c.empresa_id]} max={2} />
                    </span>
                  ) : (
                    <span className="text-xs text-hmc-muted/70">Sin empresa</span>
                  )}
                </div>
              </div>

              {/* Acciones: contacto directo + editar/eliminar */}
              <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {c.whatsapp && (
                  <a
                    href={`https://wa.me/${limpiarWhatsapp(c.whatsapp)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-[#25d366]"
                    title="Escribir por WhatsApp"
                    aria-label="Escribir por WhatsApp"
                  >
                    <TbBrandWhatsapp size={17} />
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white"
                    title="Enviar email"
                    aria-label="Enviar email"
                  >
                    <TbMail size={17} />
                  </a>
                )}

                {/* Divisor vertical sutil */}
                <span className="mx-1 h-5 w-px bg-hmc-border" />

                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white"
                  aria-label="Editar"
                  title="Editar"
                >
                  <TbPencil size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c)}
                  className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-red-400"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <TbTrash size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ContactoModal
          contacto={editing}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSave={handleSave}
          onDelete={
            editing
              ? async () => {
                  const { error: err } = await deleteContacto(editing.id)
                  if (err) return 'No se pudo eliminar: ' + err.message
                  setModalOpen(false)
                  setEditing(null)
                  await loadContactos()
                  return null
                }
              : undefined
          }
        />
      )}

      {importOpen && (
        <ImportModal
          tipo="contactos"
          empresas={empresas}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-hmc-border bg-hmc-gray2 p-4"
        >
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-hmc-gray3" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-hmc-gray3" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-hmc-gray3" />
          </div>
          <div className="h-3.5 w-32 animate-pulse rounded bg-hmc-gray3" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasContactos, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-hmc-border bg-hmc-gray2 px-6 py-16 text-center">
      <TbUsers size={40} className="mb-3 text-hmc-muted" />
      {hasContactos ? (
        <p className="text-sm text-hmc-muted">
          No hay contactos que coincidan con el filtro.
        </p>
      ) : (
        <>
          <p className="text-sm text-hmc-muted">No hay contactos cargados aún</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
          >
            <TbPlus size={18} />
            Nuevo contacto
          </button>
        </>
      )}
    </div>
  )
}
