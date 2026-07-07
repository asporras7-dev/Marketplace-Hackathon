import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { Result, ok, err } from '@/lib/result'
import { logger } from '@/lib/logger'
import { Database } from '@/types/database'

export type TituloFwd = Database['public']['Enums']['titulo_fwd_enum']

export interface TalentRankingItem {
  idEstudiante: string
  nombreCompleto: string
  fotoPerfil: string | null
  tituloFwd: TituloFwd | null
  reputacion: number | null
  tecnologias: string[]
}

export interface TalentRankingResponse {
  items: TalentRankingItem[]
  totalCount: number
}

export interface GetTalentRankingParams {
  page: number
  pageSize: number
  categoria?: TituloFwd | undefined
  tecnologiaId?: string | undefined
}

export async function getTalentRanking({
  page,
  pageSize,
  categoria,
  tecnologiaId,
}: GetTalentRankingParams): Promise<Result<TalentRankingResponse>> {
  try {
    const supabase = createSupabaseAdminClient()

    let query = supabase.from('estudiantes').select(
      `
        id_estudiante,
        reputacion,
        titulo_fwd,
        usuarios!estudiantes_id_usuario_fkey!inner(nombre, apellido_1, apellido_2, foto_perfil),
        habilidades_tecnicas(tecnologias(nombre))
      `,
      { count: 'exact' },
    )

    if (categoria) {
      query = query.eq('titulo_fwd', categoria)
    }

    if (tecnologiaId) {
      // Fetch students with this specific technology
      const { data: techStudents, error: techError } = await supabase
        .from('habilidades_tecnicas')
        .select('id_estudiante')
        .eq('id_tecnologia', tecnologiaId)

      if (techError) {
        logger.error('Error fetching students by technology', {
          error: techError,
        })
        return err(techError.message)
      }

      const ids = techStudents?.map((ts) => ts.id_estudiante) || []

      if (ids.length === 0) {
        return ok({ items: [], totalCount: 0 })
      }

      query = query.in('id_estudiante', ids)
    }

    // Sort by reputation (simulated or real) - since reputation is nullable, we'll sort descending
    query = query.order('reputacion', { ascending: false, nullsFirst: false })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      logger.error('Error fetching talent ranking', { error })
      return err(error.message)
    }

    // Define expected row shape from Supabase inner join to avoid 'any'
    type DbRow = {
      id_estudiante: string
      reputacion: number | null
      titulo_fwd: TituloFwd | null
      usuarios: {
        nombre: string | null
        apellido_1: string | null
        apellido_2: string | null
        foto_perfil: string | null
      } | null
      habilidades_tecnicas:
        | {
            tecnologias: { nombre: string } | null
          }[]
        | null
    }

    const items: TalentRankingItem[] = (data || []).map((rawRow: unknown) => {
      const row = rawRow as DbRow
      const nombreCompleto =
        `${row.usuarios?.nombre} ${row.usuarios?.apellido_1} ${row.usuarios?.apellido_2 || ''}`.trim()

      const tecnologias = (row.habilidades_tecnicas || [])
        .map((h) => h.tecnologias?.nombre)
        .filter(Boolean) as string[]

      return {
        idEstudiante: row.id_estudiante,
        nombreCompleto,
        fotoPerfil: row.usuarios?.foto_perfil ?? null,
        tituloFwd: row.titulo_fwd,
        reputacion: row.reputacion,
        tecnologias,
      }
    })

    return ok({
      items,
      totalCount: count || 0,
    })
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getTalentRanking: unexpected error', { error: errorMsg })
    return err(errorMsg)
  }
}

/**
 * Gets all technologies that at least one public student has, for the filter dropdown.
 */
export async function getActiveTechnologies(): Promise<
  Result<{ id: string; nombre: string }[]>
> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('tecnologias')
      .select('id_tecnologia, nombre')
      .eq('is_active', true)
      .order('nombre')

    if (error) return err(error.message)

    return ok(
      (data || []).map((t) => ({
        id: t.id_tecnologia,
        nombre: t.nombre,
      })),
    )
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}
