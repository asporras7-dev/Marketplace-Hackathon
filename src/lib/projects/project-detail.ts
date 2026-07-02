'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { crearNotificaciones } from '@/lib/notifications/create'
import { DEFAULT_LOCALE } from '@/i18n/config'
import type { Database } from '@/types/database'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  participacionContratadaHtml,
  participacionContratadaSubject,
} from '@/lib/email/templates/participacion-contratada'
import {
  PARTICIPACION_ACTION_TARGET,
  canAdvanceProject,
  computeEstadoEfectivoProyecto,
  isParticipacionActionAllowed,
  type EstadoParticipacion,
  type EstadoProyecto,
} from './project-detail-logic'
import { getMyPublishedProjects } from './dashboard'
import {
  buildAdjudicacionNotificaciones,
  type AfectadoAdjudicacion,
} from './adjudicacion-notificacion-logic'

type TituloFwd = Database['public']['Enums']['titulo_fwd_enum']
type RpcParticipacionRow =
  Database['public']['Functions']['get_participaciones_de_proyecto']['Returns'][number]

/** Postgres `check_violation`: lo emite el trigger ante una transición ilegal. */
const CHECK_VIOLATION = '23514'

export interface ParticipacionEmpresario {
  idParticipacion: string
  estado: EstadoParticipacion
  estudianteNombre: string
  estudianteApellidos: string
  fotoPerfil: string | null
  reputacion: number | null
  tituloFwd: TituloFwd | null
  cartaPostulacion: string | null
  planteamientoSolucion: string | null
  prototipoEnlaces: string[]
  documentacionTecnica: string | null
  urlRepositorioProyecto: string | null
  fechaPostulacion: string
  fechaEntregaPrototipo: string | null
  calificacionPrototipo: number | null
  comentarioPrototipo: string | null
  /** Booleanos de la tapa del sobre: existencia de adjuntos, NO su contenido.
   *  Vienen calculados del RPC y se muestran aun con la oferta sellada. */
  tienePrototipo: boolean
  tieneRepositorio: boolean
  tieneDocumentacion: boolean
}

/** Participación cross-project: lleva el proyecto al que pertenece la oferta. */
export interface ParticipacionConProyecto extends ParticipacionEmpresario {
  proyecto: { id: string; titulo: string }
}

/** Mapea una fila cruda del RPC al shape camelCase que consume la UI. */
function mapParticipacionRow(
  fila: RpcParticipacionRow,
): ParticipacionEmpresario {
  return {
    idParticipacion: fila.id_participacion,
    estado: fila.estado,
    estudianteNombre: fila.estudiante_nombre,
    estudianteApellidos: fila.estudiante_apellido_2
      ? `${fila.estudiante_apellido_1} ${fila.estudiante_apellido_2}`
      : fila.estudiante_apellido_1,
    fotoPerfil: fila.foto_perfil,
    reputacion: fila.reputacion,
    tituloFwd: fila.titulo_fwd,
    cartaPostulacion: fila.carta_postulacion,
    planteamientoSolucion: fila.planteamiento_solucion,
    prototipoEnlaces: fila.prototipo_enlaces ?? [],
    documentacionTecnica: fila.documentacion_tecnica,
    urlRepositorioProyecto: fila.url_repositorio_proyecto,
    fechaPostulacion: fila.fecha_postulacion,
    fechaEntregaPrototipo: fila.fecha_entrega_prototipo,
    calificacionPrototipo: fila.calificacion_prototipo,
    comentarioPrototipo: fila.comentario_prototipo,
    tienePrototipo: fila.tiene_prototipo,
    tieneRepositorio: fila.tiene_repositorio,
    tieneDocumentacion: fila.tiene_documentacion,
  }
}

/**
 * Participaciones del proyecto con la identidad del estudiante (RF-34). Usa el
 * RPC `get_participaciones_de_proyecto` (SECURITY DEFINER) porque la RLS no deja
 * al empresario leer el nombre del postulante; el RPC reimpone que el llamante
 * sea el empresario dueño.
 */
