import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ETAPAS } from '../lib/crm'

function inicioPeriodo(p) {
  const now = new Date()
  if (p === 'hoy') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (p === 'semana') return new Date(now.getTime() - 7 * 86400000).toISOString()
  if (p === 'mes') return new Date(now.getTime() - 30 * 86400000).toISOString()
  return new Date(now.getTime() - 365 * 86400000).toISOString()
}

// Buckets temporales para el gráfico de actividad según el período.
function buckets(p) {
  const now = new Date()
  const arr = []
  if (p === 'hoy') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now)
      d.setMinutes(0, 0, 0)
      d.setHours(now.getHours() - i)
      arr.push({ label: `${d.getHours()}h`, start: d.getTime(), end: d.getTime() + 3600000 })
    }
  } else if (p === 'semana') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(now.getDate() - i)
      arr.push({ label: d.toLocaleDateString('es-AR', { weekday: 'short' }), start: d.getTime(), end: d.getTime() + 86400000 })
    }
  } else if (p === 'mes') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(now.getDate() - i)
      arr.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, start: d.getTime(), end: d.getTime() + 86400000 })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      arr.push({ label: d.toLocaleDateString('es-AR', { month: 'short' }), start: d.getTime(), end: end.getTime() })
    }
  }
  return arr
}

function contarEnBuckets(serie, fechas) {
  const counts = serie.map(() => 0)
  for (const f of fechas) {
    const t = new Date(f).getTime()
    for (let i = 0; i < serie.length; i++) {
      if (t >= serie[i].start && t < serie[i].end) {
        counts[i]++
        break
      }
    }
  }
  return counts
}

export function useDashboard(periodo) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const inicio = inicioPeriodo(periodo)
      const ahora = new Date().toISOString()
      const serie = buckets(periodo)
      const serieInicio = new Date(serie[0].start).toISOString()

      const [
        empCount,
        conCount,
        ganadas,
        pipelineRows,
        cotEnv,
        pendVenc,
        etapaRows,
        empTime,
        conTime,
        pendientes,
        enProceso,
        ultEmpresas,
        cotizaciones,
        productosRows,
        ventasRows,
      ] = await Promise.all([
        supabase.from('empresas').select('*', { count: 'exact', head: true }).gte('created_at', inicio),
        supabase.from('contactos').select('*', { count: 'exact', head: true }).gte('created_at', inicio),
        supabase.from('crm_oportunidades').select('*', { count: 'exact', head: true }).eq('etapa', 'cerrado_ganado').gte('updated_at', inicio),
        supabase.from('crm_oportunidades').select('valor_estimado, moneda').neq('etapa', 'cerrado_perdido').gte('created_at', inicio),
        supabase.from('cotizaciones').select('*', { count: 'exact', head: true }).in('estado', ['enviada', 'aprobada']).gte('created_at', inicio),
        supabase.from('crm_actividades').select('*', { count: 'exact', head: true }).in('estado', ['pendiente', 'en_proceso']),
        supabase.from('crm_oportunidades').select('etapa'),
        supabase.from('empresas').select('created_at').gte('created_at', serieInicio),
        supabase.from('contactos').select('created_at').gte('created_at', serieInicio),
        supabase
          .from('crm_actividades')
          .select('*, oportunidad:oportunidad_id(id, titulo)')
          .in('estado', ['pendiente', 'en_proceso'])
          .not('fecha_vencimiento', 'is', null)
          .order('fecha_vencimiento', { ascending: true })
          .limit(8),
        supabase
          .from('crm_oportunidades')
          .select('*, empresa:empresa_id(nombre, logo_url), contacto:contacto_id(nombre, apellido, foto_url), crm_actividades(updated_at)')
          .in('etapa', ['en_proceso', 'propuesta_enviada'])
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase.from('empresas').select('id, nombre, logo_url, created_at, empresa_segmentos(segmentos(id, nombre, color))').order('created_at', { ascending: false }).limit(4),
        supabase.from('cotizaciones').select('id, numero, titulo, estado, total_usd').order('created_at', { ascending: false }).limit(4),
        supabase.from('productos').select('id, nombre, activo, created_at, categoria:categoria_id(nombre, color)').order('created_at', { ascending: false }),
        supabase.from('ventas').select('total_usd, total_ars, fecha_cobro').gte('fecha_cobro', inicio),
      ])

      // Pipeline por etapa
      const conteoEtapa = {}
      ;(etapaRows.data ?? []).forEach((o) => {
        conteoEtapa[o.etapa] = (conteoEtapa[o.etapa] ?? 0) + 1
      })
      const pipeline = ETAPAS.map((e) => ({
        etapa: e.key,
        label: e.label,
        value: conteoEtapa[e.key] ?? 0,
        color: e.color,
      }))

      // Serie temporal
      const empCounts = contarEnBuckets(serie, (empTime.data ?? []).map((r) => r.created_at))
      const conCounts = contarEnBuckets(serie, (conTime.data ?? []).map((r) => r.created_at))
      const actividad = serie.map((b, i) => ({ label: b.label, empresas: empCounts[i], contactos: conCounts[i] }))

      // Pipeline valor separado por moneda nativa (se convierte en la UI).
      let pipUsd = 0
      let pipArs = 0
      ;(pipelineRows.data ?? []).forEach((o) => {
        const v = Number(o.valor_estimado ?? 0)
        if (o.moneda === 'ARS') pipArs += v
        else pipUsd += v
      })

      // Productos
      const prods = productosRows.data ?? []
      const activos = prods.filter((p) => p.activo).length
      const porCatMap = new Map()
      prods.forEach((p) => {
        const nombre = p.categoria?.nombre ?? 'Sin categoría'
        const color = p.categoria?.color ?? '#777777'
        const cur = porCatMap.get(nombre) ?? { nombre, color, count: 0 }
        cur.count++
        porCatMap.set(nombre, cur)
      })

      // Ventas del período
      const ventas = ventasRows.data ?? []
      const ventasUsd = ventas.reduce((acc, v) => acc + Number(v.total_usd ?? 0), 0)
      const ventasArs = ventas.reduce((acc, v) => acc + Number(v.total_ars ?? 0), 0)

      setData({
        metricas: {
          empresas: empCount.count ?? 0,
          contactos: conCount.count ?? 0,
          ganadas: ganadas.count ?? 0,
          pipelineUsd: pipUsd,
          pipelineArs: pipArs,
          cotizaciones: cotEnv.count ?? 0,
          pendientes: pendVenc.count ?? 0,
          ventasUsd,
          ventasArs,
          ventasCount: ventas.length,
        },
        pipeline,
        actividad,
        pendientes: pendientes.data ?? [],
        enProceso: enProceso.data ?? [],
        ultimasEmpresas: (ultEmpresas.data ?? []).map((e) => ({
          ...e,
          segmentos: (e.empresa_segmentos ?? []).map((r) => r.segmentos).filter(Boolean),
        })),
        cotizaciones: cotizaciones.data ?? [],
        productos: {
          activos,
          porCategoria: [...porCatMap.values()].sort((a, b) => b.count - a.count),
          ultimo: prods[0] ?? null,
        },
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { data, loading, error, refetch: fetchAll }
}
