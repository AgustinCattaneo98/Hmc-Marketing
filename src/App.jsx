import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'

// Páginas con carga diferida (code-splitting): cada una se descarga recién
// cuando se visita, achicando el bundle inicial. Login queda eager (entrada).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Empresas = lazy(() => import('./pages/Empresas'))
const EmpresaDetalle = lazy(() => import('./pages/EmpresaDetalle'))
const Contactos = lazy(() => import('./pages/Contactos'))
const CRM = lazy(() => import('./pages/CRM'))
const CRMCalendario = lazy(() => import('./pages/CRMCalendario'))
const CRMActividades = lazy(() => import('./pages/CRMActividades'))
const CRMDetalle = lazy(() => import('./pages/CRMDetalle'))
const Productos = lazy(() => import('./pages/Productos'))
const ProductoDetalle = lazy(() => import('./pages/ProductoDetalle'))
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'))
const CotizacionEditor = lazy(() => import('./pages/CotizacionEditor'))
// Campañas: módulo ocultado de la navegación (tablas y db.js intactos)
const Configuracion = lazy(() => import('./pages/Configuracion'))

// Fallback mientras se descarga el chunk de la página.
function Cargando() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <span className="animate-pulse text-2xl font-bold italic text-hmc-white">hmc</span>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Login fuera del layout (sin sidebar) */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas: requieren sesión. Sidebar + contenido. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Suspense fallback={<Cargando />}><Dashboard /></Suspense>} />
        <Route path="/empresas" element={<Suspense fallback={<Cargando />}><Empresas /></Suspense>} />
        <Route path="/empresas/:id" element={<Suspense fallback={<Cargando />}><EmpresaDetalle /></Suspense>} />
        <Route path="/contactos" element={<Suspense fallback={<Cargando />}><Contactos /></Suspense>} />
        <Route path="/crm" element={<Suspense fallback={<Cargando />}><CRM /></Suspense>} />
        <Route path="/crm/calendario" element={<Suspense fallback={<Cargando />}><CRMCalendario /></Suspense>} />
        <Route path="/crm/actividades" element={<Suspense fallback={<Cargando />}><CRMActividades /></Suspense>} />
        <Route path="/crm/:id" element={<Suspense fallback={<Cargando />}><CRMDetalle /></Suspense>} />
        <Route path="/productos" element={<Suspense fallback={<Cargando />}><Productos /></Suspense>} />
        <Route path="/productos/:id" element={<Suspense fallback={<Cargando />}><ProductoDetalle /></Suspense>} />
        <Route path="/cotizaciones" element={<Suspense fallback={<Cargando />}><Cotizaciones /></Suspense>} />
        <Route path="/cotizaciones/:id" element={<Suspense fallback={<Cargando />}><CotizacionEditor /></Suspense>} />
        <Route path="/configuracion" element={<Suspense fallback={<Cargando />}><Configuracion /></Suspense>} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
