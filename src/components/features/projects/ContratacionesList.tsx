'use client'

import React from 'react'
import {
  Star,
  Briefcase,
  Eye,
  FileText,
  FileCheck2,
  MapPin,
  Clock,
  ArrowRight,
  Calendar,
  ChevronDown,
  Check,
  BarChart3,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ParticipacionConProyecto } from '@/lib/projects/project-detail'

interface ContratacionesListProps {
  contrataciones: ParticipacionConProyecto[]
}

type FiltroEstado = 'all' | 'contratada' | 'finalizada'

function InitialsAvatar({
  nombre,
  apellidos,
}: {
  nombre: string
  apellidos: string
}) {
  const iniciales =
    `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase() || '?'
  return (
    <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-inner font-sans">
      {iniciales}
    </div>
  )
}

function ReputacionStars({ rating }: { rating: number | null }) {
  const t = useTranslations('EmpresaPerfil')
  if (rating === null) {
    return (
      <span className="text-xs text-muted-foreground">{t('noRatings')}</span>
    )
  }
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating
              ? 'text-highlight fill-highlight'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const t = useTranslations('EmpresaPerfil')
  const isActive = estado === 'contratada'
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
        isActive
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-accent/10 text-accent border-accent/20'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-primary' : 'bg-accent'
        }`}
      />
      {isActive ? t('estadoEnDesarrollo') : t('estadoFinalizado')}
    </span>
  )
}

