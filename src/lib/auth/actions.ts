'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  accountVerificationHtml,
  accountVerificationSubject,
} from '@/lib/email/templates/account-verification'
import {
  accountVerifiedHtml,
  accountVerifiedSubject,
} from '@/lib/email/templates/account-verified'
import { ROLE_HOME } from '@/lib/auth/roles'
import {
  OnboardingSchema,
  SignInSchema,
  SignUpSchema,
  type OnboardingInput,
  type PerfilInput,
  type SignInInput,
  type SignUpInput,
} from './schemas'
import { crearPerfilUsuario, type DatosPerfilOpcionales } from './profile'
import { isEgresadoEmailAllowed } from './egresado-allowlist'
import { getUserRole } from './queries'
import { requireRole } from './guards'
import { getCurrentUser } from './dal'
import { checkPwnedPassword } from './check-pwned-password'
import { evaluateAdminManagement } from '@/lib/admin/admin-management'
import { resolveAdminTargetContext } from '@/lib/admin/admin-management-server'
import { crearNotificacion } from '@/lib/notifications/create'
import { DEFAULT_LOCALE } from '@/i18n/config'

export async function getCurrentUserRole(): Promise<Result<string>> {
  return getUserRole()
}

export async function signOut(): Promise<Result<void>> {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // no-op desde Server Component
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error('signOut failed', { error: error.message })
    return err(error.message)
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

/**
 * Solicita un enlace de recuperación de contraseña (RF-04).
 *
 * Supabase Auth devuelve éxito incluso si el correo no existe en el sistema,
 * de modo que la respuesta nunca revela si una cuenta está registrada
 * (anti-enumeración por diseño del proveedor). Si llega un error es operacional
 * (rate limit, config inválida) — se registra pero no se expone al usuario.
 */
export async function requestPasswordReset(
  email: string,
): Promise<Result<void>> {
  const parsed = z.string().email().safeParse(email)
  if (!parsed.success) return err('invalid_email')

  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const redirectTo = `${proto}://${host}/auth/callback?next=/reset-password`

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo,
  })

  if (error) {
    logger.error('requestPasswordReset failed', { error: error.message })
    return err('reset_failed')
  }

  return ok(undefined)
}

/**
 * Completa el onboarding del Camino B (OAuth): el usuario ya tiene sesión y
 * correo confirmado por el proveedor, pero no tiene rol ni perfil. Elige su rol
 * (RF-01) y carga sus campos; se crean rol + perfil con service_role
 * (`crearPerfilUsuario`, jubila `assign_my_role`) y se registran los
 * consentimientos (RNF-36 términos; RNF-38 cotejo para egresado).
 */
