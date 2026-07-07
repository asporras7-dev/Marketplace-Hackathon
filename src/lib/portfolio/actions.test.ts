import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import {
  getStudentProfile,
  saveStudentProfile,
  addStudentSkill,
  deleteStudentSkill,
  savePortfolioProject,
  deletePortfolioProject,
} from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedServer = vi.mocked(createSupabaseServerClient)

const USER_ID = 'usr-abc-123'
const EST_ID = 'est-abc-456'

/** Supabase mock con auth.getUser() exitoso */
function withUser(fromImpl: (table: string) => unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn(fromImpl),
  }
}

/** Supabase mock con auth.getUser() fallando */
function withNoUser() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'not authenticated' },
      }),
    },
    from: vi.fn(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// getStudentProfile
// ─────────────────────────────────────────────────────────────────────────────

describe('getStudentProfile', () => {
  it('retorna error unauthorized si no hay usuario autenticado', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await getStudentProfile()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna null si el estudiante no existe en la DB', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getStudentProfile()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('retorna el perfil completo del estudiante', async () => {
    const mockEstudiante = {
      id_estudiante: EST_ID,
      id_usuario: USER_ID,
      descripcion: 'Desarrollador junior',
      portafolio_visible_publicamente: true,
      titulo_fwd: 'frontend',
      usuarios: {
        nombre: 'Ana',
        apellido_1: 'García',
        apellido_2: 'Mora',
        foto_perfil: 'https://example.com/foto.jpg',
      },
      habilidades_tecnicas: [
        {
          nivel: 'intermedio',
          id_tecnologia: 'tech-1',
          tecnologias: { nombre: 'TypeScript' },
        },
      ],
      proyectos_portafolio: [
        {
          id_portafolio: 'port-1',
          titulo: 'Mi proyecto',
          descripcion: 'Descripción',
          url_repositorio: 'https://github.com/ana/proyecto',
          url_demo: null,
          fecha: '2024-01-15',
          portafolio_tecnologias: [{ tecnologias: { nombre: 'React' } }],
        },
      ],
    }

    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockEstudiante,
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getStudentProfile()
    expect(result.ok).toBe(true)
    if (result.ok && result.data) {
      expect(result.data.firstName).toBe('Ana')
      expect(result.data.lastName1).toBe('García')
      expect(result.data.skills).toHaveLength(1)
      expect(result.data.skills[0]).toMatchObject({
        name: 'TypeScript',
        level: 'intermedio',
      })
      expect(result.data.projects).toHaveLength(1)
      expect(result.data.projects[0]?.title).toBe('Mi proyecto')
    }
  })

  it('retorna error si la query falla', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'db error' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getStudentProfile()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// saveStudentProfile
// ─────────────────────────────────────────────────────────────────────────────

describe('saveStudentProfile', () => {
  it('retorna error unauthorized si no hay usuario autenticado', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await saveStudentProfile({ descripcion: 'Nuevo' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('guarda el perfil exitosamente', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            update: mockUpdate,
          }
        }
        return {}
      }) as never,
    )

    const result = await saveStudentProfile({
      descripcion: 'Nuevo perfil',
      portafolio_visible_publicamente: true,
    })
    expect(result.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: 'Nuevo perfil',
        portafolio_visible_publicamente: true,
      }),
    )
  })

  it('retorna error si el upsert falla', async () => {
    const mockEq = vi
      .fn()
      .mockResolvedValue({ error: { message: 'update failed' } })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            update: mockUpdate,
          }
        }
        return {}
      }) as never,
    )

    const result = await saveStudentProfile({ descripcion: 'Error' })
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// addStudentSkill
// ─────────────────────────────────────────────────────────────────────────────

describe('addStudentSkill', () => {
  it('retorna error unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await addStudentSkill('TypeScript', 'intermedio')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('añade habilidad usando tecnología existente', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'tecnologias') {
          return {
            select: vi.fn(() => ({
              ilike: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_tecnologia: 'tech-ts' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'habilidades_tecnicas') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await addStudentSkill('TypeScript', 'intermedio')
    expect(result.ok).toBe(true)
  })

  it('crea nueva tecnología si no existe y luego añade la habilidad', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'tecnologias') {
          return {
            select: vi.fn(() => ({
              ilike: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_tecnologia: 'new-tech' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'habilidades_tecnicas') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await addStudentSkill('NuevaTech', 'basico')
    expect(result.ok).toBe(true)
  })

  it('retorna estudiante_not_found si no existe el estudiante', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await addStudentSkill('TypeScript', 'avanzado')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estudiante_not_found')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteStudentSkill
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteStudentSkill', () => {
  it('retorna error unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await deleteStudentSkill('tech-1')
    expect(result.ok).toBe(false)
  })

  it('elimina la habilidad exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'habilidades_tecnicas') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await deleteStudentSkill('tech-ts')
    expect(result.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deletePortfolioProject
// ─────────────────────────────────────────────────────────────────────────────

describe('deletePortfolioProject', () => {
  it('retorna error unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await deletePortfolioProject('port-1')
    expect(result.ok).toBe(false)
  })

  it('elimina el proyecto exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'proyectos_portafolio') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await deletePortfolioProject('port-1')
    expect(result.ok).toBe(true)
  })

  it('retorna error si la eliminación falla', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'proyectos_portafolio') {
          return {
            delete: vi.fn(() => ({
              eq: vi
                .fn()
                .mockResolvedValue({ error: { message: 'delete failed' } }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await deletePortfolioProject('port-1')
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// savePortfolioProject
// ─────────────────────────────────────────────────────────────────────────────

describe('savePortfolioProject', () => {
  const projectData = {
    title: 'Mi Proyecto',
    description: 'Descripción del proyecto',
    technologies: ['TypeScript', 'React'],
    completionDate: '2024-06-01',
    repositoryUrl: 'https://github.com/test/repo',
  }

  it('retorna error unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await savePortfolioProject(projectData)
    expect(result.ok).toBe(false)
  })

  it('crea un nuevo proyecto exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos_portafolio') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_portafolio: 'new-port-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'portafolio_tecnologias') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'tecnologias') {
          return {
            select: vi.fn(() => ({
              ilike: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_tecnologia: 'tech-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await savePortfolioProject(projectData)
    expect(result.ok).toBe(true)
  })

  it('actualiza un proyecto existente', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos_portafolio') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'portafolio_tecnologias') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'tecnologias') {
          return {
            select: vi.fn(() => ({
              ilike: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_tecnologia: 'tech-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await savePortfolioProject(projectData, 'existing-port-1')
    expect(result.ok).toBe(true)
  })
})
