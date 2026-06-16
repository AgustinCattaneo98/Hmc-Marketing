// Estilos de badge por segmento (compartido entre la lista y el detalle).
export const SEGMENTO_STYLES = {
  hotel: { label: 'Hotel', color: '#7fb8e8' },
  inmobiliaria: { label: 'Inmobiliaria', color: '#a8d88a' },
  hostel: { label: 'Hostel', color: '#e8b87f' },
  corporativo: { label: 'Corporativo', color: '#c8a8e8' },
  otro: { label: 'Otro', color: '#777777' },
}

export default function SegmentoBadge({ segmento }) {
  const style = SEGMENTO_STYLES[segmento] ?? SEGMENTO_STYLES.otro
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${style.color}22`, color: style.color }}
    >
      {style.label}
    </span>
  )
}
