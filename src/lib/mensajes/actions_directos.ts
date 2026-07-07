'use server'

import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'

import { crearNotificacion } from '@/lib/notifications/create'
import type { ConversacionItem, Mensaje } from './actions'

const CONTENIDO_MAX = 2000

const EnviarMensajeDirectoSchema = z.object({
  idChat: z.string().uuid(),
  contenido: z.string().trim().min(1).max(CONTENIDO_MAX),
})

/** Obtiene los chats directos de un usuario (empresario o egresado) formateados como ConversacionItem */
export async function getConversacionesDirectas(
  rol: 'empresario' | 'estudiante',
): Promise<Result<ConversacionItem[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return err('unauthorized')

    const admin = createSupabaseAdminClient()

    let idRol = ''
    if (rol === 'empresario') {
      const { data } = await admin
        .from('empresarios')
        .select('id_empresario')
        .eq('id_usuario', user.id)
        .single()
      if (!data) return err('unauthorized')
      idRol = data.id_empresario
    } else {
      const { data } = await admin
        .from('estudiantes')
        .select('id_estudiante')
        .eq('id_usuario', user.id)
        .single()
      if (!data) return err('unauthorized')
      idRol = data.id_estudiante
    }

    // Buscar chats directos
    const { data: chats, error: chatsError } = await admin
      .from('chats_directos')
      .select('id_chat, id_empresario, id_estudiante, created_at')
      .eq(rol === 'empresario' ? 'id_empresario' : 'id_estudiante', idRol)

    if (chatsError) return err('unexpected')
    if (!chats || chats.length === 0) return ok([])

    const chatIds = chats.map((c) => c.id_chat)

    // Mensajes no leídos
    const { data: unreadMessages } = await admin
      .from('mensajes_directos')
      .select('id_chat')
      .in('id_chat', chatIds)
      .neq('id_remitente', user.id)
      .eq('leido', false)

    const unreadMap = new Map<string, number>()
    for (const msg of unreadMessages ?? []) {
      unreadMap.set(msg.id_chat, (unreadMap.get(msg.id_chat) ?? 0) + 1)
    }

    // Pre-cargar nombres para evitar N+1 queries
    let nombreContraparteMap = new Map<string, string>()
    let fotoContraparteMap = new Map<string, string | null>()

    if (rol === 'empresario') {
      const estudianteIds = chats
        .map((c) => c.id_estudiante)
        .filter(Boolean) as string[]
      if (estudianteIds.length > 0) {
        const { data: estudiantes } = await admin
          .from('estudiantes')
          .select('id_estudiante, id_usuario')
          .in('id_estudiante', estudianteIds)
        if (estudiantes && estudiantes.length > 0) {
          const usuarioIds = estudiantes
            .map((e) => e.id_usuario)
            .filter(Boolean) as string[]
          const { data: usuarios } = await admin
            .from('usuarios')
            .select('id_usuario, nombre, apellido_1, foto_perfil')
            .in('id_usuario', usuarioIds)

          const userMap = new Map(
            (usuarios || []).map((u) => [
              u.id_usuario,
              { nombre: `${u.nombre} ${u.apellido_1}`, foto: u.foto_perfil },
            ]),
          )
          nombreContraparteMap = new Map(
            (estudiantes || []).map((e) => [
              e.id_estudiante,
              userMap.get(e.id_usuario)?.nombre || 'Usuario',
            ]),
          )
          fotoContraparteMap = new Map(
            (estudiantes || []).map((e) => [
              e.id_estudiante,
              userMap.get(e.id_usuario)?.foto || null,
            ]),
          )
        }
      }
    } else {
      const empresarioIds = chats
        .map((c) => c.id_empresario)
        .filter(Boolean) as string[]
      if (empresarioIds.length > 0) {
        const { data: empresarios } = await admin
          .from('empresarios')
          .select('id_empresario, id_usuario, nombre_empresa')
          .in('id_empresario', empresarioIds)
        if (empresarios && empresarios.length > 0) {
          const usuarioIds = empresarios
            .map((e) => e.id_usuario)
            .filter(Boolean) as string[]
          const { data: usuarios } = await admin
            .from('usuarios')
            .select('id_usuario, nombre, apellido_1, foto_perfil')
            .in('id_usuario', usuarioIds)

          const userMap = new Map(
            (usuarios || []).map((u) => [
              u.id_usuario,
              { nombre: `${u.nombre} ${u.apellido_1}`, foto: u.foto_perfil },
            ]),
          )
          nombreContraparteMap = new Map(
            (empresarios || []).map((e) => [
              e.id_empresario,
              `${userMap.get(e.id_usuario)?.nombre || 'Usuario'} (${e.nombre_empresa || 'Empresa'})`,
            ]),
          )
          fotoContraparteMap = new Map(
            (empresarios || []).map((e) => [
              e.id_empresario,
              userMap.get(e.id_usuario)?.foto || null,
            ]),
          )
        }
      }
    }

    const conversaciones: ConversacionItem[] = chats.map((chat) => {
      let nombreContraparte = 'Usuario'
      let fotoContraparte = null
      if (rol === 'empresario') {
        nombreContraparte =
          nombreContraparteMap.get(chat.id_estudiante) || 'Usuario'
        fotoContraparte = fotoContraparteMap.get(chat.id_estudiante) || null
      } else {
        nombreContraparte =
          nombreContraparteMap.get(chat.id_empresario) || 'Empresa'
        fotoContraparte = fotoContraparteMap.get(chat.id_empresario) || null
      }

      return {
        idConversacion: chat.id_chat,
        tipo: 'directo',
        idChat: chat.id_chat,
        tituloProyecto: 'Contacto Directo',
        nombreContraparte,
        fotoContraparte,
        estado: 'directo' as unknown as 'contratada',
        noLeidos: unreadMap.get(chat.id_chat) ?? 0,
      }
    })

    return ok(conversaciones)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return err('unexpected')
  }
}

