import React from 'react'
import { Project } from '@/types'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/routing'
import {
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  ArrowRight,
  Target,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ProjectCardProps {
  project: Project
  actionButton?: React.ReactNode
  showAdminActions?: boolean
  onAdminHide?: () => void
  onAdminApprove?: () => void
  /**
   * Etiqueta de presupuesto ya formateada (rango + moneda real). Cuando viene,
   * reemplaza el `${project.budget} USD` por defecto. Pensada para datos reales
   * donde el presupuesto es un rango y la moneda puede no ser USD.
   */
  budgetLabel?: string | undefined
}

export function ProjectCard({
  project,
  actionButton,
  budgetLabel,
}: ProjectCardProps) {
  const tCommon = useTranslations('Common')

  // Modalidad mapeada a tokens FWD (§5.1): remoto=success/accent, hibrido=atencion/warning,
  // presencial=profundidad/secondary.
  const modeColors = {
    remoto: 'bg-accent/10 text-accent border-accent/20',
    hibrido: 'bg-warning/10 text-warning border-warning/20',
    presencial: 'bg-secondary/10 text-secondary border-secondary/20',
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden border border-border/80 bg-card/60 backdrop-blur-sm hover:shadow-md hover:border-primary/40 transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)] group">
      <CardHeader className="p-6 pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge
            variant="outline"
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${modeColors[project.mode]}`}
          >
            <MapPin className="w-3 h-3 mr-1 shrink-0" />
            {tCommon(project.mode)}
          </Badge>
          <div className="flex items-center gap-3">
            {project.matchScore !== undefined && (
              <Badge
                variant="outline"
                className="px-2 py-0.5 rounded-full text-xs font-bold border-primary text-primary bg-primary/5"
              >
                <Target className="w-3 h-3 mr-1" />
                Match: {project.matchScore} pts
              </Badge>
            )}
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {project.startDate}
            </span>
          </div>
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {project.title}
        </CardTitle>
        <p className="text-sm font-semibold text-primary/95 mt-1 font-heading">
          {project.companyName || tCommon('unknownCompany')}
        </p>
      </CardHeader>

      <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-between gap-4">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {project.description}
        </p>

        {/* Tech tags */}
        <div className="flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <Badge
              key={tech}
              variant="secondary"
              className="text-xs font-medium bg-secondary/5 text-secondary-foreground border border-border/60"
            >
              {tech}
            </Badge>
          ))}
        </div>

        {/* Metadatos */}
        <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4 mt-2">
          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Clock className="w-4 h-4 text-primary/80 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                {tCommon('duration')}
              </p>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {project.durationDays === null
                  ? tCommon('durationNotSet')
                  : tCommon('durationInDays', { days: project.durationDays })}
              </p>
            </div>
          </div>

          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <DollarSign className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                {tCommon('budget')}
              </p>
              <p className="font-bold text-foreground truncate mt-0.5">
                {budgetLabel ?? `$${project.budget} USD`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 border-t border-border/40 bg-muted/10 flex justify-between items-center gap-4">
        {actionButton ? (
          actionButton
        ) : (
          <Link
            href={`/egresado/projects/${project.id}`}
            className="inline-flex items-center justify-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors group/link w-full py-2"
          >
            {tCommon('viewDetails')}
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover/link:translate-x-1" />
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
