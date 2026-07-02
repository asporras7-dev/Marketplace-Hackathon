'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'

export interface MiContratacion {
  id_contratacion: string
  id_participacion: string
  estado_periodo: string
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  url_repositorio_proyecto: string | null
}

export interface ComentarioHilo {
  id_comentario_entregable: string
  contenido: string
  tipo_comentario: string
  comentado_at: string
}

export interface EntregablePropio {
  id_entregable: string
  tipo_entregable: 'parcial' | 'final'
  version: number
  archivo_url: string | null
  estado: 'enviado' | 'en_revision' | 'aprobado' | 'con_cambios'
  comentario_empresario: string | null
  cargado_at: string
  comentarios: ComentarioHilo[]
}

/**
 * Devuelve la contratacion activa del egresado para un proyecto dado,
 * o null si no está contratado. RF-40.
 */
export async function getMiContratacion(
  idProyecto: string,
): Promise<Result<MiContratacion | null>> {
  if (!z.string().uuid().safeParse(idProyecto).success)
    return err('invalid_input')

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .single()

  if (estError || !estudiante) return err('estudiante_not_found')

  const { data: part, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, url_repositorio_proyecto')
    .eq('id_proyecto', idProyecto)
    .eq('id_estudiante', estudiante.id_estudiante)
    .in('estado', ['contratada', 'finalizada'])
    .maybeSingle()

  if (partError) {
    logger.error('getMiContratacion: participacion query failed', {
      error: partError.message,
    })
    return err('database_error')
  }

  if (!part) return ok(null)

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select('id_contratacion, estado_periodo, fecha_inicio, fecha_fin_estimada')
    .eq('id_participacion', part.id_participacion)
    .maybeSingle()

  if (contError) {
    logger.error('getMiContratacion: contratacion query failed', {
      error: contError.message,
    })
    return err('database_error')
  }

  if (!contratacion) return ok(null)

  return ok({
    id_contratacion: contratacion.id_contratacion,
    id_participacion: part.id_participacion,
    estado_periodo: contratacion.estado_periodo,
    fecha_inicio: contratacion.fecha_inicio,
    fecha_fin_estimada: contratacion.fecha_fin_estimada,
    url_repositorio_proyecto: part.url_repositorio_proyecto,
  })
}

export interface ComentarioEntregable {
  id_comentario_entregable: string
  contenido: string
  tipo_comentario: string
  comentado_at: string
}

export interface EntregableEmpresario {
  id_entregable: string
  tipo_entregable: 'parcial' | 'final'
  version: number
  archivo_url: string | null
  estado: 'enviado' | 'en_revision' | 'aprobado' | 'con_cambios'
  comentario_empresario: string | null
  cargado_at: string
  comentarios: ComentarioEntregable[]
}

/**
 * Lista los entregables del contratado para un proyecto del empresario (RF-43).
 * Verifica que el caller sea el empresario dueño antes de devolver datos.
 */
export async function getEntregablesDeProyecto(
  idProyecto: string,
): Promise<Result<EntregableEmpresario[]>> {
  if (!z.string().uuid().safeParse(idProyecto).success)
    return err('invalid_input')

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empError) {
    logger.error('getEntregablesDeProyecto: empresario query failed', {
      error: empError.message,
    })
    return err('database_error')
  }
  if (!empresario) return err('unauthorized')

  const { data: proyecto, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyError) {
    logger.error('getEntregablesDeProyecto: proyecto query failed', {
      error: proyError.message,
    })
    return err('database_error')
  }
  if (!proyecto) return err('unauthorized')

  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion')
    .eq('id_proyecto', idProyecto)
    .in('estado', ['contratada', 'finalizada'])
    .maybeSingle()
  if (partError) {
    logger.error('getEntregablesDeProyecto: participacion query failed', {
      error: partError.message,
    })
    return err('database_error')
  }
  if (!participacion) return ok([])

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select('id_contratacion')
    .eq('id_participacion', participacion.id_participacion)
    .maybeSingle()
  if (contError) {
    logger.error('getEntregablesDeProyecto: contratacion query failed', {
      error: contError.message,
    })
    return err('database_error')
  }
  if (!contratacion) return ok([])

  const { data, error } = await supabase
    .from('entregables')
    .select(
      `id_entregable, tipo_entregable, version, archivo_url, estado, comentario_empresario, cargado_at,
      comentarios_entregables (
        id_comentario_entregable, contenido, tipo_comentario, comentado_at
      )`,
    )
    .eq('id_contratacion', contratacion.id_contratacion)
    .order('cargado_at', { ascending: false })
  if (error) {
    logger.error('getEntregablesDeProyecto: entregables query failed', {
      error: error.message,
    })
    return err('database_error')
  }

  const mapped: EntregableEmpresario[] = (data ?? []).map((e) => ({
    id_entregable: e.id_entregable,
    tipo_entregable: e.tipo_entregable as 'parcial' | 'final',
    version: e.version,
    archivo_url: e.archivo_url,
    estado: e.estado as EntregableEmpresario['estado'],
    comentario_empresario: e.comentario_empresario,
    cargado_at: e.cargado_at,
    comentarios: (e.comentarios_entregables ?? []).map((c) => ({
      id_comentario_entregable: c.id_comentario_entregable,
      contenido: c.contenido,
      tipo_comentario: c.tipo_comentario,
      comentado_at: c.comentado_at,
    })),
  }))

  return ok(mapped)
}

