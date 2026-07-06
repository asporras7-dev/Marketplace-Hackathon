import type { Database } from '@/types/database'

export type TipoNotificacion =
  Database['public']['Enums']['tipo_notificacion_enum']

/**
 * Tono visual de cada tipo de notificación, mapeado a tokens FWD (§5.1).
 * No se usan colores crudos: el componente traduce el tono a clases de token.
 */
export type NotificationTone = 'primary' | 'accent' | 'warning' | 'magenta'

const TONE_BY_TIPO: Record<TipoNotificacion, NotificationTone> = {
  mensaje_nuevo: 'primary',
  postulacion_recibida: 'primary',
  plazo_vence: 'warning',
  participacion_no_seleccionada: 'magenta',
  participacion_contratada: 'accent',
  participacion_en_revision: 'primary',
  entregable_aprobado: 'accent',
  entregable_rechazado: 'magenta',
  entregable_enviado: 'primary',
  evaluacion_recibida: 'primary',
  cuenta_verificada: 'accent',
  cuenta_suspendida: 'magenta',
  strike_recibido: 'magenta',
  proyecto_modificado: 'primary',
}

const TIPOS_CONOCIDOS: ReadonlySet<string> = new Set<TipoNotificacion>(
  Object.keys(TONE_BY_TIPO) as TipoNotificacion[],
)

/**
 * Tipos que usan plantilla i18n estática (sin interpolación de params).
 * resolveNotificationContent devuelve kind:'i18n' con values:{} para estos
 * tipos incluso cuando no se pasan params, evitando el fallback en español.
 */
const TIPOS_I18N_ESTATICOS: ReadonlySet<string> = new Set<TipoNotificacion>([
  'cuenta_verificada',
])

/**
 * Tipos cuyo contenido ya tiene plantilla i18n (clave `content.<tipo>`).
 * Crece a medida que cada evento se migra a almacenamiento i18n-first
 * (tipo + parámetros) en lugar de texto plano en la columna `mensaje`.
 */
const TIPOS_CON_PLANTILLA: ReadonlySet<string> = new Set<TipoNotificacion>([
  'proyecto_modificado',
  'strike_recibido',
  'cuenta_suspendida',
  'cuenta_verificada',
  'participacion_contratada',
  'participacion_no_seleccionada',
  'participacion_en_revision',
  'postulacion_recibida',
  'plazo_vence',
  'entregable_aprobado',
  'entregable_rechazado',
  'entregable_enviado',
  'mensaje_nuevo',
])

/**
 * Devuelve el tono visual (token FWD) para el tipo de notificación.
 * Acepta `string` para tolerar tipos que la BD podría tener antes que estos
 * tipos de TypeScript; cae a `primary` ante un valor desconocido.
 */
export function getNotificationTone(tipo: string): NotificationTone {
  return (
    (TONE_BY_TIPO as Record<string, NotificationTone | undefined>)[tipo] ??
    'primary'
  )
}

/**
 * Clave i18n de la etiqueta de tipo (badge). Los tipos no reconocidos caen a
 * una etiqueta genérica para que la campana nunca rompa ante un tipo nuevo.
 */
export function getNotificationTypeKey(tipo: string): string {
  return TIPOS_CONOCIDOS.has(tipo) ? `types.${tipo}` : 'types.generic'
}

/**
 * Resultado del render de contenido: o una clave i18n con sus parámetros
 * (almacenamiento i18n-first), o el texto crudo guardado en `mensaje` (fallback
 * para notificaciones previas a la migración i18n-first).
 */
export type NotificationContent =
  | { kind: 'i18n'; key: string; values: Record<string, string> }
  | { kind: 'raw'; text: string }

/**
 * Decide cómo renderizar el cuerpo de una notificación.
 *
 * - Tipo en TIPOS_I18N_ESTATICOS → clave i18n con values:{} (sin params).
 * - Con `params` y un tipo que tiene plantilla → clave i18n con los params.
 * - En cualquier otro caso → texto crudo guardado en `mensaje` (fallback).
 */
export function resolveNotificationContent(input: {
  tipo: string
  mensaje: string
  params?: Record<string, string> | null
}): NotificationContent {
  const { tipo, mensaje, params } = input
  if (TIPOS_I18N_ESTATICOS.has(tipo)) {
    return { kind: 'i18n', key: `content.${tipo}`, values: {} }
  }
  const hasParams = params != null && Object.keys(params).length > 0
  if (hasParams && TIPOS_CON_PLANTILLA.has(tipo)) {
    // Para notificaciones antiguas que tenían params pero no 'remitente', proveemos un fallback
    const safeValues = { ...params }
    if (tipo === 'mensaje_nuevo' && !safeValues.remitente) {
      safeValues.remitente = 'un usuario'
    }
    return { kind: 'i18n', key: `content.${tipo}`, values: safeValues }
  }
  return { kind: 'raw', text: mensaje }
}
