import { useEffect, useState } from 'react'
import { TbX } from 'react-icons/tb'
import { getOportunidades, createActividadCRM, updateActividadCRM } from '../lib/db'
import { TIPOS_ACTIVIDAD, ESTADOS_ACTIVIDAD } from '../lib/campanas'

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'
const ALTA = '[ALTA] '

function toDateInput(d) {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(0, 10)
}
function toTimeInput(d) {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(11, 16)
}

// Props: actividad (null=crear), oportunidadId (preselección), onClose, onSaved
export default function ActividadCRMModal({ actividad, oportunidadId, onClose, onSaved }) {
  const descRaw = actividad?.descripcion ?? ''
  const esAlta = descRaw.startsWith(ALTA)

  const [form, setForm] = useState({
    titulo: actividad?.titulo ?? '',
    tipo: actividad?.tipo ?? 'tarea',
    oportunidad_id: actividad?.oportunidad_id ?? oportunidadId ?? '',
    descripcion: esAlta ? descRaw.slice(ALTA.length) : descRaw,
    estado: actividad?.estado ?? 'pendiente',
    fecha: actividad?.fecha_vencimiento ? toDateInput(new Date(actividad.fecha_vencimiento)) : '',
    hora: actividad?.fecha_vencimiento ? toTimeInput(new Date(actividad.fecha_vencimiento)) : '',
    prioridad: esAlta ? 'alta' : 'normal',
  })
  const [ops, setOps] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOportunidades().then(({ data }) => setOps(data ?? []))
  }, [])

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  function shortcut(dias) {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    setForm((prev) => ({ ...prev, fecha: toDateInput(d), hora: prev.hora || '09:00' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.titulo.trim()) return setError('El título es obligatorio.')

    let fecha_vencimiento = null
    if (form.fecha) fecha_vencimiento = new Date(`${form.fecha}T${form.hora || '09:00'}`).toISOString()

    const desc = form.descripcion.trim()
    const descripcion = form.prioridad === 'alta' ? `${ALTA}${desc}` : desc || null

    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      oportunidad_id: form.oportunidad_id || null,
      descripcion,
      estado: form.estado,
      fecha_vencimiento,
    }

    setSaving(true)
    const { error: err } = actividad
      ? await updateActividadCRM(actividad.id, payload)
      : await createActividadCRM(payload)
    setSaving(false)
    if (err) return setError('No se pudo guardar: ' + err.message)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">{actividad ? 'Editar actividad' : 'Nueva actividad'}</h2>
          <button type="button" onClick={onClose} className="text-hmc-muted hover:text-hmc-white"><TbX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Título *</label>
              <input className={inputClass} value={form.titulo} onChange={(e) => update('titulo', e.target.value)} autoFocus />
            </div>

            {/* Tipo: grid de cards */}
            <div>
              <label className={labelClass}>Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS_ACTIVIDAD.map((t) => {
                  const Icon = t.icon
                  const sel = form.tipo === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update('tipo', t.value)}
                      className={`flex flex-col items-center gap-1 rounded-md border-2 py-2 text-xs transition-colors ${sel ? 'border-hmc-white' : 'border-hmc-border hover:border-[#555]'}`}
                    >
                      <Icon size={18} style={{ color: t.color }} />
                      <span className="text-hmc-white">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Oportunidad</label>
              <select className={inputClass} value={form.oportunidad_id} onChange={(e) => update('oportunidad_id', e.target.value)}>
                <option value="">Sin oportunidad</option>
                {ops.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo}{o.empresa?.nombre ? ` · ${o.empresa.nombre}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Vencimiento</label>
              <div className="flex gap-2">
                <input type="date" className={inputClass} value={form.fecha} onChange={(e) => update('fecha', e.target.value)} />
                <input type="time" className="w-32 rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white" value={form.hora} onChange={(e) => update('hora', e.target.value)} />
              </div>
              <div className="mt-2 flex gap-2">
                {[{ l: 'Hoy', d: 0 }, { l: 'Mañana', d: 1 }, { l: 'En 1 semana', d: 7 }].map((s) => (
                  <button key={s.l} type="button" onClick={() => shortcut(s.d)} className="rounded-md border border-hmc-border px-2.5 py-1 text-xs text-hmc-muted hover:text-hmc-white">{s.l}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Estado</label>
                <select className={inputClass} value={form.estado} onChange={(e) => update('estado', e.target.value)}>
                  {ESTADOS_ACTIVIDAD.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Prioridad</label>
                <div className="flex gap-2">
                  {[{ k: 'normal', l: 'Normal' }, { k: 'alta', l: 'Alta' }].map((p) => (
                    <button key={p.k} type="button" onClick={() => update('prioridad', p.k)} className={`flex-1 rounded-md border px-2 py-2 text-xs transition-colors ${form.prioridad === p.k ? 'border-hmc-white text-hmc-white' : 'border-hmc-border text-hmc-muted hover:text-hmc-white'}`} style={form.prioridad === p.k && p.k === 'alta' ? { color: '#e24b4a', borderColor: '#e24b4a' } : {}}>{p.l}</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Descripción</label>
              <textarea rows={2} className={`${inputClass} resize-none`} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white hover:bg-hmc-gray3">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black hover:opacity-90 disabled:opacity-60">{saving ? 'Guardando…' : actividad ? 'Guardar cambios' : 'Crear actividad'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
