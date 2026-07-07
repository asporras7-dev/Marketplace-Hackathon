import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))
vi.mock('@/lib/auth/dal', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/projects/project-detail-logic', () => ({
  computeEstadoParticipacionEfectivo: vi.fn((estado: string) => estado),
}))

import { getMisPostulacionesStats, getMisPostulaciones } from './queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/dal'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedAdminServer = vi.mocked(createSupabaseAdminClient)
const mockedGetCurrentUser = vi.mocked(getCurrentUser)

let activeClient: unknown = null
const originalMockResolvedValue = mockedServer.mockResolvedValue
mockedServer.mockResolvedValue = (
  value: Parameters<typeof originalMockResolvedValue>[0],
) => {
  activeClient = value
  return originalMockResolvedValue(value)
}

mockedAdminServer.mockImplementation(() => {
  return activeClient as never
})

const USER_ID = 'usr-egresado-1'
const EST_ID = 'est-1'

function withAuth(fromImpl: (table: string) => unknown) {
  return { from: vi.fn(fromImpl) }
}

beforeEach(() => {
  vi.clearAllMocks()
  activeClient = null
  mockedGetCurrentUser.mockResolvedValue({ id: USER_ID } as never)
})

// ─────────────────────────────────────────────────────────────────────────────
// getMisPostulacionesStats
// ─────────────────────────────────────────────────────────────────────────────

describe('getMisPostulacionesStats', () => {
  it('retorna unauthorized si no hay usuario autenticado', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await getMisPostulacionesStats()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna ceros si el estudiante no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
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

    const result = await getMisPostulacionesStats()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ total: 0, activas: 0, contratadas: 0 })
    }
  })

  it('cuenta correctamente las postulaciones activas y contratadas', async () => {
    const mockParticipaciones = [
      { estado: 'enviada', proyectos: { estado: 'abierto' } },
      { estado: 'en_revision', proyectos: { estado: 'en_recepcion' } },
      { estado: 'contratada', proyectos: { estado: 'en_desarrollo' } },
      { estado: 'rechazada', proyectos: { estado: 'abierto' } },
      { estado: 'finalizada', proyectos: { estado: 'finalizado' } },
    ]

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: mockParticipaciones,
                error: null,
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMisPostulacionesStats()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.total).toBe(5)
      expect(result.data.activas).toBe(2) // enviada + en_revision
      expect(result.data.contratadas).toBe(2) // contratada + finalizada
    }
  })

  it('retorna error si la query de estudiante falla', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
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

    const result = await getMisPostulacionesStats()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getMisPostulaciones
// ─────────────────────────────────────────────────────────────────────────────

describe('getMisPostulaciones', () => {
  it('retorna unauthorized si no hay usuario autenticado', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await getMisPostulaciones()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna [] si el estudiante no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
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

    const result = await getMisPostulaciones()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('retorna la lista de postulaciones del egresado', async () => {
    const mockPostulacion = {
      id_participacion: 'part-1',
      id_proyecto: 'proj-1',
      carta_postulacion: 'Me interesa mucho este proyecto.',
      estado: 'enviada',
      fecha_postulacion: '2024-06-01T10:00:00Z',
      proyectos: {
        titulo: 'App móvil',
        estado: 'abierto',
        id_empresario: 'emp-1',
        empresarios: { nombre_empresa: 'Acme Corp' },
      },
    }

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [mockPostulacion],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMisPostulaciones()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id_participacion: 'part-1',
        projectTitle: 'App móvil',
        companyName: 'Acme Corp',
        estado: 'enviada',
      })
    }
  })

  it('retorna error si la query de participaciones falla', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'query failed' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMisPostulaciones()
    expect(result.ok).toBe(false)
  })
})
