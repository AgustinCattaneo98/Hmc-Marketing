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
  TbX,
  TbSearch,
  TbUserPlus,
  TbUserSearch,
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
  // Flujo "Agregar contacto": null | 'menu' | 'buscar'
  const [flujoAgregar, setFlujoAgregar] = useState(null)
  const [existentes, setExistentes] = useState([])
  const [buscarQuery, setBuscarQuery] = useState('')
  const [cargandoExistentes, setCargandoExistentes] = useState(false)
  const [vinculandoId, setVinculandoId] = useState(null)

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

  // --- Flujo "Agregar contacto" (elegir crear nuevo o vincular existente) ---
  function abrirAgregarContacto() {
    setFlujoAgregar('menu')
  }

  function cerrarFlujo() {
    setFlujoAgregar(null)
    setBuscarQuery('')
    setExistentes([])
  }

  function elegirCrearNuevo() {
    setFlujoAgregar(null)
    openCreateContacto()
  }

  async function elegirExistente() {
    setFlujoAgregar('buscar')
    setCargandoExistentes(true)
    const { data } = await supabase
      .from('contactos')
      .select('id, nombre, apellido, email, empresa_id, foto_url, cargo')
      .order('nombre', { ascending: true })
    setExistentes(data ?? [])
    setCargandoExistentes(false)
  }

  async function vincularExistente(c) {
    setVinculandoId(c.id)
    const { error: err } = await updateContacto(c.id, { empresa_id: empresa.id })
    setVinculandoId(null)
    if (err) {
      setError('No se pudo vincular el contacto: ' + err.message)
      return
    }
    cerrarFlujo()
    await load()
  }

  // Contactos existentes para vincular: excluye los ya vinculados a esta empresa
  // y filtra por nombre / apellido / email en tiempo real.
  const qExistentes = buscarQuery.trim().toLowerCase()
  const existentesFiltrados = existentes.filter(
    (c) =>
      c.empresa_id !== empresa?.id &&
      (!qExistentes ||
        `${c.nombre ?? ''} ${c.apellido ?? ''} ${c.email ?? ''}`.toLowerCase().includes(qExistentes))
  )

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
            onClick={abrirAgregarContacto}
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

      {/* Flujo "Agregar contacto": elegir crear nuevo o vincular existente */}
      {flujoAgregar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onMouseDown={cerrarFlujo}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
              <h2 className="text-lg font-semibold text-hmc-white">Agregar contacto</h2>
              <button
                type="button"
                onClick={cerrarFlujo}
                className="text-hmc-muted transition-colors hover:text-hmc-white"
                aria-label="Cerrar"
              >
                <TbX size={20} />
              </button>
            </div>

            {flujoAgregar === 'menu' && (
              <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={elegirCrearNuevo}
                  className="flex flex-col items-center gap-2 rounded-lg border border-hmc-border bg-hmc-gray p-6 text-center transition-colors hover:bg-hmc-gray3/50"
                >
                  <TbUserPlus size={26} className="text-hmc-white" />
                  <span className="text-sm font-medium text-hmc-white">Crear nuevo contacto</span>
                  <span className="text-xs text-hmc-muted">Cargar una persona nueva</span>
                </button>
                <button
                  type="button"
                  onClick={elegirExistente}
                  className="flex flex-col items-center gap-2 rounded-lg border border-hmc-border bg-hmc-gray p-6 text-center transition-colors hover:bg-hmc-gray3/50"
                >
                  <TbUserSearch size={26} className="text-hmc-white" />
                  <span className="text-sm font-medium text-hmc-white">Agregar existente</span>
                  <span className="text-xs text-hmc-muted">Vincular un contacto ya cargado</span>
                </button>
              </div>
            )}

            {flujoAgregar === 'buscar' && (
              <div className="p-6">
                <button
                  type="button"
                  onClick={() => setFlujoAgregar('menu')}
                  className="mb-3 inline-flex items-center gap-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white"
                >
                  <TbArrowLeft size={16} /> Volver
                </button>
                <div className="relative mb-4">
                  <TbSearch
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hmc-muted"
                  />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar por nombre, apellido o email…"
                    value={buscarQuery}
                    onChange={(e) => setBuscarQuery(e.target.value)}
                    className="w-full rounded-md border border-hmc-border bg-hmc-gray2 py-2 pl-10 pr-3 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted"
                  />
                </div>
                {cargandoExistentes ? (
                  <p className="py-6 text-center text-sm text-hmc-muted">Cargando…</p>
                ) : existentesFiltrados.length === 0 ? (
                  <p className="py-6 text-center text-sm text-hmc-muted">
                    {buscarQuery ? 'Sin resultados.' : 'No hay otros contactos para vincular.'}
                  </p>
                ) : (
                  <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                    {existentesFiltrados.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-md border border-hmc-border bg-hmc-gray p-3"
                      >
                        {c.foto_url ? (
                          <img
                            src={c.foto_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-hmc-border object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hmc-border bg-hmc-gray3 text-xs font-semibold text-hmc-white">
                            {iniciales(c.nombre, c.apellido)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-hmc-white">
                            {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                          </p>
                          {c.email && <p className="truncate text-xs text-hmc-muted">{c.email}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => vincularExistente(c)}
                          disabled={vinculandoId === c.id}
                          className="shrink-0 rounded-md bg-hmc-white px-3 py-1.5 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          {vinculandoId === c.id ? '…' : 'Seleccionar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
