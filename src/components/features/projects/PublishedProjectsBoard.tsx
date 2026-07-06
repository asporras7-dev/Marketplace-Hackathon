'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Target, MapPin, Coins } from 'lucide-react'
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
  en_evaluacion: 'bg-warning/15 text-warning border-warning/30',
  adjudicado: 'bg-primary/10 text-primary border-primary/20',
  en_desarrollo: 'bg-primary/10 text-primary border-primary/20',
  finalizado: 'bg-muted text-ink-muted border-border',
  cancelado: 'bg-magenta/10 text-magenta border-magenta/20',
  borrador: 'bg-muted text-ink-muted border-border',
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
      <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center text-muted-foreground bg-white">
        <p className="font-semibold text-foreground">{t('empty')}</p>
        <p className="text-sm mt-1">{t('emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Segmented Filter Control */}
      <div className="flex justify-between items-center gap-4 flex-wrap bg-white border border-gray-100 px-5 py-3 rounded-xl shadow-sm">
        <span className="text-xs text-ink-muted font-bold font-sans uppercase tracking-wider">
          {t('filterLabel')}
        </span>
        <div className="flex bg-gray-50 p-1 rounded-xl gap-0.5 border border-gray-100">
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
      </div>

      {/* Card List */}
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
              className="border border-gray-100 bg-white shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-[var(--duration-fast)]"
            >
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-extrabold text-lg text-ink-strong leading-snug break-words">
                      {project.titulo}
                    </h4>
                    <StatusPill
                      estado={project.estadoEfectivo}
                      label={t(`status_${project.estadoEfectivo}`)}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-ink-muted font-sans flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                      <span>{tCommon(project.modalidad)}</span>
                    </span>
                    {budget && (
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-ink-muted" />
                        <span className="font-semibold text-ink-strong">
                          {budget}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 md:self-center flex-wrap">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="bg-muted/30 hover:bg-muted/60 border border-border text-ink-strong font-bold text-xs h-9 rounded-xl cursor-pointer px-4 flex items-center gap-1.5"
                  >
                    <Link href={`/empresario/proyectos/${project.id}/matches`}>
                      <Target className="w-4 h-4 text-primary" />
                      {t('viewMatches')}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="bg-muted/30 hover:bg-muted/60 border border-border text-ink-strong font-bold text-xs h-9 rounded-xl cursor-pointer px-4 flex items-center gap-1.5"
                  >
                    <Link href={`/empresario/proyecto/${project.id}`}>
                      <Eye className="w-4 h-4 text-ink-muted" />
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
        'rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer font-sans border-none select-none',
        active
          ? 'bg-white text-ink-strong shadow-sm'
          : 'bg-transparent text-ink-muted hover:text-ink',
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
        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-sans shrink-0',
        STATUS_STYLE[estado],
      )}
    >
      {label}
    </span>
  )
}
