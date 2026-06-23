import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  TbArrowLeft,
  TbPencil,
  TbTrash,
  TbPlus,
  TbCamera,
  TbMail,
  TbBrandWhatsapp,
  TbUsers,
} from 'react-icons/tb'
import {
  getEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getContactosByEmpresa,
  createContacto,
  updateContacto,
  deleteContacto,
} from '../lib/db'
import { supabase } from '../lib/supabase'
import { iniciales, limpiarWhatsapp } from '../lib/utils'
import { SegmentoPills } from '../components/SegmentoPill'
import EmpresaModal from '../components/EmpresaModal'
import ContactoModal from '../components/ContactoModal'
import { confirmDialog } from '../components/confirm'

const labelClass = 'text-xs uppercase tracking-wide text-hmc-muted'

export default function EmpresaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [empresa, setEmpresa] = useState(null)
  const [contactos, setContactos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const [empresaModal, setEmpresaModal] = useState(false)
  const [contactoModal, setContactoModal] = useState(false)
  const [editingContacto, setEditingContacto] = useState(null)

  const logoRef = useRef(null)

  async function load() {
    setLoading(true)
    setError('')
    const [{ data: emp, error: empErr }, { data: cont, error: contErr }] =
      await Promise.all([getEmpresa(id), getContactosByEmpresa(id)])

    if (empErr) {
      setError('No se pudo cargar la empresa: ' + empErr.message)
    } else {
      setEmpresa(emp)
      setContactos(contErr ? [] : cont ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `empresas/${empresa.id}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setUploading(false)
      setError('No se pudo subir el logo: ' + upErr.message)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    const logoUrl = `${data.publicUrl}?t=${Date.now()}`

    const { error: updErr } = await updateEmpresa(empresa.id, {
      logo_url: logoUrl,
    })
    setUploading(false)
    if (updErr) {
      setError('No se pudo guardar el logo: ' + updErr.message)
      return
    }
    setEmpresa((prev) => ({ ...prev, logo_url: logoUrl }))
  }

  // EmpresaModal: recibe { empresa, contacto }.
  async function handleEmpresaSave(payload) {
    const { error: err } = await updateEmpresa(empresa.id, payload.empresa)
    if (err) return 'No se pudo guardar: ' + err.message

    if (payload.contacto) {
      const { error: cErr } = await createContacto({
        ...payload.contacto,
        empresa_id: empresa.id,
      })
      if (cErr) return 'Empresa guardada, pero falló el contacto: ' + cErr.message
    }

    setEmpresaModal(false)
    await load()
    return null
  }

  // ContactoModal: payload ya incluye empresa_id y foto_url.
  async function handleContactoSave(payload) {
    const action = editingContacto
      ? updateContacto(editingContacto.id, payload)
      : createContacto(payload)
    const { error: err } = await action
    if (err) return 'No se pudo guardar el contacto: ' + err.message

    setContactoModal(false)
    setEditingContacto(null)
    await load()
    return null
  }

  async function handleDeleteContacto(contacto) {
    const nombre = [contacto.nombre, contacto.apellido].filter(Boolean).join(' ')
    if (!(await confirmDialog(`¿Eliminar el contacto "${nombre}"?`))) return
    const { error: err } = await deleteContacto(contacto.id)
    if (err) {
      setError('No se pudo eliminar el contacto: ' + err.message)
      return
    }
    await load()
  }

  function openCreateContacto() {
    setEditingContacto(null)
    setContactoModal(true)
  }

  function openEditContacto(contacto) {
    setEditingContacto(contacto)
    setContactoModal(true)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hmc-border border-t-hmc-white" />
      </div>
    )
  }

  if (error && !empresa) {
    return (
      <div>
        <BackButton onClick={() => navigate('/empresas')} />
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      </div>
    )
  }

  if (!empresa) return null

  const campos = [
    { label: 'Ciudad', value: empresa.ciudad },
    { label: 'Dirección', value: empresa.direccion },
    { label: 'Provincia', value: empresa.provincia },
    { label: 'País', value: empresa.pais },
    { label: 'Email', value: empresa.email },
    { label: 'Teléfono', value: empresa.telefono },
    { label: 'Sitio web', value: empresa.sitio_web },
    { label: 'Instagram', value: empresa.instagram },
    { label: 'Notas', value: empresa.notas },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <BackButton onClick={() => navigate('/empresas')} />

      {error && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start gap-5">
        <div className="relative shrink-0">
          {empresa.logo_url ? (
            <img
              src={empresa.logo_url}
              alt=""
              className="h-20 w-20 rounded-full border border-hmc-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-hmc-border bg-hmc-gray3 text-2xl font-semibold text-hmc-white">
              {iniciales(empresa.nombre)}
            </div>
          )}
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 rounded-full border border-hmc-border bg-hmc-gray2 p-1.5 text-hmc-muted transition-colors hover:text-hmc-white disabled:opacity-60"
            title="Subir logo"
            aria-label="Subir logo"
          >
            <TbCamera size={15} />
          </button>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogo}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-hmc-white">
                {empresa.nombre}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <SegmentoPills segmentos={empresa.segmentos} max={0} />
                {uploading && (
                  <span className="text-xs text-hmc-muted">Subiendo logo…</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmpresaModal(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
            >
              <TbPencil size={16} />
              Editar empresa
            </button>
          </div>
        </div>
      </div>

      {/* Información */}
      <section className="mb-8 rounded-lg border border-hmc-border bg-hmc-gray2 p-6">
        <h2 className="mb-4 text-sm uppercase tracking-wide text-hmc-muted">
          Información
        </h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {campos.map((c) => (
            <div key={c.label}>
              <p className={labelClass}>{c.label}</p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-hmc-white">
                {c.value || '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contactos */}
      <section className="rounded-lg border border-hmc-border bg-hmc-gray2 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide text-hmc-muted">
            Contactos
          </h2>
          <button
            type="button"
            onClick={openCreateContacto}
            className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
          >
            <TbPlus size={16} />
            Agregar contacto
          </button>
        </div>

        {contactos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TbUsers size={32} className="mb-2 text-hmc-muted" />
            <p className="text-sm text-hmc-muted">
              Esta empresa todavía no tiene contactos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {contactos.map((c) => (
              <div
                key={c.id}
                onClick={() => openEditContacto(c)}
                className="flex cursor-pointer items-center gap-4 rounded-md border border-hmc-border bg-hmc-gray p-3 transition-colors hover:bg-hmc-gray3/40 active:scale-[0.99]"
              >
                {c.foto_url ? (
                  <img
                    src={c.foto_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-hmc-border object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hmc-border bg-hmc-gray3 text-sm font-semibold text-hmc-white">
                    {iniciales(c.nombre, c.apellido)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-hmc-white">
                    {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                  </p>
                  {c.cargo && (
                    <p className="truncate text-xs text-hmc-muted">{c.cargo}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-hmc-muted" onClick={(e) => e.stopPropagation()}>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-hmc-white"
                        title="Enviar email"
                      >
                        <TbMail size={14} />
                        {c.email}
                      </a>
                    )}
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${limpiarWhatsapp(c.whatsapp)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-[#25d366]"
                        title="Escribir por WhatsApp"
                      >
                        <TbBrandWhatsapp size={14} />
                        {c.whatsapp}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openEditContacto(c)}
                    className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white"
                    aria-label="Editar contacto"
                    title="Editar"
                  >
                    <TbPencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteContacto(c)}
                    className="rounded p-1.5 text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-red-400"
                    aria-label="Eliminar contacto"
                    title="Eliminar"
                  >
                    <TbTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {empresaModal && (
        <EmpresaModal
          empresa={empresa}
          onClose={() => setEmpresaModal(false)}
          onSave={handleEmpresaSave}
          onDelete={async () => {
            const { error: err } = await deleteEmpresa(empresa.id)
            if (err) return 'No se pudo eliminar: ' + err.message
            navigate('/empresas')
            return null
          }}
        />
      )}

      {contactoModal && (
        <ContactoModal
          contacto={editingContacto}
          empresaId={empresa.id}
          bloquearEmpresa
          onClose={() => {
            setContactoModal(false)
            setEditingContacto(null)
          }}
          onSave={handleContactoSave}
          onDelete={
            editingContacto
              ? async () => {
                  const { error: err } = await deleteContacto(editingContacto.id)
                  if (err) return 'No se pudo eliminar: ' + err.message
                  setContactoModal(false)
                  setEditingContacto(null)
                  await load()
                  return null
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white"
    >
      <TbArrowLeft size={16} />
      Volver
    </button>
  )
}