/** Obtiene el hilo de mensajes directos */
export async function getMensajesDirectos(
  idChat: string,
): Promise<Result<{ mensajes: Mensaje[]; puedeEnviar: boolean }>> {
  const parsed = z.string().uuid().safeParse(idChat)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const admin = createSupabaseAdminClient()

  // Validar acceso (si es el empresario o estudiante de este chat)
  const { data: chat, error: chatError } = await admin
    .from('chats_directos')
    .select('id_empresario, id_estudiante')
    .eq('id_chat', parsed.data)
    .single()

  if (chatError || !chat) return err('unauthorized')

  // Obtener mensajes
  const { data, error } = await admin
    .from('mensajes_directos')
    .select('id_mensaje, id_chat, id_remitente, contenido, leido, fecha_envio')
    .eq('id_chat', parsed.data)
    .order('fecha_envio', { ascending: true })

  if (error) return err('mensajes_load_failed')

  const mensajes: Mensaje[] = (data ?? []).map((row) => ({
    idMensaje: row.id_mensaje,
    idProyecto: row.id_chat, // reusamos el campo para id_chat
    idRemitente: row.id_remitente,
    contenido: row.contenido,
    leido: row.leido,
    fechaEnvio: row.fecha_envio,
  }))

  return ok({ mensajes, puedeEnviar: true })
}

/** Envía un mensaje a un chat directo */
export async function enviarMensajeDirecto(
  input: z.infer<typeof EnviarMensajeDirectoSchema>,
): Promise<Result<Mensaje>> {
  const parsed = EnviarMensajeDirectoSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const admin = createSupabaseAdminClient()

  // Validar acceso y obtener contraparte
  const { data: chat, error: chatError } = await admin
    .from('chats_directos')
    .select('id_empresario, id_estudiante')
    .eq('id_chat', parsed.data.idChat)
    .single()

  if (chatError || !chat) return err('unauthorized')

  const { data: mensaje, error } = await admin
    .from('mensajes_directos')
    .insert({
      id_chat: parsed.data.idChat,
      id_remitente: user.id,
      contenido: parsed.data.contenido,
    })
    .select('id_mensaje, id_chat, id_remitente, contenido, leido, fecha_envio')
    .single()

  if (error || !mensaje) return err('envio_fallido')

  // Notificar a la contraparte
  const { data: empData } = await admin
    .from('empresarios')
    .select('id_usuario, nombre_empresa')
    .eq('id_empresario', chat.id_empresario)
    .single()
  const { data: estData } = await admin
    .from('estudiantes')
    .select(
      'id_usuario, usuarios!estudiantes_id_usuario_fkey(nombre, apellido_1)',
    )
    .eq('id_estudiante', chat.id_estudiante)
    .single()

  const idContraparte =
    user.id === empData?.id_usuario ? estData?.id_usuario : empData?.id_usuario
  const urlDestino =
    user.id === empData?.id_usuario
      ? `/egresado/mensajes?directo=${parsed.data.idChat}`
      : `/empresario/mensajes?directo=${parsed.data.idChat}`
  const nombreEstudiante = estData?.usuarios
    ? `${(estData.usuarios as unknown as { nombre: string }).nombre || ''} ${(estData.usuarios as unknown as { apellido_1: string }).apellido_1 || ''}`.trim()
    : ''
  const nombreRemitente =
    user.id === empData?.id_usuario
      ? empData?.nombre_empresa || 'Empresa'
      : nombreEstudiante || 'un talento'

  if (idContraparte) {
    await crearNotificacion({
      idUsuario: idContraparte,
      tipoEvento: 'mensaje_nuevo',
      mensaje: `Tienes un mensaje nuevo de ${nombreRemitente}`,
      urlDestino: urlDestino,
      params: { idChat: parsed.data.idChat, remitente: nombreRemitente },
    })
  }

  return ok({
    idMensaje: mensaje.id_mensaje,
    idProyecto: mensaje.id_chat,
    idRemitente: mensaje.id_remitente,
    contenido: mensaje.contenido,
    leido: mensaje.leido,
    fechaEnvio: mensaje.fecha_envio,
  })
}

/** Marca como leídos todos los mensajes recibidos directos */
export async function marcarLeidosDirectos(
  idChat: string,
): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(idChat)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('mensajes_directos')
    .update({ leido: true })
    .eq('id_chat', parsed.data)
    .neq('id_remitente', user.id)
    .eq('leido', false)

  if (error) return err('update_failed')

  return ok(undefined)
}
