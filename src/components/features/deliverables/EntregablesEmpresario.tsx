'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Package,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import {
  getSignedUrlEntregable,
  type ComentarioEntregable,
  type EntregableEmpresario,
  type ContratacionParaCalificacion,
} from '@/lib/deliverables/queries'
import { responderEntregable } from '@/lib/deliverables/actions'
import { EmpresarioRatingCard } from '@/components/features/evaluaciones/EmpresarioRatingCard'
import { ReportButton } from '@/components/features/moderation/ReportButton'
import type { Result } from '@/lib/result'

const ESTADO_STYLE: Record<string, string> = {
  enviado: 'bg-warning/10 text-warning border-warning/20',
  en_revision: 'bg-primary/10 text-primary border-primary/20',
  aprobado: 'bg-accent/10 text-accent border-accent/20',
  con_cambios: 'bg-destructive/10 text-destructive border-destructive/20',
}

const PERIODO_STYLE: Record<string, string> = {
  vigente: 'text-accent border-accent/40 bg-accent/10',
  pausado: 'text-warning border-warning/40 bg-warning/10',
  finalizado: 'text-primary border-primary/40 bg-primary/10',
  cancelado: 'text-magenta border-magenta/40 bg-magenta/10',
}

const PERIODO_LABEL_KEY: Record<string, string> = {
  vigente: 'periodoVigente',
  pausado: 'periodoPausado',
  finalizado: 'periodoFinalizado',
  cancelado: 'periodoCancelado',
}

