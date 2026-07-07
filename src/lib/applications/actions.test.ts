import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(),
  requireVerifiedEgresado: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    },
  })),
}))

import {
  postularse,
  retirarPostulacion,
  getSignedUrlDocumentacionTecnica,
} from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole, requireVerifiedEgresado } from '@/lib/auth/guards'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedAdmin = vi.mocked(createSupabaseAdminClient)
const mockedRequireRole = vi.mocked(requireRole)
const mockedVerifiedEgresado = vi.mocked(requireVerifiedEgresado)

const PROJ_UUID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PART_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const USER_ID = 'usr-egresado-1'
const EST_ID = 'est-1'

function withAuth(fromImpl: (table: string) => unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn(fromImpl),
    storage: {
      from: vi.fn(() => ({
        upload: vi
          .fn()
          .mockResolvedValue({ data: { path: 'subido' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  }
}

function withNoAuth() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'no auth' },
      }),
    },
    from: vi.fn(),
  }
}

// postularse recibe FormData: el documento técnico viaja como File y los enlaces
// como JSON. Los overrides permiten romper un campo puntual para los casos de error.
function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.append('id_proyecto', overrides.id_proyecto ?? PROJ_UUID)
  fd.append(
    'planteamiento_solucion',
    overrides.planteamiento_solucion ??
      'Esta es mi propuesta de solución detallada para el proyecto.',
  )
  fd.append(
    'carta_postulacion',
    overrides.carta_postulacion ?? 'Carta de presentación del egresado.',
  )
  fd.append(
    'prototipo_enlaces',
    overrides.prototipo_enlaces ??
      JSON.stringify(['https://github.com/test/prototype']),
  )
  fd.append(
    'file',
    new File(['contenido del documento'], 'propuesta.pdf', {
      type: 'application/pdf',
    }),
  )
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'egresado' })
  mockedVerifiedEgresado.mockResolvedValue({
    ok: true,
    data: { id_estudiante: EST_ID, id_usuario: USER_ID },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// postularse
// ─────────────────────────────────────────────────────────────────────────────

describe('postularse', () => {
  it('retorna invalid_input si el input no cumple el schema', async () => {
    const result = await postularse(
      buildFormData({
        id_proyecto: 'no-es-uuid',
        planteamiento_solucion: 'corto',
        prototipo_enlaces: JSON.stringify([]),
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('propaga error si el rol no es egresado', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna estudiante_not_found si el estudiante no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estudiante_not_found')
  })

  it('retorna cuenta_no_verificada si el egresado no está verificado', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'pendiente',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('cuenta_no_verificada')
  })

  it('retorna proyecto_not_found si el proyecto no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('proyecto_not_found')
  })

  it('retorna proyecto_cerrado si el proyecto no está abierto', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    estado: 'finalizado',
                    fecha_cierre: null,
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('proyecto_cerrado')
  })

  it('envía la postulación exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    estado: 'abierto',
                    fecha_cierre: null,
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(buildFormData())
    expect(result.ok).toBe(true)
  })

  it('borra el archivo huérfano del Storage si el insert falla (cleanup)', async () => {
    const removeMock = vi.fn().mockResolvedValue({ data: [], error: null })
    mockedServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    estado: 'abierto',
                    fecha_cierre: null,
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            insert: vi
              .fn()
              .mockResolvedValue({ error: { message: 'boom', code: '08006' } }),
          }
        }
        return {}
      }),
    } as never)

    mockedAdmin.mockImplementation(
      () =>
        ({
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
          storage: {
            from: vi.fn(() => ({
              upload: vi
                .fn()
                .mockResolvedValue({ data: { path: 'subido' }, error: null }),
              remove: removeMock,
            })),
          },
        }) as never,
    )

    const result = await postularse(buildFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('database_error')
    // El huérfano se limpia: remove() recibe el path recién subido.
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledWith([
      expect.stringContaining(PROJ_UUID),
    ])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getSignedUrlDocumentacionTecnica
// ─────────────────────────────────────────────────────────────────────────────

const EMP_ID = 'emp-1'

function serverConEmpresario(empresario: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-emp-1' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'empresarios') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: empresario, error: null }),
            })),
          })),
        }
      }
      return {}
    }),
  }
}

function adminParaDoc(opts: {
  part: unknown
  proyecto: unknown
  signed?: { data: { signedUrl: string } | null; error: unknown }
}) {
  const createSignedUrl = vi.fn().mockResolvedValue(
    opts.signed ?? {
      data: { signedUrl: 'https://signed.example/doc?token=abc' },
      error: null,
    },
  )
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'participaciones') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: opts.part, error: null }),
            })),
          })),
        }
      }
      if (table === 'proyectos') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: opts.proyecto, error: null }),
            })),
          })),
        }
      }
      return {}
    }),
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  }
  return { client, createSignedUrl }
}

