'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'

export type TipoNotificacion =
  Database['public']['Enums']['tipo_notificacion_enum']

export interface NotificacionItem {
  id_notificacion: string
  mensaje: string
  tipo_evento: TipoNotificacion
  leida: boolean
  url_destino: string | null
  generada_at: string
  params: Record<string, string> | null
}

const MAX_NOTIFICACIONES = 30
const NOTIFICACION_COLUMNS =
  'id_notificacion, mensaje, tipo_evento, leida, url_destino, generada_at, params'
const idSchema = z.string().uuid()

/**
 * Lee las últimas notificaciones del usuario autenticado (estudiante o
 * empresario). Usa el cliente con sesión: RLS (`notificaciones_select_own`)
 * garantiza que solo se devuelvan las propias (RF-47).
 */
export async function getMisNotificaciones(): Promise<
  Result<NotificacionItem[]>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('notificaciones')
    .select(NOTIFICACION_COLUMNS)
    .eq('id_usuario', user.id)
    .order('generada_at', { ascending: false })
    .limit(MAX_NOTIFICACIONES)

  if (error) {
    logger.error('getMisNotificaciones: fallo al leer notificaciones', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok((data ?? []) as NotificacionItem[])
}

/**
 * Cuenta de forma exacta las notificaciones sin leer del usuario autenticado.
 * Independiente del límite de la lista, para que el badge nunca subestime el
 * total cuando hay más de {@link MAX_NOTIFICACIONES} sin leer.
 */
export async function getMisNotificacionesNoLeidasCount(): Promise<
  Result<number>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const supabase = await createSupabaseServerClient()
  const { count, error } = await supabase
    .from('notificaciones')
    .select('id_notificacion', { count: 'exact', head: true })
    .eq('id_usuario', user.id)
    .eq('leida', false)

  if (error) {
    logger.error('getMisNotificacionesNoLeidasCount: fallo al contar', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(count ?? 0)
}

/**
 * Marca una notificación propia como leída. El filtro por `id_usuario` y la
 * RLS (`notificaciones_update_own`) impiden tocar notificaciones de otros.
 */
export async function marcarNotificacionLeida(
  id: string,
): Promise<Result<void>> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return err('invalid_id')

  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id_notificacion', parsed.data)
    .eq('id_usuario', user.id)

  if (error) {
    logger.error('marcarNotificacionLeida: fallo al actualizar', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Marca como leídas todas las notificaciones sin leer del usuario autenticado.
 */
export async function marcarTodasMisNotificacionesLeidas(): Promise<
  Result<void>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id_usuario', user.id)
    .eq('leida', false)

  if (error) {
    logger.error('marcarTodasMisNotificacionesLeidas: fallo al actualizar', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Elimina una notificación propia. El filtro por `id_usuario`
 * garantiza que no se eliminen notificaciones de otros.
 */
export async function eliminarNotificacion(id: string): Promise<Result<void>> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return err('invalid_id')

  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('notificaciones')
    .delete()
    .eq('id_notificacion', parsed.data)
    .eq('id_usuario', user.id)

  if (error) {
    logger.error('eliminarNotificacion: fallo al eliminar', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}
