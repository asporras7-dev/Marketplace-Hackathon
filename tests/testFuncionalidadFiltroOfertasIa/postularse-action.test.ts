import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postularse } from '@/lib/applications/actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { ok, err } from '@/lib/result'
import type { UserRole } from '@/types'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/ai-filtro-ofertas/openrouter-validation', () => ({
  validateApplicationWithAI: vi.fn(),
}))

// El productor de notificaciones (notificarPostulacion) usa el cliente admin;
// se mockea para que no intente una conexión real (igual que strike-actions.test).
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              empresarios: {
                id_usuario: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
              },
            },
            error: null,
          }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}))

import { validateApplicationWithAI } from '@/lib/ai-filtro-ofertas/openrouter-validation'

const ID_PROYECTO = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const INPUT_VALIDO = {
  id_proyecto: ID_PROYECTO,
  planteamiento_solucion:
    'Desarrollaré la plataforma usando Next.js y Supabase, integrando pagos con Stripe.',
  prototipo_enlaces: ['https://figma.com/mi-prototipo'] as string[],
  carta_postulacion: 'Tengo experiencia en proyectos similares de e-commerce.',
}

// postularse recibe FormData: el documento técnico viaja como File y los enlaces
// como JSON. Convierte el objeto de prueba al FormData que espera la action.
function buildFormData(input: typeof INPUT_VALIDO = INPUT_VALIDO): FormData {
  const fd = new FormData()
  fd.append('id_proyecto', input.id_proyecto)
  fd.append('planteamiento_solucion', input.planteamiento_solucion)
  fd.append('carta_postulacion', input.carta_postulacion)
  fd.append('prototipo_enlaces', JSON.stringify(input.prototipo_enlaces))
  fd.append(
    'file',
    new File(['contenido del documento'], 'propuesta.pdf', {
      type: 'application/pdf',
    }),
  )
  return fd
}

const PROYECTO_ABIERTO = {
  titulo: 'Plataforma de delivery',
  descripcion: 'App web para pedir comida a restaurantes locales.',
  estado: 'abierto',
  fecha_cierre: null,
  is_active: true,
}

const ESTUDIANTE_VERIFICADO = {
  id_estudiante: 'est-abc-123',
  estado_verificacion: 'verificado',
}

function buildSupabaseMock(
  overrides: {
    estudiante?: unknown
    proyecto?: unknown
    insertError?: unknown
  } = {},
) {
  const estudiante =
    overrides.estudiante !== undefined
      ? overrides.estudiante
      : { data: ESTUDIANTE_VERIFICADO, error: null }

  const proyecto =
    overrides.proyecto !== undefined
      ? overrides.proyecto
      : { data: PROYECTO_ABIERTO, error: null }

  const insertError =
    overrides.insertError !== undefined ? overrides.insertError : null

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-xyz' } },
        error: null,
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi
          .fn()
          .mockResolvedValue({ data: { path: 'subido' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'estudiantes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(estudiante),
        }
      }
      if (table === 'proyectos') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(proyecto),
        }
      }
      if (table === 'participaciones') {
        return {
          insert: vi.fn().mockResolvedValue({ error: insertError }),
        }
      }
      return {}
    }),
  }
}

describe('postularse — server action de postulaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    vi.mocked(validateApplicationWithAI).mockResolvedValue({
      isRelated: true,
      problematicFields: [],
      reason: 'Postulación válida',
    })
  })

  it('retorna invalid_input si los parámetros no pasan la validación de Zod', async () => {
    const res = await postularse(
      buildFormData({
        ...INPUT_VALIDO,
        id_proyecto: 'no-es-uuid',
        planteamiento_solucion: 'corto',
        prototipo_enlaces: [],
      }),
    )

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('invalid_input')
    }
  })

  it('retorna forbidden si el usuario no tiene rol egresado', async () => {
    vi.mocked(requireRole).mockResolvedValue(err('forbidden'))

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('forbidden')
    }
  })

  it('retorna unauthenticated si no hay sesión activa', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('unauthenticated')
    }
  })

  it('retorna estudiante_not_found si no se encuentra el perfil del egresado', async () => {
    const mockSupabase = buildSupabaseMock({
      estudiante: { data: null, error: { message: 'not found' } },
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('estudiante_not_found')
    }
  })

  it('retorna cuenta_no_verificada si el egresado no está verificado', async () => {
    const mockSupabase = buildSupabaseMock({
      estudiante: {
        data: {
          id_estudiante: 'est-abc-123',
          estado_verificacion: 'pendiente',
        },
        error: null,
      },
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('cuenta_no_verificada')
    }
  })

  it('retorna proyecto_cerrado si el proyecto no está activo', async () => {
    const mockSupabase = buildSupabaseMock({
      proyecto: {
        data: {
          ...PROYECTO_ABIERTO,
          is_active: false,
          estado: 'cerrado',
        },
        error: null,
      },
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('proyecto_cerrado')
    }
  })

  it('retorna plazo_vencido si la fecha de cierre ya pasó', async () => {
    const mockSupabase = buildSupabaseMock({
      proyecto: {
        data: {
          ...PROYECTO_ABIERTO,
          fecha_cierre: '2020-01-01T00:00:00Z',
        },
        error: null,
      },
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('plazo_vencido')
    }
  })

  it('retorna error AI_REJECTED si la IA detecta contenido no relacionado', async () => {
    vi.mocked(validateApplicationWithAI).mockResolvedValue({
      isRelated: false,
      problematicFields: ['Planteamiento de la solución'],
      reason: 'El contenido habla de cocina, no de programación.',
    })

    const mockSupabase = buildSupabaseMock()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toMatch(/^AI_REJECTED::/)
      expect(res.error).toContain('cocina')
    }
  })

  it('retorna database_error si falla el insert en Supabase', async () => {
    const mockSupabase = buildSupabaseMock({
      insertError: { message: 'Connection timeout', code: '08006' },
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('database_error')
    }
  })

  it('retorna cupo_excedido si el trigger de Postgres rechaza por cupo', async () => {
    const mockSupabase = buildSupabaseMock({
      insertError: {
        message: 'se superó el cupo máximo de postulaciones activas',
        code: 'P0001',
      },
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('cupo_excedido')
    }
  })

  it('retorna ok cuando todo el flujo es exitoso', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await postularse(buildFormData())

    expect(res.ok).toBe(true)
    expect(validateApplicationWithAI).toHaveBeenCalledOnce()
  })

  it('llama a validateApplicationWithAI con los datos correctos del proyecto y la postulación', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    await postularse(buildFormData())

    expect(validateApplicationWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        projectTitle: PROYECTO_ABIERTO.titulo,
        projectDescription: PROYECTO_ABIERTO.descripcion,
        solutionApproach: INPUT_VALIDO.planteamiento_solucion,
        coverLetter: INPUT_VALIDO.carta_postulacion,
      }),
    )
  })
})
