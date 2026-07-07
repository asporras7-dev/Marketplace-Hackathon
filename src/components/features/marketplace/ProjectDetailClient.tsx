'use client'

import { Link } from '@/i18n/routing'
import { Project } from '@/types'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle,
  FileText,
  Star,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ReportButton } from '@/components/features/moderation/ReportButton'

interface ProjectDetailClientProps {
  project: Project
  alreadyApplied: boolean
  studentCountry?: string | null
  studentRegion?: string | null
}

export function ProjectDetailClient({
  project,
  alreadyApplied,
  studentCountry,
  studentRegion,
}: ProjectDetailClientProps) {
  const tCommon = useTranslations('Common')
  const tEgresado = useTranslations('Egresado')
  const tAccount = useTranslations('Account')

  const { isPending } = useAccountStatus()

  const modeColors: Record<string, string> = {
    remoto: 'bg-accent/10 text-accent border-accent/20',
    hibrido: 'bg-warning/10 text-warning border-warning/20',
    presencial: 'bg-secondary/10 text-secondary border-secondary/20',
  }

  return (
    <div className="flex flex-col min-h-screen relative bg-fwd-page-gradient">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/egresado/projects"
            className="inline-flex items-center text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tEgresado('backToMarketplace')}
          </Link>
          <ReportButton target={{ tipo: 'proyecto', id: project.id }} />
        </div>

        <PageTitle
          title={project.title}
          description={`${tEgresado('company')}: ${project.companyName}`}
          dotColor="text-accent"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border border-border/80 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold tracking-tight text-foreground font-heading">
                    {tEgresado('projectDescription')}
                    <span className="text-accent">.</span>
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </div>
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <h3 className="text-lg font-bold tracking-tight text-foreground font-heading">
                    {tEgresado('requirementsStack')}
                    <span className="text-accent">.</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.stack.map((tech) => (
                      <Badge
                        key={tech}
                        variant="outline"
                        className="text-sm font-bold bg-primary/10 text-primary border-primary/20"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-primary" />
              <CardContent className="p-6 space-y-6 pt-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tEgresado('selectMode')}
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-1 rounded-full text-xs font-semibold ${modeColors[project.mode] ?? ''}`}
                      >
                        {tCommon(project.mode)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tCommon('duration')}
                      </p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {project.durationDays === null
                          ? tCommon('durationNotSet')
                          : tCommon('durationInDays', {
                              days: project.durationDays,
                            })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tCommon('budget')}
                      </p>
                      <p className="text-base font-extrabold text-accent mt-0.5">
                        ${project.budget} USD
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tEgresado('startDate')}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {project.startDate}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/60">
                  {alreadyApplied ? (
                    <Button
                      disabled
                      className="w-full bg-muted text-muted-foreground font-semibold h-11 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {tEgresado('alreadyApplied')}
                    </Button>
                  ) : isPending ? (
                    <Button
                      disabled
                      title={tAccount('actionDisabledPending')}
                      className="w-full bg-muted text-muted-foreground/50 font-semibold h-11 flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      {tEgresado('applyBtn')}
                    </Button>
                  ) : (
                    <Link
                      href={`/egresado/projects/${project.id}/apply`}
                      className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold h-11 flex items-center justify-center gap-2 rounded-md transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      {tEgresado('applyBtn')}
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Match Information Card */}
            {project.matchScore !== undefined && project.matchScore > 0 && (
              <Card className="border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden mt-6">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-magenta flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {tEgresado('matchWithProject') || 'Match con el Proyecto'}
                  </h3>

                  {project.matchDetalles &&
                    project.matchDetalles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
                          {tEgresado('matchingTechs') || 'Habilidades en común'}
                        </p>
                        <div className="flex flex-col gap-2">
                          {project.matchDetalles.map((det) => (
                            <div
                              key={det.id_tecnologia}
                              className="text-xs flex items-center justify-between border-b border-border/40 pb-1"
                            >
                              <span>
                                <span className="font-semibold text-highlight">
                                  {det.nombre_tecnologia || det.id_tecnologia}
                                </span>{' '}
                                (
                                <span className="text-primary uppercase text-[10px]">
                                  {det.nivel}
                                </span>
                                )
                              </span>
                              <span className="font-bold text-primary">
                                +{det.puntos} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {project.countryIso === studentCountry &&
                    studentCountry != null && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
                          {tEgresado('matchingLocation') ||
                            'Ubicación en común'}
                        </p>
                        <div className="text-xs flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>
                            {project.region === studentRegion &&
                            studentRegion != null
                              ? tEgresado('sameCountryAndRegion')
                              : tEgresado('sameCountry')}
                          </span>
                        </div>
                      </div>
                    )}

                  <div className="pt-3 border-t border-border/60 flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">
                      Puntaje Total
                    </span>
                    <span className="text-lg font-extrabold text-magenta">
                      {project.matchScore} pts
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
