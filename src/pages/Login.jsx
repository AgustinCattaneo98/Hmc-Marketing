import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { STORAGE, loadStr } from '../lib/settings'

export default function Login() {
  const navigate = useNavigate()
  const logo = loadStr(STORAGE.logo)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.')
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hmc-black px-4">
      <div className="w-full max-w-sm">
        {/* Identidad */}
        <div className="mb-10 text-center">
          {logo ? (
            <img src={logo} alt="Logo" className="mx-auto max-h-20 object-contain" />
          ) : (
            <h1 className="text-6xl font-bold italic tracking-widest text-hmc-white">
              hmc
            </h1>
          )}
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-hmc-muted">
            Handmade Cycles · Córdoba
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs uppercase tracking-wide text-hmc-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input px-4 py-2.5 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs uppercase tracking-wide text-hmc-muted"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input px-4 py-2.5 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-hmc-white py-2.5 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
