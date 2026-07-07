import { getLocale, getTranslations } from 'next-intl/server'
import {
  Users,
  UserCheck,
  ShieldCheck,
  Power,
  GraduationCap,
  Building2,
  ShieldAlert,
  Briefcase,
  FolderOpen,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import {
  DashboardStats,
  type StatItem,
} from '@/components/features/DashboardStats'
import { AdminReportsInterface } from '@/components/features/admin/AdminReportsInterface'
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
import {
  getUserStats,
  getProjectStats,
  listUsers,
  listAllProjectsForAdmin,
  listAuditoria,
  MAX_USERS_PER_QUERY,
  MAX_AUDIT_ROWS,
  type AdminAccountStatus,
  type AdminUserStats,
  type AdminProjectStats,
} from '@/lib/admin/queries'

const EMPTY_USER_STATS: AdminUserStats = {
  total: 0,
  pendientes: 0,
  activas: 0,
  desactivadas: 0,
  egresados: 0,
  empresarios: 0,
  administradores: 0,
}

const EMPTY_PROJECT_STATS: AdminProjectStats = {
  total: 0,
  borrador: 0,
  abierto: 0,
  en_recepcion: 0,
  adjudicado: 0,
  en_desarrollo: 0,
  finalizado: 0,
  cancelado: 0,
}

// ── Visual design helpers (badge maps + avatar) ─────────────────────────────

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

const PROJECT_STATUS_CLASS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-600 border-gray-200',
  abierto: 'bg-blue-50 text-blue-700 border-blue-200',
  en_recepcion: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  adjudicado: 'bg-violet-50 text-violet-700 border-violet-200',
  en_desarrollo: 'bg-amber-50 text-amber-700 border-amber-200',
  finalizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelado: 'bg-rose-50 text-rose-700 border-rose-200',
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

export default async function AdminReportsPage() {
  const t = await getTranslations('Admin')
  const tBoard = await getTranslations('ProjectsBoard')
  const locale = await getLocale()

  const [
    userStatsResult,
    usersResult,
    projectStatsResult,
    projectsResult,
    auditResult,
  ] = await Promise.all([
    getUserStats(),
    listUsers(),
    getProjectStats(),
    listAllProjectsForAdmin(),
    listAuditoria(),
  ])

  const userStats = userStatsResult.ok ? userStatsResult.data : EMPTY_USER_STATS
  const users = usersResult.ok ? usersResult.data : []
  const projectStats = projectStatsResult.ok
    ? projectStatsResult.data
    : EMPTY_PROJECT_STATS
  const projects = projectsResult.ok ? projectsResult.data : []
  const auditEvents = auditResult.ok ? auditResult.data : []

  const userCards: StatItem[] = [
    {
      title: t('statTotalUsers'),
      value: userStats.total,
      icon: Users,
      description: t('statTotalUsersDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: t('statPendingUsers'),
      value: userStats.pendientes,
      icon: UserCheck,
      description: t('statPendingUsersDesc'),
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: t('statActiveUsers'),
      value: userStats.activas,
      icon: ShieldCheck,
      description: t('statActiveUsersDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: t('statInactiveUsers'),
      value: userStats.desactivadas,
      icon: Power,
      description: t('statInactiveUsersDesc'),
      colorClass: 'text-destructive bg-destructive/10',
    },
    {
      title: t('statGraduates'),
      value: userStats.egresados,
      icon: GraduationCap,
      description: t('statGraduatesDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: t('statCompanyUsers'),
      value: userStats.empresarios,
      icon: Building2,
      description: t('statCompanyUsersDesc'),
      colorClass: 'text-magenta bg-magenta/10',
    },
    {
      title: t('statAdmins'),
      value: userStats.administradores,
      icon: ShieldAlert,
      description: t('statAdminsDesc'),
      colorClass: 'text-highlight bg-highlight/10',
    },
  ]

  const projectCards: StatItem[] = [
    {
      title: t('statTotalProjects'),
      value: projectStats.total,
      icon: Briefcase,
      description: t('statTotalProjectsDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: t('statOpenProjects'),
      value: projectStats.abierto,
      icon: FolderOpen,
      description: t('statOpenProjectsDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: t('statActiveProjects'),
      value: projectStats.en_desarrollo,
      icon: PlayCircle,
      description: t('statActiveProjectsDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: t('statFinishedProjects'),
      value: projectStats.finalizado,
      icon: CheckCircle2,
      description: t('statFinishedProjectsDesc'),
      colorClass: 'text-highlight bg-highlight/10',
    },
    {
      title: t('statCancelledProjects'),
      value: projectStats.cancelado,
      icon: AlertTriangle,
      description: t('statCancelledProjectsDesc'),
      colorClass: 'text-destructive bg-destructive/10',
    },
  ]

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

  const formatDate = (value: string): string =>
    new Date(value).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('reportsTitle')}
        description={t('reportsDesc')}
        dotColor="text-primary"
      />

      {/* ── Usuarios: métricas + tabla en pantalla ── */}
      <section className="space-y-6">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {t('reportUsersTitle')}
        </h2>

        <DashboardStats stats={userCards} className="xl:grid-cols-4" />

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const fullName = `${user.nombre} ${user.apellido_1}`
                const initials =
                  `${user.nombre[0] ?? ''}${user.apellido_1[0] ?? ''}`.toUpperCase()
                const avatarColor = getAvatarColor(fullName)
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
                        <p className="font-semibold text-sm text-ink-strong leading-tight">
                          {fullName}
                          {user.apellido_2 ? ` ${user.apellido_2}` : ''}
                        </p>
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
                    <TableCell className="whitespace-nowrap text-sm text-ink-muted">
                      {formatDate(user.fecha_registro)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {users.length >= MAX_USERS_PER_QUERY && (
          <p className="text-xs text-ink-muted">{t('usersLimitWarning')}</p>
        )}
      </section>

      {/* ── Proyectos: métricas + tabla en pantalla ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {t('reportProjectsTitle')}
        </h2>

        <DashboardStats stats={projectCards} className="xl:grid-cols-5" />

        {projects.length === 0 ? (
          <EmptyState
            title={t('noProjects')}
            description={t('noProjectsDesc')}
            icon={Briefcase}
          />
        ) : (
          <>
            <p className="text-xs text-ink-muted">
              {t('projectsCount', { count: projects.length })}
            </p>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-surface-sunken/30">
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColTitle')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColCompany')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('colStatus')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColPublished')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project.id_proyecto}
                      className="border-border/30 hover:bg-surface-sunken/30 transition-colors"
                    >
                      <TableCell className="font-semibold text-sm text-ink-strong">
                        {project.titulo}
                      </TableCell>
                      <TableCell className="text-sm text-ink-muted">
                        {project.nombre_empresa ?? t('companyUnknown')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full border px-2.5 text-[10px] font-bold ${PROJECT_STATUS_CLASS[project.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                        >
                          {tBoard(`status_${project.estado}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-ink-muted">
                        {project.fecha_publicacion
                          ? formatDate(project.fecha_publicacion)
                          : t('notPublished')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {/* ── Actividad: tabla de auditoría reciente ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {t('reportActivityTitle')}
        </h2>

        {auditEvents.length === 0 ? (
          <EmptyState
            title={t('reportNoActivity')}
            description={t('reportNoActivityDesc')}
            icon={Activity}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-surface-sunken/30">
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColDate')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColActor')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColAction')}
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                      {t('reportColEntity')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow
                      key={event.id_auditoria}
                      className="border-border/30 hover:bg-surface-sunken/30 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap text-sm text-ink-muted">
                        {formatDate(event.ocurrida_at)}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-ink-strong">
                        {event.actor_nombre ?? t('reportAuditSystem')}
                      </TableCell>
                      <TableCell className="text-sm text-ink">
                        {event.accion}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-bold text-indigo-700"
                        >
                          {event.entidad}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {auditEvents.length >= MAX_AUDIT_ROWS && (
              <p className="text-xs text-ink-muted">
                {t('reportActivityLimit', { limit: MAX_AUDIT_ROWS })}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Exportación CSV (todas las entidades) ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <AdminReportsInterface />
      </section>
    </div>
  )
}
