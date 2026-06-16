import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  // Mientras se resuelve la sesión, spinner centrado sobre negro.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hmc-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hmc-border border-t-hmc-white" />
      </div>
    )
  }

  // Sin sesión → al login.
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
