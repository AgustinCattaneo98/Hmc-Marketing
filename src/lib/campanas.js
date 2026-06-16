import {
  TbHeading,
  TbAlignLeft,
  TbPhoto,
  TbHandFinger,
  TbMinus,
  TbId,
  TbCheckbox,
  TbPhone,
  TbCalendarEvent,
  TbBrandWhatsapp,
  TbMail,
  TbArrowsExchange,
} from 'react-icons/tb'

// Estados de la campaña.
export const ESTADO_CAMPANA = {
  borrador: { label: 'Borrador', color: '#777777' },
  programada: { label: 'Programada', color: '#ccaa44' },
  enviada: { label: 'Enviada', color: '#44aa99' },
}

// Estados de email/whatsapp por cliente.
export const ESTADO_EMAIL = {
  sin_crear: { label: 'Sin crear', color: '#555555' },
  borrador: { label: 'Borrador', color: '#ccaa44' },
  listo: { label: 'Listo', color: '#44aa99' },
}

export const ESTADO_WHATSAPP = {
  sin_crear: { label: 'Sin crear', color: '#555555' },
  borrador: { label: 'Borrador', color: '#ccaa44' },
  listo: { label: 'Listo', color: '#44aa99' },
  enviado: { label: 'Enviado', color: '#44aa99' },
}

// Tipos de actividad con ícono y color.
export const TIPOS_ACTIVIDAD = [
  { value: 'tarea', label: 'Tarea', icon: TbCheckbox, color: '#777777' },
  { value: 'llamada', label: 'Llamada', icon: TbPhone, color: '#c8a8e8' },
  { value: 'reunion', label: 'Reunión', icon: TbCalendarEvent, color: '#e8b87f' },
  { value: 'whatsapp', label: 'WhatsApp', icon: TbBrandWhatsapp, color: '#25d366' },
  { value: 'email', label: 'Email', icon: TbMail, color: '#7fb8e8' },
  { value: 'seguimiento', label: 'Seguimiento', icon: TbArrowsExchange, color: '#a8d88a' },
]

export const TIPO_ACTIVIDAD_MAP = Object.fromEntries(
  TIPOS_ACTIVIDAD.map((t) => [t.value, t])
)

export const ESTADOS_ACTIVIDAD = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
]

// Tipos de bloque del editor de email.
export const TIPOS_BLOQUE = [
  { tipo: 'titulo', label: 'Título', icon: TbHeading },
  { tipo: 'texto', label: 'Texto', icon: TbAlignLeft },
  { tipo: 'imagen', label: 'Imagen', icon: TbPhoto },
  { tipo: 'cta', label: 'Botón CTA', icon: TbHandFinger },
  { tipo: 'separador', label: 'Separador', icon: TbMinus },
  { tipo: 'firma', label: 'Firma', icon: TbId },
]

export const FIRMA_DEFAULT =
  'Agus — HMC Bicicletas\nCórdoba, Argentina\nhmcbicicletas@gmail.com'

export function contenidoBloqueDefault(tipo) {
  switch (tipo) {
    case 'titulo':
      return 'Título nuevo'
    case 'texto':
      return 'Escribí tu texto acá…'
    case 'cta':
      return 'Ver más'
    case 'firma':
      return FIRMA_DEFAULT
    default:
      return ''
  }
}

// Nombre legible de un cliente de campaña (empresa o contacto).
export function nombreCliente(cliente) {
  if (cliente.tipo === 'empresa') return cliente.empresa?.nombre ?? 'Empresa'
  const c = cliente.contacto
  return [c?.nombre, c?.apellido].filter(Boolean).join(' ') || 'Contacto'
}

export const uid = () =>
  crypto.randomUUID?.() ?? `b_${Date.now()}_${Math.random().toString(36).slice(2)}`
