'use client'

import React, { useState } from 'react'
import {
  Calendar,
  X,
  Calculator,
  DollarSign,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import type { EstadoParticipacion } from '@/lib/projects/project-detail-logic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { type CotizacionConProyecto } from '@/lib/cotizaciones/queries'

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
  monto_propuesto?: number | null
  id_cotizacion?: string | null
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
  const [viewingCotizacion, setViewingCotizacion] =
    useState<CotizacionConProyecto | null>(null)
  const [isFetchingCotizacion, setIsFetchingCotizacion] = useState(false)

  const handleViewQuotation = async (idCotizacion: string) => {
    setIsFetchingCotizacion(true)
    try {
      const { getCotizacionById } = await import('@/lib/cotizaciones/queries')
      const res = await getCotizacionById(idCotizacion)
      if (res.ok) {
        setViewingCotizacion(res.data)
      } else {
        toast.error('No se pudo cargar el desglose de la cotización')
      }
    } catch {
      toast.error('Error al cargar la cotización')
    } finally {
      setIsFetchingCotizacion(false)
    }
  }

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
          {postulacion.monto_propuesto && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Monto Propuesto
                </p>
                <div className="text-sm font-extrabold text-foreground">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  }).format(postulacion.monto_propuesto)}{' '}
                  USD
                  <span className="text-xs font-bold text-primary/80 ml-2">
                    (≈{' '}
                    {new Intl.NumberFormat('es-CR', {
                      style: 'currency',
                      currency: 'CRC',
                      maximumFractionDigits: 0,
                    }).format(postulacion.monto_propuesto * 515)}{' '}
                    CRC)
                  </span>
                </div>
              </div>
              {postulacion.id_cotizacion && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleViewQuotation(postulacion.id_cotizacion!)
                  }
                  disabled={isFetchingCotizacion}
                  className="border-primary/20 text-primary hover:bg-primary/10 text-xs font-bold py-1 px-3 h-8"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Ver Desglose de Cotización
                </Button>
              )}
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

      <Dialog
        open={viewingCotizacion !== null}
        onOpenChange={(open) => !open && setViewingCotizacion(null)}
      >
        <DialogContent className="sm:max-w-lg border border-border bg-card/95 backdrop-blur-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-primary flex items-center gap-1.5">
              <Calculator className="w-5 h-5" />
              Detalle de Cotización
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-muted">
              {viewingCotizacion?.nombre_cotizacion}
            </DialogDescription>
          </DialogHeader>

          {viewingCotizacion && (
            <div className="space-y-4 py-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 border border-border/40 p-3 rounded-xl space-y-1">
                  <div className="text-ink-muted text-[10px] uppercase">
                    Tiempo y Esfuerzo
                  </div>
                  <div className="text-foreground text-sm font-extrabold">
                    {viewingCotizacion.horas_estimadas} Horas
                  </div>
                  <div className="text-ink-muted text-[10px]">
                    ({viewingCotizacion.duracion_semanas} Semanas)
                  </div>
                </div>

                <div className="bg-background/50 border border-border/40 p-3 rounded-xl space-y-1">
                  <div className="text-ink-muted text-[10px] uppercase">
                    Tarifa y Complejidad
                  </div>
                  <div className="text-foreground text-sm font-extrabold">
                    {viewingCotizacion.tarifa_base_hora} USD / hr
                  </div>
                  <div className="text-ink-muted text-[10px]">
                    Complejidad: {viewingCotizacion.complejidad.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 border border-border/40 p-3 rounded-xl space-y-1">
                  <div className="text-ink-muted text-[10px] uppercase">
                    Modalidad de Trabajo
                  </div>
                  <div className="text-foreground text-sm font-bold">
                    {viewingCotizacion.modalidad.toUpperCase()}
                  </div>
                </div>

                <div className="bg-background/50 border border-border/40 p-3 rounded-xl space-y-1">
                  <div className="text-ink-muted text-[10px] uppercase">
                    Impuestos (IVA)
                  </div>
                  <div className="text-foreground text-sm font-bold">
                    {viewingCotizacion.incluye_iva
                      ? '13% Incluido'
                      : 'No incluido'}
                  </div>
                </div>
              </div>

              {viewingCotizacion.stack &&
                viewingCotizacion.stack.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-ink-muted text-[10px] uppercase">
                      Stack Técnico
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {viewingCotizacion.stack.map((s: string, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="bg-primary/5 border-primary/20 text-foreground py-0.5 px-2 text-[10px] rounded-full"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {viewingCotizacion.funcionalidades &&
                viewingCotizacion.funcionalidades.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-ink-muted text-[10px] uppercase">
                      Funcionalidades Principales
                    </div>
                    <ul className="space-y-1">
                      {viewingCotizacion.funcionalidades.map(
                        (f: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-center gap-1.5 p-2 rounded-lg bg-background/30 border border-border/20 text-[11px] text-foreground"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                            {f}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

              <div className="border-t border-border pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subtotal:</span>
                  <span>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(viewingCotizacion.subtotal_usd)}{' '}
                    USD
                  </span>
                </div>
                {viewingCotizacion.incluye_iva && (
                  <div className="flex justify-between text-magenta">
                    <span>IVA (13%):</span>
                    <span>
                      +
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(viewingCotizacion.iva_usd)}{' '}
                      USD
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed pt-2 font-extrabold text-sm text-foreground">
                  <span>Total Cotizado:</span>
                  <div className="text-right">
                    <div>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(viewingCotizacion.total_usd)}{' '}
                      USD
                    </div>
                    <div className="text-xs text-primary/80 font-bold">
                      ≈{' '}
                      {new Intl.NumberFormat('es-CR', {
                        style: 'currency',
                        currency: 'CRC',
                        maximumFractionDigits: 0,
                      }).format(viewingCotizacion.total_crc)}{' '}
                      CRC
                    </div>
                  </div>
                </div>
              </div>

              {viewingCotizacion.explicacion_ia && (
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl space-y-1.5 mt-2">
                  <div className="text-accent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Justificación IA
                  </div>
                  <p className="text-[11px] text-ink leading-relaxed whitespace-pre-line italic">
                    {viewingCotizacion.explicacion_ia}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button type="button" onClick={() => setViewingCotizacion(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
