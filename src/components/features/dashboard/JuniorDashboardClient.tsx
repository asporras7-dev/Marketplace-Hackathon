'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { InsightSection } from '@/components/features/brand/InsightSection'
import { Link } from '@/i18n/routing'
import { Project } from '@/types'
import type { MisPostulacionesStats } from '@/lib/applications/queries'
import {
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  Lightbulb,
  Rocket,
  Target,
} from 'lucide-react'

interface JuniorDashboardClientProps {
  recommendedProjects: Project[]
  stats: MisPostulacionesStats
}

export function JuniorDashboardClient({
  recommendedProjects,
  stats,
}: JuniorDashboardClientProps) {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')

  const dashboardStats: StatItem[] = [
    {
      title: tEgresado('appliedProjects'),
      value: stats.total,
      icon: FileText,
      description: tEgresado('statAppliedDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: tEgresado('activeApplications'),
      value: stats.activas,
      icon: Send,
      description: tEgresado('statActiveDesc'),
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: tEgresado('acceptedProjects'),
      value: stats.contratadas,
      icon: CheckCircle2,
      description: tEgresado('statAcceptedDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
  ]

  const insights = [
    {
      title: tEgresado('insightTitle1'),
      description: tEgresado('insightDesc1'),
      icon: Lightbulb,
    },
    {
      title: tEgresado('insightTitle2'),
      description: tEgresado('insightDesc2'),
      icon: Target,
    },
    {
      title: tEgresado('insightTitle3'),
      description: tEgresado('insightDesc3'),
      icon: Rocket,
    },
  ]

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="flex flex-col gap-6">
          <PageTitle
            title={tEgresado('dashboard')}
            description={tEgresado('dashboardDesc')}
            dotColor="text-primary"
          />

          <DashboardStats stats={dashboardStats} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                  {tEgresado('statsRecommended')}
                  <span className="text-accent">.</span>
                </h2>
                <Link
                  href="/egresado/projects"
                  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5"
                >
                  {tCommon('viewAll')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {recommendedProjects.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                  {tEgresado('emptyRecommendations')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <InsightSection
                title={tEgresado('insightsSectionTitle')}
                insights={insights}
              />
            </div>
          </div>
        </main>
      </div>
    </EgresadoShell>
  )
}
