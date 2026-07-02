import { describe, it, expect } from 'vitest'
import { parseClientEnv } from './env'
import { parseServerEnv } from './env.server'

const VALID_URL = 'https://example.supabase.co'
const VALID_ANON = 'anon-key-value'
const VALID_SERVICE = 'service-role-key-value'
const VALID_GMAIL_USER = 'test@gmail.com'
const VALID_GMAIL_PASS = 'abcdabcdabcdabcd'

describe('parseClientEnv', () => {
  it('devuelve las vars cuando el input es válido', () => {
    const result = parseClientEnv({
      NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_ANON,
    })
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_URL)
    expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(VALID_ANON)
  })

  it('lanza ENV_INVALID cuando falta NEXT_PUBLIC_SUPABASE_URL', () => {
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_ANON }),
    ).toThrow('ENV_INVALID')
  })

  it('lanza ENV_INVALID cuando la URL está malformada', () => {
    expect(() =>
      parseClientEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_ANON,
      }),
    ).toThrow('ENV_INVALID')
  })

  it('lanza ENV_INVALID cuando NEXT_PUBLIC_SUPABASE_ANON_KEY está vacía', () => {
    expect(() =>
      parseClientEnv({
        NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      }),
    ).toThrow('ENV_INVALID')
  })
})

describe('parseServerEnv', () => {
  it('devuelve las vars cuando el input es válido con Gmail', () => {
    const result = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE,
      GMAIL_USER: VALID_GMAIL_USER,
      GMAIL_APP_PASSWORD: VALID_GMAIL_PASS,
    })
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBe(VALID_SERVICE)
    expect(result.GMAIL_USER).toBe(VALID_GMAIL_USER)
    expect(result.GMAIL_APP_PASSWORD).toBe(VALID_GMAIL_PASS)
  })

  it('pasa sin vars de email opcionales', () => {
    const result = parseServerEnv({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE })
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBe(VALID_SERVICE)
    expect(result.GMAIL_USER).toBeUndefined()
  })

  it('lanza ENV_INVALID cuando falta SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(() => parseServerEnv({})).toThrow('ENV_INVALID')
  })

  it('lanza ENV_INVALID cuando SUPABASE_SERVICE_ROLE_KEY está vacía', () => {
    expect(() => parseServerEnv({ SUPABASE_SERVICE_ROLE_KEY: '' })).toThrow(
      'ENV_INVALID',
    )
  })

  it('lanza ENV_INVALID cuando GMAIL_USER no es un email válido', () => {
    expect(() =>
      parseServerEnv({
        SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE,
        GMAIL_USER: 'no-es-un-email',
      }),
    ).toThrow('ENV_INVALID')
  })
})
