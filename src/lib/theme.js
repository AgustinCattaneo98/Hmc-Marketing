import { STORAGE, DEFAULT_APARIENCIA, loadJSON, loadStr } from './settings'

const DARK = {
  '--hmc-black': '#0a0a0a',
  '--hmc-gray': '#161616',
  '--hmc-gray2': '#1e1e1e',
  '--hmc-gray3': '#2a2a2a',
  '--hmc-border': '#2e2e2e',
  '--hmc-muted': '#777777',
  '--hmc-white': '#f0f0ea',
}

const LIGHT = {
  '--hmc-black': '#ffffff',
  '--hmc-gray': '#f5f5f0',
  '--hmc-gray2': '#eeeeea',
  '--hmc-gray3': '#e0e0dc',
  '--hmc-border': '#d0d0cc',
  '--hmc-muted': '#888888',
  '--hmc-white': '#111111',
}

export function applyTema(tema) {
  const root = document.documentElement
  const vars = tema === 'claro' ? LIGHT : DARK
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.classList.toggle('light', tema === 'claro')
}

export function applyAccent(color) {
  if (color) document.documentElement.style.setProperty('--hmc-accent-btn', color)
}

// Usa el logo de la marca (si está cargado) como favicon de la pestaña.
// Borra los favicons existentes y crea uno nuevo: cambiar solo el href no
// siempre lo refresca (los navegadores cachean el favicon).
export function aplicarFavicon() {
  const url = loadStr(STORAGE.logo)
  if (!url) return
  document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']").forEach((l) => l.remove())
  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = url
  document.head.appendChild(link)
}

// Aplica todas las preferencias guardadas. Llamar al iniciar la app.
export function applyAparienciaInicial() {
  const a = loadJSON(STORAGE.apariencia, DEFAULT_APARIENCIA)
  applyTema(a.tema === 'claro' ? 'claro' : 'oscuro')
  applyAccent(a.accentBtn)
  aplicarFavicon()
  const wallpaper = loadStr(STORAGE.wallpaper)
  if (a.fondo === 'imagen' && wallpaper) {
    document.documentElement.style.setProperty('--hmc-wallpaper', `url(${wallpaper})`)
  }
}
