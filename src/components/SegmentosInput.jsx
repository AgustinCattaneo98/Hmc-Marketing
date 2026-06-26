import { useEffect, useRef, useState } from 'react'
import { TbX, TbPlus } from 'react-icons/tb'
import { getSegmentos, createSegmento } from '../lib/db'

// Input de etiquetas (tags) dinámicas para los segmentos de una empresa.
// Props:
//   value: array de { id, nombre, color } seleccionados
//   onChange: (nuevoArray) => void
//   placeholder: texto del input
export default function SegmentosInput({ value = [], onChange, placeholder = 'Buscar o crear segmento…' }) {
  const [todos, setTodos] = useState([])      // catálogo completo
  const [texto, setTexto] = useState('')
  const [open, setOpen] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    let activo = true
    getSegmentos()
      .then((data) => activo && setTodos(data ?? []))
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [])

  // Cierra el dropdown al hacer click fuera del componente.
  // Se usa fase de captura (true) para que funcione aunque un modal contenedor
  // haga stopPropagation del mousedown (ej. EmpresaModal). El tag seleccionado
  // se mantiene; solo se cierra el dropdown y se limpia el texto de búsqueda.
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setTexto('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [])

  const q = texto.trim().toLowerCase()
  const seleccionados = new Set(value.map((v) => v.id))
  const sugerencias = todos.filter(
    (s) => !seleccionados.has(s.id) && s.nombre.toLowerCase().includes(q)
  )
  const existeExacto = todos.some((s) => s.nombre.toLowerCase() === q)
  const puedeCrear = q.length > 0 && !existeExacto

  function agregar(seg) {
    if (!seleccionados.has(seg.id)) onChange([...value, seg])
    setTexto('')
    setOpen(true)
    inputRef.current?.focus()
  }

  function quitar(id) {
    onChange(value.filter((v) => v.id !== id))
  }

  async function crear() {
    if (!puedeCrear || creando) return
    setCreando(true)
    setError('')
    try {
      const nuevo = await createSegmento(texto)
      setTodos((prev) => [...prev, nuevo])
      agregar(nuevo)
    } catch (e) {
      setError('No se pudo crear el segmento: ' + (e?.message ?? e))
    } finally {
      setCreando(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (sugerencias.length) agregar(sugerencias[0])
      else if (puedeCrear) crear()
    } else if (e.key === 'Backspace' && texto === '' && value.length) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Área de tags + input (clickeable para enfocar) */}
      <div
        onClick={() => {
          setOpen(true)
          inputRef.current?.focus()
        }}
        className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 glass-input px-2 py-1.5 transition-colors focus-within:border-hmc-white"
      >
        {value.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${s.color}33`,
              color: s.color,
              border: `1px solid ${s.color}`,
            }}
          >
            {s.nombre}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                quitar(s.id)
              }}
              className="opacity-70 transition-opacity hover:opacity-100"
              aria-label={`Quitar ${s.nombre}`}
            >
              <TbX size={13} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm text-hmc-white outline-none placeholder:text-hmc-muted"
        />
      </div>

      {/* Dropdown de sugerencias / crear */}
      {open && (sugerencias.length > 0 || puedeCrear) && (
        <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-[10px] border border-white/10 bg-[#1a1a1a] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {sugerencias.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                agregar(s)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.nombre}
            </button>
          ))}
          {puedeCrear && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                crear()
              }}
              disabled={creando}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-hmc-muted transition-colors hover:bg-hmc-gray3 hover:text-hmc-white disabled:opacity-60"
            >
              <TbPlus size={15} />
              {creando ? 'Creando…' : <>Crear «{texto.trim()}»</>}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
