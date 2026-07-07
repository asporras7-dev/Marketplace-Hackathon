import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/dal', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import {
  getCompanyProfile,
  getCompanyProfileForEdit,
  saveCompanyProfile,
} from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/dal'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedAdmin = vi.mocked(createSupabaseAdminClient)
const mockedGetCurrentUser = vi.mocked(getCurrentUser)

const USER_ID = 'usr-empresa-1'

/** Supabase mock con auth exitoso */
function withUser(fromImpl: (table: string) => unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: 'empresa@test.com' } },
        error: null,
      }),
    },
    from: vi.fn(fromImpl),
  }
}

/** Supabase mock sin usuario */
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

const mockEmpresario = {
  id_empresario: 'emp-1',
  id_usuario: USER_ID,
  nombre_empresa: 'Tech Corp SA',
  tipo_empresario: 'empresa_formal',
  sector: 'Tecnología',
  cedula: '3-101-999999',
  descripcion: 'Una empresa de tecnología',
  logo: null,
  sitio_web: 'https://techcorp.com',
  pais_iso_sede: 'CR',
  region_sede: 'CR-SJ',
  alcance_operativo: 'nacional',
  estado_verificacion: 'verificado',
  reputacion: '4.5',
}

const mockUsuario = {
  nombre: 'María',
  apellido_1: 'González',
  apellido_2: null,
  fecha_nacimiento: '1985-06-15',
  foto_perfil: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetCurrentUser.mockResolvedValue({
    id: USER_ID,
    email: 'empresa@test.com',
  } as never)
  mockedAdmin.mockImplementation(
    () =>
      ({
        from: vi.fn((table) => {
          if (table === 'empresarios') {
            return {
              upsert: vi.fn().mockResolvedValue({ error: null }),
            }
          }
          if (table === 'usuarios') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            }
          }
          return {}
        }),
      }) as never,
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// getCompanyProfile
// ─────────────────────────────────────────────────────────────────────────────

describe('getCompanyProfile', () => {
  it('retorna error unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await getCompanyProfile()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna null si el empresario no existe (primer login)', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'empresarios') {
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

    const result = await getCompanyProfile()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('retorna el perfil completo del empresario', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockEmpresario,
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUsuario,
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getCompanyProfile()
    expect(result.ok).toBe(true)
    if (result.ok && result.data) {
      expect(result.data.firstName).toBe('María')
      expect(result.data.name).toBe('Tech Corp SA')
      expect(result.data.companyType).toBe('formal')
      expect(result.data.verificationStatus).toBe('verificado')
    }
  })

  it('retorna error si la query de empresarios falla', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'empresarios') {
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

    const result = await getCompanyProfile()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCompanyProfileForEdit
// ─────────────────────────────────────────────────────────────────────────────

describe('getCompanyProfileForEdit', () => {
  it('retorna error unauthorized si no hay usuario', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await getCompanyProfileForEdit()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna perfil con datos de usuario aunque no exista empresario', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUsuario,
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'empresarios') {
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

    const result = await getCompanyProfileForEdit()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.firstName).toBe('María')
      expect(result.data.name).toBe('')
    }
  })

  it('retorna perfil con datos completos si el empresario existe', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUsuario,
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockEmpresario,
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getCompanyProfileForEdit()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('Tech Corp SA')
      expect(result.data.sector).toBe('Tecnología')
    }
  })

  it('retorna error si la query de usuarios falla', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'usuarios') {
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

    const result = await getCompanyProfileForEdit()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// saveCompanyProfile
// ─────────────────────────────────────────────────────────────────────────────

describe('saveCompanyProfile', () => {
  const validProfile = {
    firstName: 'María',
    lastName1: 'González',
    birthDate: '1985-06-15',
    profilePhoto: '',
    name: 'Empresa Demo SA',
    companyType: 'formal' as const,
    sector: 'Tecnología',
    cedula: '3-101-999999',
    description: '',
    contactEmail: 'maria@empresa.com',
    website: '',
    logo: '',
    country: 'Costa Rica',
    operatingScope: 'nacional' as const,
  }

  it('retorna invalid_input si el perfil no pasa validación', async () => {
    const result = await saveCompanyProfile({
      ...validProfile,
      firstName: 'A', // muy corto
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('retorna unauthorized si no hay usuario autenticado', async () => {
    mockedServer.mockResolvedValue(withNoUser() as never)
    const result = await saveCompanyProfile(validProfile)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('guarda el perfil exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withUser((table) => {
        if (table === 'empresarios') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'usuarios') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await saveCompanyProfile(validProfile)
    expect(result.ok).toBe(true)
  })
  it('retorna error si el upsert de empresarios falla', async () => {
    mockedAdmin.mockImplementation(
      () =>
        ({
          from: vi.fn((table) => {
            if (table === 'empresarios') {
              return {
                upsert: vi
                  .fn()
                  .mockResolvedValue({ error: { message: 'upsert failed' } }),
              }
            }
            return {}
          }),
        }) as never,
    )

    const result = await saveCompanyProfile(validProfile)
    expect(result.ok).toBe(false)
  })
})
