import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Maneja el estado de autenticación de Supabase.
// Retorna { user, session, loading }.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Sesión inicial (al montar / recargar la página).
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    // Suscripción a cambios de auth (login, logout, refresh de token).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user: session?.user ?? null, session, loading }
}
