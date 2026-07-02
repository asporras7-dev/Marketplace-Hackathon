'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

const RateCompanySchema = z.object({
  idEmpresario: z.string().uuid(),
  idContratacion: z.string().uuid(),
  puntuacion: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
})

export type RateCompanyInput = z.infer<typeof RateCompanySchema>

/**
 * Inserta una calificación para el empresario por parte del egresado.
 * Requiere un contrato en estado 'finalizado' que vincule al egresado con la empresa (RF-49).
 * Garantiza una única calificación por contrato por egresado.
 */
export async function rateCompany(
  input: RateCompanyInput,
): Promise<Result<void>> {
  const parsed = RateCompanySchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()

  // Obtener el ID del estudiante (egresado) autenticado
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()

  if (estError || !estudiante) return err('unauthorized')

  // Verificar validez del contrato e id_empresario coincidente
  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select(
      `
      id_contratacion,
      estado_periodo,
      participaciones!inner(
        id_estudiante,
        id_proyecto,
        proyectos!inner(
          id_empresario,
          id_proyecto
        )
      )
    `,
    )
    .eq('id_contratacion', parsed.data.idContratacion)
    .maybeSingle()

  if (contError || !contratacion) {
    logger.error('rateCompany: fallo al buscar contratación', {
      error: contError?.message,
    })
    return err('contratacion_not_found')
  }

  const part = contratacion.participaciones
  if (part.id_estudiante !== estudiante.id_estudiante) {
    return err('forbidden')
  }

  if (contratacion.estado_periodo !== 'finalizado') {
    return err('contratacion_no_finalizada')
  }

  // El empresario en el contrato debe coincidir con el proporcionado
  if (part.proyectos.id_empresario !== parsed.data.idEmpresario) {
    return err('invalid_input')
  }

  // Verificar si ya existe calificación del estudiante para este contrato (uniqueness guard)
  const { data: existing, error: existError } = await supabase
    .from('evaluaciones_empresarios')
    .select('id_evaluacion')
    .eq('id_contratacion', parsed.data.idContratacion)
    .eq('id_estudiante', estudiante.id_estudiante)
    .maybeSingle()

  if (existError) {
    logger.error('rateCompany: fallo al validar duplicado', {
      error: existError.message,
    })
    return err('database_error')
  }

  if (existing) {
    return err('ya_calificado')
  }

  // Insertar la calificación en la base de datos
  const { error: insertError } = await supabase
    .from('evaluaciones_empresarios')
    .insert({
      id_contratacion: parsed.data.idContratacion,
      id_estudiante: estudiante.id_estudiante,
      id_empresario: parsed.data.idEmpresario,
      puntuacion: parsed.data.puntuacion,
      comentario: parsed.data.comentario || null,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return err('ya_calificado')
    }
    logger.error('rateCompany: inserción fallida en base de datos', {
      error: insertError.message,
    })
    return err('database_error')
  }

  // Revalidar rutas del empresario
  revalidatePath(`/empresario/perfil`)
  return ok(undefined)
}

/**
 * Consulta la calificación que un egresado le dejó a la empresa por un contrato específico.
 */
export async function getCompanyRatingForContract(
  idContratacion: string,
): Promise<Result<{ puntuacion: number; comentario: string | null } | null>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('evaluaciones_empresarios')
    .select('puntuacion, comentario')
    .eq('id_contratacion', idContratacion)
    .maybeSingle()

  if (error) {
    logger.error('getCompanyRatingForContract: fallo en consulta', {
      error: error.message,
    })
    return err('database_error')
  }

  return ok(data || null)
}

/**
 * Consulta la calificación que el egresado actual le dejó a un empresario específico.
 */
export async function getCompanyRatingForStudent(
  idEmpresario: string,
): Promise<Result<{ puntuacion: number; comentario: string | null } | null>> {
  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return ok(null)

  const { data: estudiante } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()

  if (!estudiante) return ok(null)

  const { data, error } = await supabase
    .from('evaluaciones_empresarios')
    .select('puntuacion, comentario')
    .eq('id_estudiante', estudiante.id_estudiante)
    .eq('id_empresario', idEmpresario)
    .maybeSingle()

  if (error) {
    logger.error('getCompanyRatingForStudent: fallo en consulta', {
      error: error.message,
    })
    return err('database_error')
  }

  return ok(data || null)
}