/**
 * Genera una URL firmada (1h) para que el empresario descargue un entregable
 * del bucket privado. Verifica propiedad antes de emitir la URL (RF-43).
 */
export async function getSignedUrlEntregable(
  idEntregable: string,
): Promise<Result<{ url: string }>> {
  if (!z.string().uuid().safeParse(idEntregable).success)
    return err('invalid_input')

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: entregable, error: entErr } = await supabase
    .from('entregables')
    .select('id_entregable, archivo_url, id_contratacion')
    .eq('id_entregable', idEntregable)
    .maybeSingle()
  if (entErr) {
    logger.error('getSignedUrlEntregable: entregable query failed', {
      error: entErr.message,
    })
    return err('database_error')
  }
  if (!entregable?.archivo_url) return err('entregable_not_found')

  const { data: contratacion, error: contErr } = await supabase
    .from('contrataciones')
    .select('id_participacion')
    .eq('id_contratacion', entregable.id_contratacion)
    .maybeSingle()
  if (contErr || !contratacion) return err('unauthorized')

  const { data: participacion, error: partErr } = await supabase
    .from('participaciones')
    .select('id_proyecto')
    .eq('id_participacion', contratacion.id_participacion)
    .maybeSingle()
  if (partErr || !participacion) return err('unauthorized')

  const { data: empresario, error: empErr } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empErr || !empresario) return err('unauthorized')

  const { data: proyectoOwned, error: proyErr } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyErr || !proyectoOwned) return err('unauthorized')

  const { data: signed, error: signErr } = await supabase.storage
    .from('entregables')
    .createSignedUrl(entregable.archivo_url, 3600, { download: true })
  if (signErr) {
    logger.error('getSignedUrlEntregable: storage error', {
      error: signErr.message,
    })
    return err('storage_error')
  }
  if (!signed?.signedUrl) return err('storage_error')

  return ok({ url: signed.signedUrl })
}

/**
 * Lista los entregables del egresado para una contratacion. RF-40.
 */
export async function getMisEntregables(
  idContratacion: string,
): Promise<Result<EntregablePropio[]>> {
  if (!z.string().uuid().safeParse(idContratacion).success)
    return err('invalid_input')

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()

  // Verificación de propiedad: la contratación debe ser del egresado actual.
  // La RLS de entregables ya lo cubre; esto es defensa en profundidad (reglas.md §5).
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .single()
  if (estError || !estudiante) return err('estudiante_not_found')

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select('id_participacion')
    .eq('id_contratacion', idContratacion)
    .maybeSingle()
  if (contError) {
    logger.error('getMisEntregables: contratacion query failed', {
      error: contError.message,
    })
    return err('database_error')
  }
  if (!contratacion) return err('unauthorized')

  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_estudiante')
    .eq('id_participacion', contratacion.id_participacion)
    .maybeSingle()
  if (partError) {
    logger.error('getMisEntregables: participacion query failed', {
      error: partError.message,
    })
    return err('database_error')
  }
  if (
    !participacion ||
    participacion.id_estudiante !== estudiante.id_estudiante
  ) {
    return err('unauthorized')
  }

  const { data, error } = await supabase
    .from('entregables')
    .select(
      `id_entregable, tipo_entregable, version, archivo_url, estado, comentario_empresario, cargado_at,
      comentarios_entregables (
        id_comentario_entregable, contenido, tipo_comentario, comentado_at
      )`,
    )
    .eq('id_contratacion', idContratacion)
    .order('cargado_at', { ascending: false })

  if (error) {
    logger.error('getMisEntregables failed', { error: error.message })
    return err('database_error')
  }

  const mapped: EntregablePropio[] = (data ?? []).map((e) => ({
    id_entregable: e.id_entregable,
    tipo_entregable: e.tipo_entregable as 'parcial' | 'final',
    version: e.version,
    archivo_url: e.archivo_url,
    estado: e.estado as EntregablePropio['estado'],
    comentario_empresario: e.comentario_empresario,
    cargado_at: e.cargado_at,
    comentarios: (e.comentarios_entregables ?? [])
      .map((c) => ({
        id_comentario_entregable: c.id_comentario_entregable,
        contenido: c.contenido,
        tipo_comentario: c.tipo_comentario,
        comentado_at: c.comentado_at,
      }))
      .sort((a, b) => a.comentado_at.localeCompare(b.comentado_at)),
  }))

  return ok(mapped)
}

