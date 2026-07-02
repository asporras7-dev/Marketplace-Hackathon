import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { crearNotificaciones, crearNotificacion } from './create'
import type { NotificacionInput } from './create-logic'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const mockedAdmin = vi.mocked(createSupabaseAdminClient)

const UUID = '123e4567-e89b-12d3-a456-426614174000'

function input(overrides: Partial<NotificacionInput> = {}): NotificacionInput {
  return {
    idUsuario: UUID,
    tipoEvento: 'mensaje_nuevo',
    mensaje: 'Tienes un mensaje nuevo',
    ...overrides,
  }
}

/**
 * Configura el admin client mockeado según el comportamiento del insert y
 * devuelve los spies para asertar las llamadas.
 */
function fakeAdmin(
  behavior: { ok: true } | { dbError: string } | { throws: true },
) {
  const insert = vi.fn()
  if ('ok' in behavior) {
    insert.mockResolvedValue({ error: null })
  } else if ('dbError' in behavior) {
    insert.mockResolvedValue({ error: { message: behavior.dbError } })
  } else {
    insert.mockRejectedValue(new Error('boom'))
  }
  const from = vi.fn(() => ({ insert }))
  mockedAdmin.mockReturnValue({ from } as unknown as ReturnType<
    typeof createSupabaseAdminClient
  >)
  return { from, insert }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('crearNotificaciones', () => {
  it('un lote vacío es no-op: devuelve ok(0) sin tocar la base', async () => {
    const result = await crearNotificaciones([])
    expect(result).toEqual({ ok: true, data: 0 })
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('rechaza una entrada inválida antes de tocar la base', async () => {
    const result = await crearNotificaciones([input({ idUsuario: 'no-uuid' })])
    expect(result.ok).toBe(false)
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('inserta el lote en notificaciones y devuelve ok con la cantidad', async () => {
    const { from, insert } = fakeAdmin({ ok: true })
    const result = await crearNotificaciones([
      input(),
      input({ mensaje: 'otra' }),
    ])
    expect(result).toEqual({ ok: true, data: 2 })
    expect(from).toHaveBeenCalledWith('notificaciones')
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0]?.[0]).toHaveLength(2)
  })

  it('propaga el error del insert como err', async () => {
    fakeAdmin({ dbError: 'insert_kaput' })
    const result = await crearNotificaciones([input()])
    expect(result).toEqual({ ok: false, error: 'insert_kaput' })
  })

  it('atrapa una excepción inesperada y la traduce a err (canal best-effort)', async () => {
    fakeAdmin({ throws: true })
    const result = await crearNotificaciones([input()])
    expect(result).toEqual({ ok: false, error: 'notificacion_excepcion' })
  })
})

describe('crearNotificacion', () => {
  it('envuelve un solo destinatario y devuelve ok(undefined)', async () => {
    fakeAdmin({ ok: true })
    const result = await crearNotificacion(input())
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('propaga el error del núcleo', async () => {
    fakeAdmin({ dbError: 'insert_kaput' })
    const result = await crearNotificacion(input())
    expect(result).toEqual({ ok: false, error: 'insert_kaput' })
  })
})
