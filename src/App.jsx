import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Empresas from './pages/Empresas'
import EmpresaDetalle from './pages/EmpresaDetalle'
import Contactos from './pages/Contactos'
import CRM from './pages/CRM'
import CRMCalendario from './pages/CRMCalendario'
import CRMActividades from './pages/CRMActividades'
import CRMDetalle from './pages/CRMDetalle'
import Productos from './pages/Productos'
import ProductoDetalle from './pages/ProductoDetalle'
import Cotizaciones from './pages/Cotizaciones'
import CotizacionEditor from './pages/CotizacionEditor'
// Campañas: módulo ocultado de la navegación (tablas y db.js intactos)
import Configuracion from './pages/Configuracion'

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/empresas/:id" element={<EmpresaDetalle />} />
        <Route path="/contactos" element={<Contactos />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/crm/calendario" element={<CRMCalendario />} />
        <Route path="/crm/actividades" element={<CRMActividades />} />
        <Route path="/crm/:id" element={<CRMDetalle />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/productos/:id" element={<ProductoDetalle />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
        <Route path="/cotizaciones/:id" element={<CotizacionEditor />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