describe('getSignedUrlDocumentacionTecnica', () => {
  it('retorna invalid_input si el id no es UUID', async () => {
    const result = await getSignedUrlDocumentacionTecnica('no-es-uuid')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('retorna unauthenticated si no hay sesión', async () => {
    mockedServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'no auth' },
        }),
      },
      from: vi.fn(),
    } as never)
    const result = await getSignedUrlDocumentacionTecnica(PART_UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna unauthorized si el usuario no es empresario', async () => {
    mockedServer.mockResolvedValue(serverConEmpresario(null) as never)
    const result = await getSignedUrlDocumentacionTecnica(PART_UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna unauthorized si el empresario NO es dueño del proyecto', async () => {
    mockedServer.mockResolvedValue(
      serverConEmpresario({ id_empresario: EMP_ID }) as never,
    )
    const { client, createSignedUrl } = adminParaDoc({
      part: {
        documentacion_tecnica: `${PROJ_UUID}/usr/x.pdf`,
        id_proyecto: PROJ_UUID,
      },
      proyecto: { id_empresario: 'emp-OTRO' },
    })
    mockedAdmin.mockReturnValue(client as never)

    const result = await getSignedUrlDocumentacionTecnica(PART_UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('devuelve la URL legacy externa tal cual, sin firmar', async () => {
    mockedServer.mockResolvedValue(
      serverConEmpresario({ id_empresario: EMP_ID }) as never,
    )
    const legacyUrl = 'https://drive.google.com/file/d/abc/view'
    const { client, createSignedUrl } = adminParaDoc({
      part: { documentacion_tecnica: legacyUrl, id_proyecto: PROJ_UUID },
      proyecto: { id_empresario: EMP_ID },
    })
    mockedAdmin.mockReturnValue(client as never)

    const result = await getSignedUrlDocumentacionTecnica(PART_UUID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.url).toBe(legacyUrl)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('firma el path del bucket privado y devuelve la signed URL', async () => {
    mockedServer.mockResolvedValue(
      serverConEmpresario({ id_empresario: EMP_ID }) as never,
    )
    const path = `${PROJ_UUID}/usr/123-x.pdf`
    const { client, createSignedUrl } = adminParaDoc({
      part: { documentacion_tecnica: path, id_proyecto: PROJ_UUID },
      proyecto: { id_empresario: EMP_ID },
    })
    mockedAdmin.mockReturnValue(client as never)

    const result = await getSignedUrlDocumentacionTecnica(PART_UUID)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.data.url).toBe('https://signed.example/doc?token=abc')
    expect(createSignedUrl).toHaveBeenCalledWith(path, 3600)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// retirarPostulacion
// ─────────────────────────────────────────────────────────────────────────────

describe('retirarPostulacion', () => {
  it('retorna invalid_input si el UUID es inválido', async () => {
    const result = await retirarPostulacion({ id_participacion: 'no-uuid' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('propaga cuenta_no_verificada del guard si el egresado no está verificado', async () => {
    mockedVerifiedEgresado.mockResolvedValue({
      ok: false,
      error: 'cuenta_no_verificada',
    })
    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('cuenta_no_verificada')
  })

  it('propaga forbidden del guard si el rol no es egresado', async () => {
    mockedVerifiedEgresado.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
  })

  it('propaga estudiante_not_found del guard', async () => {
    mockedVerifiedEgresado.mockResolvedValue({
      ok: false,
      error: 'estudiante_not_found',
    })
    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estudiante_not_found')
  })

  it('retorna participacion_not_found si no existe la participación', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
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
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'not found' },
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('participacion_not_found')
  })

  it('retorna estado_invalido_retiro si el estado no permite retiro', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
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
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id_participacion: PART_UUID, estado: 'contratada' },
                error: null,
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estado_invalido_retiro')
  })

  it('retira la postulación exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
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
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id_participacion: PART_UUID,
                  estado: 'enviada',
                  id_proyecto: PROJ_UUID,
                },
                error: null,
              }),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { fecha_cierre: null },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(true)
  })

  it('retorna plazo_vencido si la ventana de ofertas ya cerró (RF-31)', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id_participacion: PART_UUID,
                  estado: 'enviada',
                  id_proyecto: PROJ_UUID,
                },
                error: null,
              }),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { fecha_cierre: '2020-01-01T00:00:00.000Z' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('plazo_vencido')
  })
})
