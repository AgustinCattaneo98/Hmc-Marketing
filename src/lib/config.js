// Sincroniza la Configuración con Supabase (tabla `configuracion`).
// localStorage se mantiene como caché sincrónica: los componentes siguen
// leyendo con loadStr/loadJSON, y acá nos encargamos de volcar lo remoto a
// local al iniciar y de empujar cada cambio a Supabase al guardar.
import { supabase } from './supabase'
import { STORAGE, saveJSON, saveStr } from './settings'
import { applyAparienciaInicial } from './theme'

// Mapeo: clave de localStorage -> columna en la tabla `configuracion`.
const MAP = {
  [STORAGE.empresa]: 'empresa',
  [STORAGE.perfil]: 'perfil',
  [STORAGE.apariencia]: 'apariencia',
  [STORAGE.emailConfig]: 'email_config',
  [STORAGE.integraciones]: 'integraciones',
  [STORAGE.firma]: 'firma',
  [STORAGE.logo]: 'logo_url',
  [STORAGE.dashboardCover]: 'dashboard_cover_url',
  [STORAGE.perfilFoto]: 'perfil_foto_url',
  [STORAGE.wallpaper]: 'wallpaper_url',
  [STORAGE.cotCondPago]: 'cot_condiciones_pago',
  [STORAGE.cotCondGenerales]: 'cot_condiciones_generales',
}

// Claves cuyo valor es un objeto JSON (el resto son strings: url / texto).
const JSON_KEYS = new Set([
  STORAGE.empresa,
  STORAGE.perfil,
  STORAGE.apariencia,
  STORAGE.emailConfig,
  STORAGE.integraciones,
])

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Lee la config remota del usuario y la vuelca a localStorage.
// Se llama una vez al entrar (Layout). Si falla o no hay fila/migración,
// no rompe: la app sigue con lo que haya en localStorage.
export async function cargarConfiguracion() {
  try {
    const uid = await getUserId()
    if (!uid) return
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (error || !data) return

    for (const [key, col] of Object.entries(MAP)) {
      const val = data[col]
      if (val === null || val === undefined) continue
      if (JSON_KEYS.has(key)) {
        if (val && Object.keys(val).length) saveJSON(key, val)
      } else {
        saveStr(key, val) // string vacío => removeItem
      }
    }
    // Reaplica tema / acento / wallpaper con lo recién cargado.
    applyAparienciaInicial()
  } catch {
    // Silencioso: caemos al comportamiento local.
  }
}

// Guarda (upsert) un campo de la config en Supabase. `storageKey` es la clave
// de localStorage; internamente la mapeamos a su columna.
export async function guardarConfig(storageKey, valor) {
  const uid = await getUserId()
  if (!uid) return { error: 'No autenticado' }
  const col = MAP[storageKey]
  if (!col) return { error: 'Clave de configuración desconocida' }
  const { error } = await supabase
    .from('configuracion')
    .upsert(
      { user_id: uid, [col]: valor, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  return { error: error?.message ?? null }
}

// Sube una imagen de configuración al bucket público `logos` (carpeta config/)
// y devuelve la URL pública (con cache-busting). `nombre` ej: 'logo', 'portada'.
export async function subirImagenConfig(file, nombre) {
  const uid = await getUserId()
  if (!uid) return { error: 'No autenticado' }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `config/${uid}/${nombre}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) return { error: upErr.message }
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return { url: `${data.publicUrl}?t=${Date.now()}` }
}
