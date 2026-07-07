import { getLocale, getTranslations } from 'next-intl/server'
import {
  Users,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  UserPlus,
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminUserFilters } from '@/components/features/admin/AdminUserFilters'
import { AccountStatusActions } from '@/components/features/admin/AccountStatusActions'
import { getCurrentUser } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { canManageAdminInUi } from '@/lib/admin/admin-management'
import {
  listUsers,
  getUserStats,
  ADMIN_USER_ROLES,
  ADMIN_ACCOUNT_STATUSES,
  type AdminAccountStatus,
  type ListUsersFilters,
} from '@/lib/admin/queries'

const STATUS_BADGE_CLASS: Record<AdminAccountStatus, string> = {
  activa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  suspendida: 'bg-rose-50 text-rose-700 border-rose-200',
  suspendida_severa: 'bg-red-100 text-red-800 border-red-300',
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  administrador: 'bg-violet-100 text-violet-800 border-violet-200',
  egresado: 'bg-blue-50 text-blue-700 border-blue-200',
  empresario: 'bg-amber-50 text-amber-700 border-amber-200',
}

const AVATAR_COLORS = [
  'bg-violet-200 text-violet-800',
  'bg-blue-200 text-blue-800',
  'bg-emerald-200 text-emerald-800',
  'bg-amber-200 text-amber-800',
  'bg-rose-200 text-rose-800',
  'bg-indigo-200 text-indigo-800',
  'bg-cyan-200 text-cyan-800',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]!
}

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const params = await searchParams

  const search = params.q?.trim() || undefined
  const role = ADMIN_USER_ROLES.find((value) => value === params.role)
  const status = ADMIN_ACCOUNT_STATUSES.find((value) => value === params.status)

  const filters: ListUsersFilters = {}
  if (search) filters.search = search
  if (role) filters.role = role
  if (status) filters.status = status

  const [result, statsResult] = await Promise.all([
    listUsers(filters),
    getUserStats(),
  ])
  const users = result.ok ? result.data : []
  const stats = statsResult.ok ? statsResult.data : null

  const currentUser = await getCurrentUser()
  const currentUserId = currentUser?.id ?? null

  let callerNivel: 'superadmin' | 'admin' | 'moderador' | null = null
  let callerFechaRegistro = ''
  if (currentUserId) {
    const adminClient = createSupabaseAdminClient()
    const { data: callerRow } = await adminClient
      .from('usuarios')
      .select('nivel_admin, fecha_registro')
      .eq('id_usuario', currentUserId)
      .maybeSingle()
    callerNivel = callerRow?.nivel_admin ?? null
    callerFechaRegistro = callerRow?.fecha_registro ?? ''
  }

  const statusLabel = (value: AdminAccountStatus): string => {
    switch (value) {
      case 'pendiente':
        return t('accountStatusPendiente')
      case 'activa':
        return t('accountStatusActiva')
      case 'suspendida':
        return t('accountStatusSuspendida')
      case 'suspendida_severa':
        return t('accountStatusSuspendidaSevera')
    }
  }

  const roleLabel = (nombreRol: string | null): string => {
    switch (nombreRol) {
      case 'administrador':
        return t('roleAdministrador')
      case 'egresado':
        return t('roleEgresado')
      case 'empresario':
        return t('roleEmpresario')
      default:
        return t('roleNone')
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <PageTitle
          title={t('usersManagement')}
          description={t('usersManagementDesc')}
          dotColor="text-magenta"
        />
        {callerNivel === 'superadmin' && (
          <Link
            href="/admin/registro-admin"
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-bold shadow-md hover:bg-foreground/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t('adminRegisterTitle')}
          </Link>
        )}
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Usuarios */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted mb-1">
                {t('statTotalUsers')}
              </p>
              <p className="text-3xl font-extrabold text-ink-strong font-heading">
                {stats.total.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          {/* Cuentas Activas */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted mb-1">
                {t('statActiveUsers')}
              </p>
              <p className="text-3xl font-extrabold text-ink-strong font-heading">
                {stats.activas.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {t('statActiveUsersDesc')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          {/* Por Verificar */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted mb-1">
                {t('statPendingUsers')}
              </p>
              <p className="text-3xl font-extrabold text-ink-strong font-heading">
                {stats.pendientes.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-amber-600 mt-1 flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {t('statPendingUsersDesc')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <AdminUserFilters
          initialSearch={search ?? ''}
          initialRole={role ?? ''}
          initialStatus={status ?? ''}
        />

        {users.length === 0 ? (
          <EmptyState
            title={t('noUsersFound')}
            description={t('noUsersFoundDesc')}
            icon={Users}
          />
        ) : (
          <div className="space-y-4">
            {users.length >= 100 && (
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning-foreground">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="font-semibold">{t('usersLimitWarning')}</p>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border/40 px-5 py-3 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">
                  {t('usersCount', { count: users.length })}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-surface-sunken/30">
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colName')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colEmail')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colRole')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colStatus')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colRegistered')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colActions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const fullName = `${user.nombre} ${user.apellido_1}`
                    const initials =
                      `${user.nombre[0] ?? ''}${user.apellido_1[0] ?? ''}`.toUpperCase()
                    const avatarColor = getAvatarColor(fullName)
                    const isAdminRow = user.nombre_rol === 'administrador'
                    const canManage =
                      !isAdminRow ||
                      canManageAdminInUi({
                        actorNivel: callerNivel,
                        actorFechaRegistro: callerFechaRegistro,
                        targetNivel: user.nivel_admin,
                        targetFechaRegistro: user.fecha_registro,
                      })
                    const canResend =
                      isAdminRow &&
                      user.estado_cuenta === 'pendiente' &&
                      callerNivel === 'superadmin'
                    return (
                      <TableRow
                        key={user.id_usuario}
                        className="border-border/30 hover:bg-surface-sunken/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${avatarColor}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-ink-strong leading-tight">
                                {fullName}
                                {user.apellido_2 ? ` ${user.apellido_2}` : ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-ink-muted">
                          {user.correo}
                        </TableCell>
                        <TableCell>
                          {user.nombre_rol ? (
                            <Badge
                              variant="outline"
                              className={`rounded-full border px-2.5 text-[10px] font-bold capitalize ${ROLE_BADGE_CLASS[user.nombre_rol] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
                            >
                              {roleLabel(user.nombre_rol)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-ink-muted italic">
                              {roleLabel(null)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge
                              variant="outline"
                              className={`rounded-full border px-2.5 text-[10px] font-bold ${STATUS_BADGE_CLASS[user.estado_cuenta]}`}
                            >
                              {statusLabel(user.estado_cuenta)}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-full border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-bold text-rose-700"
                            >
                              {t('accountInactive')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-ink-muted whitespace-nowrap">
                          {new Date(user.fecha_registro).toLocaleDateString(
                            locale,
                            { year: 'numeric', month: 'short', day: 'numeric' },
                          )}
                        </TableCell>
                        <TableCell>
                          <AccountStatusActions
                            userId={user.id_usuario}
                            estadoCuenta={user.estado_cuenta}
                            isActive={user.is_active}
                            isSelf={user.id_usuario === currentUserId}
                            userName={fullName}
                            canManage={canManage}
                            canResend={canResend}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