export async function getProjectParticipations(
  projectId: string,
): Promise<Result<ParticipacionEmpresario[]>> {
  const parsed = z.string().uuid().safeParse(projectId)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(
    'get_participaciones_de_proyecto',
    { p_id_proyecto: parsed.data },
  )
  if (error) {
    logger.error('getProjectParticipations: fallo en RPC', {
      error: error.message,
    })
    return err('participaciones_load_failed')
  }

  return ok((data ?? []).map(mapParticipacionRow))
}

const CambiarEstadoProyectoSchema = z.object({
  idProyecto: z.string().uuid(),
  destino: z.enum(['adjudicado', 'en_desarrollo']),
})

/**
 * Avance manual del estado del proyecto (RF-25), validado en la app porque la
 * BD no tiene máquina de estados de proyecto. Solo permite transiciones hacia
 * adelante de `project-detail-logic`. Cancelar va por `cancelProject`.
 */
export async function setProjectEstado(
  input: z.infer<typeof CambiarEstadoProyectoSchema>,
): Promise<Result<{ estado: EstadoProyecto }>> {
  const parsed = CambiarEstadoProyectoSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', user.id)
    .maybeSingle()
  if (empError) {
    logger.error('setProjectEstado: fallo al leer empresario', {
      error: empError.message,
    })
    return err('unexpected')
  }
  if (!empresario) return err('empresario_no_encontrado')

  const { data: proyecto, error: readError } = await supabase
    .from('proyectos')
    .select('estado, fecha_cierre')
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (readError) {
    logger.error('setProjectEstado: fallo al leer proyecto', {
      error: readError.message,
    })
    return err('unexpected')
  }
  if (!proyecto) return err('proyecto_no_encontrado')

  const efectivo = computeEstadoEfectivoProyecto(
    proyecto.estado,
    proyecto.fecha_cierre,
  )
  if (!canAdvanceProject(efectivo, parsed.data.destino)) {
    return err('transicion_invalida')
  }

  const { data: actualizado, error: updateError } = await supabase
    .from('proyectos')
    .update({ estado: parsed.data.destino })
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .select('id_proyecto')
    .maybeSingle()
  if (updateError) {
    logger.error('setProjectEstado: fallo al actualizar', {
      error: updateError.message,
    })
    return err('update_failed')
  }
  if (!actualizado) return err('update_failed')

  return ok({ estado: parsed.data.destino })
}

const CambiarEstadoParticipacionSchema = z.object({
  idParticipacion: z.string().uuid(),
  accion: z.enum(['revisar', 'contratar', 'rechazar']),
})

/**
 * Cambia el estado de una participación según la acción del empresario (trío de
 * revisión). La RLS (`participaciones_update`) y el trigger
 * `validar_transicion_participacion` son la red dura; acá validamos antes para
 * dar un error claro y evitar viajes innecesarios a la BD.
 */