/**
 * Busca el contrato finalizado más reciente entre el egresado autenticado y una empresa.
 * Devuelve null si no existe ningún contrato finalizado con esa empresa.
 */
export async function getFinalizedContractWithCompany(
  idEmpresario: string,
): Promise<
  Result<{
    idContratacion: string
    tituloProyecto: string
    existingRating: { puntuacion: number; comentario: string | null } | null
  } | null>
> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return ok(null)

  const { data: estudiante } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()

  if (!estudiante) return ok(null)

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select(
      `
      id_contratacion,
      participaciones!inner(
        id_estudiante,
        proyectos!inner(
          titulo,
          id_empresario
        )
      )
    `,
    )
    .eq('estado_periodo', 'finalizado')
    .eq('participaciones.id_estudiante', estudiante.id_estudiante)
    .eq('participaciones.proyectos.id_empresario', idEmpresario)
    .limit(1)
    .maybeSingle()

  if (contError) {
    logger.error('getFinalizedContractWithCompany: error al consultar', {
      error: contError.message,
    })
    return err('database_error')
  }

  if (!contratacion) return ok(null)

  const part = contratacion.participaciones as unknown as {
    id_estudiante: string
    proyectos: { titulo: string; id_empresario: string }
  }

  const { data: rating } = await supabase
    .from('evaluaciones_empresarios')
    .select('puntuacion, comentario')
    .eq('id_contratacion', contratacion.id_contratacion)
    .eq('id_estudiante', estudiante.id_estudiante)
    .maybeSingle()

  return ok({
    idContratacion: contratacion.id_contratacion,
    tituloProyecto: part.proyectos.titulo,
    existingRating: rating ?? null,
  })
}

export interface AdminRatingItem {
  idEvaluacion: string
  idContratacion: string
  proyectoTitulo: string
  nombreEgresado: string
  nombreEmpresa: string
  puntuacion: number
  comentario: string | null
  evaluadoAt: string
}

/**
 * Consulta todas las calificaciones de empresarios del sistema para el panel de administración.
 */
export async function getAllCompanyRatingsForAdmin(): Promise<
  Result<AdminRatingItem[]>
> {
  const roleResult = await requireRole('administrador')
  if (!roleResult.ok) return err('forbidden')

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('evaluaciones_empresarios')
    .select(
      `
      id_evaluacion,
      id_contratacion,
      puntuacion,
      comentario,
      evaluado_at,
      estudiantes!inner(
        usuarios!estudiantes_id_usuario_fkey(
          nombre,
          apellido_1,
          apellido_2
        )
      ),
      empresarios!inner(
        nombre_empresa,
        usuarios!empresarios_id_usuario_fkey(
          nombre,
          apellido_1,
          apellido_2
        )
      ),
      contrataciones(
        participaciones(
          proyectos(
            titulo
          )
        )
      )
    `,
    )
    .order('evaluado_at', { ascending: false })

  if (error) {
    logger.error('getAllCompanyRatingsForAdmin: fallo en consulta', {
      error: error.message,
    })
    return err('database_error')
  }

  const items: AdminRatingItem[] = (data || []).map((row) => {
    const estUser = row.estudiantes.usuarios
    const nombreEgresado = [
      estUser.nombre,
      estUser.apellido_1,
      estUser.apellido_2,
    ]
      .filter(Boolean)
      .join(' ')

    const emp = row.empresarios
    const empUser = emp.usuarios
    const repName = [empUser.nombre, empUser.apellido_1, empUser.apellido_2]
      .filter(Boolean)
      .join(' ')
    const nombreEmpresa = emp.nombre_empresa || repName

    const proy = row.contrataciones?.participaciones?.proyectos
    const proyectoTitulo = proy?.titulo || 'Calificación General'

    return {
      idEvaluacion: row.id_evaluacion,
      idContratacion: row.id_contratacion,
      proyectoTitulo,
      nombreEgresado,
      nombreEmpresa,
      puntuacion: row.puntuacion,
      comentario: row.comentario,
      evaluadoAt: row.evaluado_at,
    }
  })

  return ok(items)
}
