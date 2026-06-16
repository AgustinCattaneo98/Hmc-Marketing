import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { STORAGE, EVENT_APARIENCIA, DEFAULT_APARIENCIA, loadJSON, loadStr } from '../lib/settings'
import { cargarConfiguracion } from '../lib/config'

function leerFondo() {
  return {
    apariencia: loadJSON(STORAGE.apariencia, DEFAULT_APARIENCIA),
    wallpaper: loadStr(STORAGE.wallpaper),
  }
}

export default function Layout() {
  const [fondo, setFondo] = useState(leerFondo)
  const [cargado, setCargado] = useState(false)

  // Trae la configuración guardada en Supabase y la vuelca a localStorage
  // ANTES de montar las páginas, para que vean logo/portada/perfil/etc.
  useEffect(() => {
    let activo = true
    cargarConfiguracion().finally(() => {
      if (!activo) return
      setFondo(leerFondo())
      setCargado(true)
    })
    return () => {
      activo = false
    }
  }, [])

  // Re-lee el fondo cuando se cambia desde Configuración.
  useEffect(() => {
    const handler = () => setFondo(leerFondo())
    window.addEventListener(EVENT_APARIENCIA, handler)
    return () => window.removeEventListener(EVENT_APARIENCIA, handler)
  }, [])

  if (!cargado) {
    return (
      <div className="flex h-screen items-center justify-center bg-hmc-black text-hmc-muted">
        <span className="animate-pulse text-2xl font-bold italic text-hmc-white">hmc</span>
      </div>
    )
  }

  const tipo = fondo.apariencia.fondo
  const conImagen = tipo === 'imagen' && fondo.wallpaper

  const mainStyle =
    tipo === 'gradiente'
      ? { backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }
      : conImagen
        ? {
            backgroundImage: `url(${fondo.wallpaper})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
        : undefined

  return (
    <div className="flex h-screen bg-hmc-black text-hmc-white">
      <Sidebar />
      <main
        className={`relative flex-1 overflow-y-auto ${tipo === 'none' ? 'bg-hmc-black' : ''}`}
        style={mainStyle}
      >
        {/* Overlay oscuro para legibilidad sobre imagen */}
        {conImagen && <div className="pointer-events-none absolute inset-0 bg-black/70" />}
        <div className="relative p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
