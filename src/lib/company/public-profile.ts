'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'

export interface PublicCompanyProfile {
  id_empresario: string
  nombre_empresa: string
  tipo_empresario: string
  sector: string | null
  descripcion: string | null
  logo: string | null
  reputacion: number | null
  sitio_web: string | null
}

export async function getPublicCompanyProfile(
  idEmpresario: string,
): Promise<Result<PublicCompanyProfile | null>> {
  if (!z.string().uuid().safeParse(idEmpresario).success)
    return err('invalid_input')

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('empresarios')
    .select(
      `
      id_empresario, nombre_empresa, tipo_empresario, sector,
      descripcion, logo, reputacion, sitio_web,
      usuarios!empresarios_id_usuario_fkey(nombre, apellido_1, apellido_2)
    `,
    )
    .eq('id_empresario', idEmpresario)
    .maybeSingle()

  if (error) {
    logger.error('getPublicCompanyProfile: query failed', {
      error: error.message,
    })
    return err('database_error')
  }
  if (!data) return ok(null)

  const user = data.usuarios
  const repName = [user.nombre, user.apellido_1, user.apellido_2]
    .filter(Boolean)
    .join(' ')
  const nombreEmpresa = data.nombre_empresa ?? repName

  return ok({
    id_empresario: data.id_empresario,
    nombre_empresa: nombreEmpresa,
    tipo_empresario: data.tipo_empresario,
    sector: data.sector,
    descripcion: data.descripcion,
    logo: data.logo,
    reputacion: data.reputacion,
    sitio_web: data.sitio_web,
  })
}
