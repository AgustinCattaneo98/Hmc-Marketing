import { useEffect, useRef, useState } from 'react'
import { TbX, TbCamera } from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { comprimirImagen } from '../lib/imagen'
import { getEmpresas } from '../lib/db'
import { iniciales } from '../lib/utils'
import { confirmDialog } from './confirm'

const EMPTY = {
  nombre: '',
  apellido: '',
  cargo: '',
  email: '',
  whatsapp: '',
  direccion: '',
  provincia: '',
  pais: 'Argentina',
  notas: '',
}

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

// Si `contacto` es null => creación.
// `empresaId` es el valor inicial del vínculo (puede ser null).
// `bloquearEmpresa` oculta el select y deja la empresa fija (uso desde el
// detalle de una empresa).
export default function ContactoModal({
  contacto,
  empresaId = null,
  bloquearEmpresa = false,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(EMPTY)
  const [empresaSel, setEmpresaSel] = useState(empresaId)
  const [empresas, setEmpresas] = useState([])
  const [fotoUrl, setFotoUrl] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // Carga de empresas para el select (solo si no está bloqueado).
  useEffect(() => {
    if (bloquearEmpresa) return
    getEmpresas().then(({ data }) => setEmpresas(data ?? []))
  }, [bloquearEmpresa])

  useEffect(() => {
    if (contacto) {
      setForm({
        nombre: contacto.nombre ?? '',
        apellido: contacto.apellido ?? '',
        cargo: contacto.cargo ?? '',
        email: contacto.email ?? '',
        whatsapp: contacto.whatsapp ?? '',
        direccion: contacto.direccion ?? '',
        provincia: contacto.provincia ?? '',
        pais: contacto.pais ?? 'Argentina',
        notas: contacto.notas ?? '',
      })
      setFotoUrl(contacto.foto_url ?? null)
      setEmpresaSel(contacto.empresa_id ?? null)
    } else {
      setForm(EMPTY)
      setFotoUrl(null)
      setEmpresaSel(empresaId)
    }
    setError('')
  }, [contacto, empresaId])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    const optim = await comprimirImagen(file)
    const ext = optim.name.split('.').pop()
    const path = `contactos/${contacto?.id ?? Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatares')
      .upload(path, optim, { upsert: true, contentType: optim.type })

    if (upErr) {
      setUploading(false)
      setError('No se pudo subir la foto: ' + upErr.message)
      return
    }

    const { data } = supabase.storage.from('avatares').getPublicUrl(path)
    // Cache-busting para que el <img> refresque al re-subir el mismo path.
    setFotoUrl(`${data.publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  async function handleBorrar() {
    const nombre = [contacto.nombre, contacto.apellido].filter(Boolean).join(' ')
    if (!(await confirmDialog(`¿Eliminar el contacto "${nombre}"? Esta acción no se puede deshacer.`))) return
    setSaving(true)
    const err = await onDelete()
    setSaving(false)
    if (err) setError(err)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    const normalize = (obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          k,
          typeof v === 'string' && v.trim() === '' ? null : v,
        ])
      )

    const payload = {
      ...normalize(form),
      empresa_id: empresaSel || null,
      foto_url: fotoUrl,
    }

    setSaving(true)
    const ok = await onSave(payload)
    setSaving(false)
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
            {contacto ? 'Editar contacto' : 'Nuevo contacto'}
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
          {/* Foto de contacto */}
          <div className="mb-5 flex items-center gap-4">
            <div className="relative">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt=""
                  className="h-16 w-16 rounded-full border border-hmc-border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-hmc-border bg-hmc-gray3 text-lg font-semibold text-hmc-white">
                  {iniciales(form.nombre, form.apellido)}
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-hmc-muted">
                Foto de contacto
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-60"
              >
                <TbCamera size={16} />
                {uploading ? 'Subiendo…' : 'Subir foto'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFoto}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
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

            <div>
              <label className={labelClass} htmlFor="apellido">
                Apellido
              </label>
              <input
                id="apellido"
                className={inputClass}
                value={form.apellido}
                onChange={(e) => update('apellido', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="cargo">
                Cargo
              </label>
              <input
                id="cargo"
                className={inputClass}
                value={form.cargo}
                onChange={(e) => update('cargo', e.target.value)}
              />
            </div>

            {!bloquearEmpresa && (
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="empresa">
                  Empresa
                </label>
                <select
                  id="empresa"
                  className={inputClass}
                  value={empresaSel ?? ''}
                  onChange={(e) => setEmpresaSel(e.target.value || null)}
                >
                  <option value="">Sin empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              <label className={labelClass} htmlFor="whatsapp">
                WhatsApp
              </label>
              <input
                id="whatsapp"
                className={inputClass}
                value={form.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="c_direccion">
                Dirección
              </label>
              <input
                id="c_direccion"
                className={inputClass}
                value={form.direccion}
                onChange={(e) => update('direccion', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="c_provincia">
                Provincia
              </label>
              <input
                id="c_provincia"
                className={inputClass}
                value={form.provincia}
                onChange={(e) => update('provincia', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="c_pais">
                País
              </label>
              <input
                id="c_pais"
                className={inputClass}
                value={form.pais}
                onChange={(e) => update('pais', e.target.value)}
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

          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {contacto && onDelete ? (
              <button
                type="button"
                onClick={handleBorrar}
                disabled={saving}
                className="rounded-md border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-60"
              >
                Borrar contacto
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
