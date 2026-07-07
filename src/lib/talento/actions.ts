'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { StudentProfileView } from '@/lib/portfolio/actions'
import { getLocale } from 'next-intl/server'
import { getCountryName, getSubdivisionName } from '@/lib/geo/catalog'
import type { PortfolioProject } from '@/types'
import { getCurrentUser } from '@/lib/auth/dal'

export async function getPublicProfiles(): Promise<
  Result<StudentProfileView[]>
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

    const admin = createSupabaseAdminClient()

    const { data: estudiantes, error } = await admin.from('estudiantes').select(
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

    if (error) {
      logger.error('getPublicProfiles: fallo al leer perfiles', {
        error: error.message,
      })
      return err(error.message)
    }

    if (!estudiantes) {
      return ok([])
    }

    const locale = await getLocale()

    const profiles: StudentProfileView[] = estudiantes.map((estudiante) => {
      const userInfo = Array.isArray(estudiante.usuarios)
        ? estudiante.usuarios[0]
        : estudiante.usuarios
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

      return {
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
          ? getCountryName(estudiante.pais_iso_residencia, locale)
          : null,
        regionNombre: estudiante.region_residencia
          ? getSubdivisionName(estudiante.region_residencia)
          : null,
        skills: skillsList,
        projects: projectsList,
        urlCurriculum: estudiante.url_curriculum ?? null,
      }
    })

    return ok(profiles)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getPublicProfiles: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}

export async function crearChatDirecto(
  idEstudiante: string,
): Promise<Result<{ idChat: string }>> {
  try {
    const user = await getCurrentUser()
    if (!user) return err('unauthorized')

    const supabase = await createSupabaseServerClient()

    // 1. Obtener id_empresario del usuario actual
    const { data: empresario, error: empError } = await supabase
      .from('empresarios')
      .select('id_empresario')
      .eq('id_usuario', user.id)
      .single()

    if (empError || !empresario) {
      logger.error('crearChatDirecto: usuario no es empresario', {
        error: empError?.message,
      })
      return err('unauthorized')
    }

    // 2. Crear o recuperar chat directo (usamos supabase-admin porque RLS está bloqueado por defecto)
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const admin = createSupabaseAdminClient()

    // Intentar buscar si ya existe
    const { data: existingChat } = await admin
      .from('chats_directos')
      .select('id_chat')
      .eq('id_empresario', empresario.id_empresario)
      .eq('id_estudiante', idEstudiante)
      .maybeSingle()

    let idChat = existingChat?.id_chat

    if (!idChat) {
      // Si no existe, crear uno nuevo
      const { data: newChat, error: createError } = await admin
        .from('chats_directos')
        .insert({
          id_empresario: empresario.id_empresario,
          id_estudiante: idEstudiante,
        })
        .select('id_chat')
        .single()

      if (createError || !newChat) {
        logger.error('crearChatDirecto: error creando chat', {
          error: createError?.message,
        })
        return err('creation_failed')
      }
      idChat = newChat.id_chat
    }

    // Se ha creado o recuperado el chat exitosamente.
    // El mensaje automático y la notificación ya no se envían aquí,
    // sino cuando el empresario envía su primer mensaje en la UI.

    return ok({ idChat })
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('crearChatDirecto: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}
