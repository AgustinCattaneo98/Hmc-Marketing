import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { applyAparienciaInicial, aplicarFavicon } from './lib/theme'
import { EVENT_LOGO } from './lib/settings'
import { ConfirmProvider } from './components/confirm'

// Aplica tema / acento / favicon guardados antes del primer render.
applyAparienciaInicial()
// Mantiene el favicon sincronizado cuando se cambia el logo en Configuración.
window.addEventListener(EVENT_LOGO, aplicarFavicon)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