export async function completarOnboarding(
  input: OnboardingInput,
): Promise<Result<void>> {
  const parsed = OnboardingSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')
  const data = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  // Gate del egresado (stand-in de RF-64), también en OAuth (Camino B).
  if (data.role === 'egresado' && !isEgresadoEmailAllowed(user.email ?? '')) {
    return err('email_not_allowed')
  }

  const admin = createSupabaseAdminClient()

  // Asegurar que exista la fila en public.usuarios (mecanismo de sanación)
  const { data: usuarioExistente } = await admin
    .from('usuarios')
    .select('id_usuario')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (!usuarioExistente) {
    const rawName = (user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      '') as string
    const parts = rawName.trim().split(' ').filter(Boolean)
    const nombre = parts[0] || user.email?.split('@')[0] || 'Usuario'
    const apellido = parts.slice(1).join(' ') || 'FWD'

    const { error: insertUserError } = await admin.from('usuarios').insert({
      id_usuario: user.id,
      nombre,
      apellido_1: apellido,
      correo: user.email ?? '',
      foto_perfil: (user.user_metadata?.avatar_url as string) || null,
      estado_cuenta: 'activa',
      is_active: true,
    })

    if (insertUserError) {
      logger.error('completarOnboarding: fallo al sanar usuario en db', {
        error: insertUserError.message,
      })
      return err(insertUserError.message)
    }
  }

  const perfil: PerfilInput =
    data.role === 'egresado'
      ? { role: 'egresado', tituloFwd: data.tituloFwd }
      : {
          role: 'empresario',
          tipoEmpresario: data.tipoEmpresario,
          nombreEmpresa: data.nombreEmpresa,
          cedula: data.cedula,
          ...(data.sitioWeb ? { sitioWeb: data.sitioWeb } : {}),
        }

  const opcionales: DatosPerfilOpcionales | undefined =
    data.role === 'empresario'
      ? {
          nombre: data.nombre,
          apellido1: data.primerApellido,
          apellido2: data.segundoApellido ?? null,
          fechaNacimiento: data.fechaNacimiento,
          ...(data.fotoPerfilUrl ? { fotoPerfilUrl: data.fotoPerfilUrl } : {}),
          paisIso: data.pais,
          region: data.region,
          alcanceOperativo: data.alcanceOperativo,
        }
      : undefined

  const perfilResult = await crearPerfilUsuario(
    admin,
    user.id,
    perfil,
    opcionales,
  )
  if (!perfilResult.ok) return perfilResult

  // Consentimientos (RNF-36 términos; RNF-38 cotejo para egresado).
  const reqHeaders = await headers()
  const ipOrigen =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 60) ??
    null
  const userAgent = reqHeaders.get('user-agent')?.slice(0, 255) ?? null

  const consentimientos: Database['public']['Tables']['consentimientos']['Insert'][] =
    [
      {
        id_usuario: user.id,
        tipo_consentimiento: 'terminos_servicio',
        otorgado: true,
        ip_origen: ipOrigen,
        user_agent: userAgent,
      },
    ]
  if (data.role === 'egresado') {
    consentimientos.push({
      id_usuario: user.id,
      tipo_consentimiento: 'cotejo_fwd',
      otorgado: true,
      ip_origen: ipOrigen,
      user_agent: userAgent,
    })
  }
  const { error: consentError } = await admin
    .from('consentimientos')
    .insert(consentimientos)
  if (consentError) {
    logger.error('completarOnboarding: fallo al registrar consentimientos', {
      error: consentError.message,
    })
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

/**
 * Reactiva la cuenta de un usuario (estado_cuenta → 'activa', is_active → true).
 * Solo un administrador puede llamarla. Usa el cliente de servicio (RLS bypass).
 *
 * Es la reactivación de RF-65: vuelve a habilitar una cuenta suspendida o
 * desactivada. NO activa cuentas nuevas — esas se activan solas al confirmar el
 * correo (trigger de activación). Reactivar a un admin exige las mismas reglas
 * que su baja (superadmin + antigüedad).
 */
export async function reactivarUsuario(userId: string): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(userId)
  if (!parsed.success) {
    return err('invalid_user_id')
  }

  // Verificar que el caller es admin
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const actor = await getCurrentUser()
  if (!actor) {
    return err('unauthenticated')
  }

  // Usar service_role para bypassear RLS (admin no pasa por políticas)
  const adminClient = createSupabaseAdminClient()

  const { data: usuario, error: fetchError } = await adminClient
    .from('usuarios')
    .select('roles(nombre_rol), correo, nombre')
    .eq('id_usuario', parsed.data)
    .maybeSingle()

  if (fetchError) {
    logger.error('reactivarUsuario: fallo al obtener datos del usuario', {
      error: fetchError.message,
      userId,
    })
  }

  // Extraer rol: reactivar a un admin exige las reglas de gestión de admins.
  const rolRaw = Array.isArray(usuario?.roles)
    ? usuario?.roles[0]?.nombre_rol
    : (usuario?.roles as { nombre_rol?: string } | null)?.nombre_rol

  // Reactivar/aprobar a un administrador es acción de superadmin: mismas reglas
  // que la baja (gate de superadmin + antigüedad), para que el control de
  // desactivación no se evada reactivando desde aquí.
  if (rolRaw === 'administrador') {
    const ctx = await resolveAdminTargetContext(
      adminClient,
      actor.id,
      parsed.data,
    )
    const verdict = evaluateAdminManagement({
      action: 'reactivate',
      actorNivel: ctx.actorNivel,
      actorFechaRegistro: ctx.actorFechaRegistro ?? '',
      targetNivel: ctx.targetNivel,
      targetFechaRegistro: ctx.targetFechaRegistro ?? '',
      activeSuperadminCount: ctx.activeSuperadminCount,
    })
    if (!verdict.allowed) {
      return err(verdict.reason)
    }
  }

  const { error } = await adminClient
    .from('usuarios')
    .update({ estado_cuenta: 'activa', is_active: true })
    .eq('id_usuario', parsed.data)

  if (error) {
    logger.error('reactivarUsuario failed', { error: error.message, userId })
    return err(error.message)
  }

  // Notificación in-app: el usuario la ve al primer login. Best-effort.
  if (rolRaw !== 'administrador') {
    const rolParaNotif: 'egresado' | 'empresario' =
      rolRaw === 'empresario' ? 'empresario' : 'egresado'
    await crearNotificacion({
      idUsuario: parsed.data,
      tipoEvento: 'cuenta_verificada',
      mensaje: 'content.cuenta_verificada',
      urlDestino: `/${DEFAULT_LOCALE}${ROLE_HOME[rolParaNotif]}`,
    })
  }

  // Enviar correo de reactivación (solo egresado/empresario).
  if (usuario?.correo && rolRaw !== 'administrador') {
    const reqHeaders = await headers()
    const host =
      reqHeaders.get('x-forwarded-host') ??
      reqHeaders.get('host') ??
      'localhost:3000'
    const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
    const baseUrl = `${proto}://${host}`

    const rol: 'egresado' | 'empresario' =
      rolRaw === 'empresario' ? 'empresario' : 'egresado'

    let loginUrl = `${baseUrl}/login`
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: usuario.correo,
      })

    if (linkError) {
      logger.error('reactivarUsuario: fallo al generar magic link', {
        error: linkError.message,
        userId,
      })
    } else {
      const tokenHash = linkData.properties?.hashed_token
      const otpType = linkData.properties?.verification_type
      if (tokenHash && otpType) {
        const params = new URLSearchParams({
          token_hash: tokenHash,
          type: otpType,
          next: ROLE_HOME[rol],
        })
        loginUrl = `${baseUrl}/auth/confirm?${params.toString()}`
      } else {
        logger.error('reactivarUsuario: el magic link no incluye token_hash', {
          userId,
        })
      }
    }

    let emailError: Error | null = null
    try {
      const transport = createGmailTransport()
      await transport.sendMail({
        from: getGmailFrom(),
        to: usuario.correo,
        subject: accountVerifiedSubject(),
        html: accountVerifiedHtml({
          nombre: usuario.nombre ?? 'Usuario',
          rol,
          loginUrl,
        }),
      })
    } catch (e) {
      emailError = e instanceof Error ? e : new Error(String(e))
    }

    if (emailError) {
      logger.error('reactivarUsuario: fallo al enviar correo de reactivación', {
        error: emailError.message,
        userId,
      })
    }
  }

  if (rolRaw === 'administrador') {
    const { error: auditError } = await adminClient.from('auditoria').insert({
      id_actor: actor.id,
      accion: 'reactivar_admin',
      entidad: 'usuarios',
      id_entidad: parsed.data,
      valores_despues: { estado_cuenta: 'activa', is_active: true },
    })
    if (auditError) {
      logger.error('reactivarUsuario: fallo al registrar en auditoria', {
        error: auditError.message,
        userId,
      })
    }
  }

  revalidatePath('/admin/validations', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

/**
 * Registro por correo y contraseña (RF-01 / RF-02), Camino A.
 *
 * Crea la cuenta SIN confirmar y SIN sesión (registro ≠ login): el usuario debe
 * confirmar su correo (enlace o código) para activarse. Asigna el rol y crea el
 * perfil con service_role, y envía el correo de verificación por Gmail.
 */
export async function signUpWithPassword(
  input: SignUpInput,
): Promise<Result<void>> {
  const parsed = SignUpSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const data = parsed.data

  // Gate del egresado (stand-in de RF-64): solo correos de la allowlist pueden
  // registrarse como egresado mientras no exista el cotejo real (RNF-30).
  if (data.role === 'egresado' && !isEgresadoEmailAllowed(data.email)) {
    return err('email_not_allowed')
  }

  let pwnedCount: number
  try {
    pwnedCount = await checkPwnedPassword(data.password)
  } catch {
    return err('pwned_check_failed')
  }
  if (pwnedCount > 0) return err('password_breached')

  const adminClient = createSupabaseAdminClient()

  const { data: existingUser } = await adminClient
    .from('usuarios')
    .select('id_usuario')
    .eq('correo', data.email)
    .maybeSingle()
  if (existingUser) {
    // Anti-enumeración: no revelar que el correo ya está registrado.
    return err('email_already_exists')
  }

  // generateLink type:'signup' crea el usuario no confirmado y devuelve el
  // enlace (hashed_token) y el código (email_otp) sin enviar correo (lo
  // enviamos nosotros por Gmail). No crea sesión.
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'signup',
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName, role: data.role },
      },
    })

  if (linkError || !linkData?.user) {
    const msg = linkError?.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('exist')) {
      return err('email_already_exists')
    }
    logger.error('signUpWithPassword: fallo al crear usuario', {
      error: linkError?.message,
    })
    return err(linkError?.message ?? 'signup_failed')
  }

  // Asignar rol + crear perfil con service_role (no hay sesión).
  const perfil = await crearPerfilUsuario(adminClient, linkData.user.id, data)
  if (!perfil.ok) {
    // Si el perfil falla, borrar el usuario a medio crear para no dejar una
    // cuenta sin perfil que quedaría trabada.
    await adminClient.auth.admin.deleteUser(linkData.user.id)
    return perfil
  }

  // Enviar el correo de verificación (enlace + código) por Gmail.
  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${proto}://${host}`

  const tokenHash = linkData.properties?.hashed_token
  const otpType = linkData.properties?.verification_type ?? 'signup'
  const code = linkData.properties?.email_otp ?? ''
  const confirmUrl = tokenHash
    ? `${baseUrl}/auth/confirm?${new URLSearchParams({
        token_hash: tokenHash,
        type: otpType,
        next: '/pending-approval',
      }).toString()}`
    : `${baseUrl}/verify-email?email=${encodeURIComponent(data.email)}`

  try {
    const transport = createGmailTransport()
    await transport.sendMail({
      from: getGmailFrom(),
      to: data.email,
      subject: accountVerificationSubject(),
      html: accountVerificationHtml({
        nombre: data.fullName,
        confirmUrl,
        code,
      }),
    })
  } catch (e) {
    // Si el envío falla, la cuenta queda creada; el usuario puede reintentar
    // desde /verify-email. Se registra pero no se aborta el registro.
    logger.error('signUpWithPassword: fallo al enviar correo de verificación', {
      error: e instanceof Error ? e.message : String(e),
    })
  }

  return ok(undefined)
}