export function ContratacionesList({
  contrataciones,
}: ContratacionesListProps) {
  const t = useTranslations('EmpresaPerfil')
  const [filtro, setFiltro] = React.useState<FiltroEstado>('all')
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null)
  const [selectedMotivacion, setSelectedMotivacion] =
    React.useState<ParticipacionConProyecto | null>(null)

  const tituloLabels: Record<string, string> = {
    frontend: t('tituloFrontend'),
    backend: t('tituloBackend'),
    fullstack: t('tituloFullstack'),
  }

  const filtros: { key: FiltroEstado; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'contratada', label: t('filterEnDesarrollo') },
    { key: 'finalizada', label: t('filterFinalizado') },
  ]

  const visibles =
    filtro === 'all'
      ? contrataciones
      : contrataciones.filter((c) => c.estado === filtro)

  if (contrataciones.length === 0) {
    return (
      <div className="p-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center bg-card/20 w-full">
        <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold text-foreground">
          {t('sinContrataciones')}
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          {t('sinContratacionesDesc')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Columna Izquierda: Filtros y Lista de Candidatos (2/3 de ancho) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filtros por estado y Decoración Reclutadores */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-surface border border-border px-5 py-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              {filtros.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFiltro(key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer ${
                    filtro === key
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Reclutadores decorativos para coincidir con la captura de pantalla */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary border-2 border-surface flex items-center justify-center text-[10px] font-bold shadow-sm">
                  JD
                </div>
                <div className="w-6 h-6 rounded-full bg-secondary/15 text-secondary border-2 border-surface flex items-center justify-center text-[10px] font-bold shadow-sm">
                  AS
                </div>
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent border-2 border-surface flex items-center justify-center text-[10px] font-bold shadow-sm">
                  ML
                </div>
              </div>
              <span className="text-[11px] text-ink-muted font-medium font-sans">
                3 reclutadores activos hay
              </span>
            </div>
          </div>

          {/* Lista de candidatos */}
          {visibles.length === 0 ? (
            <div className="p-10 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center bg-card/20">
              <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('sinResultadosFiltro')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibles.map((item) => (
                <Card
                  key={item.idParticipacion}
                  className="overflow-hidden border border-border bg-surface shadow-sm rounded-xl hover:shadow-md transition-all duration-[var(--duration-fast)]"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Header izquierdo: Foto/avatar + datos */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          {item.fotoPerfil ? (
                            <img
                              src={item.fotoPerfil}
                              alt={item.estudianteNombre}
                              className="w-14 h-14 rounded-xl object-cover border border-border/80 shadow-sm"
                            />
                          ) : (
                            <InitialsAvatar
                              nombre={item.estudianteNombre}
                              apellidos={item.estudianteApellidos}
                            />
                          )}
                          {/* Blue checkmark/star badge at bottom-right of avatar to match screenshot */}
                          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-surface shadow-sm flex items-center justify-center animate-fade-in">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-[17px] text-ink-strong leading-tight">
                            {item.estudianteNombre} {item.estudianteApellidos}
                          </h4>
                          <p className="text-primary text-xs font-bold uppercase tracking-wider mt-1.5 font-sans">
                            {tituloLabels[item.tituloFwd ?? ''] ??
                              t('tituloEgresado')}
                          </p>
                          {/* Truncated cover letter as description/bio */}
                          {item.cartaPostulacion && (
                            <p className="text-sm text-ink leading-relaxed mt-2.5 line-clamp-2 font-sans">
                              {item.cartaPostulacion}
                            </p>
                          )}

                          {/* Location, clock metadata */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-ink-muted font-sans flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                              <span>Costa Rica (Remoto)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-ink-muted" />
                              <span>
                                {t('postuloEl')}{' '}
                                {new Date(
                                  item.fechaPostulacion,
                                ).toLocaleDateString()}
                              </span>
                            </span>
                            {item.reputacion !== null && (
                              <span className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-highlight fill-highlight" />
                                <span className="font-semibold text-ink-strong">
                                  {item.reputacion.toFixed(1)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header derecho: EstadoBadge + Ver Perfil link */}
                      <div className="flex flex-col items-start md:items-end gap-6 shrink-0 justify-between self-stretch">
                        <EstadoBadge estado={item.estado} />
                        <Link
                          href={`/empresario/portafolio-egresado/${item.idParticipacion}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-auto group transition-colors duration-[var(--duration-fast)]"
                        >
                          <span>{t('viewProfile')}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Proyecto */}
                    <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 border border-border/40">
                      <Briefcase className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-0.5 font-sans">
                          {t('contratadoPara')}
                        </span>
                        <span className="text-sm font-semibold text-ink-strong truncate block font-sans">
                          {item.proyecto.titulo}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTitle(item.proyecto.titulo)}
                        className="shrink-0 text-ink-muted hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus:outline-none cursor-pointer"
                        title={t('verTituloCompleto')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Footer: acciones secundarias */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMotivacion(item)}
                        className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {t('verMotivacion')}
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="default"
                        className="h-8 text-xs font-semibold gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground ml-auto cursor-pointer"
                      >
                        <Link
                          href={`/empresario/proyecto/${item.proyecto.id}/entregables`}
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          {t('viewEntregables')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Sidebar con widgets (1/3 de ancho) */}
        <div className="space-y-6">
          {/* Card: Métricas de Talento */}
          <Card className="border border-border bg-surface shadow-sm rounded-xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="font-heading text-lg font-bold text-ink-strong">
                  Métricas de Talento
                </h3>
                <BarChart3 className="w-5 h-5 text-ink-muted" />
              </div>

              {/* Circular Donut Progress Chart */}
              <div className="flex justify-center py-2">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="56"
                      stroke="var(--border)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="56"
                      stroke="var(--primary)"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray="351.8"
                      strokeDashoffset={351.8 * (1 - 0.78)}
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-out animate-fade-in"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="block text-3xl font-extrabold text-ink-strong font-sans">
                      78%
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted mt-0.5 font-sans">
                      Eficiencia
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-strong font-sans">
                    <span>TASA DE ACEPTACIÓN</span>
                    <span className="font-bold">92%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: '92%' }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-strong font-sans">
                    <span>TIEMPO DE CIERRE</span>
                    <span className="font-bold">14 días</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink rounded-full"
                      style={{ width: '45%' }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Próximos Pasos */}
          <Card className="border border-border bg-surface shadow-sm rounded-xl">
            <CardContent className="p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-sans">
                Próximos Pasos
              </h4>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 animate-fade-in">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-semibold text-sm text-ink-strong truncate">
                      Feedback de Elena
                    </h5>
                    <p className="text-xs text-ink-muted mt-0.5 font-sans">
                      Hoy, 18:30
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-accent/10 text-accent shrink-0 animate-fade-in">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-semibold text-sm text-ink-strong truncate">
                      Revisión Portafolio Marina
                    </h5>
                    <p className="text-xs text-ink-muted mt-0.5 font-sans">
                      Mañana, 09:00
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog: título completo */}
      <Dialog
        open={selectedTitle !== null}
        onOpenChange={(open) => !open && setSelectedTitle(null)}
      >
        <DialogContent className="sm:max-w-[425px] border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {t('tituloProyectoLabel')}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 text-sm font-medium text-foreground leading-relaxed break-words">
            {selectedTitle}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: motivación */}
      <Dialog
        open={selectedMotivacion !== null}
        onOpenChange={(open) => !open && setSelectedMotivacion(null)}
      >
        <DialogContent className="sm:max-w-[600px] border-border max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0 pb-4 border-b border-border/50">
            <DialogTitle className="font-heading text-xl">
              {t('motivacionYSolucion')}
            </DialogTitle>
            {selectedMotivacion && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('postulacionDe', {
                  nombre: selectedMotivacion.estudianteNombre,
                })}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            {selectedMotivacion?.cartaPostulacion ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider text-primary">
                  {t('cartaPresentacion')}
                </h4>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-xl border border-border/40">
                  {selectedMotivacion.cartaPostulacion}
                </div>
              </div>
            ) : null}
            {selectedMotivacion?.planteamientoSolucion ? (
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider text-accent">
                  {t('planteamientoSolucionLabel')}
                </h4>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-accent/5 p-4 rounded-xl border border-accent/10">
                  {selectedMotivacion.planteamientoSolucion}
                </div>
              </div>
            ) : null}
            {!selectedMotivacion?.cartaPostulacion &&
              !selectedMotivacion?.planteamientoSolucion && (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>{t('sinMotivacion')}</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
