import { useState } from 'react'
import { TbX } from 'react-icons/tb'
import { createCategoria, updateCategoria } from '../lib/db'
import { COLORES_CATEGORIA } from '../lib/productos'

const inputClass =
  'w-full glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

// Props: categoria (objeto a editar o null), onClose, onSaved(categoria)
export default function CategoriaModal({ categoria, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: categoria?.nombre ?? '',
    descripcion: categoria?.descripcion ?? '',
    color: categoria?.color ?? '#7fb8e8',
    orden: categoria?.orden ?? 0,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      color: form.color,
      orden: Number(form.orden) || 0,
    }

    setSaving(true)
    const { data, error: err } = categoria
      ? await updateCategoria(categoria.id, payload)
      : await createCategoria(payload)
    setSaving(false)
    if (err) return setError('No se pudo guardar: ' + err.message)
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md glass-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">
            {categoria ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white" aria-label="Cerrar">
            <TbX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input className={inputClass} value={form.nombre} onChange={(e) => update('nombre', e.target.value)} autoFocus />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <input className={inputClass} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <div className="flex items-center gap-2">
                {COLORES_CATEGORIA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update('color', c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-hmc-white' : 'border-hmc-border'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input type="color" value={form.color} onChange={(e) => update('color', e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-hmc-border bg-transparent" title="Color personalizado" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Orden</label>
              <input type="number" className={inputClass} value={form.orden} onChange={(e) => update('orden', e.target.value)} />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