export async function setParticipacionEstado(
  input: z.infer<typeof CambiarEstadoParticipacionSchema>,
): Promise<Result<{ estado: EstadoParticipacion }>> {
  const parsed = CambiarEstadoParticipacionSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: actual, error: readError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado, id_proyecto')
    .eq('id_participacion', parsed.data.idParticipacion)
    .maybeSingle()
  if (readError) {
    logger.error('setParticipacionEstado: fallo al leer participación', {
      error: readError.message,
    })
    return err('unexpected')
  }
  if (!actual) return err('participacion_no_encontrada')

  if (!isParticipacionActionAllowed(actual.estado, parsed.data.accion)) {
    return err('transicion_invalida')
  }
  const destino = PARTICIPACION_ACTION_TARGET[parsed.data.accion]

  const { data: actualizada, error: updateError } = await supabase
    .from('participaciones')
    .update({ estado: destino })
    .eq('id_participacion', actual.id_participacion)
    .select('id_participacion')
    .maybeSingle()
  if (updateError) {
    logger.error('setParticipacionEstado: fallo al actualizar', {
      error: updateError.message,
    })
    if (updateError.code === CHECK_VIOLATION) return err('transicion_invalida')
    return err('update_failed')
  }
  if (!actualizada) return err('update_failed')

  // Revision explicita (enviada -> en_revision): avisar al egresado.
  // Best-effort; el helper es autoblindado, no altera el resultado del cambio.
  if (parsed.data.accion === 'revisar') {
    await notificarParticipacionEnRevision(
      actual.id_participacion,
      actual.id_proyecto,
    )
  }

  // Rechazo explícito (en_revision -> no_seleccionada): avisar al egresado.
  // Best-effort; el helper es autoblindado, no altera el resultado del cambio.
  if (parsed.data.accion === 'rechazar') {
    await notificarRechazoParticipacion(
      actual.id_participacion,
      actual.id_proyecto,
    )
  }

  return ok({ estado: destino })
}

/**
 * Todas las participaciones de TODOS los proyectos del empresario, con la
 * identidad del estudiante (RF-34) y el proyecto al que pertenecen. Reusa el RPC
 * por proyecto (N+1) en vez de un RPC dedicado: a escala del MVP es aceptable y
 * evita una migración. Resiliente: si un proyecto falla se omite; si TODOS los
 * proyectos fallan se devuelve error (para distinguir "roto" de "sin ofertas").
 */
export async function getEmpresarioParticipations(): Promise<
  Result<ParticipacionConProyecto[]>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const projectsResult = await getMyPublishedProjects()
  if (!projectsResult.ok) return err('participaciones_load_failed')
  const proyectos = projectsResult.data
  if (proyectos.length === 0) return ok([])

  const supabase = await createSupabaseServerClient()
  const porProyecto = await Promise.all(
    proyectos.map(async (proyecto) => {
      const { data, error } = await supabase.rpc(
        'get_participaciones_de_proyecto',
        { p_id_proyecto: proyecto.id },
      )
      if (error) {
        logger.error('getEmpresarioParticipations: fallo en RPC', {
          error: error.message,
          proyecto: proyecto.id,
        })
        return null
      }
      return { proyecto, filas: data ?? [] }
    }),
  )

  const cargados = porProyecto.filter(
    (entrada): entrada is NonNullable<typeof entrada> => entrada !== null,
  )
  if (cargados.length === 0) return err('participaciones_load_failed')

  const items = cargados.flatMap(({ proyecto, filas }) =>
    filas.map((fila) => ({
      ...mapParticipacionRow(fila),
      proyecto: { id: proyecto.id, titulo: proyecto.titulo },
    })),
  )

  return ok(items)
}

const CalificarParticipacionSchema = z.object({
  idParticipacion: z.string().uuid(),
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
})

/**
 * Guarda la calificación (1-5) y el comentario opcional del empresario sobre el
 * prototipo de un postulante (RF-36). Solo aplicable cuando `estado === 'en_revision'`.
 * No modifica el estado — el trigger de transición no se dispara.
 */
