import { useEffect, useState } from 'react'
import { TbX } from 'react-icons/tb'
import { getEmpresaSegmentos } from '../lib/db'
import SegmentosInput from './SegmentosInput'
import { confirmDialog } from './confirm'

const EMPTY = {
  nombre: '',
  ciudad: 'Córdoba',
  direccion: '',
  provincia: '',
  pais: 'Argentina',
  email: '',
  telefono: '',
  sitio_web: '',
  instagram: '',
  notas: '',
}

const EMPTY_CONTACTO = {
  nombre: '',
  apellido: '',
  cargo: '',
  email: '',
  whatsapp: '',
}

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

// Si `empresa` es null => creación. Si trae datos => edición.
// `onDelete` (opcional) => función async que borra y devuelve error|null.
export default function EmpresaModal({ empresa, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY)
  const [segmentos, setSegmentos] = useState([])
  const [contacto, setContacto] = useState(EMPTY_CONTACTO)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleBorrar() {
    if (!(await confirmDialog(`¿Eliminar la empresa "${empresa.nombre}"? Esta acción no se puede deshacer.`))) return
    setSaving(true)
    const err = await onDelete()
    setSaving(false)
    if (err) setError(err)
  }

  useEffect(() => {
    if (empresa) {
      setForm({
        nombre: empresa.nombre ?? '',
        ciudad: empresa.ciudad ?? 'Córdoba',
        direccion: empresa.direccion ?? '',
        provincia: empresa.provincia ?? '',
        pais: empresa.pais ?? 'Argentina',
        email: empresa.email ?? '',
        telefono: empresa.telefono ?? '',
        sitio_web: empresa.sitio_web ?? '',
        instagram: empresa.instagram ?? '',
        notas: empresa.notas ?? '',
      })
      // Carga los segmentos actuales de la empresa.
      getEmpresaSegmentos(empresa.id)
        .then((segs) => setSegmentos(segs ?? []))
        .catch(() => setSegmentos([]))
    } else {
      setForm(EMPTY)
      setSegmentos([])
    }
    setContacto(EMPTY_CONTACTO)
    setError('')
  }, [empresa])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateContacto(field, value) {
    setContacto((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    // Normaliza strings vacíos a null para no guardar "".
    const normalize = (obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          k,
          typeof v === 'string' && v.trim() === '' ? null : v,
        ])
      )

    const empresaPayload = normalize(form)

    // El contacto solo se incluye si tiene nombre.
    const contactoPayload = contacto.nombre.trim()
      ? normalize(contacto)
      : null

    setSaving(true)
    const ok = await onSave({
      empresa: empresaPayload,
      contacto: contactoPayload,
      segmentos: segmentos.map((s) => s.id),
    })
    setSaving(false)

    // onSave devuelve un mensaje de error si falló, o null/undefined si OK.
    if (ok) setError(ok)
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
            {empresa ? 'Editar empresa' : 'Nueva empresa'}
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
              <label className={labelClass} htmlFor="nombre">
                Nombre *
              </label>
              <input
                id="nombre"
                className={inputClass}
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                autoFocus
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Segmentos</label>
              <SegmentosInput value={segmentos} onChange={setSegmentos} />
            </div>

            <div>
              <label className={labelClass} htmlFor="ciudad">
                Ciudad
              </label>
              <input
                id="ciudad"
                className={inputClass}
                value={form.ciudad}
                onChange={(e) => update('ciudad', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="direccion">
                Dirección
              </label>
              <input
                id="direccion"
                className={inputClass}
                value={form.direccion}
                onChange={(e) => update('direccion', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="provincia">
                Provincia
              </label>
              <input
                id="provincia"
                className={inputClass}
                value={form.provincia}
                onChange={(e) => update('provincia', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pais">
                País
              </label>
              <input
                id="pais"
                className={inputClass}
                value={form.pais}
                onChange={(e) => update('pais', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="telefono">
                Teléfono
              </label>
              <input
                id="telefono"
                className={inputClass}
                value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="sitio_web">
                Sitio web
              </label>
              <input
                id="sitio_web"
                className={inputClass}
                placeholder="https://"
                value={form.sitio_web}
                onChange={(e) => update('sitio_web', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="instagram">
                Instagram
              </label>
              <input
                id="instagram"
                className={inputClass}
                placeholder="@usuario"
                value={form.instagram}
                onChange={(e) => update('instagram', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="notas">
                Notas
              </label>
              <textarea
                id="notas"
                rows={3}
                className={`${inputClass} resize-none`}
                value={form.notas}
                onChange={(e) => update('notas', e.target.value)}
              />
            </div>
          </div>

          {/* Sección de contacto principal (opcional) */}
          <div className="mt-6 border-t border-hmc-border pt-5">
            <h3 className="mb-4 text-sm font-medium text-hmc-white">
              Contacto principal{' '}
              <span className="font-normal text-hmc-muted">(opcional)</span>
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="c_nombre">
                  Nombre
                </label>
                <input
                  id="c_nombre"
                  className={inputClass}
                  value={contacto.nombre}
                  onChange={(e) => updateContacto('nombre', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="c_apellido">
                  Apellido
                </label>
                <input
                  id="c_apellido"
                  className={inputClass}
                  value={contacto.apellido}
                  onChange={(e) => updateContacto('apellido', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="c_cargo">
                  Cargo
                </label>
                <input
                  id="c_cargo"
                  className={inputClass}
                  value={contacto.cargo}
                  onChange={(e) => updateContacto('cargo', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="c_email">
                  Email
                </label>
                <input
                  id="c_email"
                  type="email"
                  className={inputClass}
                  value={contacto.email}
                  onChange={(e) => updateContacto('email', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="c_whatsapp">
                  WhatsApp
                </label>
                <input
                  id="c_whatsapp"
                  className={inputClass}
                  value={contacto.whatsapp}
                  onChange={(e) => updateContacto('whatsapp', e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {empresa && onDelete ? (
              <button
                type="button"
                onClick={handleBorrar}
                disabled={saving}
                className="rounded-md border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-60"
              >
                Borrar empresa
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
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
                className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
