import { useEffect, useRef, useState } from 'react'
import { TbX, TbTrash, TbPhoto, TbFileText, TbPlus, TbBike } from 'react-icons/tb'
import {
  getCategorias,
  createProducto,
  updateProducto,
  createVariante,
  updateVariante,
  deleteVariante,
} from '../lib/db'
import { supabase } from '../lib/supabase'
import { comprimirImagen } from '../lib/imagen'
import { convertir, formatMonto } from '../lib/dolar'
import { MONEDAS } from '../lib/productos'
import CategoriaModal from './CategoriaModal'

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

const uid = () =>
  crypto.randomUUID?.() ?? `v_${Date.now()}_${Math.random().toString(36).slice(2)}`

const sanitizar = (n) => n.replace(/[^\w.\-]/g, '_')

export default function ProductoModal({ producto, cotizacion, onClose, onSaved }) {
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '',
    categoria_id: producto?.categoria_id ?? '',
    linea: producto?.linea ?? '',
    descripcion: producto?.descripcion ?? '',
    precio_usd: producto?.precio_usd ?? '',
    moneda: producto?.moneda ?? 'USD',
    activo: producto?.activo ?? true,
  })
  const [fotos, setFotos] = useState(() => {
    if (Array.isArray(producto?.fotos) && producto.fotos.length) return producto.fotos
    return producto?.foto_url ? [producto.foto_url] : []
  })
  const [pdfUrl, setPdfUrl] = useState(producto?.pdf_url ?? '')
  const [variantes, setVariantes] = useState(() =>
    (producto?.producto_variantes ?? []).map((v) => ({
      _uid: uid(),
      id: v.id,
      nombre: v.nombre ?? '',
      precio_usd: v.precio_usd ?? '',
    }))
  )
  const [eliminados, setEliminados] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [subiendo, setSubiendo] = useState('')
  const [catModal, setCatModal] = useState(false)

  const fotoRef = useRef(null)
  const pdfRef = useRef(null)

  async function cargarCategorias() {
    const { data } = await getCategorias()
    setCategorias(data ?? [])
  }
  useEffect(() => {
    cargarCategorias()
  }, [])

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  // Texto de conversión a la otra moneda según la moneda del producto.
  function conversionTexto(valor) {
    const { usd, ars } = convertir(valor, form.moneda, cotizacion)
    if (form.moneda === 'ARS') return usd ? `≈ ${formatMonto(usd, 'USD')}` : '≈ USD —'
    return ars ? `≈ ${formatMonto(ars, 'ARS')}` : '≈ ARS —'
  }

  async function subir(file, carpeta, contentType) {
    const f = await comprimirImagen(file)
    const path = `${carpeta}/${Date.now()}_${sanitizar(f.name)}`
    const { error: upErr } = await supabase.storage
      .from('productos')
      .upload(path, f, { upsert: true, contentType: contentType || f.type })
    if (upErr) throw upErr
    return supabase.storage.from('productos').getPublicUrl(path).data.publicUrl
  }

  async function handleFotos(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    setError('')
    setSubiendo('foto')
    try {
      const nuevas = []
      for (const file of files) {
        nuevas.push(`${await subir(file, 'productos')}?t=${Date.now()}`)
      }
      setFotos((prev) => [...prev, ...nuevas])
    } catch (e) {
      setError('No se pudo subir la foto: ' + e.message)
    }
    setSubiendo('')
  }

  function quitarFoto(url) {
    setFotos((prev) => prev.filter((f) => f !== url))
  }

  async function handlePdf(file) {
    if (!file) return
    setError('')
    setSubiendo('pdf')
    try {
      setPdfUrl(await subir(file, 'pdfs', 'application/pdf'))
    } catch (e) {
      setError('No se pudo subir el PDF: ' + e.message)
    }
    setSubiendo('')
  }

  function addVariante() {
    setVariantes((prev) => [...prev, { _uid: uid(), id: null, nombre: '', precio_usd: '' }])
  }
  function updateVar(_uid, campo, valor) {
    setVariantes((prev) => prev.map((v) => (v._uid === _uid ? { ...v, [campo]: valor } : v)))
  }
  function removeVar(_uid) {
    setVariantes((prev) => {
      const v = prev.find((x) => x._uid === _uid)
      if (v?.id) setEliminados((e) => [...e, v.id])
      return prev.filter((x) => x._uid !== _uid)
    })
  }

  async function handleSave() {
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')

    const payload = {
      nombre: form.nombre.trim(),
      categoria_id: form.categoria_id || null,
      linea: form.linea.trim() || null,
      descripcion: form.descripcion.trim() || null,
      precio_usd: form.precio_usd === '' ? null : Number(form.precio_usd),
      moneda: form.moneda,
      activo: form.activo,
      fotos,
      foto_url: fotos[0] || null, // portada
      pdf_url: pdfUrl || null,
    }

    setSaving(true)
    try {
      let productoId = producto?.id
      if (producto) {
        const { error: err } = await updateProducto(producto.id, payload)
        if (err) throw err
      } else {
        const { data, error: err } = await createProducto(payload)
        if (err) throw err
        productoId = data.id
      }

      for (const idVar of eliminados) await deleteVariante(idVar)
      for (const v of variantes) {
        if (!v.nombre.trim()) continue
        const vp = {
          producto_id: productoId,
          nombre: v.nombre.trim(),
          precio_usd: v.precio_usd === '' ? null : Number(v.precio_usd),
        }
        if (v.id) await updateVariante(v.id, vp)
        else await createVariante(vp)
      }

      onSaved()
    } catch (e) {
      setError('No se pudo guardar: ' + e.message)
    }
    setSaving(false)
  }

  const cat = categorias.find((c) => c.id === form.categoria_id)
  const variantesValidas = variantes.filter((v) => v.nombre.trim()).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white/[0.07] backdrop-blur-md ring-1 ring-white/15 shadow-xl shadow-black/40" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white" aria-label="Cerrar"><TbX size={20} /></button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Formulario */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <h3 className="mb-3 text-xs uppercase tracking-wide text-hmc-muted">Información</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Nombre *</label>
                <input className={inputClass} value={form.nombre} onChange={(e) => update('nombre', e.target.value)} autoFocus />
              </div>
              <div>
                <label className={labelClass}>Categoría</label>
                <select
                  className={inputClass}
                  value={form.categoria_id}
                  onChange={(e) => {
                    if (e.target.value === '__nueva__') setCatModal(true)
                    else update('categoria_id', e.target.value)
                  }}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                  <option value="__nueva__">+ Crear categoría</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Línea</label>
                <input className={inputClass} value={form.linea} onChange={(e) => update('linea', e.target.value)} placeholder="ej: Urban, Pro…" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Descripción</label>
                <textarea rows={3} className={`${inputClass} resize-none`} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Precio</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" className={inputClass} value={form.precio_usd} onChange={(e) => update('precio_usd', e.target.value)} placeholder="0.00" />
                  <select className="w-24 rounded-md border border-hmc-border bg-hmc-gray2 px-2 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white" value={form.moneda} onChange={(e) => update('moneda', e.target.value)}>
                    {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {form.precio_usd !== '' && (
                  <p className="mt-1 text-xs text-hmc-muted">
                    {conversionTexto(form.precio_usd)}
                    {cotizacion ? ` al dólar blue de hoy ($${cotizacion.venta})` : ' (sin cotización)'}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-hmc-white">
                  <button type="button" onClick={() => update('activo', !form.activo)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-hmc-gray3'}`}>
                    <span className={`absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-transform ${form.activo ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  Activo
                </label>
              </div>
            </div>

            {/* Fotos */}
            <h3 className="mb-3 mt-6 text-xs uppercase tracking-wide text-hmc-muted">
              Fotos {fotos.length > 0 && <span className="text-hmc-muted">({fotos.length})</span>}
            </h3>
            {fotos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {fotos.map((url, i) => (
                  <div key={url} className="group relative h-[80px] w-[80px]">
                    <img src={url} alt="" className="h-full w-full rounded-md border border-hmc-border object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-hmc-white">Portada</span>
                    )}
                    <button
                      type="button"
                      onClick={() => quitarFoto(url)}
                      className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-hmc-gray2 p-0.5 text-hmc-muted hover:text-red-400 group-hover:block"
                      title="Quitar"
                    >
                      <TbX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fotoRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-hmc-border py-6 text-hmc-muted hover:text-hmc-white"
            >
              <TbPhoto size={24} />
              <span className="text-xs">{subiendo === 'foto' ? 'Subiendo…' : 'Click para subir (podés elegir varias)'}</span>
            </button>
            <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFotos(e.target.files)} />

            {/* PDF */}
            <h3 className="mb-3 mt-6 text-xs uppercase tracking-wide text-hmc-muted">PDF</h3>
            {pdfUrl ? (
              <div className="flex items-center gap-3 rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2">
                <TbFileText size={18} className="text-hmc-muted" />
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-[#7fb8e8] hover:underline">Ver</a>
                <button type="button" onClick={() => setPdfUrl('')} className="text-hmc-muted hover:text-red-400"><TbTrash size={16} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => pdfRef.current?.click()} className="rounded-md border border-hmc-border px-3 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">{subiendo === 'pdf' ? 'Subiendo…' : 'Subir PDF'}</button>
            )}
            <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handlePdf(e.target.files?.[0])} />

            {/* Variantes */}
            <h3 className="mb-3 mt-6 text-xs uppercase tracking-wide text-hmc-muted">Variantes / upgrades</h3>
            <div className="flex flex-col gap-2">
              {variantes.map((v) => (
                <div key={v._uid} className="rounded-md border border-hmc-border bg-hmc-gray2 p-2.5">
                  <div className="flex items-center gap-2">
                    <input className={inputClass} placeholder="Nombre" value={v.nombre} onChange={(e) => updateVar(v._uid, 'nombre', e.target.value)} />
                    <input type="number" step="0.01" className="w-28 rounded-md border border-hmc-border bg-hmc-gray2 px-2 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white" placeholder={form.moneda} value={v.precio_usd} onChange={(e) => updateVar(v._uid, 'precio_usd', e.target.value)} />
                    <button type="button" onClick={() => removeVar(v._uid)} className="rounded p-1.5 text-hmc-muted hover:text-red-400"><TbTrash size={16} /></button>
                  </div>
                  {v.precio_usd !== '' && (
                    <p className="mt-1 pl-1 text-xs text-hmc-muted">{conversionTexto(v.precio_usd)}</p>
                  )}
                </div>
              ))}
              <button type="button" onClick={addVariante} className="inline-flex items-center gap-2 self-start rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white hover:bg-hmc-gray3">
                <TbPlus size={16} />
                Agregar variante
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          </div>

          {/* Preview */}
          <div className="hidden w-[230px] shrink-0 border-l border-hmc-border p-4 sm:block">
            <p className="mb-3 text-xs uppercase tracking-wide text-hmc-muted">Preview</p>
            <div className="overflow-hidden rounded-lg border border-hmc-border bg-hmc-black">
              <div className="flex aspect-video items-center justify-center" style={{ backgroundColor: cat ? `${cat.color}22` : '#2a2a2a' }}>
                {fotos[0] ? <img src={fotos[0]} alt="" className="h-full w-full object-cover" /> : <TbBike size={32} style={{ color: cat?.color ?? '#777' }} />}
              </div>
              <div className="p-3">
                {cat && (
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>{cat.nombre}</span>
                )}
                <p className="mt-1.5 text-sm font-medium text-hmc-white">{form.nombre || 'Nombre del producto'}</p>
                {form.precio_usd !== '' && (
                  <>
                    <p className="mt-1 text-sm font-semibold text-hmc-white">{formatMonto(Number(form.precio_usd), form.moneda)}</p>
                    <p className="text-xs text-hmc-muted">{conversionTexto(form.precio_usd)}</p>
                  </>
                )}
                {variantesValidas > 0 && <p className="mt-1 text-xs text-hmc-muted">{variantesValidas} variantes</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-hmc-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>

      {catModal && (
        <CategoriaModal
          categoria={null}
          onClose={() => setCatModal(false)}
          onSaved={async (nueva) => {
            setCatModal(false)
            await cargarCategorias()
            if (nueva?.id) update('categoria_id', nueva.id)
          }}
        />
      )}
    </div>
  )
}
