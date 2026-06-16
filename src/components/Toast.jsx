import { useEffect } from 'react'
import { TbCircleCheck } from 'react-icons/tb'

// Toast simple abajo a la derecha. Se cierra solo a los 2.5s.
export default function Toast({ mensaje, visible, onClose }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => onClose?.(), 2500)
    return () => clearTimeout(t)
  }, [visible, mensaje, onClose])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-md border border-hmc-border bg-hmc-gray2 px-4 py-3 text-sm text-hmc-white shadow-xl">
      <TbCircleCheck size={18} className="text-green-400" />
      {mensaje}
    </div>
  )
}
