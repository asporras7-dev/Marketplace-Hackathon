'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { getCurrentUser } from '@/lib/auth/dal'
import type { Database } from '@/types/database'

export type CotizacionConProyecto =
  Database['public']['Tables']['cotizaciones']['Row'] & {
    proyectos: { titulo: string } | null
  }

export async function getMisCotizaciones(): Promise<
  Result<CotizacionConProyecto[]>
> {
  try {
    const user = await getCurrentUser()
    if (!user) return err('unauthorized')

    const supabase = await createSupabaseServerClient()

    const { data: estudiante, error: estError } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()

    if (estError || !estudiante) return err('estudiante_not_found')

    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*, proyectos(titulo)')
      .eq('id_estudiante', estudiante.id_estudiante)
      .order('created_at', { ascending: false })

    if (error) {
      return err('database_error')
    }
    return ok(data ?? [])
  } catch {
    return err('unexpected')
  }
}

export async function getCotizacionById(
  idCotizacion: string,
): Promise<Result<CotizacionConProyecto>> {
  try {
    const user = await getCurrentUser()
    if (!user) return err('unauthorized')

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*, proyectos(titulo)')
      .eq('id_cotizacion', idCotizacion)
      .single()

    if (error) {
      return err('database_error')
    }
    return ok(data)
  } catch {
    return err('unexpected')
  }
}
