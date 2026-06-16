import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  TbLayoutDashboard,
  TbBuildingSkyscraper,
  TbUsers,
  TbLayoutKanban,
  TbBike,
  TbFileInvoice,
  TbSettings,
  TbLogout,
} from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { STORAGE, EVENT_LOGO, loadStr } from '../lib/settings'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: TbLayoutDashboard },
  { to: '/empresas', label: 'Empresas', icon: TbBuildingSkyscraper },
  { to: '/contactos', label: 'Contactos', icon: TbUsers },
  { to: '/crm', label: 'CRM', icon: TbLayoutKanban },
  { to: '/productos', label: 'Productos', icon: TbBike },
  { to: '/cotizaciones', label: 'Cotizaciones', icon: TbFileInvoice },
]

const linkClass = ({ isActive }) =>
  [
    'flex items-center gap-3 rounded-md border-l-2 px-4 py-2.5 text-sm transition-colors',
    isActive
      ? 'border-hmc-white bg-hmc-gray text-hmc-white'
      : 'border-transparent text-hmc-muted hover:bg-hmc-gray hover:text-hmc-white',
  ].join(' ')

export default function Sidebar() {
  const navigate = useNavigate()
  const [logo, setLogo] = useState(() => loadStr(STORAGE.logo))

  // Refresca el logo cuando cambia desde Configuración.
  useEffect(() => {
    const handler = () => setLogo(loadStr(STORAGE.logo))
    window.addEventListener(EVENT_LOGO, handler)
    return () => window.removeEventListener(EVENT_LOGO, handler)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-hmc-border bg-hmc-black">
      <div className="px-6 py-8">
        {logo ? (
          <img src={logo} alt="Logo" className="h-8 object-contain" />
        ) : (
          <span className="text-3xl font-bold italic tracking-tight text-hmc-white">
            hmc
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <NavLink to="/configuracion" className={linkClass}>
          <TbSettings size={18} />
          <span>Configuración</span>
        </NavLink>

        <div className="my-2 border-t border-hmc-border" />

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm text-hmc-muted transition-colors hover:bg-hmc-gray hover:text-hmc-white"
        >
          <TbLogout size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
