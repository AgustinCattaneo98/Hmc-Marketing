import { useState } from 'react'
import { TbX } from 'react-icons/tb'
import { TIPOS_ACTIVIDAD, ESTADOS_ACTIVIDAD, nombreCliente } from '../lib/campanas'

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

// Convierte ISO <-> valor de <input type="datetime-local"> (hora local).
function isoToLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(0, 16)
}
function localToIso(local) {
  return local ? new Date(local).toISOString() : null
}

// Props:
// - actividad: objeto a editar, o null para crear
// - campanaId
// - clienteIdFijo: si viene, el cliente queda fijo (creación desde su panel)
// - clientes: lista de clientes de la campaña (para el select global)
// - onClose, onSave(payload) => string error | null
export default function ActividadModal({
  actividad,
  campanaId,
  clienteIdFijo,
  clientes = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    titulo: actividad?.titulo ?? '',
    tipo: actividad?.tipo ?? 'tarea',
    descripcion: actividad?.descripcion ?? '',
    estado: actividad?.estado ?? 'pendiente',
    fecha: isoToLocal(actividad?.fecha_vencimiento),
    campana_cliente_id:
      actividad?.campana_cliente_id ?? clienteIdFijo ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mostrarSelectCliente = !clienteIdFijo && !actividad

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.titulo.trim()) return setError('El título es obligatorio.')

    const payload = {
      campana_id: campanaId,
      campana_cliente_id: form.campana_cliente_id || null,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      estado: form.estado,
      fecha_vencimiento: localToIso(form.fecha),
    }

    setSaving(true)
    const err = await onSave(payload)
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">
            {actividad ? 'Editar actividad' : 'Nueva actividad'}
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

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Título *</label>
              <input
                className={inputClass}
                value={form.titulo}
                onChange={(e) => update('titulo', e.target.value)}
                autoFocus
              />
            </div>

            {mostrarSelectCliente && (
              <div>
                <label className={labelClass}>Cliente</label>
                <select
                  className={inputClass}
                  value={form.campana_cliente_id}
                  onChange={(e) => update('campana_cliente_id', e.target.value)}
                >
                  <option value="">Sin cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {nombreCliente(c)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  className={inputClass}
                  value={form.tipo}
                  onChange={(e) => update('tipo', e.target.value)}
                >
                  {TIPOS_ACTIVIDAD.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  className={inputClass}
                  value={form.estado}
                  onChange={(e) => update('estado', e.target.value)}
                >
                  {ESTADOS_ACTIVIDAD.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Vencimiento</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.fecha}
                onChange={(e) => update('fecha', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                value={form.descripcion}
                onChange={(e) => update('descripcion', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
