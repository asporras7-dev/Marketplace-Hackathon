import { getLocale, getTranslations } from 'next-intl/server'
import {
  AlertTriangle,
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Flag,
} from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StrikeActions } from '@/components/features/admin/StrikeActions'
import { StrikeAuditHistory } from '@/components/features/admin/StrikeAuditHistory'
import { CreateStrikeButton } from '@/components/features/admin/CreateStrikeButton'
import { ModerationReportActions } from '@/components/features/admin/ModerationReportActions'
import { getCurrentUser } from '@/lib/auth/dal'
import {
  listUsersWithStrikes,
  listUsers,
  type AdminAccountStatus,
  MAX_STRIKES_LIMIT,
} from '@/lib/admin/queries'
import { listarColaReportes } from '@/lib/moderation/report-actions'

// ── Risk-level helpers ────────────────────────────────────────────────────────

type RiskLevel = 'salvable' | 'suspendido' | 'expulsion'

function getRiskLevel(strikes: number, estado: AdminAccountStatus): RiskLevel {
  if (estado === 'suspendida_severa') return 'expulsion'
  if (strikes >= MAX_STRIKES_LIMIT || estado === 'suspendida')
    return 'suspendido'
  return 'salvable'
}

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; icon: React.ElementType; className: string }
> = {
  salvable: {
    label: 'Se puede salvar',
    icon: ShieldCheck,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  suspendido: {
    label: 'Suspendido',
    icon: ShieldAlert,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  expulsion: {
    label: 'Expulsión',
    icon: ShieldX,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

// ── Status + role badge maps ──────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminModerationPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()

  const result = await listUsersWithStrikes(1)
  const users = result.ok ? result.data : []

  const allUsersRes = await listUsers()
  const allUsers = allUsersRes.ok ? allUsersRes.data : []

  const currentUser = await getCurrentUser()
  const currentUserId = currentUser?.id ?? null

  const colaRes = await listarColaReportes()
  const reportes = colaRes.ok ? colaRes.data : []

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
      <PageTitle
        title={t('strikeManagement')}
        description={t('strikeManagementDesc')}
        dotColor="text-warning"
        action={
          <CreateStrikeButton users={allUsers} currentUserId={currentUserId} />
        }
      />

      <div className="mt-6 space-y-6">
        <Tabs defaultValue="moderation" className="w-full">
          <TabsList label="Moderación" className="mb-4">
            <TabsTrigger value="moderation">
              Usuarios Penalizados
              {users.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/20 px-1 text-[9px] font-bold text-warning">
                  {users.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit">Historial de Auditoría</TabsTrigger>
            <TabsTrigger value="reports">
              {t('reportQueueTab')}
              {reportes.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/20 px-1 text-[9px] font-bold text-destructive">
                  {reportes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Usuarios Penalizados ── */}
          <TabsContent value="moderation" className="space-y-6">
            {users.length === 0 ? (
              <EmptyState
                title={t('noUsersWithStrikes')}
                description={t('noUsersWithStrikesDesc')}
                icon={AlertTriangle}
              />
            ) : (
              <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">
                    {t('usersCount', { count: users.length })} con strikes
                    activos
                  </span>
                  <span className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />{' '}
                      Se puede salvar (1–{MAX_STRIKES_LIMIT - 1})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />{' '}
                      Suspendido (≥{MAX_STRIKES_LIMIT})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />{' '}
                      Expulsión
                    </span>
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
                      <TableHead className="text-center font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('colStrikes')}
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        Nivel de riesgo
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
                      const riskLevel = getRiskLevel(
                        user.cantidad_strikes,
                        user.estado_cuenta,
                      )
                      const risk = RISK_CONFIG[riskLevel]
                      const RiskIcon = risk.icon

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

                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-sm font-extrabold tabular-nums text-amber-700">
                              {user.cantidad_strikes}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${risk.className}`}
                            >
                              <RiskIcon className="h-3.5 w-3.5 shrink-0" />
                              {risk.label}
                            </span>
                          </TableCell>

                          <TableCell className="text-sm text-ink-muted whitespace-nowrap">
                            {new Date(user.fecha_registro).toLocaleDateString(
                              locale,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </TableCell>

                          <TableCell>
                            <StrikeActions
                              userId={user.id_usuario}
                              userName={fullName}
                              cantidadStrikes={user.cantidad_strikes}
                              isSelf={user.id_usuario === currentUserId}
                              isExpelled={
                                user.estado_cuenta === 'suspendida_severa'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Historial de Auditoría ── */}
          <TabsContent value="audit">
            <StrikeAuditHistory />
          </TabsContent>

          {/* ── Tab: Cola de reportes (RF-69) ── */}
          <TabsContent value="reports" className="space-y-6">
            {reportes.length === 0 ? (
              <EmptyState
                title={t('reportQueueEmpty')}
                description={t('reportQueueEmptyDesc')}
                icon={Flag}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
                <div className="border-b border-border/40 px-5 py-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">
                    {t('reportQueueCount', { count: reportes.length })}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-surface-sunken/30">
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('reportColReporter')}
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('reportColTarget')}
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('reportColType')}
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('reportColDescription')}
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('reportColDate')}
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wide text-ink-muted">
                        {t('colActions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportes.map((reporte) => (
                      <TableRow
                        key={reporte.id_reporte}
                        className="border-border/30 hover:bg-surface-sunken/30 transition-colors"
                      >
                        <TableCell className="font-semibold text-sm text-ink-strong">
                          {reporte.reportante_nombre}
                        </TableCell>
                        <TableCell className="font-semibold text-ink-strong">
                          {reporte.target ? (
                            <span className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-ink-muted">
                                {t(`targetTipo_${reporte.target.tipo}`)}
                              </span>
                              <span className="text-sm">
                                {reporte.target.nombre}
                              </span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="rounded-full border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-bold text-violet-800"
                          >
                            {t(`tipoReporte_${reporte.tipo_reporte}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-pre-wrap text-sm text-ink">
                          {reporte.descripcion}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-ink-muted">
                          {new Date(reporte.reportado_at).toLocaleDateString(
                            locale,
                            { year: 'numeric', month: 'short', day: 'numeric' },
                          )}
                        </TableCell>
                        <TableCell>
                          <ModerationReportActions
                            reportId={reporte.id_reporte}
                            canStrike={reporte.target?.tipo === 'usuario'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
