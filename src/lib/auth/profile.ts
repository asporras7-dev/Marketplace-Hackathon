import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { PerfilInput } from './schemas'

type AdminClient = SupabaseClient<Database>

/**
 * Datos personales y de sede opcionales. Los usa el onboarding OAuth (Camino B),
 * que recoge más que el registro por contraseña (Camino A). En el Camino A se
 * omiten y quedan con los valores de `handle_new_user` / null.
 */
export interface DatosPerfilOpcionales {
  nombre?: string
  apellido1?: string
  apellido2?: string | null
  fechaNacimiento?: string
  fotoPerfilUrl?: string | null
  paisIso?: string
  region?: string
  alcanceOperativo?: Database['public']['Enums']['alcance_enum']
}

/**
 * Asigna el rol y crea la fila de perfil (`estudiantes`/`empresarios`) del
 * usuario, usando el cliente admin (service_role). Único punto de creación de
 * perfil: lo usan el registro por contraseña (Camino A, sin sesión) y el
 * onboarding OAuth (Camino B, con sesión). `assign_my_role` queda jubilado.
 *
 * El `estado_verificacion` arranca 'pendiente' (lo refuerza el guard BEFORE
 * INSERT de BD); la verificación la hace el admin (RF-64 / RF-17).
 */
export async function crearPerfilUsuario(
  admin: AdminClient,
  userId: string,
  datos: PerfilInput,
  opcionales?: DatosPerfilOpcionales,
): Promise<Result<void>> {
  // Resolver id_rol desde el catálogo (mismo vocabulario que nombre_rol).
  const { data: rol, error: rolError } = await admin
    .from('roles')
    .select('id_rol')
    .eq('nombre_rol', datos.role)
    .maybeSingle()

  if (rolError || !rol) {
    logger.error('crearPerfilUsuario: rol no encontrado', {
      error: rolError?.message,
      role: datos.role,
    })
    return err('role_not_found')
  }

  let perfilCreado:
    | { table: 'estudiantes'; idField: 'id_usuario'; id: string }
    | { table: 'empresarios'; idField: 'id_usuario'; id: string }
    | null = null

  if (datos.role === 'egresado') {
    const { error: estudianteError } = await admin.from('estudiantes').upsert(
      {
        id_usuario: userId,
        titulo_fwd: datos.tituloFwd,
      },
      { onConflict: 'id_usuario' },
    )
    if (estudianteError) {
      logger.error('crearPerfilUsuario: fallo al crear estudiante', {
        error: estudianteError.message,
      })
      return err(estudianteError.message)
    }
    perfilCreado = { table: 'estudiantes', idField: 'id_usuario', id: userId }
  } else {
    const empresarioInsert: Database['public']['Tables']['empresarios']['Insert'] =
      {
        id_usuario: userId,
        tipo_empresario: datos.tipoEmpresario,
        nombre_empresa: datos.nombreEmpresa,
        cedula: datos.cedula,
        sitio_web: datos.sitioWeb ? datos.sitioWeb : null,
      }
    if (opcionales?.paisIso) empresarioInsert.pais_iso_sede = opcionales.paisIso
    if (opcionales?.region) empresarioInsert.region_sede = opcionales.region
    if (opcionales?.alcanceOperativo)
      empresarioInsert.alcance_operativo = opcionales.alcanceOperativo

    const { error: empresarioError } = await admin
      .from('empresarios')
      .upsert(empresarioInsert, { onConflict: 'id_usuario' })
    if (empresarioError) {
      logger.error('crearPerfilUsuario: fallo al crear empresario', {
        error: empresarioError.message,
      })
      return err(empresarioError.message)
    }
    perfilCreado = { table: 'empresarios', idField: 'id_usuario', id: userId }
  }

  const usuarioUpdate: Database['public']['Tables']['usuarios']['Update'] = {
    id_rol: rol.id_rol,
  }
  if (opcionales?.nombre) usuarioUpdate.nombre = opcionales.nombre
  if (opcionales?.apellido1) usuarioUpdate.apellido_1 = opcionales.apellido1
  if (opcionales?.apellido2 !== undefined)
    usuarioUpdate.apellido_2 = opcionales.apellido2 || null
  if (opcionales?.fechaNacimiento)
    usuarioUpdate.fecha_nacimiento = opcionales.fechaNacimiento
  if (opcionales?.fotoPerfilUrl !== undefined)
    usuarioUpdate.foto_perfil = opcionales.fotoPerfilUrl ?? null

  const { error: usuarioError } = await admin
    .from('usuarios')
    .update(usuarioUpdate)
    .eq('id_usuario', userId)

  if (usuarioError) {
    logger.error('crearPerfilUsuario: fallo al asignar rol', {
      error: usuarioError.message,
    })
    if (perfilCreado) {
      const { error: rollbackError } = await admin
        .from(perfilCreado.table)
        .delete()
        .eq(perfilCreado.idField, perfilCreado.id)
      if (rollbackError) {
        logger.error('crearPerfilUsuario: fallo al revertir perfil parcial', {
          error: rollbackError.message,
          table: perfilCreado.table,
          userId,
        })
      }
    }
    return err(usuarioError.message)
  }

  return ok(undefined)
}
