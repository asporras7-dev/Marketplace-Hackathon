import 'server-only'

import { unstable_rethrow } from 'next/navigation'
import type { QueryData } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ok, err, type Result } from '@/lib/result'
import type { Project } from '@/types'
import { logger } from '@/lib/logger'
import { estadoToStatus } from './status'
import { durationInDays } from './duration'
import {
  calculateMatchScore,
  type MatchProjectTech,
  type MatchStudentSkill,
} from './match-logic'

type ServerClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | ReturnType<typeof createSupabaseAdminClient>

const PROYECTO_SELECT = `
  *,
  empresarios (nombre_empresa),
  proyecto_tecnologias (
    id_tecnologia,
    tecnologias (nombre)
  )
` as const

function selectProyectos(supabase: ServerClient) {
  return supabase.from('proyectos').select(PROYECTO_SELECT)
}

type ProyectoRow = QueryData<ReturnType<typeof selectProyectos>>[number]

/** Mapea una fila de Supabase (tipo inferido del `.select`) a la interfaz `Project`. */
function mapProject(
  row: ProyectoRow,
  studentSkills?: MatchStudentSkill[],
): Project {
  const stack: string[] = []
  const projectTechs: MatchProjectTech[] = []

  for (const pt of row.proyecto_tecnologias) {
    if (pt.tecnologias?.nombre) stack.push(pt.tecnologias.nombre)
    projectTechs.push({
      id_tecnologia: pt.id_tecnologia,
      nombre_tecnologia: pt.tecnologias?.nombre,
    })
  }

  let matchScore: number | undefined
  let matchDetalles: import('./match-logic').MatchDetail[] | undefined

  if (studentSkills && projectTechs.length > 0) {
    const match = calculateMatchScore(studentSkills, projectTechs)
    matchScore = match.score
    matchDetalles = match.detalles
  }

  if (!Array.isArray(row.empresarios) && row.empresarios) {
    console.log('empresarios:', row.empresarios)
  }

  return {
    id: row.id_proyecto,
    title: row.titulo,
    companyId: row.id_empresario,
    // El nombre de empresa siempre viene (FK NOT NULL); si faltara, la UI rotula
    // el vacío vía i18n (sin string hardcodeado acá, reglas.md §4).
    companyName: Array.isArray(row.empresarios)
      ? (row.empresarios[0]?.nombre_empresa ?? '')
      : ((row.empresarios as { nombre_empresa?: string | null })
          ?.nombre_empresa ?? ''),
    description: row.descripcion,
    stack,
    durationDays: durationInDays(row.fecha_publicacion, row.fecha_cierre),
    budget: row.presupuesto_max ?? row.presupuesto_min ?? 0,
    mode: row.modalidad,
    countryIso: row.pais_iso_proyecto,
    region: row.region_proyecto,
    startDate: row.fecha_publicacion
      ? new Date(row.fecha_publicacion).toISOString()
      : row.created_at,
    status: estadoToStatus(row.estado),
    createdAt: row.created_at,
    matchScore,
    matchDetalles,
  }
}

/**
 * Proyectos activos del marketplace (estados `abierto` o `en_recepcion`).
 */
export async function getMarketplaceProjects(): Promise<
  Result<Project[], string>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()

    const { data, error } = await selectProyectos(supabaseAdmin)
      .eq('is_active', true)
      .in('estado', ['abierto', 'en_recepcion'])
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching marketplace projects', {
        error: error.message,
      })
      return err('database_error')
    }

    // Attempt to fetch student skills if user is an egresado
    let studentSkills: MatchStudentSkill[] = []
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        const { data: estData } = await supabase
          .from('estudiantes')
          .select('id_estudiante')
          .eq('id_usuario', userData.user.id)
          .maybeSingle()

        if (estData) {
          const { data: skillsData } = await supabase
            .from('habilidades_tecnicas')
            .select('id_tecnologia, nivel')
            .eq('id_estudiante', estData.id_estudiante)
          if (skillsData) {
            studentSkills = skillsData as MatchStudentSkill[]
          }
        }
      }
    } catch {
      // Ignorar errores de auth para usuarios anónimos o no egresados
    }

    return ok(data.map((row) => mapProject(row, studentSkills)))
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Unexpected error fetching marketplace projects', { error })
    return err('unexpected_error')
  }
}

/**
 * Detalle de un proyecto específico.
 */
export async function getMarketplaceProjectById(
  id: string,
): Promise<Result<Project, string>> {
  try {
    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()

    const { data, error } = await selectProyectos(supabaseAdmin)
      .eq('id_proyecto', id)
      .single()

    if (error) {
      logger.error('Error fetching project by ID', { id, error: error.message })
      return err(error.code === 'PGRST116' ? 'not_found' : 'database_error')
    }

    let studentSkills: MatchStudentSkill[] = []
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        const { data: estData } = await supabase
          .from('estudiantes')
          .select('id_estudiante')
          .eq('id_usuario', userData.user.id)
          .maybeSingle()

        if (estData) {
          const { data: skillsData } = await supabase
            .from('habilidades_tecnicas')
            .select('id_tecnologia, nivel')
            .eq('id_estudiante', estData.id_estudiante)
          if (skillsData) {
            studentSkills = skillsData as MatchStudentSkill[]
          }
        }
      }
    } catch {
      // Ignore auth errors
    }

    return ok(mapProject(data, studentSkills))
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Unexpected error fetching project by id', { error })
    return err('unexpected_error')
  }
}

/**
 * Verifica si el egresado actual ya aplicó a este proyecto.
 */
export async function checkIfApplied(
  projectId: string,
): Promise<Result<boolean, string>> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return err('unauthenticated')

    const { data: estudiante, error: estError } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', userData.user.id)
      .single()

    if (estError || !estudiante) return err('estudiante_not_found')

    const { data: participacion, error: partError } = await supabase
      .from('participaciones')
      .select('id_participacion')
      .eq('id_proyecto', projectId)
      .eq('id_estudiante', estudiante.id_estudiante)
      .maybeSingle()

    if (partError) {
      logger.error('Error checking application status', {
        error: partError.message,
      })
      return err('database_error')
    }

    return ok(!!participacion)
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Unexpected error checking application status', { error })
    return err('unexpected_error')
  }
}
