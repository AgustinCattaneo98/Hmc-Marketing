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
  TbCopy,
  TbX,
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
  addEmpresaSegmentoPorNombre,
} from '../lib/db'
import { iniciales, limpiarWhatsapp } from '../lib/utils'
import EmpresaModal from '../components/EmpresaModal'
import ImportModal from '../components/ImportModal'
import { SegmentoPills } from '../components/SegmentoPill'
import { confirmDialog } from '../components/confirm'

const filtroSelectClass =
  'rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white'

export default function Empresas() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState([])
  const [segmentosCatalogo, setSegmentosCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [segmentoFiltro, setSegmentoFiltro] = useState('')
  const [provinciaFiltro, setProvinciaFiltro] = useState('')
  const [ciudadFiltro, setCiudadFiltro] = useState('')
  const [contactosFiltro, setContactosFiltro] = useState('') // '' | con | sin
  const [orden, setOrden] = useState('recientes') // recientes | nombre | contactos
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

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

  // Opciones dinámicas de provincia y ciudad según los datos cargados.
  const provincias = useMemo(
    () =>
      [...new Set(empresas.map((e) => (e.provincia || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [empresas]
  )
  const ciudades = useMemo(
    () =>
      [...new Set(empresas.map((e) => (e.ciudad || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [empresas]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const arr = empresas.filter((e) => {
      const matchSegmento =
        !segmentoFiltro || (e.segmentos ?? []).some((s) => s.id === segmentoFiltro)
      const matchSearch = !q || (e.nombre ?? '').toLowerCase().includes(q)
      const matchProv = !provinciaFiltro || (e.provincia || '').trim() === provinciaFiltro
      const matchCiudad = !ciudadFiltro || (e.ciudad || '').trim() === ciudadFiltro
      const cc = contactCount(e)
      const matchContactos =
        !contactosFiltro || (contactosFiltro === 'con' ? cc > 0 : cc === 0)
      return matchSegmento && matchSearch && matchProv && matchCiudad && matchContactos
    })
    arr.sort((a, b) => {
      if (orden === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '')
      if (orden === 'contactos') return contactCount(b) - contactCount(a)
      return new Date(b.created_at) - new Date(a.created_at) // recientes
    })
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresas, search, segmentoFiltro, provinciaFiltro, ciudadFiltro, contactosFiltro, orden])

  const hayFiltros =
    !!(search || segmentoFiltro || provinciaFiltro || ciudadFiltro || contactosFiltro) ||
    orden !== 'recientes'

  function limpiarFiltros() {
    setSearch('')
    setSegmentoFiltro('')
    setProvinciaFiltro('')
    setCiudadFiltro('')
    setContactosFiltro('')
    setOrden('recientes')
  }

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
    const ok = await confirmDialog(
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
      // El segmento del CSV no es columna de empresas: se procesa como tag aparte.
      const { segmento, ...empresaData } = filas[i].data
      const { data: nueva, error: err } = await createEmpresa(empresaData)
      if (err) {
        errores.push({ fila: filas[i].fila, motivo: err.message })
      } else {
        exitosos++
        // Si vino segmento en el CSV, lo asignamos como etiqueta. Si falla, no
        // bloquea la importación: la empresa ya quedó creada (solo se loguea).
        if (segmento) {
          try {
            await addEmpresaSegmentoPorNombre(nueva.id, segmento)
          } catch (e) {
            console.error(`No se pudo asignar el segmento "${segmento}" a la empresa importada:`, e)
          }
        }
      }
      onProgress(i + 1, filas.length)
    }
    await loadEmpresas()
    return { exitosos, errores }
  }

  // ---- Selección múltiple ----
  const filteredIds = filtered.map((e) => e.id)
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
    if (!(await confirmDialog(`¿Eliminar ${ids.length} empresa${ids.length === 1 ? '' : 's'}? Esta acción no se puede deshacer.`))) return
    setBulkBusy(true)
    setError('')
    let fallidos = 0
    for (const id of ids) {
      const { error: err } = await deleteEmpresa(id)
      if (err) fallidos++
    }
    setBulkBusy(false)
    clearSeleccion()
    await loadEmpresas()
    if (fallidos) setError(`No se pudieron eliminar ${fallidos} empresa(s).`)
  }

  async function bulkDuplicar() {
    const ids = [...selected]
    if (!ids.length) return
    setBulkBusy(true)
    setError('')
    let fallidos = 0
    for (const id of ids) {
      const emp = empresas.find((e) => e.id === id)
      if (!emp) {
        fallidos++
        continue
      }
      // Excluye claves que no son columnas insertables (relaciones / sistema).
      const { id: _id, created_at, contactos, empresa_segmentos, segmentos, ...cols } = emp
      const { data: nueva, error: err } = await createEmpresa({
        ...cols,
        nombre: `${cols.nombre} (copia)`,
      })
      if (err || !nueva) {
        fallidos++
        continue
      }
      // Copia las etiquetas de segmento a la nueva empresa.
      if (segmentos?.length) {
        try {
          await setEmpresaSegmentos(nueva.id, segmentos.map((s) => s.id))
        } catch {
          /* no bloquea la duplicación */
        }
      }
    }
    setBulkBusy(false)
    clearSeleccion()
    await loadEmpresas()
    if (fallidos) setError(`No se pudieron duplicar ${fallidos} empresa(s).`)
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
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
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
            value={provinciaFiltro}
            onChange={(e) => setProvinciaFiltro(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="">Todas las provincias</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={ciudadFiltro}
            onChange={(e) => setCiudadFiltro(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={contactosFiltro}
            onChange={(e) => setContactosFiltro(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="">Con y sin contactos</option>
            <option value="con">Con contactos</option>
            <option value="sin">Sin contactos</option>
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className={filtroSelectClass}
          >
            <option value="recientes">Más recientes</option>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="contactos">Más contactos</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-hmc-muted">
          <span>
            {filtered.length} de {empresas.length} empresa{empresas.length === 1 ? '' : 's'}
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

      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-hmc-border bg-hmc-gray2 px-4 py-2.5">
          <span className="text-sm text-hmc-white">
            {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
          </span>
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
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Contenido */}
      <div className="overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2">
        {/* Encabezado de tabla */}
        <div className="grid grid-cols-[36px_48px_2fr_140px_160px_120px_80px_80px] items-center gap-4 border-b border-hmc-border px-5 py-2.5 text-xs uppercase tracking-wide text-hmc-muted">
          <span className="flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected
              }}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer accent-hmc-white"
              aria-label="Seleccionar todas"
            />
          </span>
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
              className={`grid cursor-pointer grid-cols-[36px_48px_2fr_140px_160px_120px_80px_80px] items-center gap-4 border-b border-hmc-border px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-hmc-gray3/60 active:scale-[0.99] ${
                selected.has(empresa.id) ? 'bg-hmc-gray3/40' : ''
              }`}
            >
              <span className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(empresa.id)}
                  onChange={() => toggleOne(empresa.id)}
                  className="h-4 w-4 cursor-pointer accent-hmc-white"
                  aria-label={`Seleccionar ${empresa.nombre}`}
                />
              </span>
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
          className="grid grid-cols-[36px_48px_2fr_140px_160px_120px_80px_80px] items-center gap-4 border-b border-hmc-border px-5 py-3 last:border-b-0"
        >
          <div className="h-4 w-4 animate-pulse rounded bg-hmc-gray3" />
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
