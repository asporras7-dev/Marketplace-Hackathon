'use client'

import { Calendar, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import type { EstadoParticipacion } from '@/lib/projects/project-detail-logic'

export interface PostulacionPropia {
  id_participacion: string
  id_proyecto: string
  projectTitle: string
  companyName: string
  carta_postulacion: string | null
  planteamiento_solucion?: string | null
  prototipo_enlaces?: string[] | null
  documentacion_tecnica?: string | null
  /** Estado real almacenado en la BD. */
  estado: EstadoParticipacion
  /** Estado EFECTIVO de cara al estudiante (RF-32): si el proyecto ya se cerró,
   *  una oferta viva se ve `no_seleccionada`/`cancelada` aunque la columna siga
   *  en `enviada`. Es lo que se PINTA; ver `computeEstadoParticipacionEfectivo`. */
  estadoEfectivo: EstadoParticipacion
  fecha_postulacion: string
}

const ESTADO_STYLE: Record<EstadoParticipacion, string> = {
  enviada: 'bg-primary/10 text-primary border-primary/20',
  en_revision: 'bg-warning/10 text-warning border-warning/20',
  contratada: 'bg-accent/10 text-accent border-accent/20',
  no_seleccionada: 'bg-magenta/10 text-magenta border-magenta/20',
  retirada: 'bg-muted text-muted-foreground border-border',
  finalizada: 'bg-secondary/10 text-secondary border-secondary/20',
  cancelada: 'bg-magenta/10 text-magenta border-magenta/20',
}

const RETIRABLE: EstadoParticipacion[] = ['enviada', 'en_revision']

interface PostulacionCardProps {
  postulacion: PostulacionPropia
  onWithdraw?: () => void
}

export function PostulacionCard({
  postulacion,
  onWithdraw,
}: PostulacionCardProps) {
  const tEgresado = useTranslations('Egresado')
  const tDetail = useTranslations('ProjectDetail')

  const canWithdraw = RETIRABLE.includes(postulacion.estadoEfectivo)

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm hover:shadow-sm transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)]">
      <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {postulacion.projectTitle}
            </h3>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                ESTADO_STYLE[postulacion.estadoEfectivo],
              )}
            >
              {tDetail(`pstatus_${postulacion.estadoEfectivo}`)}
            </span>
          </div>
          <p className="text-sm font-semibold text-primary font-heading">
            {postulacion.companyName}
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mt-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(postulacion.fecha_postulacion).toLocaleDateString()}
        </span>
      </CardHeader>

      {(postulacion.carta_postulacion ||
        postulacion.planteamiento_solucion) && (
        <CardContent className="p-6 pt-0 space-y-4">
          {postulacion.carta_postulacion && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Carta de Presentación
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line italic">
                &quot;{postulacion.carta_postulacion}&quot;
              </p>
            </div>
          )}
          {postulacion.planteamiento_solucion && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Propuesta de solución
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {postulacion.planteamiento_solucion}
              </p>
            </div>
          )}
          {(postulacion.documentacion_tecnica ||
            (postulacion.prototipo_enlaces &&
              postulacion.prototipo_enlaces.length > 0)) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {postulacion.documentacion_tecnica && (
                <a
                  href={postulacion.documentacion_tecnica}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-warning/10 text-warning border border-warning/20 rounded-full hover:bg-warning/20 transition-colors"
                >
                  Ver Documentación Técnica
                </a>
              )}
              {postulacion.prototipo_enlaces &&
                postulacion.prototipo_enlaces.map((enlace, idx) => {
                  const isPrototipo = idx === 0
                  return (
                    <a
                      key={idx}
                      href={enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-full transition-colors',
                        isPrototipo
                          ? 'bg-magenta/10 text-magenta border-magenta/20 hover:bg-magenta/20'
                          : 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20',
                      )}
                    >
                      {isPrototipo
                        ? 'Ver Prototipo'
                        : `Ver Enlace Adicional ${idx}`}
                    </a>
                  )
                })}
            </div>
          )}
        </CardContent>
      )}

      {canWithdraw && onWithdraw && (
        <CardFooter className="p-6 pt-4 border-t border-border/40 bg-muted/10 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onWithdraw}
            className="border-magenta/30 text-magenta hover:bg-magenta/10 hover:text-magenta flex items-center justify-center gap-1.5 px-4"
          >
            <X className="w-4 h-4" />
            {tEgresado('withdrawOffer')}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
