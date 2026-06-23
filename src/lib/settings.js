// Claves de localStorage usadas por Configuración y el resto de la app.
export const STORAGE = {
  logo: 'hmc_logo_url',
  empresa: 'hmc_empresa',
  perfilFoto: 'hmc_perfil_foto',
  perfil: 'hmc_perfil',
  firma: 'hmc_firma',
  apariencia: 'hmc_apariencia',
  emailConfig: 'hmc_email_config',
  wallpaper: 'hmc_wallpaper',
  integraciones: 'hmc_integraciones',
  dashboardCover: 'hmc_dashboard_cover',
  cotCondPago: 'hmc_cot_cond_pago',
  cotCondGenerales: 'hmc_cot_cond_generales',
}

// Condiciones por defecto para nuevas cotizaciones (editable por cotización
// y persistido como predeterminado cuando el usuario lo cambia).
export const DEFAULT_COT_COND_PAGO =
  '50% de anticipo para iniciar la producción y 50% restante contra entrega.\n' +
  'Medios de pago: transferencia bancaria o efectivo.'

export const DEFAULT_COT_COND_GENERALES =
  '• Precios sujetos a cambio sin previo aviso.\n' +
  '• Plazo de producción: 30 días hábiles desde el pago del anticipo.\n' +
  '• Tipo de cambio de referencia: dólar blue.'

// Eventos para refrescar componentes cuando cambian las preferencias.
export const EVENT_LOGO = 'hmc_logo_changed'
export const EVENT_APARIENCIA = 'hmc_apariencia_changed'

// Defaults
export const DEFAULT_EMPRESA = {
  nombre: 'HMC — Handmade Cycles',
  slogan: 'Buenos Aires · Bicicletas urbanas a medida',
  sitio_web: '',
  email: 'hmcbicicletas@gmail.com',
  whatsapp: '',
  instagram: '',
  ciudad: 'Buenos Aires, Argentina',
  zona: 'Córdoba (representante)',
  descripcion: '',
  cuit: '',
}

export const DEFAULT_PERFIL = {
  nombre: 'Agustín',
  apellido: 'Cattaneo',
  rol: 'Representante Comercial — Córdoba',
  telefono: '',
  email: '',
  ciudad: 'Córdoba, Argentina',
  bio: '',
}

export const DEFAULT_FIRMA =
  'Agus — HMC Bicicletas\nRepresentante Córdoba\nhmcbicicletas@gmail.com'

export const DEFAULT_APARIENCIA = {
  tema: 'oscuro',
  fondo: 'none', // none | imagen | gradiente
  accentBtn: '#f0f0ea',
}

export const DEFAULT_INTEGRACIONES = {
  // Email
  email_servicio: 'gmail', // gmail | resend
  gmail_address: '',
  gmail_app_password: '',
  resend_api_key: '',
  // WhatsApp
  wa_metodo: 'meta', // meta | twilio
  phone_number_id: '',
  access_token: '',
  business_account_id: '',
  webhook_verify_token: '',
  account_sid: '',
  auth_token: '',
  whatsapp_number: '',
  // Notion
  notion_token: '',
  notion_database_id: '',
}

export const DEFAULT_EMAIL_CONFIG = {
  remitente_nombre: 'Agus — HMC Bicicletas',
  remitente_email: 'hmcbicicletas@gmail.com',
  reply_to: '',
  personalizar_asunto: true,
  copia_mi: false,
  cc_santi: false,
  rastrear_aperturas: true,
  rastrear_clics: false,
  fu_primer: '5',
  fu_segundo: '10',
  fu_archivar: '60',
  pie:
    "HMC Bicicletas · Córdoba, Argentina\nhmcbicicletas@gmail.com\nPara no recibir más emails, respondé con 'baja'.",
}

// Helpers JSON
export function loadJSON(key, def = {}) {
  try {
    const v = localStorage.getItem(key)
    return v ? { ...def, ...JSON.parse(v) } : { ...def }
  } catch {
    return { ...def }
  }
}

export function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// Helpers string (logo/foto/wallpaper en base64, firma en texto plano)
export function loadStr(key) {
  return localStorage.getItem(key) || ''
}

export function saveStr(key, val) {
  if (val) localStorage.setItem(key, val)
  else localStorage.removeItem(key)
}

// Convierte un File a data URL (base64).
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
