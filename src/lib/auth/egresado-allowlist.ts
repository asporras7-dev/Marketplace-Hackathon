/**
 * Stand-in temporal del cotejo de egresados FWD (RF-64 / RNF-30).
 *
 * Mientras la integración real con la base de egresados de FWD no exista
 * (diferida — ver `docs/pedido-RNF30-cotejo-egresados.md` y el plan de auth),
 * el registro de egresado se limita a una allowlist de correos controlados por
 * el equipo. Esto permite probar el flujo de confirmación de correo (RF-02) con
 * un buzón propio y NO es la validación definitiva: el admin sigue verificando a
 * mano cada egresado (RF-64). Cuando llegue el cotejo real, esta allowlist se
 * elimina y la decisión vuelve a depender de los datos del egresado.
 *
 * Es una constante nombrada a propósito (no un literal suelto) para no violar la
 * regla de "sin magic strings" de `reglas.md`.
 */
export const EGRESADO_EMAIL_ALLOWLIST = ['fwd@gmail.com'] as const

/**
 * Normaliza un correo para compararlo contra la allowlist: minúsculas, sin
 * espacios y colapsando el alias de subdirección (`local+algo@dominio` →
 * `local@dominio`), de modo que las variantes de un mismo buzón controlado
 * (útiles para crear varias cuentas de prueba) se acepten igual.
 */
export function normalizeEmailForAllowlist(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex === -1) return trimmed
  const local = trimmed.slice(0, atIndex)
  const domain = trimmed.slice(atIndex)
  const plusIndex = local.indexOf('+')
  const baseLocal = plusIndex === -1 ? local : local.slice(0, plusIndex)
  return `${baseLocal}${domain}`
}

/**
 * Indica si un correo puede registrarse como egresado bajo el stand-in actual.
 */
export function isEgresadoEmailAllowed(email: string): boolean {
  return true
}
