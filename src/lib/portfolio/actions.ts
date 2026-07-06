'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import { serverEnv } from '@/lib/env.server'
import type { Database } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { getCountryName, getSubdivisionName } from '@/lib/geo/catalog'

cloudinary.config({
  cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME ?? '',
  api_key: serverEnv.CLOUDINARY_API_KEY ?? '',
  api_secret: serverEnv.CLOUDINARY_API_SECRET ?? '',
})
import type { StudentSkill, PortfolioProject } from '@/types'

export interface StudentProfileView {
  id_estudiante: string
  id_usuario: string
  descripcion: string
  portafolio_visible_publicamente: boolean
  firstName: string
  lastName1: string
  lastName2: string
  profilePhoto: string
  tituloFwd: string
  reputacion: number | null
  paisIsoResidencia?: string | null
  regionResidencia?: string | null
  paisNombre?: string | null
  regionNombre?: string | null
  skills: StudentSkill[]
  projects: PortfolioProject[]
  urlCurriculum: string | null
}

export type StudentProfileInput = Partial<
  Pick<
    StudentProfileView,
    | 'descripcion'
    | 'portafolio_visible_publicamente'
    | 'paisIsoResidencia'
    | 'regionResidencia'
    | 'urlCurriculum'
  >
>

/**
 * Obtiene el perfil del estudiante para el usuario autenticado actual.
 */
export async function getStudentProfile(): Promise<
  Result<StudentProfileView | null>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const { data: estudiante, error } = await supabase
      .from('estudiantes')
      .select(
        `
        id_estudiante,
        id_usuario,
        descripcion,
        portafolio_visible_publicamente,
        titulo_fwd,
        reputacion,
        pais_iso_residencia,
        region_residencia,
        url_curriculum,
        usuarios!estudiantes_id_usuario_fkey(nombre, apellido_1, apellido_2, foto_perfil),
        habilidades_tecnicas(nivel, id_tecnologia, tecnologias(nombre)),
        proyectos_portafolio(id_portafolio, titulo, descripcion, url_repositorio, url_demo, fecha, portafolio_tecnologias(tecnologias(nombre)))
        `,
      )
      .eq('id_usuario', user.id)
      .maybeSingle()

    if (error) {
      logger.error(
        'getStudentProfile: fallo al leer el registro en base de datos',
        { error: error.message },
      )
      return err(error.message)
    }

    if (!estudiante) {
      return ok(null)
    }

    const userInfo = estudiante.usuarios

    const rawSkills = estudiante.habilidades_tecnicas ?? []

    const skillsList = rawSkills.map((h) => ({
      id: h.id_tecnologia,
      name: h.tecnologias?.nombre ?? 'Desconocida',
      level: h.nivel,
    }))

    const rawProjects = estudiante.proyectos_portafolio ?? []

    const projectsList: PortfolioProject[] = rawProjects.map((p) => {
      const techNames = (p.portafolio_tecnologias || [])
        .map((pt) => pt.tecnologias?.nombre)
        .filter(Boolean)
      const proj: PortfolioProject = {
        id: p.id_portafolio,
        title: p.titulo,
        description: p.descripcion ?? '',
        technologies: techNames as string[],
        completionDate: p.fecha ?? '',
      }
      if (p.url_repositorio) proj.repositoryUrl = p.url_repositorio
      if (p.url_demo) proj.demoUrl = p.url_demo
      return proj
    })

    const profile: StudentProfileView = {
      id_estudiante: estudiante.id_estudiante,
      id_usuario: estudiante.id_usuario,
      descripcion: estudiante.descripcion ?? '',
      portafolio_visible_publicamente:
        estudiante.portafolio_visible_publicamente,
      firstName: userInfo?.nombre ?? '',
      lastName1: userInfo?.apellido_1 ?? '',
      lastName2: userInfo?.apellido_2 ?? '',
      profilePhoto: userInfo?.foto_perfil ?? '',
      tituloFwd: estudiante.titulo_fwd ?? '',
      reputacion: estudiante.reputacion ?? null,
      paisIsoResidencia: estudiante.pais_iso_residencia,
      regionResidencia: estudiante.region_residencia,
      paisNombre: estudiante.pais_iso_residencia
        ? getCountryName(estudiante.pais_iso_residencia, await getLocale())
        : null,
      regionNombre: estudiante.region_residencia
        ? getSubdivisionName(estudiante.region_residencia)
        : null,
      skills: skillsList,
      projects: projectsList,
      urlCurriculum: estudiante.url_curriculum ?? null,
    }

    return ok(profile)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getStudentProfile: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}

