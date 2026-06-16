import { useState, useEffect } from 'react'
import { getCotizacionDolar } from '../lib/dolar'

export function useDolar() {
  const [cotizacion, setCotizacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchDolar() {
    setLoading(true)
    try {
      const data = await getCotizacionDolar()
      setCotizacion(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDolar()
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchDolar, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { cotizacion, loading, error, refetch: fetchDolar }
}
