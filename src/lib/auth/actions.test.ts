import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/egresado-allowlist', () => ({
  isEgresadoEmailAllowed: vi.fn((email) => email === 'fwd@gmail.com'),
}))

import { signInWithPassword, signUpWithPassword } from './actions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedAdmin = vi.mocked(createSupabaseAdminClient)
const mockedServer = vi.mocked(createSupabaseServerClient)

interface UsuarioRow {
  id_usuario: string
  intentos_fallidos: number
  bloqueado_hasta: string | null
}

function buildAdmin(opts: {
  usuario: UsuarioRow | null
  updateError?: { message: string } | null
  rpcError?: { message: string } | null
}) {
  const usuariosUpdate = vi.fn<
    (updates: {
      intentos_fallidos: number
      bloqueado_hasta?: string | null
    }) => {
      eq: () => Promise<{ error: { message: string } | null }>
    }
  >()
  usuariosUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }),
  })

  const rpc = vi.fn().mockResolvedValue({ error: opts.rpcError ?? null })

  const client = {
    from: vi.fn(() => ({
      // Solo 'usuarios' se consulta desde el action ahora.
      // La config de bloqueo vive en el RPC de la BD.
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.usuario }),
        })),
      })),
      update: usuariosUpdate,
    })),
    rpc,
    usuariosUpdate,
  }

  // El cliente admin es síncrono en el action.
  mockedAdmin.mockReturnValue(client as never)
  return client
}

/** Simula la respuesta de supabase.auth.signInWithPassword.
 *  `code` es el campo que usa el action para discriminar el tipo de error. */
function buildServer(signInError: { message: string; code?: string } | null) {
  const signInWithPasswordFn = vi.fn().mockResolvedValue({ error: signInError })
  mockedServer.mockResolvedValue({
    auth: { signInWithPassword: signInWithPasswordFn },
  } as never)
  return signInWithPasswordFn
}

const CREDENTIALS = { email: 'user@example.com', password: 'secret-123' }

describe('signInWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza input inválido sin tocar Supabase', async () => {
    const result = await signInWithPassword({
      email: 'no-es-email',
      password: '',
    })

    expect(result).toEqual({ ok: false, error: 'invalid_input' })
    expect(mockedAdmin).not.toHaveBeenCalled()
    expect(mockedServer).not.toHaveBeenCalled()
  })

  it('devuelve account_locked sin intentar autenticar si el bloqueo sigue vigente', async () => {
    buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 5,
        bloqueado_hasta: '2999-01-01T00:00:00.000Z',
      },
    })
    const signIn = buildServer(null)

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'account_locked' })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('invoca el RPC atómico en credenciales inválidas (usuario conocido)', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 2,
        bloqueado_hasta: null,
      },
    })
    buildServer({
      message: 'Invalid login credentials',
      code: 'invalid_credentials',
    })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(admin.rpc).toHaveBeenCalledTimes(1)
    expect(admin.rpc).toHaveBeenCalledWith('register_failed_login', {
      p_email: CREDENTIALS.email,
    })
    // El reset vía UPDATE solo ocurre en login exitoso.
    expect(admin.usuariosUpdate).not.toHaveBeenCalled()
  })

  it('NO invoca el RPC si el error es email_not_confirmed (anti-falso-positivo)', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 0,
        bloqueado_hasta: null,
      },
    })
    buildServer({ message: 'Email not confirmed', code: 'email_not_confirmed' })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.usuariosUpdate).not.toHaveBeenCalled()
  })

  it('NO invoca el RPC si el error es over_request_rate_limit (anti-falso-positivo)', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 0,
        bloqueado_hasta: null,
      },
    })
    buildServer({
      message: 'Too many requests',
      code: 'over_request_rate_limit',
    })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.usuariosUpdate).not.toHaveBeenCalled()
  })

  it('resetea el contador tras un login exitoso', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 3,
        bloqueado_hasta: null,
      },
    })
    const signIn = buildServer(null)

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: true, data: undefined })
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.usuariosUpdate).toHaveBeenCalledWith({
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    })
  })

  it('NO invoca el RPC para correos desconocidos (usuario null)', async () => {
    const admin = buildAdmin({ usuario: null })
    buildServer({
      message: 'Invalid login credentials',
      code: 'invalid_credentials',
    })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    // Sin usuario conocido no tiene sentido llamar el RPC (el correo no existe en usuarios).
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.usuariosUpdate).not.toHaveBeenCalled()
  })
})

describe('signUpWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza input inválido sin tocar Supabase', async () => {
    const result = await signUpWithPassword({
      role: 'egresado',
      email: 'no-es-email',
      password: '123',
      fullName: 'X',
      tituloFwd: 'frontend',
    })

    expect(result).toEqual({ ok: false, error: 'invalid_input' })
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('bloquea al egresado con correo fuera de la allowlist antes de crear nada', async () => {
    const result = await signUpWithPassword({
      role: 'egresado',
      email: 'random@gmail.com',
      password: 'una-clave-larga',
      fullName: 'Egresado Prueba',
      tituloFwd: 'fullstack',
    })

    expect(result).toEqual({ ok: false, error: 'email_not_allowed' })
    // El gate corre antes del pwned-check y de cualquier llamada a Supabase.
    expect(mockedAdmin).not.toHaveBeenCalled()
  })
})
