import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import type { Database } from '@/types/database'

export type TipoNotificacion =
  Database['public']['Enums']['tipo_notificacion_enum']

type NotificacionRow = Database['public']['Tables']['notificaciones']['Insert']

/** Límite de la columna `mensaje` (`varchar(255)`) de la tabla `notificaciones`. */
export const MENSAJE_MAX_LEN = 255

/**
 * Entrada para crear una notificación. La audiencia (a quién notificar) la
 * resuelve cada productor; este núcleo recibe el `idUsuario` ya resuelto.
 *
 * - `mensaje`: texto plano, fallback en la campana y fuente del correo (RF-46).
 * - `params`: datos del evento para el render i18n en el cliente (RF-47). Si se
 *   omite, la campana muestra `mensaje` tal cual.
 */
export interface NotificacionInput {
  idUsuario: string
  tipoEvento: TipoNotificacion
  mensaje: string
  urlDestino?: string | null
  params?: Record<string, string> | null
}

const inputSchema = z.object({
  idUsuario: z.string().uuid(),
  tipoEvento: z.string().min(1),
  mensaje: z.string().trim().min(1).max(MENSAJE_MAX_LEN),
  urlDestino: z.string().max(255).nullish(),
  params: z.record(z.string(), z.string()).nullish(),
})

/**
 * Valida un lote de entradas en la frontera (Zod). Devuelve las mismas entradas
 * si todas son válidas, o el primer error encontrado. Pura: no toca la base, así
 * el productor y los tests comparten exactamente la misma validación.
 */
export function validateNotificacionInputs(
  inputs: NotificacionInput[],
): Result<NotificacionInput[]> {
  for (const input of inputs) {
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      console.error(
        'Validation failed for input:',
        input,
        'Errors:',
        parsed.error.issues,
      )
      return err(
        `notificacion_invalida: ${issue?.message ?? 'entrada inválida'}`,
      )
    }
  }
  return ok(inputs)
}

/**
 * Mapea las entradas (camelCase del dominio) a filas de la tabla (snake_case),
 * resolviendo los defaults (`url_destino`/`params` a `null`, `leida` a `false`).
 * Pura y separada del I/O para poder testear el mapeo sin tocar la base.
 */
export function buildNotificacionRows(
  inputs: NotificacionInput[],
): NotificacionRow[] {
  return inputs.map((input) => ({
    id_usuario: input.idUsuario,
    tipo_evento: input.tipoEvento,
    mensaje: input.mensaje,
    url_destino: input.urlDestino ?? null,
    params: input.params ?? null,
    leida: false,
  }))
}
