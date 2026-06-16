import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TbBuilding,
  TbUser,
  TbPalette,
  TbMail,
  TbPlug,
  TbShield,
  TbTrash,
  TbDownload,
  TbLogout,
  TbEye,
  TbEyeOff,
  TbChevronDown,
  TbChevronRight,
  TbFileSpreadsheet,
} from 'react-icons/tb'
import { supabase } from '../lib/supabase'
import { exportarBaseDatos } from '../lib/exportar'
import { useAuth } from '../hooks/useAuth'
import { iniciales } from '../lib/utils'
import { applyTema, applyAccent } from '../lib/theme'
import Toast from '../components/Toast'
import {
  STORAGE,
  EVENT_LOGO,
  EVENT_APARIENCIA,
  DEFAULT_EMPRESA,
  DEFAULT_PERFIL,
  DEFAULT_FIRMA,
  DEFAULT_APARIENCIA,
  DEFAULT_EMAIL_CONFIG,
  DEFAULT_INTEGRACIONES,
  loadJSON,
  saveJSON,
  loadStr,
  saveStr,
  fileToBase64,
} from '../lib/settings'

const TABS = [
  { key: 'empresa', label: 'Empresa', icon: TbBuilding },
  { key: 'perfil', label: 'Perfil', icon: TbUser },
  { key: 'apariencia', label: 'Apariencia', icon: TbPalette },
  { key: 'email', label: 'Email', icon: TbMail },
  { key: 'integraciones', label: 'Integraciones', icon: TbPlug },
  { key: 'cuenta', label: 'Cuenta', icon: TbShield },
]

const inputClass =
  'w-full rounded-md border border-hmc-border bg-hmc-gray2 px-3 py-2 text-sm text-hmc-white outline-none transition-colors focus:border-hmc-white placeholder:text-hmc-muted'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-hmc-muted'

function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 border-b border-hmc-border pb-2 text-sm uppercase tracking-wide text-hmc-muted">
      {children}
    </h3>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-hmc-gray3'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SaveButton({ onClick, children = 'Guardar cambios' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  )
}

export default function Configuracion() {
  const [tab, setTab] = useState('empresa')
  const [toast, setToast] = useState({ visible: false, mensaje: '' })

  function showToast(mensaje = 'Cambios guardados') {
    setToast({ visible: true, mensaje })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-hmc-white">Configuración</h1>
        <p className="mt-1 text-sm text-hmc-muted">Preferencias del sistema</p>
      </div>

      <div className="flex gap-6">
        {/* Tabs laterales */}
        <div className="w-[180px] shrink-0 border-r border-hmc-border pr-2">
          <div className="flex flex-col gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={[
                  'flex items-center gap-2.5 rounded-md border-l-2 px-3.5 py-2.5 text-sm transition-colors',
                  tab === key
                    ? 'border-hmc-white bg-hmc-gray2 text-hmc-white'
                    : 'border-transparent text-hmc-muted hover:text-hmc-white',
                ].join(' ')}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="max-w-[560px] flex-1">
          {tab === 'empresa' && <TabEmpresa showToast={showToast} />}
          {tab === 'perfil' && <TabPerfil showToast={showToast} />}
          {tab === 'apariencia' && <TabApariencia />}
          {tab === 'email' && <TabEmail showToast={showToast} />}
          {tab === 'integraciones' && <TabIntegraciones showToast={showToast} />}
          {tab === 'cuenta' && <TabCuenta />}
        </div>
      </div>

      <Toast
        visible={toast.visible}
        mensaje={toast.mensaje}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  )
}