export async function calificarParticipacion(
  input: z.infer<typeof CalificarParticipacionSchema>,
): Promise<Result<void>> {
  const parsed = CalificarParticipacionSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', user.id)
    .maybeSingle()
  if (empError) {
    logger.error('calificarParticipacion: fallo al leer empresario', {
      error: empError.message,
    })
    return err('unexpected')
  }
  if (!empresario) return err('empresario_no_encontrado')

  const { data: participacion, error: readError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado, id_proyecto')
    .eq('id_participacion', parsed.data.idParticipacion)
    .maybeSingle()
  if (readError) {
    logger.error('calificarParticipacion: fallo al leer participacion', {
      error: readError.message,
    })
    return err('unexpected')
  }
  if (!participacion) return err('participacion_no_encontrada')
  if (participacion.estado !== 'en_revision') return err('transicion_invalida')

  const { data: proyectoOwned, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyError) {
    logger.error('calificarParticipacion: fallo al verificar proyecto', {
      error: proyError.message,
    })
    return err('unexpected')
  }
  if (!proyectoOwned) return err('unauthorized')

  const { error: updateError } = await supabase
    .from('participaciones')
    .update({
      calificacion_prototipo: parsed.data.calificacion,
      ...(parsed.data.comentario !== undefined
        ? { comentario_prototipo: parsed.data.comentario }
        : {}),
    })
    .eq('id_participacion', parsed.data.idParticipacion)
  if (updateError) {
    logger.error('calificarParticipacion: fallo al actualizar', {
      error: updateError.message,
    })
    return err('calificacion_fallida')
  }

  return ok(undefined)
}

const AdjudicarParticipacionSchema = z.object({
  idParticipacion: z.string().uuid(),
  idProyecto: z.string().uuid(),
})

/**
 * Adjudica el proyecto al postulante seleccionado (RF-37 + RF-39) de forma
 * ATÓMICA vía el RPC `adjudicar_participacion`: en una sola transacción pone al
 * ganador en `contratada` (dispara el trigger que crea la contratación), el resto
 * en `no_seleccionada` y el proyecto en `adjudicado`. El RPC reimpone que el
 * llamante sea el empresario dueño y que la participación esté en `en_revision`.
 */
export async function adjudicarParticipacion(
  input: z.infer<typeof AdjudicarParticipacionSchema>,
): Promise<Result<void>> {
  const parsed = AdjudicarParticipacionSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('adjudicar_participacion', {
    p_id_participacion: parsed.data.idParticipacion,
    p_id_proyecto: parsed.data.idProyecto,
  })

  if (error) {
    logger.error('adjudicarParticipacion: fallo en RPC', {
      error: error.message,
    })
    if (
      error.code === CHECK_VIOLATION ||
      error.message.includes('TRANSICION_INVALIDA')
    )
      return err('transicion_invalida')
    if (error.message.includes('EMPRESARIO_NO_ENCONTRADO'))
      return err('empresario_no_encontrado')
    if (error.message.includes('PARTICIPACION_NO_ENCONTRADA'))
      return err('participacion_no_encontrada')
    return err('adjudicacion_fallida')
  }

  const { error: advanceError } = await supabase
    .from('proyectos')
    .update({ estado: 'en_desarrollo' })
    .eq('id_proyecto', parsed.data.idProyecto)

  if (advanceError) {
    logger.error('adjudicarParticipacion: fallo al avanzar a en_desarrollo', {
      error: advanceError.message,
    })
  }

  await notificarAdjudicacion(parsed.data.idProyecto)

  return ok(undefined)
}

interface ParticipacionAfectadaRaw {
  estado: AfectadoAdjudicacion['estado']
  estudiantes: {
    usuarios: { id_usuario: string; correo: string; nombre: string } | null
  } | null
}

/**
 * Notifica al ganador y a los no seleccionados tras una adjudicación exitosa
 * (RF-37/39). Best-effort y autoblindada: la adjudicación ya quedó confirmada por
 * el RPC, así que cualquier fallo aquí se loguea y se traga (log + decisión, §8)
 * para no devolver error sobre algo que sí ocurrió. Lee con `service_role`: la
 * audiencia (ganador + resto) no la devuelve el RPC.
 */
async function notificarAdjudicacion(idProyecto: string): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()

    const { data: proyecto, error: proyectoError } = await admin
      .from('proyectos')
      .select('titulo')
      .eq('id_proyecto', idProyecto)
      .maybeSingle()
    if (proyectoError || !proyecto) {
      logger.error('notificarAdjudicacion: fallo al leer el proyecto', {
        idProyecto,
        error: proyectoError?.message,
      })
      return
    }

    const { data: filas, error: filasError } = await admin
      .from('participaciones')
      .select(
        'estado, estudiantes(usuarios!estudiantes_id_usuario_fkey(id_usuario, correo, nombre))',
      )
      .eq('id_proyecto', idProyecto)
      .in('estado', ['contratada', 'no_seleccionada'])
    if (filasError) {
      logger.error('notificarAdjudicacion: fallo al leer participaciones', {
        idProyecto,
        error: filasError.message,
      })
      return
    }

    const filasRaw = (filas ?? []) as unknown as ParticipacionAfectadaRaw[]

    const afectados: AfectadoAdjudicacion[] = filasRaw
      .map((fila) => {
        const idUsuario = fila.estudiantes?.usuarios?.id_usuario
        return idUsuario ? { idUsuario, estado: fila.estado } : null
      })
      .filter((afectado): afectado is AfectadoAdjudicacion => afectado !== null)

    const urlProyecto = `/${DEFAULT_LOCALE}/egresado/projects/${idProyecto}`
    const result = await crearNotificaciones(
      buildAdjudicacionNotificaciones({
        titulo: proyecto.titulo,
        urlProyecto,
        afectados,
      }),
    )
    if (!result.ok) {
      logger.error('notificarAdjudicacion: fallo al crear notificaciones', {
        idProyecto,
        error: result.error,
      })
    }

    // Correo al ganador (RF-46): solo a la participación contratada. Best-effort
    // y separado del in-app; si Gmail no está configurado o falla, se loguea y no
    // rompe (la adjudicación y el aviso in-app ya ocurrieron).
    const ganador = filasRaw.find((fila) => fila.estado === 'contratada')
      ?.estudiantes?.usuarios
    if (ganador?.correo) {
      const baseUrl = await resolveBaseUrl()
      await enviarEmailAdjudicacion({
        nombre: ganador.nombre,
        correo: ganador.correo,
        tituloProyecto: proyecto.titulo,
        urlProyecto: `${baseUrl}${urlProyecto}`,
      })
    }
  } catch (e) {
    logger.error('notificarAdjudicacion: excepción inesperada', {
      idProyecto,
      error: String(e),
    })
  }
}

