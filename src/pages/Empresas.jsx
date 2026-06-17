import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TbPlus,
  TbPencil,
  TbTrash,
  TbSearch,
  TbBuildingSkyscraper,
  TbMail,
  TbBrandWhatsapp,
  TbFileImport,
  TbFileSpreadsheet,
} from 'react-icons/tb'
import { exportarEntidad } from '../lib/exportar'
import {
  getEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  createContacto,
  getSegmentos,
  setEmpresaSegmentos,
} from '../lib/db'
import { iniciales, limpiarWhatsapp } from '../lib/utils'
import EmpresaModal from '../components/EmpresaModal'
import ImportModal from '../components/ImportModal'
import { SegmentoPills } from '../components/SegmentoPill'

export default function Empresas() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState([])
  const [segmentosCatalogo, setSegmentosCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [segmentoFiltro, setSegmentoFiltro] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  async function loadEmpresas() {
    setLoading(true)
    setError('')
    const { data, error: err } = await getEmpresas()
    if (err) {
      setError('No se pudieron cargar las empresas: ' + err.message)
      setEmpresas([])
    } else {
      setEmpresas(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEmpresas()
    getSegmentos()
      .then((data) => setSegmentosCatalogo(data ?? []))
      .catch(() => {})
  }, [])

  // Cantidad de contactos viene como empresa.contactos[0].count.
  function contactCount(empresa) {
    return empresa.contactos?.[0]?.count ?? 0
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return empresas.filter((e) => {
      const matchSegmento =
        !segmentoFiltro || (e.segmentos ?? []).some((s) => s.id === segmentoFiltro)
      const matchSearch = !q || (e.nombre ?? '').toLowerCase().includes(q)
      return matchSegmento && matchSearch
    })
  }, [empresas, search, segmentoFiltro])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(empresa) {
    setEditing(empresa)
    setModalOpen(true)
  }

  // Recibe { empresa, contacto }. Devuelve un mensaje de error si falla,
  // o null si OK (lo usa el modal).
  async function handleSave(payload) {
    let empresaId
    if (editing) {
      const { error: err } = await updateEmpresa(editing.id, payload.empresa)
      if (err) return 'No se pudo guardar: ' + err.message
      empresaId = editing.id
    } else {
      const { data, error: err } = await createEmpresa(payload.empresa)
      if (err) return 'No se pudo guardar: ' + err.message
      empresaId = data.id
    }

    // Segmentos (etiquetas): reemplaza el set completo de la empresa.
    if (payload.segmentos) {
      try {
        await setEmpresaSegmentos(empresaId, payload.segmentos)
      } catch (e) {
        return 'Empresa guardada, pero fallaron los segmentos: ' + (e?.message ?? e)
      }
    }

    // Contacto principal opcional: se crea asociado a la empresa.
    if (payload.contacto) {
      const { error: contactoErr } = await createContacto({
        ...payload.contacto,
        empresa_id: empresaId,
      })
      if (contactoErr)
        return 'Empresa guardada, pero falló el contacto: ' + contactoErr.message
    }

    setModalOpen(false)
    setEditing(null)
    await loadEmpresas()
    return null
  }

  async function handleDelete(empresa) {
    const ok = window.confirm(
      `¿Eliminar la empresa "${empresa.nombre}"? Esta acción no se puede deshacer.`
    )
    if (!ok) return
    const { error: err } = await deleteEmpresa(empresa.id)
    if (err) {
      setError('No se pudo eliminar: ' + err.message)
      return
    }
    await loadEmpresas()
  }

  // Importa filas (ya mapeadas) de a una. Devuelve { exitosos, errores }.
  async function handleImport(filas, onProgress) {
    let exitosos = 0
    const errores = []
    for (let i = 0; i < filas.length; i++) {
      const { error: err } = await createEmpresa(filas[i].data)
      if (err) errores.push({ fila: filas[i].fila, motivo: err.message })
      else exitosos++
      onProgress(i + 1, filas.length)
    }
    await loadEmpresas()
    return { exitosos, errores }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-hmc-white">Empresas</h1>
          <p className="mt-1 text-sm text-hmc-muted">Organizaciones prospectas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const { error: err } = await exportarEntidad('empresas', 'Empresas')
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
            Nueva empresa
          </button>
        </div>
      </div>

      {/* Filtros: búsqueda por nombre + filtro por segmento */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <TbSearch
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted"
          />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-10 pr-3 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted"
          />
        </div>
        <select
          value={segmentoFiltro}
          onChange={(e) => setSegmentoFiltro(e.target.value)}
          className="w-48 rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white"
        >
          <option value="">Todos los segmentos</option>
          {segmentosCatalogo.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Contenido */}
      <div className="overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2">
        {/* Encabezado de tabla */}
        <div className="grid grid-cols-[48px_2fr_140px_160px_120px_80px_80px] items-center gap-4 border-b border-hmc-border px-5 py-2.5 text-xs uppercase tracking-wide text-hmc-muted">
          <span />
          <span>Nombre</span>
          <span>Segmento</span>
          <span>Ciudad</span>
          <span className="text-center">Contacto rápido</span>
          <span className="text-center">Contactos</span>
          <span className="text-right">Acciones</span>
        </div>

        {loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState hasEmpresas={empresas.length > 0} onCreate={openCreate} />
        ) : (
          filtered.map((empresa) => (
            <div
              key={empresa.id}
              onClick={() => navigate(`/empresas/${empresa.id}`)}
              className="grid cursor-pointer grid-cols-[48px_2fr_140px_160px_120px_80px_80px] items-center gap-4 border-b border-hmc-border px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-hmc-gray3/60 active:scale-[0.99]"
            >
              {empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-md border border-hmc-border object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-hmc-border bg-hmc-gray3 text-xs font-medium text-hmc-white">
                  {iniciales(empresa.nombre)}
                </div>
              )}
              <span className="min-w-0 truncate font-medium text-hmc-white">{empresa.nombre}</span>
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {empresa.segmentos?.length ? (
                  <SegmentoPills segmentos={empresa.segmentos} max={2} />
                ) : (
                  <span className="text-hmc-muted">—</span>
                )}
              </span>
              <span className="truncate text-hmc-muted">
                {empresa.ciudad || '—'}
              </span>
              <span className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                {empresa.email || empresa.telefono ? (
                  <>
                    {empresa.telefono && (
                      <a
                        href={`https://wa.me/${limpiarWhatsapp(empresa.telefono)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-[#25d366]"
                        title="Escribir por WhatsApp"
                        aria-label="Escribir por WhatsApp"
                      >
                        <TbBrandWhatsapp size={17} />
                      </a>
                    )}
                    {empresa.email && (
                      <a
                        href={`mailto:${empresa.email}`}
                        className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white"
                        title="Enviar email"
                        aria-label="Enviar email"
                      >
                        <TbMail size={17} />
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-hmc-muted">—</span>
                )}
              </span>
              <span className="text-center text-hmc-muted">
                {contactCount(empresa)}
              </span>
              <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openEdit(empresa)}
                  className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white"
                  aria-label="Editar"
                  title="Editar"
                >
                  <TbPencil size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(empresa)}
                  className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-red-400"
                  aria-label="Eliminar"
                  title="Eliminar"
                >
                  <TbTrash size={17} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <EmpresaModal
          empresa={editing}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSave={handleSave}
          onDelete={
            editing
              ? async () => {
                  const { error: err } = await deleteEmpresa(editing.id)
                  if (err) return 'No se pudo eliminar: ' + err.message
                  setModalOpen(false)
                  setEditing(null)
                  await loadEmpresas()
                  return null
                }
              : undefined
          }
        />
      )}

      {importOpen && (
        <ImportModal
          tipo="empresas"
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[48px_2fr_140px_160px_120px_80px_80px] items-center gap-4 border-b border-hmc-border px-5 py-3 last:border-b-0"
        >
          <div className="h-9 w-9 animate-pulse rounded-md bg-hmc-gray3" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-hmc-gray3" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-hmc-gray3" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-hmc-gray3" />
          <div className="mx-auto h-3.5 w-14 animate-pulse rounded bg-hmc-gray3" />
          <div className="mx-auto h-3.5 w-6 animate-pulse rounded bg-hmc-gray3" />
          <div className="ml-auto h-3.5 w-12 animate-pulse rounded bg-hmc-gray3" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasEmpresas, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <TbBuildingSkyscraper size={40} className="mb-3 text-hmc-muted" />
      {hasEmpresas ? (
        <p className="text-sm text-hmc-muted">
          No hay empresas que coincidan con el filtro.
        </p>
      ) : (
        <>
          <p className="text-sm text-hmc-muted">
            Todavía no cargaste ninguna empresa.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
          >
            <TbPlus size={18} />
            Nueva empresa
          </button>
        </>
      )}
    </div>
  )
}