// ============================== TAB EMPRESA ==============================
function TabEmpresa({ showToast }) {
  const [logo, setLogo] = useState(() => loadStr(STORAGE.logo))
  const [portada, setPortada] = useState(() => loadStr(STORAGE.dashboardCover))
  const [form, setForm] = useState(() => loadJSON(STORAGE.empresa, DEFAULT_EMPRESA))
  const fileRef = useRef(null)
  const portadaRef = useRef(null)

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    setLogo(base64)
    saveStr(STORAGE.logo, base64)
    window.dispatchEvent(new Event(EVENT_LOGO))
  }

  function eliminarLogo() {
    setLogo('')
    saveStr(STORAGE.logo, '')
    window.dispatchEvent(new Event(EVENT_LOGO))
  }

  async function handlePortada(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    setPortada(base64)
    saveStr(STORAGE.dashboardCover, base64)
  }

  function eliminarPortada() {
    setPortada('')
    saveStr(STORAGE.dashboardCover, '')
  }

  function guardar() {
    saveJSON(STORAGE.empresa, form)
    showToast()
  }

  return (
    <div>
      <SectionTitle>Identidad de la marca</SectionTitle>

      {/* Logo */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border border-hmc-border bg-hmc-gray2">
          {logo ? (
            <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-2xl font-bold italic text-hmc-white">hmc</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
            >
              Cambiar logo
            </button>
            {logo && (
              <button
                type="button"
                onClick={eliminarLogo}
                className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-muted transition-colors hover:text-red-400"
              >
                Eliminar
              </button>
            )}
          </div>
          <p className="text-xs text-hmc-muted">
            Se usa en sidebar, login y header de emails.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogo}
          />
        </div>
      </div>

      {/* Portada del dashboard */}
      <div className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-wide text-hmc-muted">Portada del dashboard</p>
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-36 items-center justify-center overflow-hidden rounded-md border border-hmc-border bg-hmc-gray2">
            {portada ? (
              <img src={portada} alt="Portada" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{ backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)' }}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => portadaRef.current?.click()}
                className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
              >
                Cambiar portada
              </button>
              {portada && (
                <button
                  type="button"
                  onClick={eliminarPortada}
                  className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-muted transition-colors hover:text-red-400"
                >
                  Eliminar
                </button>
              )}
            </div>
            <p className="text-xs text-hmc-muted">Imagen de fondo del hero del Dashboard.</p>
            <input
              ref={portadaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePortada}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre de la marca">
            <input className={inputClass} value={form.nombre} onChange={(e) => update('nombre', e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Slogan">
            <input className={inputClass} value={form.slogan} onChange={(e) => update('slogan', e.target.value)} />
          </Field>
        </div>
        <Field label="Sitio web">
          <input className={inputClass} value={form.sitio_web} onChange={(e) => update('sitio_web', e.target.value)} />
        </Field>
        <Field label="Email institucional">
          <input className={inputClass} value={form.email} onChange={(e) => update('email', e.target.value)} />
        </Field>
        <Field label="WhatsApp comercial">
          <input className={inputClass} value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />
        </Field>
        <Field label="Instagram">
          <input className={inputClass} value={form.instagram} onChange={(e) => update('instagram', e.target.value)} />
        </Field>
        <Field label="Ciudad / sede">
          <input className={inputClass} value={form.ciudad} onChange={(e) => update('ciudad', e.target.value)} />
        </Field>
        <Field label="Zona comercial">
          <input className={inputClass} value={form.zona} onChange={(e) => update('zona', e.target.value)} />
        </Field>
        <Field label="CUIT (opcional)">
          <input className={inputClass} value={form.cuit} onChange={(e) => update('cuit', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descripción corta (pie de emails)">
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={form.descripcion}
              onChange={(e) => update('descripcion', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <SaveButton onClick={guardar} />
    </div>
  )
}

// ============================== TAB PERFIL ==============================
function TabPerfil({ showToast }) {
  const [foto, setFoto] = useState(() => loadStr(STORAGE.perfilFoto))
  const [form, setForm] = useState(() => loadJSON(STORAGE.perfil, DEFAULT_PERFIL))
  const [firma, setFirma] = useState(() => loadStr(STORAGE.firma) || DEFAULT_FIRMA)
  const fileRef = useRef(null)

  function update(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }))
  }

  async function handleFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    setFoto(base64)
    saveStr(STORAGE.perfilFoto, base64)
  }

  function guardar() {
    saveJSON(STORAGE.perfil, form)
    saveStr(STORAGE.firma, firma)
    showToast()
  }

  return (
    <div>
      <SectionTitle>Perfil</SectionTitle>

      <div className="mb-6 flex items-center gap-4">
        {foto ? (
          <img
            src={foto}
            alt=""
            className="h-16 w-16 rounded-full border border-hmc-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-hmc-border bg-hmc-gray3 text-lg font-semibold text-hmc-white">
            {iniciales(form.nombre, form.apellido)}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
        >
          Subir foto
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input className={inputClass} value={form.nombre} onChange={(e) => update('nombre', e.target.value)} />
        </Field>
        <Field label="Apellido">
          <input className={inputClass} value={form.apellido} onChange={(e) => update('apellido', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Rol">
            <input className={inputClass} value={form.rol} onChange={(e) => update('rol', e.target.value)} />
          </Field>
        </div>
        <Field label="Teléfono / WhatsApp">
          <input className={inputClass} value={form.telefono} onChange={(e) => update('telefono', e.target.value)} />
        </Field>
        <Field label="Email de contacto">
          <input className={inputClass} value={form.email} onChange={(e) => update('email', e.target.value)} />
        </Field>
        <Field label="Ciudad">
          <input className={inputClass} value={form.ciudad} onChange={(e) => update('ciudad', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Bio / Presentación corta">
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="mt-6">
        <Field label="Firma de email">
          <textarea
            rows={4}
            className={`${inputClass} resize-none whitespace-pre-line`}
            value={firma}
            onChange={(e) => setFirma(e.target.value)}
          />
        </Field>
      </div>

      <SaveButton onClick={guardar} />
    </div>
  )
}

// ============================== TAB APARIENCIA ==============================
const ACCENTS = [
  { label: 'Blanco', value: '#f0f0ea' },
  { label: 'Azul', value: '#378add' },
  { label: 'Verde', value: '#1d9e75' },
  { label: 'Coral', value: '#d85a30' },
  { label: 'Ámbar', value: '#ba7517' },
  { label: 'Violeta', value: '#8b5cf6' },
]

function TabApariencia() {
  const [apariencia, setApariencia] = useState(() =>
    loadJSON(STORAGE.apariencia, DEFAULT_APARIENCIA)
  )
  const [wallpaper, setWallpaper] = useState(() => loadStr(STORAGE.wallpaper))
  const fileRef = useRef(null)

  function persistir(next) {
    setApariencia(next)
    saveJSON(STORAGE.apariencia, next)
    window.dispatchEvent(new Event(EVENT_APARIENCIA))
  }

  function setTema(tema) {
    applyTema(tema)
    persistir({ ...apariencia, tema })
  }

  function setFondo(fondo) {
    persistir({ ...apariencia, fondo })
  }

  async function handleWallpaper(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    setWallpaper(base64)
    saveStr(STORAGE.wallpaper, base64)
    persistir({ ...apariencia, fondo: 'imagen' })
  }

  function eliminarFondo() {
    setWallpaper('')
    saveStr(STORAGE.wallpaper, '')
    persistir({ ...apariencia, fondo: 'none' })
  }

  function setAccent(color) {
    applyAccent(color)
    persistir({ ...apariencia, accentBtn: color })
  }

  // Estilo del preview de fondo.
  const previewStyle =
    apariencia.fondo === 'gradiente'
      ? { backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }
      : apariencia.fondo === 'imagen' && wallpaper
        ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: '#0a0a0a' }

  const accentTexto = apariencia.accentBtn === '#f0f0ea' ? '#0a0a0a' : '#ffffff'

  return (
    <div>
      <SectionTitle>Tema</SectionTitle>
      <div className="mb-6 flex gap-3">
        {[
          { key: 'oscuro', label: 'Oscuro', emoji: '🌑', bg: '#0a0a0a', fg: '#f0f0ea' },
          { key: 'claro', label: 'Claro', emoji: '☀️', bg: '#ffffff', fg: '#111111' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTema(t.key)}
            className={`flex flex-col items-center gap-2 rounded-md border-2 p-3 transition-colors ${
              apariencia.tema === t.key ? 'border-hmc-white' : 'border-hmc-border'
            }`}
          >
            <div
              className="flex h-[60px] w-20 items-center justify-center rounded text-xs"
              style={{ backgroundColor: t.bg, color: t.fg }}
            >
              {t.emoji}
            </div>
            <span className="text-xs text-hmc-white">{t.label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Fondo de pantalla</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { key: 'none', label: 'Sin fondo' },
          { key: 'gradiente', label: 'Gradiente sutil' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFondo(f.key)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              apariencia.fondo === f.key
                ? 'bg-hmc-white text-hmc-black'
                : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            apariencia.fondo === 'imagen'
              ? 'bg-hmc-white text-hmc-black'
              : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'
          }`}
        >
          Subir imagen
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
      </div>

      {/* Preview */}
      <div className="mb-2 flex items-end gap-3">
        <div
          className="relative h-[120px] w-[200px] overflow-hidden rounded-md border border-hmc-border"
          style={previewStyle}
        >
          {apariencia.fondo === 'imagen' && wallpaper && (
            <div className="absolute inset-0 bg-black/70" />
          )}
        </div>
        {apariencia.fondo === 'imagen' && wallpaper && (
          <button
            type="button"
            onClick={eliminarFondo}
            className="rounded-md border border-hmc-border px-3 py-1.5 text-sm text-hmc-muted transition-colors hover:text-red-400"
          >
            Eliminar fondo
          </button>
        )}
      </div>

      <SectionTitle>Color de acento</SectionTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ACCENTS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAccent(a.value)}
            title={a.label}
            className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
              apariencia.accentBtn === a.value ? 'border-hmc-white' : 'border-hmc-border'
            }`}
            style={{ backgroundColor: a.value }}
          />
        ))}
        <input
          type="color"
          value={apariencia.accentBtn}
          onChange={(e) => setAccent(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-hmc-border bg-transparent"
          title="Color personalizado"
        />
      </div>

      {/* Preview botón */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-hmc-muted">Vista previa:</span>
        <span
          className="rounded-md px-5 py-2 text-sm font-semibold"
          style={{ backgroundColor: apariencia.accentBtn, color: accentTexto }}
        >
          Botón primario
        </span>
      </div>
    </div>
  )
}

// ============================== TAB EMAIL ==============================
function TabEmail({ showToast }) {
  const [cfg, setCfg] = useState(() => loadJSON(STORAGE.emailConfig, DEFAULT_EMAIL_CONFIG))

  function update(f, v) {
    setCfg((prev) => ({ ...prev, [f]: v }))
  }

  function guardar() {
    saveJSON(STORAGE.emailConfig, cfg)
    showToast('Configuración guardada')
  }

  const toggles = [
    { key: 'personalizar_asunto', label: 'Personalizar asunto por contacto (reemplaza [Nombre])' },
    { key: 'copia_mi', label: 'Enviar copia a mí mismo' },
    { key: 'cc_santi', label: 'CC automático a Santi (hmcbicicletas@gmail.com)' },
    { key: 'rastrear_aperturas', label: 'Rastrear aperturas' },
    { key: 'rastrear_clics', label: 'Rastrear clics' },
  ]

  const selClass = inputClass

  return (
    <div>
      <SectionTitle>Remitente</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-4">
        <Field label="Nombre del remitente">
          <input className={inputClass} value={cfg.remitente_nombre} onChange={(e) => update('remitente_nombre', e.target.value)} />
        </Field>
        <Field label="Email de envío">
          <input className={inputClass} value={cfg.remitente_email} onChange={(e) => update('remitente_email', e.target.value)} />
        </Field>
        <Field label="Email de respuesta (reply-to)">
          <input className={inputClass} value={cfg.reply_to} onChange={(e) => update('reply_to', e.target.value)} />
        </Field>
      </div>

      <SectionTitle>Comportamiento</SectionTitle>
      <div className="mb-6 flex flex-col gap-3">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-hmc-white">{t.label}</span>
            <Toggle checked={!!cfg[t.key]} onChange={(v) => update(t.key, v)} />
          </div>
        ))}
      </div>

      <SectionTitle>Follow-up automático</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Primer recordatorio">
          <select className={selClass} value={cfg.fu_primer} onChange={(e) => update('fu_primer', e.target.value)}>
            {['3', '5', '7'].map((d) => <option key={d} value={d}>{d} días</option>)}
          </select>
        </Field>
        <Field label="Segundo recordatorio">
          <select className={selClass} value={cfg.fu_segundo} onChange={(e) => update('fu_segundo', e.target.value)}>
            {['7', '10', '14'].map((d) => <option key={d} value={d}>{d} días</option>)}
          </select>
        </Field>
        <Field label="Archivar si no responde">
          <select className={selClass} value={cfg.fu_archivar} onChange={(e) => update('fu_archivar', e.target.value)}>
            {['30', '60', '90'].map((d) => <option key={d} value={d}>{d} días</option>)}
          </select>
        </Field>
      </div>

      <SectionTitle>Pie de email</SectionTitle>
      <textarea
        rows={4}
        className={`${inputClass} resize-none whitespace-pre-line`}
        value={cfg.pie}
        onChange={(e) => update('pie', e.target.value)}
      />

      <SaveButton onClick={guardar} children="Guardar configuración" />
    </div>
  )
}

// ============================== TAB INTEGRACIONES ==============================
function PasswordField({ label, value, onChange, placeholder, nota, link }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`${inputClass} pr-10`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-hmc-muted transition-colors hover:text-hmc-white"
          aria-label={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? <TbEyeOff size={16} /> : <TbEye size={16} />}
        </button>
      </div>
      {nota && <p className="mt-1 text-xs text-hmc-muted">{nota}</p>}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-[#7fb8e8] hover:underline"
        >
          Ir a configuración →
        </a>
      )}
    </div>
  )
}

function EstadoConexion({ conectado }) {
  return conectado ? (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: '#4a9910', color: '#4a9', border: '0.5px solid #4a9940' }}
    >
      Conectado
    </span>
  ) : (
    <span className="inline-flex items-center rounded bg-hmc-gray3 px-2 py-0.5 text-xs font-medium text-hmc-muted">
      Sin configurar
    </span>
  )
}

function IntegracionCard({ titulo, conectado, children }) {
  return (
    <div className="mb-3 rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-medium text-hmc-white">{titulo}</h4>
        {conectado !== undefined && <EstadoConexion conectado={conectado} />}
      </div>
      {children}
    </div>
  )
}

// Selector tipo radio entre dos opciones.
function SelectorMetodo({ opciones, valor, onChange }) {
  return (
    <div className="mb-4 flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
            valor === o.value
              ? 'bg-hmc-white text-hmc-black'
              : 'border border-hmc-border text-hmc-muted hover:text-hmc-white'
          }`}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
              valor === o.value ? 'border-hmc-black' : 'border-hmc-muted'
            }`}
          >
            {valor === o.value && <span className="h-1.5 w-1.5 rounded-full bg-hmc-black" />}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SeccionSaveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
    >
      Guardar credenciales
    </button>
  )
}

function TabIntegraciones({ showToast }) {
  const [cfg, setCfg] = useState(() => loadJSON(STORAGE.integraciones, DEFAULT_INTEGRACIONES))
  const [resendAbierto, setResendAbierto] = useState(false)
  const [otrosAbierto, setOtrosAbierto] = useState(false)

  function update(f, v) {
    setCfg((prev) => ({ ...prev, [f]: v }))
  }

  function guardar(mensaje = 'Credenciales guardadas') {
    saveJSON(STORAGE.integraciones, cfg)
    showToast(mensaje)
  }

  // Estados de conexión (campos requeridos con valor).
  const gmailOk = !!(cfg.gmail_address && cfg.gmail_app_password)
  const resendOk = !!cfg.resend_api_key
  const emailOk = cfg.email_servicio === 'resend' ? resendOk : gmailOk
  const metaOk = !!(cfg.phone_number_id && cfg.access_token)
  const twilioOk = !!(cfg.account_sid && cfg.auth_token)
  const waOk = cfg.wa_metodo === 'twilio' ? twilioOk : metaOk
  const notionOk = !!cfg.notion_token

  return (
    <div>
      {/* Aviso de seguridad */}
      <div
        className="mb-5 rounded-md"
        style={{ background: '#ca410', border: '0.5px solid #ca440', padding: '12px 14px' }}
      >
        <div style={{ color: '#ca4', fontSize: 12, fontWeight: 500 }}>
          ⚠️ Seguridad de credenciales
        </div>
        <div style={{ color: '#ca4', fontSize: 11, marginTop: 4, opacity: 0.8 }}>
          Estas credenciales se guardan únicamente en tu navegador (localStorage). No se
          envían a ningún servidor externo. No compartas este dispositivo con personas no
          autorizadas.
        </div>
      </div>

      {/* EMAIL */}
      <SectionTitle>Email</SectionTitle>
      <IntegracionCard titulo="📧 Gmail API" conectado={emailOk}>
        <SelectorMetodo
          opciones={[
            { value: 'gmail', label: 'Gmail SMTP' },
            { value: 'resend', label: 'Resend API' },
          ]}
          valor={cfg.email_servicio}
          onChange={(v) => update('email_servicio', v)}
        />

        <div className="flex flex-col gap-4">
          <Field label="Gmail Address">
            <input
              className={inputClass}
              value={cfg.gmail_address}
              onChange={(e) => update('gmail_address', e.target.value)}
              placeholder="tu@gmail.com"
            />
          </Field>
          <PasswordField
            label="Gmail App Password"
            value={cfg.gmail_app_password}
            onChange={(v) => update('gmail_app_password', v)}
            placeholder="xxxx xxxx xxxx xxxx"
            nota="Generá una contraseña de aplicación en myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación"
            link="https://myaccount.google.com/apppasswords"
          />
        </div>

        {/* Sub-sección Resend */}
        <button
          type="button"
          onClick={() => setResendAbierto((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-sm text-hmc-muted transition-colors hover:text-hmc-white"
        >
          {resendAbierto ? <TbChevronDown size={16} /> : <TbChevronRight size={16} />}
          O usar Resend (recomendado)
        </button>
        {resendAbierto && (
          <div className="mt-3">
            <PasswordField
              label="Resend API Key"
              value={cfg.resend_api_key}
              onChange={(v) => update('resend_api_key', v)}
              placeholder="re_xxxxxxxxxxxxxxxx"
              nota="Obtené tu API key gratis en resend.com"
              link="https://resend.com/signup"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <SeccionSaveButton onClick={() => guardar()} />
          <button
            type="button"
            onClick={() => showToast('Verificación disponible próximamente')}
            className="mt-4 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
          >
            Verificar conexión
          </button>
        </div>
      </IntegracionCard>

      {/* WHATSAPP */}
      <SectionTitle>WhatsApp</SectionTitle>
      <IntegracionCard titulo="💬 WhatsApp API" conectado={waOk}>
        <SelectorMetodo
          opciones={[
            { value: 'meta', label: 'Meta API' },
            { value: 'twilio', label: 'Twilio' },
          ]}
          valor={cfg.wa_metodo}
          onChange={(v) => update('wa_metodo', v)}
        />

        {cfg.wa_metodo === 'meta' ? (
          <div className="flex flex-col gap-4">
            <Field label="Phone Number ID">
              <input
                className={inputClass}
                value={cfg.phone_number_id}
                onChange={(e) => update('phone_number_id', e.target.value)}
                placeholder="1234567890"
              />
            </Field>
            <PasswordField
              label="Access Token (Permanent)"
              value={cfg.access_token}
              onChange={(v) => update('access_token', v)}
              placeholder="EAAxxxxxxx..."
            />
            <Field label="Business Account ID">
              <input
                className={inputClass}
                value={cfg.business_account_id}
                onChange={(e) => update('business_account_id', e.target.value)}
                placeholder="1234567890"
              />
            </Field>
            <Field label="Webhook Verify Token">
              <input
                className={inputClass}
                value={cfg.webhook_verify_token}
                onChange={(e) => update('webhook_verify_token', e.target.value)}
                placeholder="mi_token_secreto"
              />
            </Field>
            <p className="text-xs text-hmc-muted">
              Configurá tu app en developers.facebook.com → WhatsApp → Getting Started.{' '}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#7fb8e8] hover:underline"
              >
                Ir a configuración →
              </a>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Account SID">
              <input
                className={inputClass}
                value={cfg.account_sid}
                onChange={(e) => update('account_sid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxx"
              />
            </Field>
            <PasswordField
              label="Auth Token"
              value={cfg.auth_token}
              onChange={(v) => update('auth_token', v)}
              placeholder="xxxxxxxxxxxxxxxx"
            />
            <Field label="WhatsApp Number">
              <input
                className={inputClass}
                value={cfg.whatsapp_number}
                onChange={(e) => update('whatsapp_number', e.target.value)}
                placeholder="+14155238886"
              />
            </Field>
            <p className="text-xs text-hmc-muted">
              Obtené tus credenciales en{' '}
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#7fb8e8] hover:underline"
              >
                console.twilio.com →
              </a>
            </p>
          </div>
        )}

        <SeccionSaveButton onClick={() => guardar()} />
      </IntegracionCard>

      {/* NOTION */}
      <SectionTitle>Notion (opcional)</SectionTitle>
      <IntegracionCard titulo="📓 Notion Integration" conectado={notionOk}>
        <div className="flex flex-col gap-4">
          <PasswordField
            label="Integration Token"
            value={cfg.notion_token}
            onChange={(v) => update('notion_token', v)}
            placeholder="secret_xxxxxxxxxxxxxxxx"
            nota="Creá una integración en notion.so/my-integrations"
            link="https://notion.so/my-integrations"
          />
          <Field label="Database ID (para sincronizar prospectos)">
            <input
              className={inputClass}
              value={cfg.notion_database_id}
              onChange={(e) => update('notion_database_id', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <SeccionSaveButton onClick={() => guardar()} />
          <button
            type="button"
            onClick={() => showToast('Próximamente')}
            className="mt-4 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
          >
            Verificar conexión
          </button>
        </div>
      </IntegracionCard>

      {/* OTROS / FUTUROS */}
      <div className="mb-3 rounded-lg border border-hmc-border bg-hmc-gray2 p-4">
        <button
          type="button"
          onClick={() => setOtrosAbierto((v) => !v)}
          className="flex w-full items-center gap-1.5 text-sm font-medium text-hmc-white"
        >
          {otrosAbierto ? <TbChevronDown size={16} /> : <TbChevronRight size={16} />}
          🔧 Otras integraciones (próximamente)
        </button>
        {otrosAbierto && (
          <div className="mt-4 flex flex-col gap-2">
            {['Mailchimp', 'Mercado Pago', 'Google Calendar', 'Slack'].map((n) => (
              <div
                key={n}
                className="flex items-center justify-between rounded-md border border-hmc-border px-3 py-2"
              >
                <span className="text-sm text-hmc-muted">{n}</span>
                <span className="rounded bg-hmc-gray3 px-2 py-0.5 text-xs text-hmc-muted">
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================== TAB CUENTA ==============================
function TabCuenta() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pass, setPass] = useState({ actual: '', nueva: '', confirmar: '' })
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const [exportando, setExportando] = useState(false)

  async function descargarExcel() {
    setExportando(true)
    const { error } = await exportarBaseDatos()
    setExportando(false)
    if (error) setMsg({ tipo: 'error', texto: error })
  }

  async function cambiarPassword() {
    setMsg({ tipo: '', texto: '' })
    if (!pass.nueva || pass.nueva.length < 6)
      return setMsg({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' })
    if (pass.nueva !== pass.confirmar)
      return setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })

    const { error } = await supabase.auth.updateUser({ password: pass.nueva })
    if (error) return setMsg({ tipo: 'error', texto: 'Error: ' + error.message })
    setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' })
    setPass({ actual: '', nueva: '', confirmar: '' })
  }

  function exportarDatos() {
    const data = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('hmc_')) data[k] = localStorage.getItem(k)
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hmc_configuracion.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function limpiarCache() {
    if (!window.confirm('¿Borrar todas las preferencias locales (logo, perfil, apariencia, etc.)?'))
      return
    Object.keys(localStorage)
      .filter((k) => k.startsWith('hmc_'))
      .forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <SectionTitle>Seguridad</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-4">
        <Field label="Email actual">
          <input className={`${inputClass} opacity-70`} value={user?.email ?? ''} readOnly />
        </Field>
        <Field label="Contraseña actual">
          <input
            type="password"
            className={inputClass}
            value={pass.actual}
            onChange={(e) => setPass((p) => ({ ...p, actual: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nueva contraseña">
            <input
              type="password"
              className={inputClass}
              value={pass.nueva}
              onChange={(e) => setPass((p) => ({ ...p, nueva: e.target.value }))}
            />
          </Field>
          <Field label="Confirmar">
            <input
              type="password"
              className={inputClass}
              value={pass.confirmar}
              onChange={(e) => setPass((p) => ({ ...p, confirmar: e.target.value }))}
            />
          </Field>
        </div>
        {msg.texto && (
          <p className={`text-sm ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.texto}
          </p>
        )}
        <div>
          <button
            type="button"
            onClick={cambiarPassword}
            className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
          >
            Cambiar contraseña
          </button>
        </div>
      </div>

      <SectionTitle>Datos</SectionTitle>
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={descargarExcel}
          disabled={exportando}
          className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3 disabled:opacity-60"
        >
          <TbFileSpreadsheet size={16} />
          {exportando ? 'Exportando…' : 'Exportar base de datos (Excel)'}
        </button>
        <button
          type="button"
          onClick={exportarDatos}
          className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
        >
          <TbDownload size={16} />
          Exportar preferencias
        </button>
        <button
          type="button"
          onClick={limpiarCache}
          className="inline-flex items-center gap-2 rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
        >
          <TbTrash size={16} />
          Limpiar caché local
        </button>
      </div>

      <SectionTitle>Peligro</SectionTitle>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-950/50"
      >
        <TbLogout size={16} />
        Cerrar sesión
      </button>
    </div>
  )
}