/** baseUrl del request para el link del correo (mismo criterio que edit-description). */
async function resolveBaseUrl(): Promise<string> {
  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

/** Envía el correo "fuiste seleccionado" al ganador (RF-46). Best-effort. */
async function enviarEmailAdjudicacion(params: {
  nombre: string
  correo: string
  tituloProyecto: string
  urlProyecto: string
}): Promise<void> {
  let transport: ReturnType<typeof createGmailTransport>
  try {
    transport = createGmailTransport()
  } catch (e) {
    logger.error('notificarAdjudicacion: Gmail no configurado', {
      error: e instanceof Error ? e.message : String(e),
    })
    return
  }
  try {
    await transport.sendMail({
      from: getGmailFrom(),
      to: params.correo,
      subject: participacionContratadaSubject(params.tituloProyecto),
      html: participacionContratadaHtml({
        nombre: params.nombre,
        tituloProyecto: params.tituloProyecto,
        urlProyecto: params.urlProyecto,
      }),
    })
  } catch (e) {
    logger.error('notificarAdjudicacion: fallo al enviar email al ganador', {
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

/**
 * Notifica al egresado cuando el empresario abre su propuesta y la pasa a
 * revision (`enviada` -> `en_revision`). Best-effort y autoblindada: el cambio
 * de estado ya quedo confirmado, asi que cualquier fallo aqui se loguea y se
 * traga. Lee con `service_role`: la sesion es del empresario y la RLS no le deja
 * ver al usuario del egresado.
 */
async function notificarParticipacionEnRevision(
  idParticipacion: string,
  idProyecto: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()

    const { data: proyecto, error: proyectoError } = await admin
      .from('proyectos')
      .select('titulo')
      .eq('id_proyecto', idProyecto)
      .maybeSingle()
    if (proyectoError || !proyecto) {
      logger.error(
        'notificarParticipacionEnRevision: fallo al leer el proyecto',
        {
          idProyecto,
          error: proyectoError?.message,
        },
      )
      return
    }

    const { data: fila, error: filaError } = await admin
      .from('participaciones')
      .select('estudiantes(id_usuario)')
      .eq('id_participacion', idParticipacion)
      .maybeSingle()
    if (filaError || !fila) {
      logger.error(
        'notificarParticipacionEnRevision: fallo al leer la participacion',
        {
          idParticipacion,
          error: filaError?.message,
        },
      )
      return
    }

    const idUsuario = (
      fila as unknown as {
        estudiantes: { id_usuario: string } | null
      }
    ).estudiantes?.id_usuario
    if (!idUsuario) {
      logger.error(
        'notificarParticipacionEnRevision: participacion sin usuario',
        {
          idParticipacion,
        },
      )
      return
    }

    const urlProyecto = `/${DEFAULT_LOCALE}/egresado/projects/${idProyecto}`
    const result = await crearNotificaciones([
      {
        idUsuario,
        tipoEvento: 'participacion_en_revision',
        mensaje: `La empresa está revisando tu propuesta para "${proyecto.titulo}".`,
        params: { titulo: proyecto.titulo },
        urlDestino: urlProyecto,
      },
    ])
    if (!result.ok) {
      logger.error(
        'notificarParticipacionEnRevision: fallo al crear la notificacion',
        {
          idParticipacion,
          error: result.error,
        },
      )
    }
  } catch (e) {
    logger.error('notificarParticipacionEnRevision: excepcion inesperada', {
      idParticipacion,
      error: String(e),
    })
  }
}

/**
 * Notifica al egresado cuando el empresario rechaza su participacion de forma
 * individual durante la revision (`en_revision` -> `no_seleccionada`).
 * Best-effort y autoblindada: el cambio de estado ya quedo confirmado, asi que
 * cualquier fallo aqui se loguea y se traga. Lee con `service_role`: la sesion
 * es del empresario y la RLS no le deja ver al usuario del egresado. Reusa
 * `buildAdjudicacionNotificaciones` con un solo afectado (mismo tipo_evento).
 */
async function notificarRechazoParticipacion(
  idParticipacion: string,
  idProyecto: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()

    const { data: proyecto, error: proyectoError } = await admin
      .from('proyectos')
      .select('titulo')
      .eq('id_proyecto', idProyecto)
      .maybeSingle()
    if (proyectoError || !proyecto) {
      logger.error('notificarRechazoParticipacion: fallo al leer el proyecto', {
        idProyecto,
        error: proyectoError?.message,
      })
      return
    }

    const { data: fila, error: filaError } = await admin
      .from('participaciones')
      .select('estudiantes(id_usuario)')
      .eq('id_participacion', idParticipacion)
      .maybeSingle()
    if (filaError || !fila) {
      logger.error(
        'notificarRechazoParticipacion: fallo al leer la participación',
        {
          idParticipacion,
          error: filaError?.message,
        },
      )
      return
    }

    const idUsuario = (
      fila as unknown as {
        estudiantes: { id_usuario: string } | null
      }
    ).estudiantes?.id_usuario
    if (!idUsuario) {
      logger.error('notificarRechazoParticipacion: participación sin usuario', {
        idParticipacion,
      })
      return
    }

    const urlProyecto = `/${DEFAULT_LOCALE}/egresado/projects/${idProyecto}`
    const result = await crearNotificaciones(
      buildAdjudicacionNotificaciones({
        titulo: proyecto.titulo,
        urlProyecto,
        afectados: [{ idUsuario, estado: 'no_seleccionada' }],
      }),
    )
    if (!result.ok) {
      logger.error(
        'notificarRechazoParticipacion: fallo al crear la notificación',
        {
          idParticipacion,
          error: result.error,
        },
      )
    }
  } catch (e) {
    logger.error('notificarRechazoParticipacion: excepción inesperada', {
      idParticipacion,
      error: String(e),
    })
  }
}

/**
 * Conteos para las stats del dashboard del empresario. No usa el RPC: la RLS
 * (`participaciones_select`) ya limita la lectura a las participaciones de los
 * proyectos del empresario, y los conteos no necesitan la identidad del
 * estudiante. Una sola query.
 */
export async function getEmpresarioParticipationStats(): Promise<
  Result<{
    total: number
    hired: number
    countsByProject: Record<string, number>
  }>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('participaciones')
    .select('estado, id_proyecto')
  if (error) {
    logger.error('getEmpresarioParticipationStats: fallo al contar', {
      error: error.message,
    })
    return err('unexpected')
  }

  const filas = data ?? []
  const total = filas.length
  const hired = filas.filter(
    (fila) => fila.estado === 'contratada' || fila.estado === 'finalizada',
  ).length

  const countsByProject: Record<string, number> = {}
  filas.forEach((fila) => {
    if (fila.id_proyecto) {
      countsByProject[fila.id_proyecto] =
        (countsByProject[fila.id_proyecto] || 0) + 1
    }
  })

  return ok({ total, hired, countsByProject })
}

/**
 * Obtiene el correo de contacto del egresado adjudicado (RF-38).
 * Solo disponible para el empresario dueño del proyecto cuando la
 * participación está en `contratada` o `finalizada`.
 * Usa admin client para leer `usuarios.correo` (protegido por RLS).
 */
export async function getEstudianteContactEmail(
  idParticipacion: string,
): Promise<Result<{ correo: string; nombre: string }>> {
  const parsed = z.string().uuid().safeParse(idParticipacion)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', user.id)
    .maybeSingle()
  if (empError) {
    logger.error('getEstudianteContactEmail: fallo al leer empresario', {
      error: empError.message,
    })
    return err('unexpected')
  }
  if (!empresario) return err('unauthorized')

  const admin = createSupabaseAdminClient()

  const { data: part, error: partError } = await admin
    .from('participaciones')
    .select('estado, id_estudiante, id_proyecto')
    .eq('id_participacion', parsed.data)
    .maybeSingle()
  if (partError || !part) {
    logger.error('getEstudianteContactEmail: participacion no encontrada', {
      error: partError?.message,
    })
    return err('participacion_no_encontrada')
  }

  const { data: proy, error: proyError } = await admin
    .from('proyectos')
    .select('id_empresario')
    .eq('id_proyecto', part.id_proyecto)
    .maybeSingle()
  if (proyError || !proy) {
    logger.error('getEstudianteContactEmail: proyecto no encontrado', {
      error: proyError?.message,
    })
    return err('participacion_no_encontrada')
  }
  if (proy.id_empresario !== empresario.id_empresario)
    return err('unauthorized')

  if (part.estado !== 'contratada' && part.estado !== 'finalizada') {
    return err('estado_invalido')
  }

  const { data: est, error: estError } = await admin
    .from('estudiantes')
    .select('id_usuario')
    .eq('id_estudiante', part.id_estudiante)
    .maybeSingle()
  if (estError || !est) {
    logger.error('getEstudianteContactEmail: estudiante no encontrado', {
      error: estError?.message,
    })
    return err('estudiante_no_encontrado')
  }

  const { data: usr, error: usrError } = await admin
    .from('usuarios')
    .select('correo, nombre, apellido_1')
    .eq('id_usuario', est.id_usuario)
    .maybeSingle()
  if (usrError || !usr) {
    logger.error('getEstudianteContactEmail: usuario no encontrado', {
      error: usrError?.message,
    })
    return err('estudiante_no_encontrado')
  }

  return ok({
    correo: usr.correo,
    nombre: `${usr.nombre} ${usr.apellido_1}`.trim(),
  })
}
