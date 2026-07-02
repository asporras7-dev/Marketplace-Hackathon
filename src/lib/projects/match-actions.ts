import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Result, ok, err } from '@/lib/result'
import { logger } from '@/lib/logger'
import {
  calculateMatchScore,
  type MatchStudentSkill,
  type MatchProjectTech,
  type MatchDetail,
} from './match-logic'
import {
  getPublicStudentProfile,
  type StudentProfileView,
} from '@/lib/portfolio/actions'

export interface MatchStudentItem {
  profile: StudentProfileView
  matchScore: number
  matchDetalles: MatchDetail[]
}

export interface GetProjectMatchesResponse {
  items: MatchStudentItem[]
  totalCount: number
}

/**
 * Obtiene todos los estudiantes que tienen un match > 0 con el proyecto dado,
 * paginados y ordenados por score descendente.
 * Retorna el perfil completo para poder ser visualizado en PortfolioViewer.
 */
export async function getProjectMatches(
  projectId: string,
  page: number = 1,
  pageSize: number = 1, // Paginación singular por defecto
): Promise<Result<GetProjectMatchesResponse>> {
  try {
    const supabase = await createSupabaseServerClient()

    // 1. Obtener tecnologías del proyecto
    const { data: projectData, error: projectError } = await supabase
      .from('proyecto_tecnologias')
      .select('id_tecnologia, tecnologias(nombre)')
      .eq('id_proyecto', projectId)

    if (projectError) {
      logger.error('Error fetching project technologies for matches', {
        error: projectError,
      })
      return err(projectError.message)
    }

    if (!projectData || projectData.length === 0) {
      return ok({ items: [], totalCount: 0 })
    }

    const projectTechs: MatchProjectTech[] = projectData.map((pt) => ({
      id_tecnologia: pt.id_tecnologia,
      nombre_tecnologia: (pt.tecnologias as { nombre: string } | null)?.nombre,
    }))

    // 2. Obtener estudiantes públicos con sus habilidades (solo IDs y habilidades para puntuar)
    const { data: studentsData, error: studentsError } = await supabase
      .from('estudiantes')
      .select(
        `
        id_estudiante,
        habilidades_tecnicas(id_tecnologia, nivel)
      `,
      )
      .eq('portafolio_visible_publicamente', true)

    if (studentsError) {
      logger.error('Error fetching public students for matches', {
        error: studentsError,
      })
      return err(studentsError.message)
    }

    // 3. Calcular score para cada estudiante
    const matches: {
      id_estudiante: string
      score: number
      detalles: MatchDetail[]
    }[] = []

    for (const row of studentsData || []) {
      const skills = (row.habilidades_tecnicas || []) as MatchStudentSkill[]
      const { score, detalles } = calculateMatchScore(skills, projectTechs)

      if (score > 0) {
        matches.push({
          id_estudiante: row.id_estudiante,
          score,
          detalles,
        })
      }
    }

    // 4. Ordenar de mayor a menor score
    matches.sort((a, b) => b.score - a.score)

    // 5. Paginar los IDs
    const totalCount = matches.length
    const startIndex = (page - 1) * pageSize
    const paginatedItems = matches.slice(startIndex, startIndex + pageSize)

    // 6. Obtener los perfiles completos solo de la página actual
    const fullProfiles: MatchStudentItem[] = []
    for (const item of paginatedItems) {
      const profileResult = await getPublicStudentProfile(item.id_estudiante)
      if (profileResult.ok && profileResult.data) {
        fullProfiles.push({
          profile: profileResult.data,
          matchScore: item.score,
          matchDetalles: item.detalles,
        })
      }
    }

    return ok({
      items: fullProfiles,
      totalCount,
    })
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getProjectMatches: unexpected error', { error: errorMsg })
    return err(errorMsg)
  }
}
