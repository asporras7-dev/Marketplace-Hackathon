import type { Database } from '@/types/database'

export type NivelHabilidad = Database['public']['Enums']['nivel_habilidad_enum']

export interface MatchStudentSkill {
  id_tecnologia: string
  nivel: NivelHabilidad
}

export interface MatchProjectTech {
  id_tecnologia: string
  nombre_tecnologia?: string | undefined
}

export interface MatchDetail {
  id_tecnologia: string
  nombre_tecnologia?: string | undefined
  puntos: number
  nivel: NivelHabilidad
}

export interface MatchResult {
  score: number
  detalles: MatchDetail[]
}

const PUNTOS_POR_NIVEL: Record<NivelHabilidad, number> = {
  basico: 10,
  intermedio: 15,
  avanzado: 20,
}

/**
 * Calcula el puntaje de coincidencia (Match Score) entre las habilidades de un estudiante
 * y las tecnologías requeridas por un proyecto.
 *
 * @param studentSkills Arreglo de habilidades técnicas que posee el estudiante
 * @param projectTechs Arreglo de tecnologías requeridas por el proyecto
 * @returns Objeto MatchResult que incluye el score total y los detalles por tecnología
 */
export function calculateMatchScore(
  studentSkills: MatchStudentSkill[],
  projectTechs: MatchProjectTech[],
): MatchResult {
  let score = 0
  const detalles: MatchDetail[] = []

  // Crear un mapa o set para búsquedas rápidas si es necesario,
  // pero típicamente los arreglos son pequeños.
  const skillsMap = new Map<string, NivelHabilidad>()
  for (const skill of studentSkills) {
    skillsMap.set(skill.id_tecnologia, skill.nivel)
  }

  // Iterar sobre lo que el proyecto requiere
  for (const tech of projectTechs) {
    const nivelEstudiante = skillsMap.get(tech.id_tecnologia)
    if (nivelEstudiante) {
      const puntos = PUNTOS_POR_NIVEL[nivelEstudiante]
      score += puntos
      detalles.push({
        id_tecnologia: tech.id_tecnologia,
        nombre_tecnologia: tech.nombre_tecnologia,
        nivel: nivelEstudiante,
        puntos,
      })
    }
  }

  return { score, detalles }
}
