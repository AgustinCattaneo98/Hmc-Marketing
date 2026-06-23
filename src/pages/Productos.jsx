import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confirmDialog } from '../components/confirm'
import {
  TbPlus,
  TbSearch,
  TbPencil,
  TbTrash,
  TbLayoutGrid,
  TbList,
  TbBike,
  TbRefresh,
  TbFileImport,
  TbFileSpreadsheet,
} from 'react-icons/tb'
import {
  getCategorias,
  getProductos,
  deleteProducto,
  deleteCategoria,
  createProducto,
} from '../lib/db'
import { useDolar } from '../hooks/useDolar'
import { convertir, formatMonto, haceCuanto } from '../lib/dolar'
import ProductoModal from '../components/ProductoModal'
import CategoriaModal from '../components/CategoriaModal'
import ImportModal from '../components/ImportModal'
import { exportarEntidad } from '../lib/exportar'

function variantesCount(p) {
  return p.producto_variantes?.length ?? 0
}

// ---- Card de cotización del dólar ----
function DolarCard({ cotizacion, loading, onRefresh, compacta }) {
  if (loading && !cotizacion) {
    return (
      <div className={`rounded-lg border border-hmc-border bg-hmc-gray2 ${compacta ? 'p-3' : 'p-4'}`}>
        <div className="h-10 animate-pulse rounded bg-hmc-gray3" />
      </div>
    )
  }
  if (!cotizacion) {
    return (
      <div className={`rounded-lg border border-hmc-border bg-hmc-gray2 ${compacta ? 'p-3' : 'p-4'}`}>
        <p className="text-sm text-hmc-muted">No se pudo obtener la cotización.</p>
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-between gap-4 rounded-lg border border-hmc-border bg-hmc-gray2 ${compacta ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-hmc-muted">Dólar {cotizacion.nombre}</p>
          <div className="mt-0.5 flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: '#44aa99' }}>Compra ${cotizacion.compra}</span>
            <span className="text-sm font-semibold" style={{ color: '#e24b4a' }}>Venta ${cotizacion.venta}</span>
          </div>
        </div>
        {cotizacion.desactualizado && (
          <span className="rounded px-2 py-0.5 text-[10px]" style={{ backgroundColor: '#ca410', color: '#ca4' }}>
            Valor desactualizado
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-hmc-muted">Actualizado {haceCuanto(cotizacion.timestamp)}</span>
        <button type="button" onClick={onRefresh} className="rounded p-1.5 text-hmc-muted transition-colors hover:text-hmc-white" title="Actualizar">
          <TbRefresh size={16} />
        </button>
      </div>
    </div>
  )
}

export default function Productos() {
  const navigate = useNavigate()
  const { cotizacion, loading: dolarLoading, refetch } = useDolar()

  const [categorias, setCategorias] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState(null) // null = todos
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [vista, setVista] = useState('grid')
  const [prodModal, setProdModal] = useState(null) // { producto } | null
  const [catModal, setCatModal] = useState(null) // { categoria } | null
  const [importOpen, setImportOpen] = useState(false)

  // Importa filas (ya mapeadas) de a una. Devuelve { exitosos, errores }.
  async function handleImport(filas, onProgress) {
    let exitosos = 0
    const errores = []
    for (let i = 0; i < filas.length; i++) {
      const { error: err } = await createProducto(filas[i].data)
      if (err) errores.push({ fila: filas[i].fila, motivo: err.message })
      else exitosos++
      onProgress(i + 1, filas.length)
    }
    await cargarProductos()
    await cargarCategorias()
    return { exitosos, errores }
  }

  async function cargarCategorias() {
    const { data } = await getCategorias()
    setCategorias(data ?? [])
  }

  async function cargarProductos() {
    setLoading(true)
    setError('')
    const { data, error: err } = await getProductos(categoriaActiva || undefined)
    if (err) setError('No se pudieron cargar los productos: ' + err.message)
    else setProductos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  useEffect(() => {
    cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaActiva])

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    return productos.filter((p) => {
      if (q && !(p.nombre ?? '').toLowerCase().includes(q)) return false
      if (soloActivos && !p.activo) return false
      return true
    })
  }, [productos, search, soloActivos])

  const nombreCategoriaActiva = categoriaActiva
    ? categorias.find((c) => c.id === categoriaActiva)?.nombre ?? 'Productos'
    : 'Todos los productos'

  async function handleDeleteProducto(p) {
    if (!(await confirmDialog(`¿Eliminar el producto "${p.nombre}"?`))) return
    const { error: err } = await deleteProducto(p.id)
    if (err) return setError('No se pudo eliminar: ' + err.message)
    cargarProductos()
    cargarCategorias()
  }

  async function handleDeleteCategoria(c) {
    if (!(await confirmDialog(`¿Eliminar la categoría "${c.nombre}"? Los productos quedarán sin categoría.`))) return
    const { error: err } = await deleteCategoria(c.id)
    if (err) return setError('No se pudo eliminar la categoría: ' + err.message)
    if (categoriaActiva === c.id) setCategoriaActiva(null)
    cargarCategorias()
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-hmc-white">Productos</h1>
          <p className="mt-1 text-sm text-hmc-muted">Catálogo HMC</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const { error: err } = await exportarEntidad('productos', 'Productos')
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
            onClick={() => setProdModal({ producto: null })}
            className="inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
          >
            <TbPlus size={18} />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Card dólar */}
      <div className="mb-5">
        <DolarCard cotizacion={cotizacion} loading={dolarLoading} onRefresh={refetch} />
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</p>
      )}

      <div className="flex gap-6">
        {/* Panel categorías */}
        <div className="sticky top-4 w-[240px] shrink-0 self-start rounded-lg border border-hmc-border bg-hmc-gray">
          <div className="flex items-center justify-between border-b border-hmc-border px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-hmc-muted">Categorías</span>
            <button type="button" onClick={() => setCatModal({ categoria: null })} className="text-hmc-muted hover:text-hmc-white" title="Nueva categoría">
              <TbPlus size={16} />
            </button>
          </div>

          <div className="flex flex-col p-2">
            <button
              type="button"
              onClick={() => setCategoriaActiva(null)}
              className={`flex items-center justify-between rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                categoriaActiva === null ? 'border-hmc-white bg-hmc-gray2 text-hmc-white' : 'border-transparent text-hmc-muted hover:text-hmc-white'
              }`}
            >
              Todos los productos
            </button>

            {categorias.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                  categoriaActiva === c.id ? 'border-hmc-white bg-hmc-gray2 text-hmc-white' : 'border-transparent text-hmc-muted hover:text-hmc-white'
                }`}
              >
                <button type="button" onClick={() => setCategoriaActiva(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="truncate">{c.nombre}</span>
                  <span className="rounded bg-hmc-gray3 px-1.5 py-0.5 text-[10px] text-hmc-muted">{c.productos?.[0]?.count ?? 0}</span>
                </button>
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <button type="button" onClick={() => setCatModal({ categoria: c })} className="rounded p-1 text-hmc-muted hover:text-hmc-white" title="Editar"><TbPencil size={13} /></button>
                  <button type="button" onClick={() => handleDeleteCategoria(c)} className="rounded p-1 text-hmc-muted hover:text-red-400" title="Eliminar"><TbTrash size={13} /></button>
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setCatModal({ categoria: null })} className="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-hmc-border px-3 py-2 text-xs text-hmc-muted hover:text-hmc-white">
              <TbPlus size={14} />
              Nueva categoría
            </button>
          </div>
        </div>

        {/* Contenido productos */}
        <div className="min-w-0 flex-1">
          {/* Encabezado de sección */}
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-hmc-white">{nombreCategoriaActiva}</h2>
              <p className="mt-0.5 text-xs text-hmc-muted">
                {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-md border border-hmc-border">
              <button type="button" onClick={() => setVista('grid')} className={`p-2 ${vista === 'grid' ? 'bg-hmc-white text-hmc-black' : 'text-hmc-muted hover:text-hmc-white'}`} title="Grilla"><TbLayoutGrid size={16} /></button>
              <button type="button" onClick={() => setVista('lista')} className={`p-2 ${vista === 'lista' ? 'bg-hmc-white text-hmc-black' : 'text-hmc-muted hover:text-hmc-white'}`} title="Lista"><TbList size={16} /></button>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <TbSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted" />
              <input type="text" placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-9 pr-3 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted" />
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-hmc-white">
              <button type="button" onClick={() => setSoloActivos((v) => !v)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${soloActivos ? 'bg-green-500' : 'bg-hmc-gray3'}`}>
                <span className={`absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-transform ${soloActivos ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              Solo activos
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-hmc-muted">Cargando…</p>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-hmc-border bg-hmc-gray2 px-6 py-16 text-center">
              <TbBike size={40} className="mb-3 text-hmc-muted" />
              <p className="text-sm text-hmc-muted">No hay productos en esta categoría</p>
              <button type="button" onClick={() => setProdModal({ producto: null })} className="mt-4 inline-flex items-center gap-2 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black hover:opacity-90">
                <TbPlus size={16} />
                Nuevo producto
              </button>
            </div>
          ) : vista === 'grid' ? (
            <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
              {filtrados.map((p) => (
                <ProductoCard key={p.id} p={p} cotizacion={cotizacion} onOpen={() => navigate(`/productos/${p.id}`)} onEdit={() => setProdModal({ producto: p })} onDelete={() => handleDeleteProducto(p)} />
              ))}
            </div>
          ) : (
            <ProductoTabla productos={filtrados} cotizacion={cotizacion} onOpen={(p) => navigate(`/productos/${p.id}`)} onEdit={(p) => setProdModal({ producto: p })} onDelete={handleDeleteProducto} />
          )}
        </div>
      </div>

      {prodModal && (
        <ProductoModal
          producto={prodModal.producto}
          cotizacion={cotizacion}
          onClose={() => setProdModal(null)}
          onSaved={() => {
            setProdModal(null)
            cargarProductos()
            cargarCategorias()
          }}
        />
      )}
      {catModal && (
        <CategoriaModal
          categoria={catModal.categoria}
          onClose={() => setCatModal(null)}
          onSaved={() => {
            setCatModal(null)
            cargarCategorias()
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          tipo="productos"
          categorias={categorias}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}

// Muestra la conversión a la otra moneda según la moneda del producto.
function ConversionTxt({ precio, moneda, cotizacion }) {
  const { usd, ars } = convertir(Number(precio), moneda, cotizacion)
  const otro =
    moneda === 'ARS'
      ? usd ? formatMonto(usd, 'USD') : 'USD —'
      : ars ? formatMonto(ars, 'ARS') : 'ARS —'
  return <span className="text-xs text-hmc-muted">≈ {otro}</span>
}

function ProductoCard({ p, cotizacion, onOpen, onEdit, onDelete }) {
  const color = p.categoria?.color ?? '#777777'
  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2 transition-all hover:border-[#555] active:scale-[0.99]"
    >
      <div className="relative flex aspect-video items-center justify-center" style={{ backgroundColor: `${color}22` }}>
        {p.foto_url ? <img src={p.foto_url} alt="" className="h-full w-full object-cover" /> : <TbBike size={36} style={{ color }} />}
        <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/60 group-hover:flex" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onEdit} className="rounded-md bg-hmc-gray2 p-2 text-hmc-white hover:bg-hmc-gray3" title="Editar"><TbPencil size={18} /></button>
          <button type="button" onClick={onDelete} className="rounded-md bg-hmc-gray2 p-2 text-hmc-white hover:text-red-400" title="Eliminar"><TbTrash size={18} /></button>
        </div>
      </div>
      <div className="p-4">
        {p.categoria && (
          <div className="mb-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${color}22`, color }}>{p.categoria.nombre}</span>
          </div>
        )}
        <p className="truncate text-sm font-medium text-hmc-white">{p.nombre}</p>
        {p.precio_usd != null && (
          <div className="mt-2">
            <p className="text-base font-semibold text-hmc-white">{formatMonto(p.precio_usd, p.moneda)}</p>
            <ConversionTxt precio={p.precio_usd} moneda={p.moneda} cotizacion={cotizacion} />
          </div>
        )}
        {variantesCount(p) > 0 && <p className="mt-2 text-xs text-hmc-muted">{variantesCount(p)} variantes</p>}
      </div>
    </div>
  )
}