export interface ContratacionResumen {
  id_contratacion: string
  estado_periodo: string
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  id_proyecto: string
  titulo_proyecto: string
  estado_proyecto: string
  id_empresario: string
}

export interface ContratacionParaCalificacion {
  id_contratacion: string
  id_participacion: string
  estado_periodo: string
  id_estudiante: string
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  url_repositorio_proyecto: string | null
}

/**
 * Devuelve la contratación activa/finalizada para un proyecto del empresario,
 * incluyendo el id_estudiante. Usado para mostrar la tarjeta de calificación (RF-49).
 */
export async function getContratacionDelProyecto(
  idProyecto: string,
): Promise<Result<ContratacionParaCalificacion | null>> {
  if (!z.string().uuid().safeParse(idProyecto).success)
    return err('invalid_input')

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empError || !empresario) return err('unauthorized')

  const { data: proyecto, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyError || !proyecto) return err('unauthorized')

  const { data: part, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, id_estudiante, url_repositorio_proyecto')
    .eq('id_proyecto', idProyecto)
    .in('estado', ['contratada', 'finalizada'])
    .maybeSingle()

  if (partError) {
    logger.error('getContratacionDelProyecto: participacion query failed', {
      error: partError.message,
    })
    return err('database_error')
  }
  if (!part) return ok(null)

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select('id_contratacion, estado_periodo, fecha_inicio, fecha_fin_estimada')
    .eq('id_participacion', part.id_participacion)
    .maybeSingle()

  if (contError) {
    logger.error('getContratacionDelProyecto: contratacion query failed', {
      error: contError.message,
    })
    return err('database_error')
  }
  if (!contratacion) return ok(null)

  return ok({
    id_contratacion: contratacion.id_contratacion,
    id_participacion: part.id_participacion,
    estado_periodo: contratacion.estado_periodo,
    id_estudiante: part.id_estudiante,
    fecha_inicio: contratacion.fecha_inicio,
    fecha_fin_estimada: contratacion.fecha_fin_estimada,
    url_repositorio_proyecto: part.url_repositorio_proyecto,
  })
}

/**
 * Lista todas las contrataciones del egresado autenticado (estado contratada
 * o finalizada) junto con los datos básicos del proyecto. RF-40/41.
 */
export async function getMisContrataciones(): Promise<
  Result<ContratacionResumen[]>
> {
  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .single()
  if (estError || !estudiante) return err('estudiante_not_found')

  const { data: participaciones, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, id_proyecto')
    .eq('id_estudiante', estudiante.id_estudiante)
    .in('estado', ['contratada', 'finalizada'])
  if (partError) {
    logger.error('getMisContrataciones: participaciones query failed', {
      error: partError.message,
    })
    return err('database_error')
  }
  if (!participaciones || participaciones.length === 0) return ok([])

  const idParticipaciones = participaciones.map((p) => p.id_participacion)

  const { data: contrataciones, error: contError } = await supabase
    .from('contrataciones')
    .select(
      'id_contratacion, id_participacion, estado_periodo, fecha_inicio, fecha_fin_estimada',
    )
    .in('id_participacion', idParticipaciones)
  if (contError) {
    logger.error('getMisContrataciones: contrataciones query failed', {
      error: contError.message,
    })
    return err('database_error')
  }
  if (!contrataciones || contrataciones.length === 0) return ok([])

  const idProyectos = participaciones.map((p) => p.id_proyecto)
  const { data: proyectos, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto, titulo, estado, id_empresario')
    .in('id_proyecto', idProyectos)
  if (proyError) {
    logger.error('getMisContrataciones: proyectos query failed', {
      error: proyError.message,
    })
    return err('database_error')
  }

  const proyectoMap = new Map((proyectos ?? []).map((p) => [p.id_proyecto, p]))
  const partMap = new Map(participaciones.map((p) => [p.id_participacion, p]))

  const result: ContratacionResumen[] = contrataciones
    .map((c) => {
      const part = partMap.get(c.id_participacion)
      if (!part) return null
      const proyecto = proyectoMap.get(part.id_proyecto)
      if (!proyecto) return null
      return {
        id_contratacion: c.id_contratacion,
        estado_periodo: c.estado_periodo as string,
        fecha_inicio: c.fecha_inicio,
        fecha_fin_estimada: c.fecha_fin_estimada,
        id_proyecto: part.id_proyecto,
        titulo_proyecto: proyecto.titulo,
        estado_proyecto: proyecto.estado as string,
        id_empresario: proyecto.id_empresario,
      } satisfies ContratacionResumen
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return ok(result)
}
