'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { computeEstadoParticipacionEfectivo } from '@/lib/projects/project-detail-logic'
import type { PostulacionPropia } from '@/components/features/applications/PostulacionCard'

export interface MisPostulacionesStats {
  total: number
  activas: number
  contratadas: number
}

export async function getMisPostulacionesStats(): Promise<
  Result<MisPostulacionesStats>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (estError) {
    logger.error('getMisPostulacionesStats: fallo al leer estudiante', {
      error: estError.message,
    })
    return err('unexpected')
  }

  if (!estudiante) return ok({ total: 0, activas: 0, contratadas: 0 })

  const { data, error } = await supabase
    .from('participaciones')
    .select('estado, proyectos(estado)')
    .eq('id_estudiante', estudiante.id_estudiante)

  if (error) {
    logger.error('getMisPostulacionesStats: fallo al contar', {
      error: error.message,
    })
    return err('unexpected')
  }

  // Estado EFECTIVO (RF-32): una oferta viva sobre un proyecto ya cerrado se
  // cuenta como cerrada, no como activa. Misma derivación que la lista.
  const estados = (data ?? []).map((f) => {
    const proyectoEstado = f.proyectos?.estado ?? null
    return proyectoEstado
      ? computeEstadoParticipacionEfectivo(f.estado, proyectoEstado)
      : f.estado
  })
  const total = estados.length
  const activas = estados.filter(
    (e) => e === 'enviada' || e === 'en_revision',
  ).length
  const contratadas = estados.filter(
    (e) => e === 'contratada' || e === 'finalizada',
  ).length

  return ok({ total, activas, contratadas })
}

/**
 * Lista las postulaciones del egresado autenticado para la pantalla "mis
 * postulaciones" (RF-30). Lectura server-side: el browser client colgaba en
 * `auth.getUser()`, así que el fetch vive en el servidor y la página solo
 * recibe los datos ya resueltos.
 */
export async function getMisPostulaciones(): Promise<
  Result<PostulacionPropia[]>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (estError) {
    logger.error('getMisPostulaciones: fallo al leer estudiante', {
      error: estError.message,
    })
    return err('unexpected')
  }

  if (!estudiante) return ok([])

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('participaciones')
    .select(
      `
      id_participacion,
      id_proyecto,
      carta_postulacion,
      planteamiento_solucion,
      prototipo_enlaces,
      documentacion_tecnica,
      estado,
      fecha_postulacion,
      proyectos (
        titulo,
        estado,
        id_empresario,
        empresarios (
          nombre_empresa
        )
      )
    `,
    )
    .eq('id_estudiante', estudiante.id_estudiante)
    .order('fecha_postulacion', { ascending: false })

  if (error) {
    logger.error('getMisPostulaciones: fallo al leer participaciones', {
      error: error.message,
    })
    return err('unexpected')
  }

  const postulaciones: PostulacionPropia[] = (data ?? []).map((p) => {
    const companyName = Array.isArray(p.proyectos?.empresarios)
      ? (p.proyectos?.empresarios[0]?.nombre_empresa ?? 'Empresa Desconocida')
      : (p.proyectos?.empresarios?.nombre_empresa ?? 'Empresa Desconocida')

    const proyectoEstado = p.proyectos?.estado ?? null

    return {
      id_participacion: p.id_participacion,
      id_proyecto: p.id_proyecto,
      projectTitle: p.proyectos?.titulo ?? 'Proyecto Desconocido',
      companyName,
      carta_postulacion: p.carta_postulacion,
      planteamiento_solucion: p.planteamiento_solucion,
      prototipo_enlaces: p.prototipo_enlaces,
      documentacion_tecnica: p.documentacion_tecnica,
      estado: p.estado,
      estadoEfectivo: proyectoEstado
        ? computeEstadoParticipacionEfectivo(p.estado, proyectoEstado)
        : p.estado,
      fecha_postulacion: p.fecha_postulacion,
    }
  })

  return ok(postulaciones)
}
