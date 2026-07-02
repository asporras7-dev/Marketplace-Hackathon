'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/routing'
import { cn } from '@/lib/utils/cn'
import type { EstadoEfectivo, PublishedProject } from '@/lib/projects/dashboard'

interface PublishedProjectsBoardProps {
  projects: PublishedProject[]
}

const STATUS_STYLE: Record<EstadoEfectivo, string> = {
  abierto: 'bg-accent/10 text-accent border-accent/20',
  en_evaluacion: 'bg-warning/10 text-warning border-warning/20',
  adjudicado: 'bg-secondary/10 text-secondary border-secondary/20',
  en_desarrollo: 'bg-primary/10 text-primary border-primary/20',
  finalizado: 'bg-muted text-foreground border-border',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
  borrador: 'bg-muted text-muted-foreground border-border',
  en_recepcion: 'bg-primary/10 text-primary border-primary/20',
}

export function formatBudget(
  moneda: string,
  min: number | null,
  max: number | null,
  fijoLabel: string,
): string | null {
  if (min === null || max === null) return null
  return min === max
    ? `${moneda} ${min} · ${fijoLabel}`
    : `${moneda} ${min} – ${max}`
}

export function PublishedProjectsBoard({
  projects,
}: PublishedProjectsBoardProps) {
  const t = useTranslations('ProjectsBoard')
  const tCommon = useTranslations('Common')
  const [filter, setFilter] = useState<EstadoEfectivo | 'all'>('all')

  const estadosPresentes = useMemo(() => {
    const set = new Set<EstadoEfectivo>()
    projects.forEach((p) => set.add(p.estadoEfectivo))
    return Array.from(set)
  }, [projects])

  const visibles = useMemo(
    () =>
      filter === 'all'
        ? projects
        : projects.filter((p) => p.estadoEfectivo === filter),
    [projects, filter],
  )

  if (projects.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
        <p className="font-semibold text-foreground">{t('empty')}</p>
        <p className="text-sm mt-1">{t('emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label={t('filterAll')}
        />
        {estadosPresentes.map((estado) => (
          <FilterButton
            key={estado}
            active={filter === estado}
            onClick={() => setFilter(estado)}
            label={t(`status_${estado}`)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {visibles.map((project) => {
          const budget = formatBudget(
            project.moneda,
            project.presupuestoMin,
            project.presupuestoMax,
            t('budgetNonNegotiable'),
          )
          return (
            <Card
              key={project.id}
              className="border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <CardContent className="p-5 flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base truncate leading-snug">
                      {project.titulo}
                    </h4>
                    <StatusPill
                      estado={project.estadoEfectivo}
                      label={t(`status_${project.estadoEfectivo}`)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tCommon(project.modalidad)}
                    {budget && (
                      <>
                        {' · '}
                        <span className="font-semibold text-foreground">
                          {budget}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Link href={`/empresario/proyectos/${project.id}/matches`}>
                      <Target className="w-4 h-4 mr-2" />
                      Ver matchs con egresados
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Link href={`/empresario/proyecto/${project.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('viewDetails')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card/50 text-muted-foreground hover:border-primary/50',
      )}
    >
      {label}
    </button>
  )
}

export function StatusPill({
  estado,
  label,
}: {
  estado: EstadoEfectivo
  label: string
}) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
        STATUS_STYLE[estado],
      )}
    >
      {label}
    </span>
  )
}