/**
 * Login con contraseña + bloqueo por intentos fallidos (RF-03).
 *
 * El bloqueo vive solo en el servidor con el cliente admin (service role): un
 * login fallido no tiene sesión, así que la escritura en `usuarios` no podría
 * pasar por RLS. OTP y OAuth quedan fuera del contador.
 *
 * - Pre-chequea `bloqueado_hasta`; si sigue vigente devuelve err('account_locked').
 * - Solo en credenciales inválidas (código `invalid_credentials`) invoca el RPC
 *   `register_failed_login`, que realiza el incremento de forma atómica en una
 *   sola sentencia UPDATE (sin race condition de lectura previa). Otros errores
 *   de Supabase (email sin confirmar, rate-limit, etc.) NO incrementan el contador.
 * - En login exitoso resetea el contador.
 * - El error de credenciales es neutro: no revela si el correo existe.
 */
export async function signInWithPassword(
  input: SignInInput,
): Promise<Result<void>> {
  const parsed = SignInSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const { email, password } = parsed.data

  const admin = createSupabaseAdminClient()

  // Estado de bloqueo actual del usuario (si la cuenta existe).
  const { data: usuario } = await admin
    .from('usuarios')
    .select('id_usuario, intentos_fallidos, bloqueado_hasta')
    .eq('correo', email)
    .maybeSingle()

  if (
    usuario?.bloqueado_hasta &&
    new Date(usuario.bloqueado_hasta) > new Date()
  ) {
    return err('account_locked')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Solo incrementar el contador si el error es de credenciales inválidas.
    // Otros códigos (email_not_confirmed, over_request_rate_limit, etc.) no
    // representan un intento de fuerza bruta y no deben penalizar al usuario.
    if (usuario && error.code === 'invalid_credentials') {
      const { error: rpcError } = await admin.rpc('register_failed_login', {
        p_email: email,
      })
      if (rpcError) {
        logger.error('signInWithPassword: fallo al registrar intento fallido', {
          error: rpcError.message,
        })
      }
    }
    return err('invalid_credentials')
  }

  // Login exitoso: resetear el contador si traía intentos o bloqueo previo.
  if (usuario && (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta)) {
    const { error: resetError } = await admin
      .from('usuarios')
      .update({ intentos_fallidos: 0, bloqueado_hasta: null })
      .eq('id_usuario', usuario.id_usuario)
    if (resetError) {
      logger.error('signInWithPassword: fallo al resetear intentos', {
        error: resetError.message,
      })
    }
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

/**
 * Reenvía el correo de verificación (enlace + código) por Gmail a un usuario que
 * aún no confirmó (RF-02). Usa generateLink type:'magiclink' (no requiere la
 * contraseña y es válido para un usuario sin confirmar) y nuestra plantilla, de
 * modo que el reenvío sale con la marca FWD igual que el del registro.
 */
export async function resendVerificationEmail(
  email: string,
): Promise<Result<void>> {
  const parsed = z.string().email().safeParse(email)
  if (!parsed.success) return err('invalid_email')

  const admin = createSupabaseAdminClient()

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: parsed.data,
    })
  if (linkError || !linkData?.properties) {
    logger.error('resendVerificationEmail: fallo al generar enlace', {
      error: linkError?.message,
    })
    return err('resend_failed')
  }

  const { data: usuario } = await admin
    .from('usuarios')
    .select('nombre')
    .eq('correo', parsed.data)
    .maybeSingle()

  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${proto}://${host}`

  const tokenHash = linkData.properties.hashed_token
  const otpType = linkData.properties.verification_type ?? 'magiclink'
  const code = linkData.properties.email_otp ?? ''
  const confirmUrl = tokenHash
    ? `${baseUrl}/auth/confirm?${new URLSearchParams({
        token_hash: tokenHash,
        type: otpType,
        next: '/pending-approval',
      }).toString()}`
    : `${baseUrl}/verify-email?email=${encodeURIComponent(parsed.data)}`

  try {
    const transport = createGmailTransport()
    await transport.sendMail({
      from: getGmailFrom(),
      to: parsed.data,
      subject: accountVerificationSubject(),
      html: accountVerificationHtml({
        nombre: usuario?.nombre ?? '',
        confirmUrl,
        code,
      }),
    })
  } catch (e) {
    logger.error('resendVerificationEmail: fallo al enviar correo', {
      error: e instanceof Error ? e.message : String(e),
    })
    return err('resend_failed')
  }

  return ok(undefined)
}

