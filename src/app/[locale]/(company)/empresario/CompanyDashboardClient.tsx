'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { PublishedProjectsBoard } from '@/components/features/projects/PublishedProjectsBoard'
import { Link } from '@/i18n/routing'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { Briefcase, Users, Plus, UserCheck } from 'lucide-react'
import type { PublishedProject } from '@/lib/projects/dashboard'
import { RankingSnippet } from '@/components/features/ranking/RankingSnippet'
import { TalentRankingItem } from '@/lib/ranking/actions'

// Charts solo en cliente: Recharts mide el contenedor con ResizeObserver, que en
// SSR no tiene layout y emite "width(-1)/height(-1)". Con ssr:false no se renderiza
// en el servidor; en el cliente el contenedor ya tiene alto fijo y dibuja sin avisos.
const DashboardCharts = dynamic(
  () =>
    import('@/components/features/dashboard/DashboardCharts').then(
      (mod) => mod.DashboardCharts,
    ),
  { ssr: false },
)

interface CompanyDashboardClientProps {
  initialProjects: PublishedProject[]
  participationStats: {
    total: number
    hired: number
    countsByProject: Record<string, number>
  }
  topTalents?: TalentRankingItem[]
  locale: string
}

/**
 * Cuerpo (client) del dashboard del empresario. Proyectos y stats llegan YA
 * cargados por prop desde el server component.
 */
export function CompanyDashboardClient({
  initialProjects,
  participationStats,
  topTalents = [],
  locale,
}: CompanyDashboardClientProps) {
  const tEmpresa = useTranslations('Empresa')
  const tAccount = useTranslations('Account')
  const { isPending } = useAccountStatus()

  const activeRealCount = initialProjects.filter(
    (p) => p.estadoEfectivo === 'abierto',
  ).length

  const stats: StatItem[] = [
    {
      title: tEmpresa('statsActiveProjects'),
      value: activeRealCount,
      icon: Briefcase,
      description: tEmpresa('statsActiveProjectsDesc'),
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: tEmpresa('statsTotalApplications'),
      value: participationStats.total,
      icon: Users,
      description: tEmpresa('statsTotalAppsDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: tEmpresa('statsHired'),
      value: participationStats.hired,
      icon: UserCheck,
      description: tEmpresa('statsHiredDesc'),
      colorClass: 'text-magenta bg-magenta/10',
    },
  ]

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <PageTitle
            title={tEmpresa('dashboard')}
            description={tEmpresa('dashboardDesc')}
            dotColor="text-magenta"
            action={
              <div className="flex items-center gap-2">
                {isPending ? (
                  <span
                    aria-disabled="true"
                    title={tAccount('actionDisabledPending')}
                    className="bg-muted text-muted-foreground/50 font-semibold flex items-center justify-center gap-1.5 rounded-lg text-sm h-8 px-3 cursor-not-allowed select-none"
                  >
                    <Plus className="w-4 h-4" />
                    {tEmpresa('publishProject')}
                  </span>
                ) : (
                  <Link
                    href="/empresario/new-project"
                    className="bg-magenta hover:bg-magenta/95 text-magenta-foreground font-semibold flex items-center justify-center gap-1.5 shadow-md rounded-lg text-sm h-8 px-3 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {tEmpresa('publishProject')}
                  </Link>
                )}
              </div>
            }
          />

          <RankingSnippet
            topTalents={topTalents}
            rankingUrl={`/${locale}/empresario/ranking`}
          />

          <DashboardStats stats={stats} />

          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-heading pb-2 border-b border-border/60">
              {tEmpresa('myPublishedProjects')}
              <span className="text-magenta">.</span>
            </h2>

            <DashboardCharts
              projects={initialProjects}
              countsByProject={participationStats.countsByProject}
            />

            <PublishedProjectsBoard projects={initialProjects} />
          </div>
        </main>
      </div>
    </CompanyShell>
  )
}
