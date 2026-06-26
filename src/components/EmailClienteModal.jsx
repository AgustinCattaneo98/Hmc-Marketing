import { useEffect, useRef, useState } from 'react'
import {
  TbX,
  TbArrowUp,
  TbArrowDown,
  TbTrash,
  TbPhoto,
} from 'react-icons/tb'
import {
  updateClienteEmail,
  getPlantillas,
  createPlantilla,
} from '../lib/db'
import { supabase } from '../lib/supabase'
import { comprimirImagen } from '../lib/imagen'
import {
  TIPOS_BLOQUE,
  ESTADO_EMAIL,
  contenidoBloqueDefault,
  nombreCliente,
  uid,
} from '../lib/campanas'

function EstadoBadge({ estado }) {
  const e = ESTADO_EMAIL[estado] ?? ESTADO_EMAIL.sin_crear
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${e.color}22`, color: e.color }}
    >
      {e.label}
    </span>
  )
}

function EmailHeader() {
  return (
    <div className="bg-hmc-black px-6 py-5 text-center">
      <div className="text-2xl font-bold italic tracking-widest text-hmc-white">
        hmc
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-hmc-muted">
        Handmade Cycles · Buenos Aires
      </div>
    </div>
  )
}

export default function EmailClienteModal({ cliente, campana, onClose, onSaved }) {
  const [asunto, setAsunto] = useState(cliente.email_asunto ?? campana.asunto ?? '')
  const [bloques, setBloques] = useState(() =>
    (cliente.email_bloques ?? []).map((b) => ({ ...b, id: b.id ?? uid() }))
  )
  const [estado, setEstado] = useState(cliente.email_estado ?? 'sin_crear')
  const [plantillas, setPlantillas] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getPlantillas().then(({ data }) => setPlantillas(data ?? []))
  }, [])

  function addBloque(tipo) {
    setBloques((prev) => [
      ...prev,
      { id: uid(), tipo, contenido: contenidoBloqueDefault(tipo), orden: prev.length },
    ])
  }

  function setContenido(id, contenido) {
    setBloques((prev) => prev.map((b) => (b.id === id ? { ...b, contenido } : b)))
  }

  function removeBloque(id) {
    setBloques((prev) => prev.filter((b) => b.id !== id))
  }

  function moverBloque(id, dir) {
    setBloques((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const copia = [...prev]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }

  function aplicarPlantilla(plantillaId) {
    if (!plantillaId) return
    const pl = plantillas.find((p) => p.id === plantillaId)
    if (!pl) return
    if (
      bloques.length > 0 &&
      !window.confirm('¿Reemplazar el diseño actual con esta plantilla?')
    )
      return
    setBloques((pl.bloques ?? []).map((b) => ({ ...b, id: uid() })))
  }

  async function handleImagen(id, file) {
    if (!file) return
    setError('')
    const optim = await comprimirImagen(file)
    const ext = optim.name.split('.').pop()
    const path = `campanas/${campana.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('campanas')
      .upload(path, optim, { upsert: true, contentType: optim.type })
    if (upErr) {
      setError('No se pudo subir la imagen: ' + upErr.message)
      return
    }
    const { data } = supabase.storage.from('campanas').getPublicUrl(path)
    setContenido(id, `${data.publicUrl}?t=${Date.now()}`)
  }

  function bloquesPayload() {
    return bloques.map((b, i) => ({
      id: b.id,
      tipo: b.tipo,
      contenido: b.contenido,
      orden: i,
    }))
  }

  async function guardar(nuevoEstado) {
    setError('')
    setGuardando(true)
    const { error: err } = await updateClienteEmail(cliente.id, {
      email_asunto: asunto,
      email_bloques: bloquesPayload(),
      email_estado: nuevoEstado,
    })
    setGuardando(false)
    if (err) {
      setError('No se pudo guardar: ' + err.message)
      return
    }
    setEstado(nuevoEstado)
    onSaved?.()
  }

  async function guardarComoPlantilla() {
    const nombre = window.prompt('Nombre de la plantilla:')
    if (!nombre?.trim()) return
    const { data, error: err } = await createPlantilla({
      nombre: nombre.trim(),
      bloques: bloquesPayload(),
    })
    if (err) {
      setError('No se pudo crear la plantilla: ' + err.message)
      return
    }
    setPlantillas((prev) => [data, ...prev])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden glass-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-hmc-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-hmc-white">
              Email para {nombreCliente(cliente)}
            </h2>
            <EstadoBadge estado={estado} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => guardar('borrador')}
              disabled={guardando}
              className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-60"
            >
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={() => guardar('listo')}
              disabled={guardando}
              className="rounded-md bg-hmc-white px-3 py-1.5 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Marcar listo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-hmc-muted transition-colors hover:text-hmc-white"
              aria-label="Cerrar"
            >
              <TbX size={20} />
            </button>
          </div>
        </div>

        {error && (
          <p className="border-b border-hmc-border bg-red-950/30 px-6 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex min-h-0 flex-1">
          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Asunto + plantilla */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Asunto de este email…"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="flex-1 glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted"
              />
              <select
                defaultValue=""
                onChange={(e) => {
                  aplicarPlantilla(e.target.value)
                  e.target.value = ''
                }}
                className="glass-input px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white sm:w-48"
              >
                <option value="">Usar plantilla…</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden glass-card">
              <EmailHeader />
              <div className="flex flex-col gap-2 p-4">
                {bloques.length === 0 ? (
                  <p className="py-10 text-center text-sm text-hmc-muted">
                    Agregá bloques desde el panel →
                  </p>
                ) : (
                  bloques.map((b, i) => (
                    <BloqueEditable
                      key={b.id}
                      bloque={b}
                      primero={i === 0}
                      ultimo={i === bloques.length - 1}
                      onContenido={setContenido}
                      onRemove={removeBloque}
                      onMover={moverBloque}
                      onImagen={handleImagen}
                    />
                  ))
                )}
              </div>
              <div className="border-t border-hmc-border bg-hmc-black px-6 py-3 text-center text-[9px] text-hmc-muted">
                {campana.remitente_nombre} · {campana.remitente_email}
              </div>
            </div>
          </div>

          {/* Panel derecho */}
          <div className="w-[220px] shrink-0 overflow-y-auto border-l border-hmc-border p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-hmc-muted">
              Bloques
            </p>
            <div className="flex flex-col gap-2">
              {TIPOS_BLOQUE.map(({ tipo, label, icon: Icon }) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => addBloque(tipo)}
                  className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-3 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
                >
                  <Icon size={16} className="text-hmc-muted" />
                  {label}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-hmc-muted">
              Plantillas
            </p>
            <div className="flex flex-col gap-1">
              {plantillas.length === 0 ? (
                <p className="text-xs text-hmc-muted">Sin plantillas guardadas.</p>
              ) : (
                plantillas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => aplicarPlantilla(p.id)}
                    className="truncate rounded px-2 py-1.5 text-left text-xs text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white"
                    title={`Aplicar "${p.nombre}"`}
                  >
                    {p.nombre}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={guardarComoPlantilla}
              disabled={bloques.length === 0}
              className="mt-3 w-full rounded-md border border-hmc-border px-3 py-2 text-xs text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-50"
            >
              Guardar como plantilla nueva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BloqueEditable({ bloque: b, primero, ultimo, onContenido, onRemove, onMover, onImagen }) {
  const fileRef = useRef(null)
  return (
    <div className="group relative rounded-md border border-hmc-border bg-hmc-black p-2.5">
      <div className="absolute right-2 top-2 z-10 hidden items-center gap-1 group-hover:flex">
        <button
          type="button"
          onClick={() => onMover(b.id, -1)}
          disabled={primero}
          className="rounded bg-hmc-gray2 p-1 text-hmc-muted hover:text-hmc-white disabled:opacity-30"
          title="Subir"
        >
          <TbArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMover(b.id, 1)}
          disabled={ultimo}
          className="rounded bg-hmc-gray2 p-1 text-hmc-muted hover:text-hmc-white disabled:opacity-30"
          title="Bajar"
        >
          <TbArrowDown size={14} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(b.id)}
          className="rounded bg-hmc-gray2 p-1 text-hmc-muted hover:text-red-400"
          title="Eliminar"
        >
          <TbTrash size={14} />
        </button>
      </div>

      <div className="mb-1 text-[9px] uppercase tracking-widest text-hmc-muted">
        {b.tipo}
      </div>

      {b.tipo === 'titulo' && (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onContenido(b.id, e.currentTarget.innerText)}
          className="text-[18px] font-medium text-hmc-white outline-none"
        >
          {b.contenido}
        </div>
      )}
      {b.tipo === 'texto' && (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onContenido(b.id, e.currentTarget.innerText)}
          className="text-[13px] leading-[1.7] text-hmc-muted outline-none"
        >
          {b.contenido}
        </div>
      )}
      {b.tipo === 'firma' && (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onContenido(b.id, e.currentTarget.innerText)}
          className="whitespace-pre-line text-[11px] text-hmc-muted outline-none"
        >
          {b.contenido}
        </div>
      )}
      {b.tipo === 'cta' && (
        <div className="flex justify-center py-1">
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onContenido(b.id, e.currentTarget.innerText)}
            className="rounded bg-hmc-white px-5 py-2 text-[13px] font-semibold text-hmc-black outline-none"
          >
            {b.contenido}
          </div>
        </div>
      )}
      {b.tipo === 'separador' && <hr className="border-hmc-border" />}
      {b.tipo === 'imagen' && (
        <div>
          {b.contenido ? (
            <img src={b.contenido} alt="" className="w-full rounded object-contain" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded border border-dashed border-hmc-border py-8 text-hmc-muted transition-colors hover:text-hmc-white"
            >
              <TbPhoto size={26} />
              <span className="text-xs">Click para subir</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImagen(b.id, e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  )
}
