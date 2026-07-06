import type { UserRole } from '@/types'

/**
 * Ruta home por rol — fuente única de verdad.
 * Usada en middleware, callbacks y layouts.
 *
 * El egresado aterriza en la raíz localizada ('' → /es), la landing
 * compartida. /egresado sigue existiendo y es accesible desde el navbar; solo
 * cambia el destino por defecto post-login. El empresario y el administrador
 * mantienen sus rutas. El valor de rol ya coincide con el nombre_rol de la BD.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  egresado: '',
  empresario: '',
  administrador: '/admin',
}

/**
 * Valida que el nombre_rol recibido de la BD sea un UserRole conocido.
 *
 * El frontend y la BD ahora usan el mismo vocabulario
 * (egresado / empresario / administrador). Esta función descarta valores
 * nulos o desconocidos y devuelve el tipo correcto — ya no hace traducción.
 */
export function normalizeRole(
  dbRole: string | null | undefined,
): UserRole | null {
  if (!dbRole) return null
  if (dbRole === 'egresado') return 'egresado'
  if (dbRole === 'empresario') return 'empresario'
  if (dbRole === 'administrador') return 'administrador'
  return null
}