function ProductoTabla({ productos, cotizacion, onOpen, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2">
      <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr_auto_auto] items-center gap-3 border-b border-hmc-border px-4 py-2.5 text-xs uppercase tracking-wide text-hmc-muted">
        <span />
        <span>Nombre</span>
        <span>Categoría</span>
        <span>Precio</span>
        <span>Conversión</span>
        <span className="text-center">Var.</span>
        <span className="text-right">Acciones</span>
      </div>
      {productos.map((p) => {
        const color = p.categoria?.color ?? '#777777'
        const conv = convertir(Number(p.precio_usd), p.moneda, cotizacion)
        const otro =
          p.moneda === 'ARS'
            ? conv.usd ? formatMonto(conv.usd, 'USD') : '—'
            : conv.ars ? formatMonto(conv.ars, 'ARS') : '—'
        return (
          <div key={p.id} onClick={() => onOpen(p)} className="grid cursor-pointer grid-cols-[48px_2fr_1fr_1fr_1fr_auto_auto] items-center gap-3 border-b border-hmc-border px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-hmc-gray3/60 active:scale-[0.99]">
            <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded" style={{ backgroundColor: `${color}22` }}>
              {p.foto_url ? <img src={p.foto_url} alt="" className="h-full w-full object-cover" /> : <TbBike size={16} style={{ color }} />}
            </div>
            <span className="truncate font-medium text-hmc-white">{p.nombre}</span>
            <span>{p.categoria ? <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${color}22`, color }}>{p.categoria.nombre}</span> : <span className="text-hmc-muted">—</span>}</span>
            <span className="text-hmc-white">{p.precio_usd != null ? formatMonto(p.precio_usd, p.moneda) : '—'}</span>
            <span className="text-hmc-muted">{p.precio_usd != null ? otro : '—'}</span>
            <span className="text-center text-hmc-muted">{variantesCount(p)}</span>
            <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => onEdit(p)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-hmc-white"><TbPencil size={16} /></button>
              <button type="button" onClick={() => onDelete(p)} className="rounded p-1.5 text-hmc-muted hover:bg-hmc-gray3 hover:text-red-400"><TbTrash size={16} /></button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
