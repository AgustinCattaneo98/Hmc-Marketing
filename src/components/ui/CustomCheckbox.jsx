import { useEffect, useRef } from 'react'

// Checkbox circular con estética glassmorphism oscura.
// - vacío: borde translúcido sutil
// - seleccionado: gradiente púrpura-índigo + glow + checkmark
// - indeterminado: gradiente + guión
// Usa un <input> nativo oculto por encima para conservar los handlers
// existentes (onChange recibe el evento real; e.target.checked sigue andando)
// y el estado indeterminate vía ref. El click hace stopPropagation para no
// disparar el onClick de la fila contenedora.
//
// Props: { checked, indeterminate, onChange, label, ariaLabel, className }
// Si se pasa `label`, el componente se renderiza como <label> con el texto al
// lado; si no, como <span> (seguro para anidar dentro de un <label> existente).
const Check = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

const Dash = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
    <path d="M6 12h12" />
  </svg>
)

export default function CustomCheckbox({
  checked = false,
  indeterminate = false,
  onChange,
  label,
  ariaLabel,
  className = '',
}) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate, checked])

  const Wrapper = label != null ? 'label' : 'span'
  const activo = checked || indeterminate

  return (
    <Wrapper
      className={`inline-flex cursor-pointer select-none items-center gap-2 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
          className="absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
        />
        <span
          className={`pointer-events-none flex h-full w-full items-center justify-center rounded-full transition-all ${
            activo
              ? 'border border-transparent bg-gradient-to-br from-purple-500 to-indigo-500 shadow-[0_0_8px_rgba(139,92,246,0.55)]'
              : 'border border-white/20 bg-white/5'
          }`}
        >
          {indeterminate ? <Dash /> : checked ? <Check /> : null}
        </span>
      </span>
      {label != null && <span className="text-xs text-hmc-muted">{label}</span>}
    </Wrapper>
  )
}
