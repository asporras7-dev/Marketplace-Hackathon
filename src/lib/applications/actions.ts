'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole, requireVerifiedEgresado } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { validateApplicationWithAI } from '@/lib/ai-filtro-ofertas/openrouter-validation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { crearNotificacion } from '@/lib/notifications/create'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { buildPostulacionNotificacion } from './postulacion-notificacion-logic'

const MIN_PLANTEAMIENTO_LEN = 30
const MIN_CARTA_LEN = 30
const MAX_CARTA_LEN = 2800
const MIN_PROTOTIPO_ENLACES = 1
const MAX_PROTOTIPO_ENLACES = 4
const MAX_ENLACE_LEN = 500
const MAX_DOC_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB; coincide con el límite del bucket documentacion_tecnica
const DOC_TECNICA_BUCKET = 'documentacion_tecnica'
const DOC_TECNICA_EXTENSIONS = ['pdf', 'zip'] as const
const SIGNED_URL_TTL_SECONDS = 3600 // 1h, igual que getSignedUrlEntregable

const PostularseSchema = z.object({
  id_proyecto: z.string().uuid(),
  planteamiento_solucion: z.string().min(MIN_PLANTEAMIENTO_LEN),
  prototipo_enlaces: z
    .array(z.string().url().max(MAX_ENLACE_LEN))
    .min(MIN_PROTOTIPO_ENLACES)
    .max(MAX_PROTOTIPO_ENLACES),
  carta_postulacion: z.string().min(MIN_CARTA_LEN).max(MAX_CARTA_LEN),
  monto_propuesto: z.coerce.number().positive(),
  id_cotizacion: z.string().uuid().optional().nullable().or(z.literal('')),
})

const RetirarSchema = z.object({
  id_participacion: z.string().uuid(),
})

/**
 * Permite a un Junior postularse a un proyecto abierto.
 * RF-27: Enviar oferta a proyecto abierto dentro del plazo.
 */
