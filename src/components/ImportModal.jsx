import { useMemo, useRef, useState } from 'react'
import { TbX, TbFileSpreadsheet, TbUpload, TbCheck, TbAlertTriangle } from 'react-icons/tb'

const MAX_FILAS = 500
const SEGMENTOS_VALIDOS = ['hotel', 'inmobiliaria', 'hostel', 'corporativo', 'otro']

// Configuración por tipo: qué campos del sistema existen y qué encabezados
// de Excel/CSV se aceptan para cada uno (case/acento-insensitive).
const CONFIG = {
  empresas: {
    titulo: 'Importar empresas',
    plantilla: '/plantillas/plantilla_empresas.csv',
    campos: [
      { campo: 'nombre', headers: ['nombre'], requerido: true },
      { campo: 'segmento', headers: ['segmento'] },
      { campo: 'ciudad', headers: ['ciudad'] },
      { campo: 'email', headers: ['email', 'correo'] },
      { campo: 'telefono', headers: ['telefono', 'tel'] },
      { campo: 'sitio_web', headers: ['sitio_web', 'web', 'sitio web', 'website'] },
      { campo: 'instagram', headers: ['instagram', 'ig'] },
      { campo: 'notas', headers: ['notas', 'observaciones'] },
    ],
  },
  contactos: {
    titulo: 'Importar contactos',
    plantilla: '/plantillas/plantilla_contactos.csv',
    campos: [
      { campo: 'nombre', headers: ['nombre'], requerido: true },
      { campo: 'apellido', headers: ['apellido'] },
      { campo: 'empresa_id', headers: ['empresa', 'empresa_id'], esEmpresa: true },
      { campo: 'cargo', headers: ['cargo', 'puesto'] },
      { campo: 'email', headers: ['email', 'correo'] },
      { campo: 'whatsapp', headers: ['whatsapp', 'telefono', 'tel'] },
      { campo: 'notas', headers: ['notas', 'observaciones'] },
    ],
  },
  productos: {
    titulo: 'Importar productos',
    plantilla: '/plantillas/plantilla_productos.csv',
    campos: [
      { campo: 'nombre', headers: ['nombre'], requerido: true },
      { campo: 'categoria_id', headers: ['categoria', 'rubro'], esCategoria: true },
      { campo: 'linea', headers: ['linea', 'line'] },
      { campo: 'descripcion', headers: ['descripcion', 'detalle'] },
      { campo: 'precio_usd', headers: ['precio', 'precio_usd', 'precio usd', 'usd'], esNumero: true },
      { campo: 'moneda', headers: ['moneda'], esMoneda: true },
      { campo: 'activo', headers: ['activo'], esBool: true },
    ],
  },
}

