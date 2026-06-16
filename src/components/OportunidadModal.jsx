import { useEffect, useMemo, useState } from 'react'
import { TbX } from 'react-icons/tb'
import { getEmpresas, getContactos, getCampanas } from '../lib/db'
import { ETAPAS, PRIORIDADES, COLORES_CARD, MONEDAS } from '../lib/crm'

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

const VACIO = {
  titulo: '',
  descripcion: '',
  etapa: 'oportunidad',
  valor_estimado: '',
  moneda: 'ARS',
  probabilidad: 0,
  prioridad: 'media',
  fecha_cierre_estimada: '',
  empresa_id: '',
  contacto_id: '',
  campana_id: '',
  color: '#7fb8e8',
  notas: '',
}

// Props:
// - oportunidad: objeto a editar o null para crear
// - etapaInicial: etapa preseleccionada al crear desde una columna
// - valoresIniciales: campos para precargar al crear (ej. desde Productos)
// - onClose, onSave(payload) => string error | null
export default function OportunidadModal({
  oportunidad,
  etapaInicial,
  valoresIniciales,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    ...VACIO,
    ...(etapaInicial ? { etapa: etapaInicial } : {}),
    ...(valoresIniciales ?? {}),
  }))
  const [empresas, setEmpresas] = useState([])
  const [contactos, setContactos] = useState([])
  const [campanas, setCampanas] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getEmpresas().then(({ data }) => setEmpresas(data ?? []))
    getContactos().then(({ data }) => setContactos(data ?? []))
    getCampanas().then(({ data }) => setCampanas(data ?? []))
  }, [])

  useEffect(() => {
    if (oportunidad) {
      setForm({
        titulo: oportunidad.titulo ?? '',
        descripcion: oportunidad.descripcion ?? '',
        etapa: oportunidad.etapa ?? 'oportunidad',
        valor_estimado: oportunidad.valor_estimado ?? '',
        moneda: oportunidad.moneda ?? 'ARS',
        probabilidad: oportunidad.probabilidad ?? 0,
        prioridad: oportunidad.prioridad ?? 'media',
        fecha_cierre_estimada: oportunidad.fecha_cierre_estimada ?? '',
        empresa_id: oportunidad.empresa_id ?? '',
        contacto_id: oportunidad.contacto_id ?? '',
        campana_id: oportunidad.campana_id ?? '',
        color: oportunidad.color ?? '#7fb8e8',
        notas: oportunidad.notas ?? '',
      })
    }
  }, [oportunidad])

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  // Contactos filtrados por empresa elegida (o todos si no hay empresa).
  const contactosFiltrados = useMemo(() => {
    if (!form.empresa_id) return contactos
    return contactos.filter((c) => c.empresa_id === form.empresa_id)
  }, [contactos, form.empresa_id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.titulo.trim()) return setError('El título es obligatorio.')

    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      etapa: form.etapa,
      valor_estimado: form.valor_estimado === '' ? null : Number(form.valor_estimado),
      moneda: form.moneda,
      probabilidad: Number(form.probabilidad),
      prioridad: form.prioridad,
      fecha_cierre_estimada: form.fecha_cierre_estimada || null,
      empresa_id: form.empresa_id || null,
      contacto_id: form.contacto_id || null,
      campana_id: form.campana_id || null,
      color: form.color,
      notas: form.notas.trim() || null,
    }

    setSaving(true)
    const err = await onSave(payload)
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">
            {oportunidad ? 'Editar oportunidad' : 'Nueva oportunidad'}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Título *</label>
              <input
                className={inputClass}
                value={form.titulo}
                onChange={(e) => update('titulo', e.target.value)}
                autoFocus
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Descripción</label>
              <textarea
                rows={2}
                className={`${inputClass} resize-none`}
                value={form.descripcion}
                onChange={(e) => update('descripcion', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Etapa</label>
              <select
                className={inputClass}
                value={form.etapa}
                onChange={(e) => update('etapa', e.target.value)}
              >
                {ETAPAS.map((et) => (
                  <option key={et.key} value={et.key}>
                    {et.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Prioridad</label>
              <div className="flex gap-2">
                {Object.entries(PRIORIDADES).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update('prioridad', key)}
                    className={`flex-1 rounded-md border px-2 py-2 text-xs transition-colors ${
                      form.prioridad === key
                        ? 'border-hmc-white text-hmc-white'
                        : 'border-hmc-border text-hmc-muted hover:text-hmc-white'
                    }`}
                    style={form.prioridad === key ? { color: p.color } : {}}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Valor estimado</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className={inputClass}
                  value={form.valor_estimado}
                  onChange={(e) => update('valor_estimado', e.target.value)}
                  placeholder="0"
                />
                <select
                  className="w-24 rounded-md border border-hmc-border bg-hmc-gray2 px-2 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white"
                  value={form.moneda}
                  onChange={(e) => update('moneda', e.target.value)}
                >
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Fecha cierre estimada</label>
              <input
                type="date"
                className={inputClass}
                value={form.fecha_cierre_estimada}
                onChange={(e) => update('fecha_cierre_estimada', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                Probabilidad: {form.probabilidad}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.probabilidad}
                onChange={(e) => update('probabilidad', e.target.value)}
                className="w-full accent-hmc-white"
              />
            </div>

            <div>
              <label className={labelClass}>Empresa</label>
              <select
                className={inputClass}
                value={form.empresa_id}
                onChange={(e) => {
                  update('empresa_id', e.target.value)
                  update('contacto_id', '')
                }}
              >
                <option value="">Sin empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Contacto</label>
              <select
                className={inputClass}
                value={form.contacto_id}
                onChange={(e) => update('contacto_id', e.target.value)}
              >
                <option value="">Sin contacto</option>
                {contactosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Campaña</label>
              <select
                className={inputClass}
                value={form.campana_id}
                onChange={(e) => update('campana_id', e.target.value)}
              >
                <option value="">Sin campaña</option>
                {campanas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Color de card</label>
              <div className="flex gap-2">
                {COLORES_CARD.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update('color', c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.color === c ? 'border-hmc-white' : 'border-hmc-border'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Notas</label>
              <textarea
                rows={2}
                className={`${inputClass} resize-none`}
                value={form.notas}
                onChange={(e) => update('notas', e.target.value)}
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