/**
 * Guarda o actualiza el perfil del estudiante para el usuario autenticado actual.
 */
export async function saveStudentProfile(
  profile: StudentProfileInput,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const estudianteProfile: Partial<
      Database['public']['Tables']['estudiantes']['Update']
    > & { id_usuario: string } = {
      id_usuario: user.id,
    }

    if (profile.descripcion !== undefined) {
      estudianteProfile.descripcion = profile.descripcion
    }
    if (profile.portafolio_visible_publicamente !== undefined) {
      estudianteProfile.portafolio_visible_publicamente =
        profile.portafolio_visible_publicamente
    }
    if (profile.paisIsoResidencia !== undefined) {
      estudianteProfile.pais_iso_residencia = profile.paisIsoResidencia
    }
    if (profile.regionResidencia !== undefined) {
      estudianteProfile.region_residencia = profile.regionResidencia
    }
    if (profile.urlCurriculum !== undefined) {
      estudianteProfile.url_curriculum = profile.urlCurriculum
    }

    const { error: estudianteError } = await supabase
      .from('estudiantes')
      .update(estudianteProfile)
      .eq('id_usuario', user.id)

    if (estudianteError) {
      logger.error(
        'saveStudentProfile: fallo al realizar upsert en estudiantes',
        { error: estudianteError.message },
      )
      return err(estudianteError.message)
    }

    return ok(undefined)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('saveStudentProfile: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}

// ----------------------------------------------------------------------------
// Habilidades (Skills)
// ----------------------------------------------------------------------------

export async function getActiveTechnologies(): Promise<
  Result<{ id: string; name: string }[]>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('tecnologias')
      .select('id_tecnologia, nombre')
      .eq('is_active', true)
      .order('nombre')

    if (error) return err(error.message)

    return ok(data.map((t) => ({ id: t.id_tecnologia, name: t.nombre })))
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getActiveTechnologies: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}

export async function addStudentSkill(
  name: string,
  level: 'basico' | 'intermedio' | 'avanzado',
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    // Obtener id_estudiante
    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()
    if (!estData) return err('estudiante_not_found')

    // Buscar o crear tecnología
    let id_tecnologia: string
    const { data: techData } = await supabase
      .from('tecnologias')
      .select('id_tecnologia')
      .ilike('nombre', name)
      .maybeSingle()

    if (techData) {
      id_tecnologia = techData.id_tecnologia
    } else {
      const { data: newTech, error: newTechErr } = await supabase
        .from('tecnologias')
        .insert({ nombre: name, is_active: true })
        .select('id_tecnologia')
        .single()
      if (newTechErr) return err(newTechErr.message)
      id_tecnologia = newTech.id_tecnologia
    }

    // Insertar en habilidades_tecnicas
    const { error: insertErr } = await supabase
      .from('habilidades_tecnicas')
      .upsert(
        {
          id_estudiante: estData.id_estudiante,
          id_tecnologia,
          nivel: level,
        },
        { onConflict: 'id_estudiante,id_tecnologia' },
      )

    if (insertErr) return err(insertErr.message)

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

export async function deleteStudentSkill(
  id_tecnologia: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()
    if (!estData) return err('estudiante_not_found')

    const { error } = await supabase
      .from('habilidades_tecnicas')
      .delete()
      .eq('id_estudiante', estData.id_estudiante)
      .eq('id_tecnologia', id_tecnologia)

    if (error) return err(error.message)
    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

// ----------------------------------------------------------------------------
// Proyectos (Projects)
// ----------------------------------------------------------------------------

export async function savePortfolioProject(
  projectData: Omit<PortfolioProject, 'id'>,
  projectId?: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()
    if (!estData) return err('estudiante_not_found')

    const payload = {
      id_estudiante: estData.id_estudiante,
      titulo: projectData.title,
      descripcion: projectData.description,
      fecha: projectData.completionDate,
      url_repositorio: projectData.repositoryUrl || null,
      url_demo: projectData.demoUrl || null,
      origen: 'independiente' as const,
      is_active: true,
    }

    let id_portafolio = projectId
    if (projectId) {
      // Update
      const { error } = await supabase
        .from('proyectos_portafolio')
        .update(payload)
        .eq('id_portafolio', projectId)
      if (error) return err(error.message)
    } else {
      // Insert
      const { data: newProj, error } = await supabase
        .from('proyectos_portafolio')
        .insert(payload)
        .select('id_portafolio')
        .single()
      if (error) return err(error.message)
      id_portafolio = newProj.id_portafolio
    }

    // Actualizar tecnologías del proyecto
    if (id_portafolio) {
      // 1. Borrar anteriores
      await supabase
        .from('portafolio_tecnologias')
        .delete()
        .eq('id_portafolio', id_portafolio)

      // 2. Insertar nuevas
      for (const techName of projectData.technologies) {
        if (!techName.trim()) continue

        let id_tecnologia: string
        const { data: techData } = await supabase
          .from('tecnologias')
          .select('id_tecnologia')
          .ilike('nombre', techName.trim())
          .maybeSingle()
        if (techData) {
          id_tecnologia = techData.id_tecnologia
        } else {
          const { data: newTech } = await supabase
            .from('tecnologias')
            .insert({ nombre: techName.trim(), is_active: true })
            .select('id_tecnologia')
            .single()
          if (!newTech) continue
          id_tecnologia = newTech.id_tecnologia
        }

        await supabase.from('portafolio_tecnologias').insert({
          id_portafolio,
          id_tecnologia,
        })
      }
    }

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

export async function deletePortfolioProject(
  id_portafolio: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const { error } = await supabase
      .from('proyectos_portafolio')
      .delete()
      .eq('id_portafolio', id_portafolio)
    if (error) return err(error.message)

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

export async function uploadAndSaveProfilePhoto(
  formData: FormData,
): Promise<Result<string>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const file = formData.get('file') as File
    if (!file) {
      return err('No file provided')
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader.upload(
          base64Image,
          {
            folder: 'imagenes',
            public_id: `profile_${user.id}_${Date.now()}`,
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error)
            else if (result) resolve(result)
            else reject(new Error('Upload result is undefined'))
          },
        )
      },
    )

    const secureUrl = uploadResult.secure_url

    const { error: dbError } = await supabase
      .from('usuarios')
      .update({ foto_perfil: secureUrl })
      .eq('id_usuario', user.id)

    if (dbError) {
      logger.error('Error updating foto_perfil in usuarios', { error: dbError })
      return err('Error updating profile photo in database')
    }

    return ok(secureUrl)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unexpected_error'
    logger.error('uploadAndSaveProfilePhoto: unexpected error', {
      error: errorMsg,
    })
    return err(errorMsg)
  }
}

/**
 * Obtiene el perfil de un estudiante por su id_estudiante para vista pública o empresarial.
 * RF-12: Verifica que sea público o que el empresario tenga una postulación de este estudiante.
 */
export async function getPublicStudentProfile(
  id_estudiante: string,
): Promise<Result<StudentProfileView | null>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const adminClient = await createSupabaseAdminClient()
    const { data: estudiante, error } = await adminClient
      .from('estudiantes')
      .select(
        `
        id_estudiante,
        id_usuario,
        descripcion,
        portafolio_visible_publicamente,
        titulo_fwd,
        reputacion,
        pais_iso_residencia,
        region_residencia,
        url_curriculum,
        usuarios!estudiantes_id_usuario_fkey(nombre, apellido_1, apellido_2, foto_perfil),
        habilidades_tecnicas(nivel, id_tecnologia, tecnologias(nombre)),
        proyectos_portafolio(id_portafolio, titulo, descripcion, url_repositorio, url_demo, fecha, portafolio_tecnologias(tecnologias(nombre)))
`,
      )
      .eq('id_estudiante', id_estudiante)
      .maybeSingle()

    if (error) {
      logger.error('getPublicStudentProfile: fallo al leer base de datos', {
        error: error.message,
      })
      return err(error.message)
    }

    if (!estudiante) {
      return ok(null)
    }

    // Verificar permisos RF-12
    if (!estudiante.portafolio_visible_publicamente) {
      const { data: empresario } = await supabase
        .from('empresarios')
        .select('id_empresario')
        .eq('id_usuario', user.id)
        .maybeSingle()

      if (!empresario) return err('unauthorized_private_portfolio')

      const { data: participacion } = await supabase
        .from('participaciones')
        .select('id_participacion, proyectos!inner(id_empresario)')
        .eq('id_estudiante', id_estudiante)
        .eq('proyectos.id_empresario', empresario.id_empresario)
        .limit(1)
        .maybeSingle()

      if (!participacion) {
        return err('unauthorized_private_portfolio')
      }
    }

    const userInfo = estudiante.usuarios
    const rawSkills = estudiante.habilidades_tecnicas ?? []
    const skillsList = rawSkills.map((h) => ({
      id: h.id_tecnologia,
      name: h.tecnologias?.nombre ?? 'Desconocida',
      level: h.nivel,
    }))

    const rawProjects = estudiante.proyectos_portafolio ?? []
    const projectsList: PortfolioProject[] = rawProjects.map((p) => {
      const techNames = (p.portafolio_tecnologias || [])
        .map((pt) => pt.tecnologias?.nombre)
        .filter(Boolean)
      const proj: PortfolioProject = {
        id: p.id_portafolio,
        title: p.titulo,
        description: p.descripcion ?? '',
        technologies: techNames as string[],
        completionDate: p.fecha ?? '',
      }
      if (p.url_repositorio) proj.repositoryUrl = p.url_repositorio
      if (p.url_demo) proj.demoUrl = p.url_demo
      return proj
    })

    const profile: StudentProfileView = {
      id_estudiante: estudiante.id_estudiante,
      id_usuario: estudiante.id_usuario,
      descripcion: estudiante.descripcion ?? '',
      portafolio_visible_publicamente:
        estudiante.portafolio_visible_publicamente,
      firstName: userInfo?.nombre ?? '',
      lastName1: userInfo?.apellido_1 ?? '',
      lastName2: userInfo?.apellido_2 ?? '',
      profilePhoto: userInfo?.foto_perfil ?? '',
      tituloFwd: estudiante.titulo_fwd ?? '',
      reputacion: estudiante.reputacion ?? null,
      paisIsoResidencia: estudiante.pais_iso_residencia,
      regionResidencia: estudiante.region_residencia,
      paisNombre: estudiante.pais_iso_residencia
        ? getCountryName(estudiante.pais_iso_residencia, await getLocale())
        : null,
      regionNombre: estudiante.region_residencia
        ? getSubdivisionName(estudiante.region_residencia)
        : null,
      skills: skillsList,
      projects: projectsList,
      urlCurriculum: estudiante.url_curriculum ?? null,
    }

    return ok(profile)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getPublicStudentProfile: error inesperado', {
      error: errorMsg,
    })
    return err(errorMsg)
  }
}

/**
 * Helper to fetch the profile using the participacion id when the client only has that ID available.
 */
export async function getPublicStudentProfileByParticipacion(
  id_participacion: string,
): Promise<Result<StudentProfileView | null>> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: participacion, error } = await supabase
      .from('participaciones')
      .select('id_estudiante')
      .eq('id_participacion', id_participacion)
      .maybeSingle()

    if (error) {
      logger.error('getPublicStudentProfileByParticipacion: database error', {
        error: error.message,
      })
      return err(error.message)
    }

    if (!participacion) {
      return err('not_found')
    }

    return getPublicStudentProfile(participacion.id_estudiante)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    return err(errorMsg)
  }
}
