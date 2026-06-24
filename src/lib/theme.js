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
export function aplicarFavicon() {
  const url = loadStr(STORAGE.logo)
  if (!url) return
  let link = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.removeAttribute('type') // que el navegador detecte el formato real
  link.href = url
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