export async function postularse(formData: FormData): Promise<Result<void>> {
  // `prototipo_enlaces` viaja como JSON dentro del FormData (un array no cabe en
  // un campo plano); el resto son campos de texto y el documento va como File.
  let prototipoEnlaces: unknown
  try {
    const raw = formData.get('prototipo_enlaces')
    prototipoEnlaces = JSON.parse(typeof raw === 'string' ? raw : 'null')
  } catch {
    return err('invalid_input')
  }

  const parsed = PostularseSchema.safeParse({
    id_proyecto: formData.get('id_proyecto'),
    planteamiento_solucion: formData.get('planteamiento_solucion'),
    prototipo_enlaces: prototipoEnlaces,
    carta_postulacion: formData.get('carta_postulacion'),
    monto_propuesto: formData.get('monto_propuesto'),
    id_cotizacion: formData.get('id_cotizacion'),
  })
  if (!parsed.success) {
    return err('invalid_input')
  }

  // El archivo se valida aparte del schema para devolver un código específico
  // (tamaño / tipo) en vez de un genérico invalid_input.
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return err('archivo_requerido')
  }
  if (file.size > MAX_DOC_FILE_SIZE_BYTES) {
    return err('archivo_muy_grande')
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!(DOC_TECNICA_EXTENSIONS as readonly string[]).includes(ext)) {
    return err('tipo_archivo_invalido')
  }

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) {
    return roleResult
  }

  const supabase = await createSupabaseServerClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return err('unauthenticated')
  }

  const { data: estudiante, error: estudianteError } = await supabase
    .from('estudiantes')
    .select('id_estudiante, estado_verificacion')
    .eq('id_usuario', userData.user.id)
    .single()

  if (estudianteError || !estudiante) {
    return err('estudiante_not_found')
  }

  if (estudiante.estado_verificacion !== 'verificado') {
    return err('cuenta_no_verificada')
  }

  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('titulo, descripcion, estado, fecha_cierre, is_active')
    .eq('id_proyecto', parsed.data.id_proyecto)
    .single()

  if (proyectoError || !proyecto) {
    return err('proyecto_not_found')
  }

  if (
    !proyecto.is_active ||
    !['abierto', 'en_recepcion'].includes(proyecto.estado)
  ) {
    return err('proyecto_cerrado')
  }

  if (proyecto.fecha_cierre && new Date(proyecto.fecha_cierre) < new Date()) {
    return err('plazo_vencido')
  }

  // Validación de IA antes de subir el archivo: si la IA rechaza, cortamos sin
  // dejar un objeto huérfano en el Storage. La IA solo usa la presencia del
  // documento (booleano), no su contenido, así que basta el nombre del archivo.
  const aiValidation = await validateApplicationWithAI({
    projectTitle: proyecto.titulo || 'Proyecto FWD',
    projectDescription: proyecto.descripcion || '',
    coverLetter: parsed.data.carta_postulacion,
    solutionApproach: parsed.data.planteamiento_solucion,
    externalLink:
      parsed.data.prototipo_enlaces?.[1] ||
      parsed.data.prototipo_enlaces?.[0] ||
      null, // Dependiendo de cuántos hay
    uploadedPrototypeUrl: parsed.data.prototipo_enlaces?.[0] || null,
    technicalDocUrl: file.name,
  })

  if (!aiValidation.isRelated) {
    return err(`AI_REJECTED::${aiValidation.reason}`)
  }

  // El upload corre en el SERVIDOR a propósito: el cliente browser de Supabase
  // se cuelga al resolver la sesión y nunca emite el request del Storage (mismo
  // patrón que entregables). Se guarda el PATH del objeto, NO una URL: el bucket
  // es privado y la URL de descarga se firma al leer
  // (getSignedUrlDocumentacionTecnica). La carpeta {id_proyecto}/{id_usuario}
  // satisface la convención del bucket.
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const archivoPath = `${parsed.data.id_proyecto}/${userData.user.id}/${uniqueSuffix}.${ext}`

  // `contentType` explícito y derivado de la extensión ya validada: el bucket
  // exige un MIME del allowlist (pdf/zip) y supabase-js, para un File, usa el
  // `file.type` del browser, que en Windows puede llegar vacío u 'octet-stream'
  // y el bucket lo rechazaría con un storage_error no accionable.
  // Se usa el admin client para el upload (service_role bypasea la RLS del
  // storage que bloquea sesiones SSR). El control de acceso ya fue verificado
  // arriba (egresado verificado + proyecto abierto + validación AI).
  const contentType = ext === 'pdf' ? 'application/pdf' : 'application/zip'
  const admin = createSupabaseAdminClient()
  const { error: uploadError } = await admin.storage
    .from(DOC_TECNICA_BUCKET)
    .upload(archivoPath, file, { contentType })
  if (uploadError) {
    logger.error('postularse: fallo al subir la documentación técnica', {
      error: uploadError.message,
    })
    return err('storage_error')
  }

  const { error: insertError } = await supabase.from('participaciones').insert({
    id_proyecto: parsed.data.id_proyecto,
    id_estudiante: estudiante.id_estudiante,
    estado: 'enviada',
    carta_postulacion: parsed.data.carta_postulacion,
    planteamiento_solucion: parsed.data.planteamiento_solucion,
    prototipo_enlaces: parsed.data.prototipo_enlaces,
    documentacion_tecnica: archivoPath,
    monto_propuesto: parsed.data.monto_propuesto,
    id_cotizacion:
      parsed.data.id_cotizacion && parsed.data.id_cotizacion !== ''
        ? parsed.data.id_cotizacion
        : null,
  })

  if (insertError) {
    // Insert falló en firme: borrar el archivo recién subido para no dejar
    // huérfanos en el Storage.
    await admin.storage.from(DOC_TECNICA_BUCKET).remove([archivoPath])
    logger.error('postularse failed', { error: insertError.message })
    if (
      insertError.code === 'P0001' ||
      insertError.message.toLowerCase().includes('cupo')
    ) {
      return err('cupo_excedido')
    }
    return err('database_error')
  }

  await notificarPostulacion(
    parsed.data.id_proyecto,
    proyecto.titulo ?? 'tu proyecto',
  )

  revalidatePath('/egresado/applications')
  revalidatePath(`/egresado/projects/${parsed.data.id_proyecto}`)

  return ok(undefined)
}

/**
 * Genera una URL temporal (1h) para que el empresario dueño vea la documentación
 * técnica de una postulación. El bucket es privado: no se puede servir un enlace
 * permanente. Las filas legacy guardaban una URL externa (Drive/Docs); se
 * devuelven tal cual. Verifica propiedad antes de firmar (RF-34).
 */