// Normaliza texto para comparar: minúsculas, sin acentos, sin espacios extremos.
const RANGO_ACENTOS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s) =>
  (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(RANGO_ACENTOS, '')

export default function ImportModal({ tipo, empresas = [], categorias = [], onClose, onImport }) {
  const cfg = CONFIG[tipo]
  const fileRef = useRef(null)

  const [step, setStep] = useState('subir') // subir | mapeo | importando | resumen
  const [fileName, setFileName] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [parseError, setParseError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState({ hecho: 0, total: 0 })
  const [resumen, setResumen] = useState(null)

  // Índice de empresas por nombre normalizado → id (para resolver empresa_id).
  const empresaPorNombre = useMemo(() => {
    const m = new Map()
    empresas.forEach((e) => m.set(norm(e.nombre), e.id))
    return m
  }, [empresas])

  // Índice de categorías por nombre normalizado → id (para resolver categoria_id).
  const categoriaPorNombre = useMemo(() => {
    const m = new Map()
    categorias.forEach((c) => m.set(norm(c.nombre), c.id))
    return m
  }, [categorias])

  // Mapeo campo del sistema → encabezado detectado en el archivo.
  const mapeo = useMemo(() => {
    const detectados = headers.map((h) => ({ original: h, n: norm(h) }))
    const out = {}
    cfg.campos.forEach(({ campo, headers: aceptados }) => {
      const aceptadosN = aceptados.map(norm)
      const found = detectados.find((d) => aceptadosN.includes(d.n))
      out[campo] = found ? found.original : null
    })
    return out
  }, [headers, cfg])

  // Convierte una fila cruda a payload del sistema.
  function mapRow(raw) {
    const data = {}
    cfg.campos.forEach(({ campo, esEmpresa, esCategoria, esNumero, esMoneda, esBool }) => {
      const header = mapeo[campo]
      const valor = header ? raw[header] : ''
      const limpio = (valor ?? '').toString().trim()

      if (esEmpresa) {
        data.empresa_id = limpio ? empresaPorNombre.get(norm(limpio)) ?? null : null
      } else if (esCategoria) {
        data.categoria_id = limpio ? categoriaPorNombre.get(norm(limpio)) ?? null : null
      } else if (esNumero) {
        const n = Number(limpio.replace(/\./g, '').replace(',', '.'))
        data[campo] = limpio === '' || Number.isNaN(n) ? null : n
      } else if (esMoneda) {
        data[campo] = norm(limpio) === 'ars' ? 'ARS' : 'USD'
      } else if (esBool) {
        data[campo] = limpio === '' ? true : !['no', 'false', '0', 'inactivo', 'inactiva'].includes(norm(limpio))
      } else if (campo === 'segmento') {
        if (!limpio) data.segmento = null
        else data.segmento = SEGMENTOS_VALIDOS.includes(norm(limpio))
          ? norm(limpio)
          : 'otro'
      } else {
        data[campo] = limpio === '' ? null : limpio
      }
    })
    return data
  }

  // Filas mapeadas (con número de fila original del Excel).
  const mapeadas = useMemo(() => {
    return rawRows.map((raw, i) => ({ fila: i + 2, data: mapRow(raw) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRows, mapeo, empresaPorNombre, categoriaPorNombre])

  const limitadas = mapeadas.slice(0, MAX_FILAS)
  const validas = limitadas.filter((r) => r.data.nombre)
  const sinNombre = limitadas.filter((r) => !r.data.nombre)
  const excede = mapeadas.length > MAX_FILAS
  const nombreSinMapear = !mapeo.nombre

  function parseFile(file) {
    setParseError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // xlsx se carga sólo cuando hace falta (no infla el bundle inicial).
        const XLSX = await import('xlsx')
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!json.length) {
          setParseError('El archivo no tiene filas de datos.')
          return
        }
        setHeaders(Object.keys(json[0]))
        setRawRows(json)
        setStep('mapeo')
      } catch (err) {
        setParseError('No se pudo leer el archivo: ' + err.message)
      }
    }
    reader.onerror = () => setParseError('No se pudo leer el archivo.')
    reader.readAsArrayBuffer(file)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  async function ejecutarImport() {
    setStep('importando')
    setProgress({ hecho: 0, total: validas.length })

    const { exitosos, errores } = await onImport(validas, (hecho, total) =>
      setProgress({ hecho, total })
    )

    // Suma los errores de validación (filas sin nombre) a los de persistencia.
    const erroresValidacion = sinNombre.map((r) => ({
      fila: r.fila,
      motivo: 'Falta el campo nombre (obligatorio)',
    }))

    setResumen({
      exitosos,
      errores: [...erroresValidacion, ...errores].sort((a, b) => a.fila - b.fila),
    })
    setStep('resumen')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-hmc-border bg-hmc-gray2 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hmc-border px-6 py-4">
          <h2 className="text-lg font-semibold text-hmc-white">{cfg.titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-hmc-muted transition-colors hover:text-hmc-white"
            aria-label="Cerrar"
          >
            <TbX size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {/* PASO 1: SUBIR */}
          {step === 'subir' && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={[
                  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
                  dragOver ? 'border-hmc-white bg-hmc-gray3/40' : 'border-hmc-border',
                ].join(' ')}
              >
                <TbUpload size={36} className="mb-3 text-hmc-muted" />
                <p className="text-sm text-hmc-white">
                  Arrastrá el archivo acá o
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 rounded-md bg-hmc-white px-4 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90"
                >
                  Seleccionar archivo
                </button>
                <p className="mt-3 text-xs text-hmc-muted">
                  Formatos: .xlsx, .xls, .csv — máximo {MAX_FILAS} filas
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              {parseError && (
                <p className="mt-4 text-sm text-red-400">{parseError}</p>
              )}

              <p className="mt-5 text-xs text-hmc-muted">
                ¿No sabés el formato?{' '}
                <a
                  href={cfg.plantilla}
                  download
                  className="text-hmc-white underline hover:opacity-80"
                >
                  Descargá la plantilla de ejemplo
                </a>
              </p>
            </>
          )}

          {/* PASO 2: MAPEO + PREVIEW */}
          {step === 'mapeo' && (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm text-hmc-white">
                <TbFileSpreadsheet size={18} className="text-hmc-muted" />
                <span className="truncate">{fileName}</span>
                <span className="text-hmc-muted">· {mapeadas.length} filas</span>
              </div>

              {nombreSinMapear && (
                <p className="mb-4 flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  <TbAlertTriangle size={16} />
                  No se detectó una columna “nombre”. Es obligatoria para importar.
                </p>
              )}

              {excede && (
                <p className="mb-4 flex items-center gap-2 rounded-md border border-yellow-900/50 bg-yellow-950/20 px-3 py-2 text-sm text-yellow-400">
                  <TbAlertTriangle size={16} />
                  El archivo tiene {mapeadas.length} filas. Se importarán solo las
                  primeras {MAX_FILAS}.
                </p>
              )}

              {/* Mapeo de columnas */}
              <p className="mb-2 text-xs uppercase tracking-wide text-hmc-muted">
                Mapeo de columnas
              </p>
              <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-md border border-hmc-border bg-hmc-gray3 p-4 text-sm">
                {cfg.campos.map(({ campo, requerido }) => (
                  <div key={campo} className="flex items-center justify-between gap-2">
                    <span className="text-hmc-muted">
                      {campo}
                      {requerido && <span className="text-red-400"> *</span>}
                    </span>
                    <span className="truncate text-hmc-white">
                      {mapeo[campo] ?? <span className="text-hmc-muted">—</span>}
                    </span>
                  </div>
                ))}
              </div>

              {/* Preview primeras 5 filas */}
              <p className="mb-2 text-xs uppercase tracking-wide text-hmc-muted">
                Vista previa (primeras 5 filas)
              </p>
              <div className="overflow-x-auto rounded-md border border-hmc-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-hmc-gray3">
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap border-b border-hmc-border px-3 py-2 font-medium text-hmc-muted"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-hmc-border last:border-b-0">
                        {headers.map((h) => (
                          <td
                            key={h}
                            className="whitespace-nowrap px-3 py-2 text-hmc-white"
                          >
                            {(row[h] ?? '').toString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PASO 3: IMPORTANDO */}
          {step === 'importando' && (
            <div className="py-8">
              <p className="mb-3 text-center text-sm text-hmc-white">
                Importando {progress.hecho} de {progress.total}…
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-hmc-gray3">
                <div
                  className="h-full bg-hmc-white transition-all"
                  style={{
                    width: progress.total
                      ? `${(progress.hecho / progress.total) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          )}

          {/* PASO 4: RESUMEN */}
          {step === 'resumen' && resumen && (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-md border border-green-900/50 bg-green-950/20 px-4 py-3 text-sm text-green-400">
                <TbCheck size={18} />
                {resumen.exitosos} registro{resumen.exitosos === 1 ? '' : 's'}{' '}
                importado{resumen.exitosos === 1 ? '' : 's'} correctamente
              </div>

              {resumen.errores.length > 0 && (
                <div className="rounded-md border border-red-900/50 bg-red-950/20 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm text-red-400">
                    <TbAlertTriangle size={16} />
                    {resumen.errores.length} error
                    {resumen.errores.length === 1 ? '' : 'es'}
                  </p>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-hmc-muted">
                    {resumen.errores.map((e, i) => (
                      <li key={i}>
                        Fila {e.fila}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-hmc-border px-6 py-4">
          {step === 'mapeo' && (
            <>
              <button
                type="button"
                onClick={() => setStep('subir')}
                className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={ejecutarImport}
                disabled={nombreSinMapear || validas.length === 0}
                className="rounded-md bg-hmc-white px-5 py-2 text-sm font-semibold text-hmc-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Importar {validas.length} registro{validas.length === 1 ? '' : 's'}
              </button>
            </>
          )}
          {(step === 'subir' || step === 'resumen') && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-hmc-border px-4 py-2 text-sm text-hmc-white transition-colors hover:bg-hmc-gray3"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
