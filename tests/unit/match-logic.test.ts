import { describe, it, expect } from 'vitest'
import {
  calculateMatchScore,
  type MatchStudentSkill,
  type MatchProjectTech,
} from '@/lib/projects/match-logic'

describe('calculateMatchScore', () => {
  it('debe retornar score 0 si no hay coincidencias', () => {
    const studentSkills: MatchStudentSkill[] = [
      { id_tecnologia: '1', nivel: 'basico' },
    ]
    const projectTechs: MatchProjectTech[] = [{ id_tecnologia: '2' }]

    const result = calculateMatchScore(studentSkills, projectTechs)

    expect(result.score).toBe(0)
    expect(result.detalles).toHaveLength(0)
  })

  it('debe sumar los puntos correctos según el nivel de habilidad', () => {
    const studentSkills: MatchStudentSkill[] = [
      { id_tecnologia: '1', nivel: 'basico' },
      { id_tecnologia: '2', nivel: 'intermedio' },
      { id_tecnologia: '3', nivel: 'avanzado' },
    ]
    // Proyecto requiere la 1 y la 3
    const projectTechs: MatchProjectTech[] = [
      { id_tecnologia: '1' }, // basico = 10
      { id_tecnologia: '3' }, // avanzado = 20
    ]

    const result = calculateMatchScore(studentSkills, projectTechs)

    expect(result.score).toBe(30) // 10 + 20
    expect(result.detalles).toHaveLength(2)

    // Verificar detalle de tecnología 1
    const det1 = result.detalles.find((d) => d.id_tecnologia === '1')
    expect(det1?.nivel).toBe('basico')
    expect(det1?.puntos).toBe(10)

    // Verificar detalle de tecnología 3
    const det3 = result.detalles.find((d) => d.id_tecnologia === '3')
    expect(det3?.nivel).toBe('avanzado')
    expect(det3?.puntos).toBe(20)
  })

  it('no debe sumar puntos si el proyecto requiere una tecnología que el estudiante no tiene', () => {
    const studentSkills: MatchStudentSkill[] = [
      { id_tecnologia: '1', nivel: 'avanzado' },
    ]
    const projectTechs: MatchProjectTech[] = [
      { id_tecnologia: '1' },
      { id_tecnologia: '2' }, // El estudiante no la tiene
    ]

    const result = calculateMatchScore(studentSkills, projectTechs)

    expect(result.score).toBe(20)
    expect(result.detalles).toHaveLength(1)
    expect(result.detalles[0]?.id_tecnologia).toBe('1')
  })

  it('no debe sumar tecnologías que el estudiante tiene pero el proyecto no pide', () => {
    const studentSkills: MatchStudentSkill[] = [
      { id_tecnologia: '1', nivel: 'avanzado' },
      { id_tecnologia: '2', nivel: 'avanzado' },
    ]
    const projectTechs: MatchProjectTech[] = [{ id_tecnologia: '1' }]

    const result = calculateMatchScore(studentSkills, projectTechs)

    expect(result.score).toBe(20)
    expect(result.detalles).toHaveLength(1)
  })
})
