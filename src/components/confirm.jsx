// Modal de confirmación global para el sistema. Se monta una vez (ConfirmProvider)
// y se invoca desde cualquier lado con `await confirmDialog(...)`, que devuelve
// true/false. Reemplaza a window.confirm con un diálogo con identidad HMC.
import { useEffect, useRef, useState } from 'react'
import { TbAlertTriangle } from 'react-icons/tb'

let handler = null

// Acepta un string (mensaje) o un objeto { title, message, confirmText, cancelText, danger }.
export function confirmDialog(opts) {
  const cfg = typeof opts === 'string' ? { message: opts } : opts || {}
  if (!handler) {
    // Fallback por si el provider no está montado.
    return Promise.resolve(window.confirm(cfg.message || '¿Confirmar?'))
  }
  return handler(cfg)
}

export function ConfirmProvider({ children }) {
  const [cfg, setCfg] = useState(null)
  const resolver = useRef(null)

  useEffect(() => {
    handler = (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setCfg(opts)
      })
    return () => {
      handler = null
    }
  }, [])

  function cerrar(valor) {
    setCfg(null)
    resolver.current?.(valor)
    resolver.current = null
  }

  useEffect(() => {
    if (!cfg) return
    function onKey(e) {
      if (e.key === 'Escape') cerrar(false)
      if (e.key === 'Enter') cerrar(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  const danger = cfg?.danger !== false // por defecto, estilo destructivo

  return (
    <>
      {children}
      {cfg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
          onMouseDown={() => cerrar(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-hmc-border bg-hmc-gray2 p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              {danger && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-950/40 text-red-400">
                  <TbAlertTriangle size={20} />
                </span>
              )}
              <h3 className="text-base font-semibold text-hmc-white">
                {cfg.title || '¿Confirmar acción?'}
              </h3>
            </div>
            {cfg.message && (
              <p className="mb-5 whitespace-pre-line text-sm text-hmc-muted">{cfg.message}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => cerrar(false)}
                className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
              >
                {cfg.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => cerrar(true)}
                className={
                  danger
                    ? 'rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/50'
                    : 'rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90'
                }
              >
                {cfg.confirmText || (danger ? 'Eliminar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
