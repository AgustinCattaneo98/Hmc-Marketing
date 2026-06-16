import { useState } from 'react'
import { TbX, TbBrandWhatsapp } from 'react-icons/tb'
import { updateClienteWhatsapp } from '../lib/db'
import { limpiarWhatsapp } from '../lib/utils'
import { ESTADO_WHATSAPP, nombreCliente } from '../lib/campanas'

const LS_KEY = 'hmc_whatsapp_textos'

function getTextosGuardados() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function EstadoBadge({ estado }) {
  const e = ESTADO_WHATSAPP[estado] ?? ESTADO_WHATSAPP.sin_crear
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${e.color}22`, color: e.color }}
    >
      {e.label}
    </span>
  )
}

// Número de WhatsApp del cliente (contacto.whatsapp o empresa.telefono).
function numeroCliente(cliente) {
  if (cliente.tipo === 'contacto') return cliente.contacto?.whatsapp ?? null
  return cliente.empresa?.telefono ?? null
}

export default function WhatsappModal({ cliente, onClose, onSaved }) {
  const [texto, setTexto] = useState(cliente.whatsapp_texto ?? '')
  const [estado, setEstado] = useState(cliente.whatsapp_estado ?? 'sin_crear')
  const [textos, setTextos] = useState(getTextosGuardados)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const numero = numeroCliente(cliente)
  const numeroLimpio = numero ? limpiarWhatsapp(numero) : null

  async function guardar(nuevoEstado) {
    setError('')
    setGuardando(true)
    const { error: err } = await updateClienteWhatsapp(cliente.id, {
      whatsapp_texto: texto,
      whatsapp_estado: nuevoEstado,
    })
    setGuardando(false)
    if (err) {
      setError('No se pudo guardar: ' + err.message)
      return
    }
    setEstado(nuevoEstado)
    onSaved?.()
  }

  function guardarTextoBase() {
    if (!texto.trim()) return
    const next = [texto.trim(), ...textos.filter((t) => t !== texto.trim())].slice(0, 10)
    setTextos(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }

  function abrirWhatsapp() {
    if (!numeroLimpio) return
    window.open(
      `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-hmc-white">
              WhatsApp para {nombreCliente(cliente)}
            </h2>
            <EstadoBadge estado={estado} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-hmc-muted transition-colors hover:text-hmc-white"
            aria-label="Cerrar"
          >
            <TbX size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Texto base */}
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted">
            Texto base
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) setTexto(e.target.value)
              e.target.value = ''
            }}
            className="mb-4 w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white"
          >
            <option value="">Usar texto predefinido…</option>
            {textos.map((t, i) => (
              <option key={i} value={t}>
                {t.slice(0, 60)}
                {t.length > 60 ? '…' : ''}
              </option>
            ))}
          </select>

          <textarea
            rows={12}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={1600}
            placeholder="Hola [Nombre], te escribo de parte de HMC Bicicletas…"
            className="w-full resize-none rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none focus:border-hmc-white placeholder:text-hmc-muted"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-hmc-muted">
            <button
              type="button"
              onClick={guardarTextoBase}
              className="hover:text-hmc-white"
            >
              Guardar como texto base
            </button>
            <span>{texto.length} / 1600</span>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {!numero && (
            <p className="mt-3 text-xs text-hmc-muted">
              Este cliente no tiene número de WhatsApp cargado.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-hmc-border px-6 py-4">
          <button
            type="button"
            onClick={() => guardar('borrador')}
            disabled={guardando}
            className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-60"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => guardar('enviado')}
            disabled={guardando}
            className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-60"
          >
            Marcar enviado
          </button>
          {numero && (
            <button
              type="button"
              onClick={abrirWhatsapp}
              className="inline-flex items-center gap-2 rounded-md bg-[#25d366] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              <TbBrandWhatsapp size={16} />
              Abrir WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