export async function updatePassword(password: string): Promise<Result<void>> {
  const parsed = z.string().min(8).safeParse(password)
  if (!parsed.success) return err('password_too_short')

  let pwnedCount: number
  try {
    pwnedCount = await checkPwnedPassword(parsed.data)
  } catch {
    return err('pwned_check_failed')
  }

  if (pwnedCount > 0) return err('password_breached')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data })

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const detail = error.message?.toLowerCase() ?? ''
    logger.error('updatePassword failed', { error: error.message, code })
    if (code === 'same_password' || detail.includes('different from the old')) {
      return err('password_same_as_old')
    }
    if (
      code === 'weak_password' ||
      detail.includes('password should be') ||
      detail.includes('weak')
    ) {
      return err('password_weak')
    }
    if (
      code === 'session_not_found' ||
      detail.includes('session') ||
      detail.includes('jwt') ||
      detail.includes('not authenticated')
    ) {
      return err('session_expired')
    }
    return err('update_failed')
  }

  // Activación del admin invitado (Opción 1): un administrador nace 'pendiente'
  // y se activa SOLO al fijar su contraseña por primera vez. La condición es
  // estrecha (rol administrador + estado pendiente), así que es no-op para un
  // reset normal (cuentas ya activas) y para un admin desactivado (sigue
  // 'activa' con is_active = false; su reactivación pasa por approveUser).
  const {
    data: { user: invitedUser },
  } = await supabase.auth.getUser()
  if (invitedUser) {
    const adminClient = createSupabaseAdminClient()
    const { data: row } = await adminClient
      .from('usuarios')
      .select('estado_cuenta, roles(nombre_rol)')
      .eq('id_usuario', invitedUser.id)
      .maybeSingle()
    const rolNombre = Array.isArray(row?.roles)
      ? row?.roles[0]?.nombre_rol
      : (row?.roles as { nombre_rol?: string } | null)?.nombre_rol
    if (rolNombre === 'administrador' && row?.estado_cuenta === 'pendiente') {
      const { error: activateError } = await adminClient
        .from('usuarios')
        .update({ estado_cuenta: 'activa', is_active: true })
        .eq('id_usuario', invitedUser.id)
      if (activateError) {
        logger.error('updatePassword: fallo al activar admin invitado', {
          error: activateError.message,
        })
      }
    }
  }

  // Endurecimiento: el enlace de recuperación/invitación crea una sesión
  // completa, no solo "permiso para cambiar la clave". Dejarla viva equivale a
  // un login persistente obtenido sin conocer la contraseña. Cerramos la sesión
  // (scope global: revoca también otras sesiones del usuario tras el cambio) y
  // así forzamos un login fresco con la contraseña nueva.
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    logger.error('updatePassword: fallo al cerrar la sesión de recuperación', {
      error: signOutError.message,
    })
  }

  return ok(undefined)
}