export async function getSignedUrlDocumentacionTecnica(
  idParticipacion: string,
): Promise<Result<{ url: string }>> {
  if (!z.string().uuid().safeParse(idParticipacion).success) {
    return err('invalid_input')
  }

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return err('unauthenticated')
  }

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empError || !empresario) {
    return err('unauthorized')
  }

  // Lectura con service_role + verificación de propiedad explícita (mismo patrón
  // que getEstudianteContactEmail): la RLS no le deja al empresario leer la fila
  // completa de la participación de otro postulante.
  const admin = createSupabaseAdminClient()
  const { data: part, error: partError } = await admin
    .from('participaciones')
    .select('documentacion_tecnica, id_proyecto')
    .eq('id_participacion', idParticipacion)
    .maybeSingle()
  if (partError || !part) {
    return err('participacion_not_found')
  }
  if (!part.documentacion_tecnica) {
    return err('documento_not_found')
  }

  const { data: proyecto, error: proyError } = await admin
    .from('proyectos')
    .select('id_empresario')
    .eq('id_proyecto', part.id_proyecto)
    .maybeSingle()
  if (proyError || !proyecto) {
    return err('participacion_not_found')
  }
  if (proyecto.id_empresario !== empresario.id_empresario) {
    return err('unauthorized')
  }

  // Legacy: URL externa guardada antes del bucket (Drive/Docs) → tal cual.
  const doc = part.documentacion_tecnica
  if (doc.startsWith('http://') || doc.startsWith('https://')) {
    return ok({ url: doc })
  }

  const { data: signed, error: signError } = await admin.storage
    .from(DOC_TECNICA_BUCKET)
    .createSignedUrl(doc, SIGNED_URL_TTL_SECONDS)
  if (signError || !signed?.signedUrl) {
    logger.error('getSignedUrlDocumentacionTecnica: storage error', {
      error: signError?.message,
    })
    return err('storage_error')
  }

  return ok({ url: signed.signedUrl })
}

/**
 * Notifica al empresario dueño que recibió una nueva postulación
 * (`postulacion_recibida`). Best-effort y autoblindada: la postulación ya quedó
 * guardada, así que un fallo al notificar se loguea y se traga (log + decisión,
 * §8). Lee el `id_usuario` del empresario con `service_role`: la sesión es del
 * egresado y la RLS no le deja ver al dueño.
 */
async function notificarPostulacion(
  idProyecto: string,
  titulo: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('proyectos')
      .select('empresarios(id_usuario)')
      .eq('id_proyecto', idProyecto)
      .maybeSingle()
    if (error || !data) {
      logger.error('notificarPostulacion: no se pudo leer el proyecto', {
        idProyecto,
        error: error?.message,
      })
      return
    }
    const empresario = (
      data as unknown as { empresarios: { id_usuario: string } | null }
    ).empresarios
    if (!empresario?.id_usuario) {
      logger.error('notificarPostulacion: proyecto sin empresario', {
        idProyecto,
      })
      return
    }
    const urlProyecto = `/${DEFAULT_LOCALE}/empresario/proyecto/${idProyecto}`
    const result = await crearNotificacion(
      buildPostulacionNotificacion({
        idUsuarioEmpresario: empresario.id_usuario,
        titulo,
        urlProyecto,
      }),
    )
    if (!result.ok) {
      logger.error('notificarPostulacion: fallo al crear la notificación', {
        idProyecto,
        error: result.error,
      })
    }
  } catch (e) {
    logger.error('notificarPostulacion: excepción inesperada', {
      idProyecto,
      error: String(e),
    })
  }
}

/**
 * Permite a un Junior retirar su oferta (RF-31)
 */
export async function retirarPostulacion(
  input: z.infer<typeof RetirarSchema>,
): Promise<Result<void>> {
  const parsed = RetirarSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input')
  }

  const verified = await requireVerifiedEgresado()
  if (!verified.ok) return verified

  const supabase = await createSupabaseServerClient()

  // Buscar la participación y asegurar que le pertenece y su estado permite retiro
  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado, id_proyecto')
    .eq('id_participacion', parsed.data.id_participacion)
    .eq('id_estudiante', verified.data.id_estudiante)
    .single()

  if (partError || !participacion) {
    return err('participacion_not_found')
  }

  if (
    ['contratada', 'finalizada', 'cancelada', 'retirada'].includes(
      participacion.estado,
    )
  ) {
    return err('estado_invalido_retiro')
  }

  // RF-31: solo se puede retirar si el plazo NO ha vencido. Una vez cerrada la
  // ventana de ofertas, la oferta queda firme para la revisión del empresario.
  // Espejo de la verificación de `postularse`.
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('fecha_cierre')
    .eq('id_proyecto', participacion.id_proyecto)
    .single()

  if (proyectoError || !proyecto) {
    return err('proyecto_not_found')
  }

  if (proyecto.fecha_cierre && new Date(proyecto.fecha_cierre) < new Date()) {
    return err('plazo_vencido')
  }

  // Actualizar a retirada
  const { error: updateError } = await supabase
    .from('participaciones')
    .update({ estado: 'retirada' })
    .eq('id_participacion', participacion.id_participacion)

  if (updateError) {
    logger.error('retirarPostulacion failed', { error: updateError.message })
    return err('database_error')
  }

  revalidatePath('/egresado/applications')
  return ok(undefined)
}