function ComentariosList({
  comentarios,
  t,
}: {
  comentarios: ComentarioEntregable[]
  t: ReturnType<typeof useTranslations<'ProjectDetail'>>
}) {
  if (comentarios.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {t('sinComentarios')}
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {comentarios.map((c) => (
        <li
          key={c.id_comentario_entregable}
          className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 space-y-1"
        >
          <p className="text-[10px] text-muted-foreground">
            {c.comentado_at.slice(0, 10)}
          </p>
          {c.contenido && (
            <p className="text-sm text-foreground leading-snug">
              {c.contenido}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

interface EntregablesEmpresarioProps {
  entregablesResult: Result<EntregableEmpresario[]>
  contratacionData?: ContratacionParaCalificacion | null
  existingRating?: { puntuacion: number; comentario: string | null } | null
}

export function EntregablesEmpresario({
  entregablesResult,
  contratacionData,
  existingRating,
}: EntregablesEmpresarioProps) {
  const t = useTranslations('ProjectDetail')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [pendingDecision, setPendingDecision] = useState<{
    id: string
    tipo: 'aprobado' | 'con_cambios'
  } | null>(null)
  const [pendingComment, setPendingComment] = useState('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const handleDownload = async (idEntregable: string) => {
    setDownloadingId(idEntregable)
    const res = await getSignedUrlEntregable(idEntregable)
    setDownloadingId(null)
    if (res.ok) {
      const a = document.createElement('a')
      a.href = res.data.url
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }
    toast.error(t('downloadError'))
  }

  const handleConfirmDecision = async () => {
    if (!pendingDecision) return
    const { id, tipo } = pendingDecision
    setSubmittingId(id)
    const comentario =
      pendingComment.trim() ||
      (tipo === 'con_cambios' ? t('cambiosDefaultComment') : undefined)
    const res = await responderEntregable({
      idEntregable: id,
      decision: tipo,
      ...(comentario ? { comentario } : {}),
    })
    setSubmittingId(null)
    if (res.ok) {
      toast.success(
        res.data.finalizado ? t('finalizarSuccess') : t('responderSuccess'),
      )
      setPendingDecision(null)
      setPendingComment('')
      router.refresh()
      return
    }
    toast.error(t('responderError'))
  }

  const isAprobando = pendingDecision?.tipo === 'aprobado'
  const isSubmitting = submittingId === pendingDecision?.id
  const isFinalizado = contratacionData?.estado_periodo === 'finalizado'
  const entregables = entregablesResult.ok ? entregablesResult.data : []

  const periodoKey = contratacionData
    ? PERIODO_LABEL_KEY[contratacionData.estado_periodo]
    : null
  const periodoStyle = contratacionData
    ? (PERIODO_STYLE[contratacionData.estado_periodo] ??
      'text-muted-foreground border-border bg-muted/20')
    : null

  return (
    <>
      {isFinalizado && contratacionData && (
        <EmpresarioRatingCard
          idEstudiante={contratacionData.id_estudiante}
          idContratacion={contratacionData.id_contratacion}
          existingRating={existingRating ?? null}
        />
      )}

      {contratacionData && (
        <div className="rounded-xl border border-border/60 bg-card/30 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {periodoKey && periodoStyle && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${periodoStyle}`}
              >
                {t(periodoKey as Parameters<typeof t>[0])}
              </span>
            )}
            {contratacionData.fecha_inicio && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-medium">{t('contratacionInicio')}:</span>
                <span className="font-semibold text-foreground">
                  {contratacionData.fecha_inicio.slice(0, 10)}
                </span>
              </span>
            )}
            {contratacionData.fecha_fin_estimada && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span className="font-medium">
                  {t('contratacionFinEstimada')}:
                </span>
                <span className="font-semibold text-foreground">
                  {contratacionData.fecha_fin_estimada.slice(0, 10)}
                </span>
              </span>
            )}
            {contratacionData.url_repositorio_proyecto && (
              <a
                href={contratacionData.url_repositorio_proyecto}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] max-w-[280px]"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {contratacionData.url_repositorio_proyecto}
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      {!entregablesResult.ok ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-foreground">
          {t('entregablesLoadError')}
        </div>
      ) : entregables.length === 0 ? (
        <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
          <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
          {t('noEntregables')}
        </div>
      ) : (
        <div className="space-y-4">
          {entregables.map((e) => (
            <Card
              key={e.id_entregable}
              className="border border-border/80 bg-card/40"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">
                      {t(`tipoEntregable_${e.tipo_entregable}`)}
                      {' — '}
                      {t('versionLabel', { n: e.version })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('uploadedAtLabel')}: {e.cargado_at.slice(0, 10)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        ESTADO_STYLE[e.estado] ??
                          'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {t(`estadoEntregable_${e.estado}`)}
                    </span>

                    {e.archivo_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === e.id_entregable}
                        onClick={() => void handleDownload(e.id_entregable)}
                        className="font-semibold h-7 text-xs gap-1"
                      >
                        {downloadingId === e.id_entregable ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {downloadingId === e.id_entregable
                          ? t('downloading')
                          : t('downloadBtn')}
                      </Button>
                    )}
                    <ReportButton
                      target={{ tipo: 'entregable', id: e.id_entregable }}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t('comentariosLabel')}
                  </p>
                  <ComentariosList comentarios={e.comentarios} t={t} />
                </div>

                {(e.estado === 'enviado' || e.estado === 'en_revision') && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                    <Button
                      type="button"
                      size="sm"
                      variant="accent"
                      disabled={submittingId === e.id_entregable}
                      onClick={() => {
                        setPendingDecision({
                          id: e.id_entregable,
                          tipo: 'aprobado',
                        })
                        setPendingComment('')
                      }}
                      className="font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('aprobarBtn')}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="warning"
                      disabled={submittingId === e.id_entregable}
                      onClick={() => {
                        setPendingDecision({
                          id: e.id_entregable,
                          tipo: 'con_cambios',
                        })
                        setPendingComment('')
                      }}
                      className="font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('solicitarCambiosBtn')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setPendingDecision(null)
            setPendingComment('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAprobando ? t('aprobarDialogTitle') : t('cambiosDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {isAprobando ? t('aprobarDialogDesc') : t('cambiosDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          {isAprobando && (
            <Textarea
              value={pendingComment}
              onChange={(ev) => setPendingComment(ev.target.value)}
              placeholder={t('aprobarCommentPlaceholder')}
              rows={3}
              disabled={isSubmitting}
              className="bg-card/50 border-border text-sm resize-none"
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                setPendingDecision(null)
                setPendingComment('')
              }}
              className="font-semibold"
            >
              {tCommon('cancel')}
            </Button>

            <Button
              type="button"
              size="sm"
              variant={isAprobando ? 'accent' : 'warning'}
              disabled={isSubmitting}
              onClick={() => void handleConfirmDecision()}
              className="font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {tCommon('loading')}
                </span>
              ) : isAprobando ? (
                t('aprobarConfirmBtn')
              ) : (
                t('cambiosConfirmBtn')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
