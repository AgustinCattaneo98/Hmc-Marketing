// Pill de segmento (etiqueta). seg: { id, nombre, color }
// Estilo canónico: fondo 15%, borde 40%, texto al color del segmento.
export default function SegmentoPill({ seg }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full font-medium"
      style={{
        fontSize: 11,
        padding: '2px 8px',
        backgroundColor: `${seg.color}26`, // ~15%
        border: `1px solid ${seg.color}66`, // ~40%
        color: seg.color,
      }}
    >
      {seg.nombre}
    </span>
  )
}

// Lista de pills con límite opcional y "+N más".
// segmentos: array de { id, nombre, color }. max = 0 => sin límite.
export function SegmentoPills({ segmentos, max = 2 }) {
  if (!segmentos?.length) return null
  const visibles = max ? segmentos.slice(0, max) : segmentos
  const resto = max ? segmentos.length - max : 0
  return (
    <span className="flex flex-wrap items-center gap-1">
      {visibles.map((s) => (
        <SegmentoPill key={s.id} seg={s} />
      ))}
      {resto > 0 && (
        <span className="whitespace-nowrap text-[11px] text-hmc-muted">+{resto} más</span>
      )}
    </span>
  )
}
