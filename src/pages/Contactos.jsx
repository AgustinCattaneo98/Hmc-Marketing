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
import ContactoModal from '../components/ContactoModal'
import ImportModal from '../components/ImportModal'

export default function Contactos() {
  const [contactos, setContactos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [segmentosCatalogo, setSegmentosCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [segmentoFiltro, setSegmentoFiltro] = useState('')
  const [empresaFiltro, setEmpresaFiltro] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

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
    return contactos.filter((c) => {
      const nombreCompleto = `${c.nombre ?? ''} ${c.apellido ?? ''}`.toLowerCase()
      const matchSearch = !q || nombreCompleto.includes(q)
      const segs = empresaSegmentos[c.empresa_id] ?? []
      const matchSegmento = !segmentoFiltro || segs.some((s) => s.id === segmentoFiltro)
      const matchEmpresa = !empresaFiltro || c.empresa_id === empresaFiltro
      return matchSearch && matchSegmento && matchEmpresa
    })
  }, [contactos, search, segmentoFiltro, empresaFiltro, empresaSegmentos])

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
    if (!window.confirm(`¿Eliminar el contacto "${nombre}"?`)) return
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
      <div className="mb-5 flex flex-wrap gap-3">
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
          className="w-44 rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white"
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
          className="w-52 rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
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
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-hmc-border bg-hmc-gray2 p-4 transition-colors hover:bg-hmc-gray3/60 active:scale-[0.99]"
            >
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
