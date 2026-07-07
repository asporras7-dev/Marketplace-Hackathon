import { describe, it, expect } from 'vitest'
import {
  EGRESADO_EMAIL_ALLOWLIST,
  normalizeEmailForAllowlist,
  isEgresadoEmailAllowed,
} from './egresado-allowlist'

describe('normalizeEmailForAllowlist', () => {
  it('pasa a minúsculas y recorta espacios', () => {
    expect(normalizeEmailForAllowlist('  FWD@Gmail.com ')).toBe('fwd@gmail.com')
  })

  it('colapsa el alias de subdirección (+algo)', () => {
    expect(normalizeEmailForAllowlist('fwd+test1@gmail.com')).toBe(
      'fwd@gmail.com',
    )
    expect(normalizeEmailForAllowlist('fwd+lo+que+sea@gmail.com')).toBe(
      'fwd@gmail.com',
    )
  })

  it('deja intacto un correo sin alias', () => {
    expect(normalizeEmailForAllowlist('persona@dominio.com')).toBe(
      'persona@dominio.com',
    )
  })

  it('no rompe con una entrada sin @', () => {
    expect(normalizeEmailForAllowlist('no-es-correo')).toBe('no-es-correo')
  })
})

describe('isEgresadoEmailAllowed', () => {
  it('acepta el correo de la allowlist', () => {
    expect(isEgresadoEmailAllowed(EGRESADO_EMAIL_ALLOWLIST[0])).toBe(true)
  })

  it('acepta variantes con alias y mayúsculas del correo permitido', () => {
    expect(isEgresadoEmailAllowed('FWD+demo@gmail.com')).toBe(true)
  })

  it('acepta cualquier correo fuera de la allowlist', () => {
    expect(isEgresadoEmailAllowed('otro@gmail.com')).toBe(true)
    expect(isEgresadoEmailAllowed('persona@empresa.com')).toBe(true)
  })
})
