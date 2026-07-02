import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/dal'
import { AccountStatusProvider } from '@/components/features/auth/AccountStatusContext'
import { PendingAccountBanner } from '@/components/features/auth/PendingAccountBanner'

/**
 * Layout del grupo (app) — rutas de egresado.
 * Verifica que el usuario esté autenticado, tenga rol 'egresado',
 * e inyecta el estado de la cuenta en AccountStatusProvider.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const supabase = await createSupabaseServerClient()
  const [{ data: roleRaw }, { data: estadoCuenta }] = await Promise.all([
    supabase.rpc('get_my_role'),
    supabase.rpc('get_my_account_status'),
  ])

  const role = normalizeRole(roleRaw as string | null)

  if (!role) {
    redirect(`/${locale}/onboarding`)
  }

  if (role !== 'egresado') {
    redirect(`/${locale}${ROLE_HOME[role]}`)
  }

  // Gate de verificación: con el correo confirmado la cuenta queda 'activa',
  // pero el acceso al panel exige que el admin haya verificado al egresado
  // (RF-64). Mientras no esté 'verificado' (pendiente o rechazado), a la
  // pantalla de "en revisión".
  const { data: estudiante } = await supabase
    .from('estudiantes')
    .select('estado_verificacion')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (estudiante?.estado_verificacion !== 'verificado') {
    redirect(`/${locale}/pending-approval`)
  }

  const estado = estadoCuenta as string | null

  return (
    <AccountStatusProvider estadoCuenta={estado}>
      {estado !== 'activa' && <PendingAccountBanner />}
      {children}
    </AccountStatusProvider>
  )
}
