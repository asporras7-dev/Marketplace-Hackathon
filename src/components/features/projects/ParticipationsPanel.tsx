'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { type CotizacionConProyecto } from '@/lib/cotizaciones/queries'
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  Lightbulb,
  ListFilter,
  Lock,
  Mail,
  MessageSquare,
  MoreVertical,
  Star,
  Users,
  XCircle,
  Calculator,
  Sparkles,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link, useRouter } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { cn } from '@/lib/utils/cn'
import {
  adjudicarParticipacion,
  calificarParticipacion,
  setParticipacionEstado,
} from '@/lib/projects/project-detail'
import type { ParticipacionEmpresario } from '@/lib/projects/project-detail'
import { getSignedUrlDocumentacionTecnica } from '@/lib/applications/actions'
import type { Result } from '@/lib/result'
import {
  canOpenParticipacion,
  compareParticipacionesBy,
  getParticipacionActions,
  isParticipacionEnPanel,
  isParticipacionSealed,
  matchesPanelSeleccion,
  type EstadoEfectivoProyecto,
  type EstadoParticipacion,
  type PanelFilterConfig,
  type PanelSortKey,
  type ParticipacionAction,
  type SortDirection,
} from '@/lib/projects/project-detail-logic'

/**
 * Item del panel. `proyecto` es opcional: la página de detalle no lo pasa (ya
 * estás dentro del proyecto); la vista cross-project de `/postulaciones` sí, y
 * la tarjeta muestra un chip que enlaza al proyecto.
 */
export type ParticipacionPanelItem = ParticipacionEmpresario & {
  proyecto?: { id: string; titulo: string }
}

interface ParticipationsPanelProps {
  result: Result<ParticipacionPanelItem[]>
  /** Config de filtro/orden según la vista: define qué estados se muestran como
   *  chips y como universo, y qué criterios de orden ofrece. */
  filterConfig: PanelFilterConfig
  /** ID del proyecto en la vista de detalle. En la vista cross-project cada
   *  item trae `participacion.proyecto.id`. */
  projectId?: string
  /** Estado efectivo del proyecto en la vista de detalle: decide si los sobres
   *  sellados todavía se pueden abrir. Ausente en la vista cross-project. */
  projectEstado?: EstadoEfectivoProyecto
}

const ESTADO_STYLE: Record<EstadoParticipacion, string> = {
  enviada: 'bg-accent/10 text-accent border-accent/20',
  en_revision: 'bg-muted text-muted-foreground border-border',
  contratada: 'bg-accent/10 text-accent border-accent/20',
  no_seleccionada: 'bg-magenta/10 text-magenta border-magenta/20',
  retirada: 'bg-muted text-muted-foreground border-border',
  finalizada: 'bg-secondary/10 text-secondary border-secondary/20',
  cancelada: 'bg-magenta/10 text-magenta border-magenta/20',
}

interface ConfirmState {
  accion: Extract<ParticipacionAction, 'contratar' | 'rechazar'>
  participacion: ParticipacionPanelItem
}

export function ParticipationsPanel({
  result,
  filterConfig,
  projectId,
  projectEstado,
}: ParticipationsPanelProps) {
  const t = useTranslations('ProjectDetail')
  const tCommon = useTranslations('Common')
  const tAccount = useTranslations('Account')
  const router = useRouter()
  const { isPending } = useAccountStatus()

  const [seleccion, setSeleccion] = useState<Set<EstadoParticipacion>>(
    () => new Set(),
  )
  const [sortKey, setSortKey] = useState<PanelSortKey>(
    () => filterConfig.sorts[0] ?? 'fecha_postulacion',
  )
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [openTarget, setOpenTarget] = useState<ParticipacionPanelItem | null>(
    null,
  )
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [ratingMutatingId, setRatingMutatingId] = useState<string | null>(null)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const [viewingCotizacion, setViewingCotizacion] =
    useState<CotizacionConProyecto | null>(null)

  const handleViewQuotation = async (idCotizacion: string) => {
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
    }
  }

  // Sin estado de proyecto (vista cross-project) dejamos abrir: ahí no hay
  // ciclo de vida de proyecto a la mano.
  const puedeAbrir =
    projectEstado === undefined ? true : canOpenParticipacion(projectEstado)

  const participaciones = useMemo(
    () => (result.ok ? result.data : []),
    [result],
  )

  const universo = useMemo(
    () =>
      participaciones.filter((p) =>
        isParticipacionEnPanel(p.estado, filterConfig),
      ),
    [participaciones, filterConfig],
  )

  const conteoPorEstado = useMemo(() => {
    const conteo = new Map<EstadoParticipacion, number>()
    for (const participacion of universo) {
      conteo.set(
        participacion.estado,
        (conteo.get(participacion.estado) ?? 0) + 1,
      )
    }
    return conteo
  }, [universo])

  const visibles = useMemo(
    () =>
      universo
        .filter((p) => matchesPanelSeleccion(p.estado, seleccion))
        .sort((a, b) => compareParticipacionesBy(a, b, sortKey, sortDir)),
    [universo, seleccion, sortKey, sortDir],
  )

  const runAction = async (
    participacion: ParticipacionPanelItem,
    accion: ParticipacionAction,
  ) => {
    setMutatingId(participacion.idParticipacion)
    setConfirm(null)

    if (accion === 'contratar') {
      const idProyecto = participacion.proyecto?.id ?? projectId
      if (!idProyecto) {
        setMutatingId(null)
        toast.error(t('errors.generic'))
        return
      }
      const res = await adjudicarParticipacion({
        idParticipacion: participacion.idParticipacion,
        idProyecto,
      })
      setMutatingId(null)
      if (res.ok) {
        toast.success(t('adjudicarSuccess'))
        router.refresh()
        return
      }
      toast.error(
        res.error === 'transicion_invalida'
          ? t('errors.transicion_invalida')
          : t('errors.adjudicacion_fallida'),
      )
      return
    }

    const res = await setParticipacionEstado({
      idParticipacion: participacion.idParticipacion,
      accion,
    })
    setMutatingId(null)
    if (res.ok) {
      toast.success(t('participationUpdateSuccess'))
      router.refresh()
      return
    }
    toast.error(
      res.error === 'transicion_invalida'
        ? t('errors.transicion_invalida')
        : t('errors.generic'),
    )
  }

  const runOpen = async (participacion: ParticipacionPanelItem) => {
    setMutatingId(participacion.idParticipacion)
    setOpenTarget(null)
    const res = await setParticipacionEstado({
      idParticipacion: participacion.idParticipacion,
      accion: 'revisar',
    })
    setMutatingId(null)
    if (res.ok) {
      toast.success(t('openSuccess'))
      router.refresh()
      return
    }
    // Carrera: si ya quedó abierta por otra pestaña, sincronizamos sin error.
    if (res.error === 'transicion_invalida') {
      router.refresh()
      return
    }
    toast.error(t('errors.generic'))
  }

  const runRate = async (
    participacion: ParticipacionPanelItem,
    calificacion: number,
    comentario: string | undefined,
  ) => {
    setRatingMutatingId(participacion.idParticipacion)
    const res = await calificarParticipacion({
      idParticipacion: participacion.idParticipacion,
      calificacion,
      ...(comentario !== undefined ? { comentario } : {}),
    })
    setRatingMutatingId(null)
    if (res.ok) {
      toast.success(t('ratingSuccess'))
      router.refresh()
      return
    }
    toast.error(t('errors.calificacion_fallida'))
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-foreground">
        {t('participationsLoadError')}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <EstadoFilter
          config={filterConfig}
          seleccion={seleccion}
          conteoPorEstado={conteoPorEstado}
          onToggle={(estado) =>
            setSeleccion((prev) => {
              const next = new Set(prev)
              if (next.has(estado)) {
                next.delete(estado)
              } else {
                next.add(estado)
              }
              return next
            })
          }
          onClear={() => setSeleccion(new Set())}
        />
        <SortControl
          config={filterConfig}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortKeyChange={setSortKey}
          onToggleDir={() =>
            setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
          }
        />
      </div>

      {universo.length === 0 ? (
        <EmptyState message={t('participationsEmpty')} />
      ) : visibles.length === 0 ? (
        <EmptyState message={t('noParticipationsInFilter')} />
      ) : (
        <div className="space-y-4">
          {visibles.map((participacion) => (
            <ParticipationCard
              key={participacion.idParticipacion}
              participacion={participacion}
              {...(projectId !== undefined ? { projectId } : {})}
              isMutating={mutatingId === participacion.idParticipacion}
              isRatingMutating={
                ratingMutatingId === participacion.idParticipacion
              }
              isPending={isPending}
              pendingTitle={tAccount('actionDisabledPending')}
              canOpen={puedeAbrir}
              onOpen={() => setOpenTarget(participacion)}
              onContratar={() =>
                setConfirm({ accion: 'contratar', participacion })
              }
              onRechazar={() =>
                setConfirm({ accion: 'rechazar', participacion })
              }
              onRate={(calificacion, comentario) =>
                runRate(participacion, calificacion, comentario)
              }
              onOpenIframe={setIframeUrl}
              onViewQuotation={handleViewQuotation}
            />
          ))}
        </div>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-md border border-border">
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading">
                  {confirm.accion === 'contratar'
                    ? t('confirmContratarTitle', {
                        name: confirm.participacion.estudianteNombre,
                      })
                    : t('confirmRechazarTitle', {
                        name: confirm.participacion.estudianteNombre,
                      })}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {confirm.accion === 'contratar' ? (
                    <div className="space-y-2">
                      <p>{t('confirmContratarDesc')}</p>
                      {confirm.participacion.montoPropuesto && (
                        <p className="font-semibold text-foreground p-3 rounded-xl bg-primary/5 border border-primary/20">
                          Monto Acordado del Contrato:{' '}
                          <span className="font-extrabold text-primary">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }).format(
                              confirm.participacion.montoPropuesto,
                            )}{' '}
                            USD
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    t('confirmRechazarDesc')
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirm(null)}
                  disabled={mutatingId !== null}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant={
                    confirm.accion === 'contratar' ? 'accent' : 'magenta'
                  }
                  onClick={() =>
                    void runAction(confirm.participacion, confirm.accion)
                  }
                  disabled={mutatingId !== null}
                  className="font-semibold"
                >
                  {confirm.accion === 'contratar'
                    ? t('actionContratar')
                    : t('actionRechazar')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openTarget !== null}
        onOpenChange={(open) => !open && setOpenTarget(null)}
      >
        <DialogContent className="sm:max-w-md border border-border">
          {openTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading">
                  {t('openConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t('openConfirmDesc', {
                    name: openTarget.estudianteNombre,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenTarget(null)}
                  disabled={mutatingId !== null}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="warning"
                  onClick={() => void runOpen(openTarget)}
                  disabled={mutatingId !== null}
                  className="font-semibold"
                >
                  <Mail className="w-4 h-4" />
                  {t('openConfirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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

      <Dialog
        open={iframeUrl !== null}
        onOpenChange={(open) => !open && setIframeUrl(null)}
      >
        <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden border border-border">
          <DialogHeader className="p-4 border-b border-border/40 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-bold font-heading truncate pr-4">
              {t('iframePreviewTitle')}
            </DialogTitle>
            {iframeUrl && (
              <a
                href={iframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-magenta hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('iframeOpenNewTab')}
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 w-full bg-background relative">
            {iframeUrl && (
              <iframe
                src={iframeUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ParticipationCardProps {
  participacion: ParticipacionPanelItem
  projectId?: string
  isMutating: boolean
  isRatingMutating: boolean
  isPending: boolean
  pendingTitle: string
  canOpen: boolean
  onOpen: () => void
  onContratar: () => void
  onRechazar: () => void
  onRate: (
    calificacion: number,
    comentario: string | undefined,
  ) => Promise<void>
  onOpenIframe: (url: string) => void
  onViewQuotation: (id: string) => void
}

function ParticipationCard({
  participacion,
  projectId,
  isMutating,
  isRatingMutating,
  isPending,
  pendingTitle,
  canOpen,
  onOpen,
  onContratar,
  onRechazar,
  onRate,
  onOpenIframe,
  onViewQuotation,
}: ParticipationCardProps) {
  const t = useTranslations('ProjectDetail')
  const sealed = isParticipacionSealed(participacion.estado)
  const acciones = getParticipacionActions(participacion.estado)
  const nombreCompleto =
    `${participacion.estudianteNombre} ${participacion.estudianteApellidos}`.trim()
  const effectiveProjectId = participacion.proyecto?.id ?? projectId

  return (
    <Card className="border border-border bg-surface shadow-sm rounded-xl">
      <CardContent className="p-6 space-y-5">
        {participacion.proyecto && (
          <Link
            href={`/empresario/proyecto/${participacion.proyecto.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-warning transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <Briefcase className="w-3.5 h-3.5" />
            {participacion.proyecto.titulo}
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {participacion.fotoPerfil ? (
              <img
                src={participacion.fotoPerfil}
                alt={nombreCompleto}
                className="w-14 h-14 shrink-0 rounded-xl object-cover border border-border/80 shadow-sm"
              />
            ) : (
              <InitialsAvatar
                nombre={participacion.estudianteNombre}
                apellidos={participacion.estudianteApellidos}
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[17px] text-ink-strong leading-tight">
                  {nombreCompleto}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0',
                    ESTADO_STYLE[participacion.estado],
                  )}
                >
                  {t(`pstatus_${participacion.estado}`).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1.5 font-medium font-sans">
                {participacion.tituloFwd
                  ? `${t(`fwd_${participacion.tituloFwd}`)} Developer`
                  : 'Egresado FWD'}
                {' • '}
                {participacion.reputacion !== null
                  ? `${participacion.reputacion.toFixed(1)} ★`
                  : t('noReputation')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {effectiveProjectId ? (
              <Link
                href={`/empresario/mensajes?proyecto=${effectiveProjectId}`}
                title={t('contactarBtn')}
                className="p-2 rounded-full hover:bg-muted text-ink-muted hover:text-accent transition-colors duration-[var(--duration-fast)]"
              >
                <Mail className="w-5 h-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  toast.info('No hay un proyecto asignado para chatear')
                }
                className="p-2 rounded-full hover:bg-muted text-ink-muted hover:text-accent transition-colors duration-[var(--duration-fast)]"
              >
                <Mail className="w-5 h-5" />
              </button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-muted text-ink-muted hover:text-accent transition-colors duration-[var(--duration-fast)]"
                  aria-label="Acciones"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-40 p-1.5 bg-surface border border-border shadow-soft rounded-lg"
              >
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/empresario/portafolio-egresado/${participacion.idParticipacion}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink-strong hover:bg-muted transition-colors duration-[var(--duration-fast)]"
                  >
                    <Users className="w-4 h-4 text-ink-muted" />
                    <span>Ver Perfil</span>
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {sealed ? (
          <SealedEnvelopeBody
            participacion={participacion}
            canOpen={canOpen}
            isMutating={isMutating}
            isPending={isPending}
            pendingTitle={pendingTitle}
            onOpen={onOpen}
          />
        ) : (
          <>
            <div className="space-y-4 text-sm">
              {/* Cover Letter and Solution Proposal Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participacion.cartaPostulacion && (
                  <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3 shadow-inner/5">
                    <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                      <FileText className="w-4.5 h-4.5 text-secondary shrink-0" />
                      <span>{t('coverLetterLabel')}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">
                      {participacion.cartaPostulacion}
                    </p>
                  </div>
                )}
                {participacion.planteamientoSolucion && (
                  <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3 shadow-inner/5">
                    <div className="flex items-center gap-2 text-warning font-bold text-sm">
                      <Lightbulb className="w-4.5 h-4.5 text-warning shrink-0" />
                      <span>{t('solutionLabel')}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">
                      {participacion.planteamientoSolucion}
                    </p>
                  </div>
                )}
              </div>

              {/* Propuesta Económica Abierta */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <DollarSign className="w-4.5 h-4.5 text-primary shrink-0" />
                    <span>Propuesta Económica</span>
                  </div>
                  <div className="text-base font-extrabold text-foreground">
                    {participacion.montoPropuesto
                      ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(participacion.montoPropuesto)} USD`
                      : 'No especificado'}
                    <span className="text-xs font-bold text-primary/80 ml-2">
                      (≈{' '}
                      {participacion.montoPropuesto
                        ? new Intl.NumberFormat('es-CR', {
                            style: 'currency',
                            currency: 'CRC',
                            maximumFractionDigits: 0,
                          }).format(participacion.montoPropuesto * 515)
                        : '0'}{' '}
                      CRC)
                    </span>
                  </div>
                </div>
                {participacion.idCotizacion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewQuotation(participacion.idCotizacion!)}
                    className="border-primary/20 text-primary hover:bg-primary/10 text-xs font-bold py-1 px-3"
                  >
                    <Calculator className="w-3.5 h-3.5 text-primary shrink-0" />
                    Ver Desglose de Cotización
                  </Button>
                )}
              </div>

              {/* Attachments & Meta Info Footer */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40">
                <div className="flex flex-wrap gap-2">
                  {participacion.prototipoEnlaces.map((enlace) => (
                    <ExternalAnchor
                      key={enlace}
                      href={enlace}
                      label={t('prototypeLabel')}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      onClick={(e) => {
                        e.preventDefault()
                        onOpenIframe(enlace)
                      }}
                    />
                  ))}
                  {participacion.documentacionTecnica && (
                    <ExternalAnchor
                      href={participacion.documentacionTecnica}
                      label={t('techDocLabel')}
                      icon={<FileText className="w-3.5 h-3.5" />}
                      onClick={async (e) => {
                        e.preventDefault()
                        const signed = await getSignedUrlDocumentacionTecnica(
                          participacion.idParticipacion,
                        )
                        if (signed.ok) {
                          onOpenIframe(signed.data.url)
                        } else {
                          toast.error(t('techDocOpenError'))
                        }
                      }}
                    />
                  )}
                  {participacion.urlRepositorioProyecto && (
                    <ExternalAnchor
                      href={participacion.urlRepositorioProyecto}
                      label={t('repoLabel')}
                      icon={<GitBranch className="w-3.5 h-3.5" />}
                      onClick={(e) => {
                        e.preventDefault()
                        onOpenIframe(participacion.urlRepositorioProyecto!)
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-sans">
                  <Clock className="w-3.5 h-3.5 text-ink-muted" />
                  <span>
                    {t('appliedOnLabel')}:{' '}
                    <span className="font-semibold text-ink-strong">
                      {participacion.fechaPostulacion.slice(0, 10)}
                    </span>
                  </span>
                  {participacion.fechaEntregaPrototipo && (
                    <span className="ml-3">
                      {t('deliveredOnLabel')}:{' '}
                      <span className="font-semibold text-ink-strong">
                        {participacion.fechaEntregaPrototipo.slice(0, 10)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {participacion.estado === 'en_revision' && (
              <StarRatingForm
                participacion={participacion}
                disabled={isMutating || isRatingMutating}
                onRate={onRate}
              />
            )}

            {participacion.calificacionPrototipo !== null &&
              participacion.estado !== 'en_revision' && (
                <RatingCollapsible
                  calificacion={participacion.calificacionPrototipo}
                  comentario={participacion.comentarioPrototipo}
                />
              )}

            {acciones.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
                {isPending ? (
                  <p className="text-sm font-semibold text-magenta capitalize font-sans">
                    {pendingTitle}
                  </p>
                ) : (
                  acciones.map((accion) => (
                    <ActionButton
                      key={accion}
                      accion={accion}
                      disabled={isMutating}
                      onContratar={onContratar}
                      onRechazar={onRechazar}
                    />
                  ))
                )}
              </div>
            )}

            {effectiveProjectId &&
              (participacion.estado === 'contratada' ||
                participacion.estado === 'finalizada') && (
                <div className="pt-3 border-t border-border/40">
                  <ContactButton idProyecto={effectiveProjectId} />
                </div>
              )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface SealedEnvelopeBodyProps {
  participacion: ParticipacionPanelItem
  canOpen: boolean
  isMutating: boolean
  isPending: boolean
  pendingTitle: string
  onOpen: () => void
}

/** Tapa del sobre cerrado: adjuntos por existencia (no contenido) + fecha + el
 *  botón "Abrir". El contenido real ni siquiera llega del servidor mientras la
 *  oferta esté `enviada`. */
function SealedEnvelopeBody({
  participacion,
  canOpen,
  isMutating,
  isPending,
  pendingTitle,
  onOpen,
}: SealedEnvelopeBodyProps) {
  const t = useTranslations('ProjectDetail')

  const adjuntos: {
    key: string
    label: string
    icon: ReactNode
    className?: string
  }[] = []
  adjuntos.push({
    key: 'presupuesto_sellado',
    label: 'Propuesta Económica Sellada',
    icon: <Lock className="w-3 h-3" />,
    className: 'border-primary/20 bg-primary/10 text-primary',
  })
  if (participacion.tienePrototipo) {
    adjuntos.push({
      key: 'prototipo',
      label: t('envelopeHasPrototype'),
      icon: <ExternalLink className="w-3.5 h-3.5" />,
    })
  }
  if (participacion.tieneRepositorio) {
    adjuntos.push({
      key: 'repositorio',
      label: t('envelopeHasRepo'),
      icon: <GitBranch className="w-3.5 h-3.5" />,
    })
  }
  if (participacion.tieneDocumentacion) {
    adjuntos.push({
      key: 'documentacion',
      label: t('envelopeHasDoc'),
      icon: <FileText className="w-3.5 h-3.5" />,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        {t('envelopeSealedHint')}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {adjuntos.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {adjuntos.map((adjunto) => (
              <span
                key={adjunto.key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  adjunto.className ||
                    'border-magenta/20 bg-magenta/10 text-magenta',
                )}
              >
                {adjunto.icon}
                {adjunto.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {t('envelopeNoAttachments')}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {t('appliedOnLabel')}:{' '}
          <span className="font-semibold text-foreground">
            {participacion.fechaPostulacion.slice(0, 10)}
          </span>
        </span>
      </div>

      <div className="pt-3 border-t border-border/40">
        {isPending ? (
          <span
            aria-disabled="true"
            title={pendingTitle}
            className="text-xs text-muted-foreground/70 italic"
          >
            {pendingTitle}
          </span>
        ) : canOpen ? (
          <Button
            type="button"
            size="sm"
            variant="magenta"
            disabled={isMutating}
            onClick={onOpen}
            className="font-semibold"
          >
            <Mail className="w-3.5 h-3.5" />
            {t('openEnvelope')}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <Lock className="w-3.5 h-3.5" />
            {t('openUnavailable')}
          </span>
        )}
      </div>
    </div>
  )
}

interface StarRatingFormProps {
  participacion: ParticipacionPanelItem
  disabled: boolean
  onRate: (
    calificacion: number,
    comentario: string | undefined,
  ) => Promise<void>
}

function StarRatingForm({
  participacion,
  disabled,
  onRate,
}: StarRatingFormProps) {
  const t = useTranslations('ProjectDetail')
  const [stars, setStars] = useState(participacion.calificacionPrototipo ?? 0)
  const [comment, setComment] = useState(
    participacion.comentarioPrototipo ?? '',
  )
  const [submitting, setSubmitting] = useState(false)

  const isDisabled = disabled || submitting

  const handleSave = async () => {
    if (stars === 0 || isDisabled) return
    setSubmitting(true)
    await onRate(stars, comment.trim() !== '' ? comment.trim() : undefined)
    setSubmitting(false)
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border/40">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t('ratePrototypeTitle')}
      </h4>
      <StarRating value={stars} onChange={setStars} disabled={isDisabled} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isDisabled}
        placeholder={t('ratingCommentPlaceholder')}
        rows={2}
        className="bg-card/50 border-border text-sm resize-none"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={stars === 0 || isDisabled}
        onClick={() => void handleSave()}
        className="font-semibold"
      >
        {t('saveRating')}
      </Button>
    </div>
  )
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered > 0 ? hovered : value
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={String(n)}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded disabled:cursor-not-allowed"
        >
          <Star
            className={cn(
              'w-5 h-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              active >= n
                ? 'text-accent fill-accent'
                : 'text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  )
}

function StarReadOnly({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'w-4 h-4',
            value >= n ? 'text-accent fill-accent' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  )
}

function RatingCollapsible({
  calificacion,
  comentario,
}: {
  calificacion: number
  comentario: string | null
}) {
  const t = useTranslations('ProjectDetail')
  const [open, setOpen] = useState(false)

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
      >
        <Star className="w-3.5 h-3.5 text-accent" />
        {t('prototypeRatingLabel')}: {calificacion}/5
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-1">
          <StarReadOnly value={calificacion} />
          {comentario ? (
            <div className="space-y-0.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t('ratingCommentLabel')}
              </p>
              <p className="text-sm text-foreground">{comentario}</p>
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              {t('ratingNoComment')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ContactButton({ idProyecto }: { idProyecto: string }) {
  const t = useTranslations('ProjectDetail')
  return (
    <Link
      href={`/empresario/mensajes?proyecto=${idProyecto}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
    >
      <MessageSquare className="w-3.5 h-3.5" />
      {t('contactarBtn')}
    </Link>
  )
}

function ActionButton({
  accion,
  disabled,
  onContratar,
  onRechazar,
}: {
  accion: ParticipacionAction
  disabled: boolean
  onContratar: () => void
  onRechazar: () => void
}) {
  const t = useTranslations('ProjectDetail')

  // El sobre cerrado reemplazó al botón "revisar": abrir la oferta es lo que
  // dispara `enviada -> en_revision`. Acá solo quedan contratar y rechazar.
  if (accion === 'revisar') {
    return null
  }
  if (accion === 'contratar') {
    return (
      <Button
        type="button"
        size="sm"
        variant="accent"
        disabled={disabled}
        onClick={onContratar}
        className="font-semibold"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('actionContratar')}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled}
      onClick={onRechazar}
      className="font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <XCircle className="w-3.5 h-3.5" />
      {t('actionRechazar')}
    </Button>
  )
}

interface EstadoFilterProps {
  config: PanelFilterConfig
  seleccion: ReadonlySet<EstadoParticipacion>
  conteoPorEstado: ReadonlyMap<EstadoParticipacion, number>
  onToggle: (estado: EstadoParticipacion) => void
  onClear: () => void
}

/** Filtro de estados multiselección (Popover + Command). Selección vacía = todos;
 *  cada item muestra su conteo. Navegable por teclado vía cmdk. */
function EstadoFilter({
  config,
  seleccion,
  conteoPorEstado,
  onToggle,
  onClear,
}: EstadoFilterProps) {
  const t = useTranslations('ProjectDetail')
  const count = seleccion.size

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-semibold"
          aria-label={t('filterStateAria')}
        >
          <ListFilter className="w-3.5 h-3.5" />
          {t('filterStateTrigger')}
          {count > 0 ? (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/10 px-1.5 text-[10px] font-bold text-accent">
              {count}
            </span>
          ) : (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {t('filterStateAll')}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <div
          role="group"
          aria-label={t('filterStateAria')}
          className="flex flex-col gap-0.5"
        >
          {config.estados.map((estado) => {
            const checked = seleccion.has(estado)
            return (
              <button
                key={estado}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggle(estado)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border',
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1">{t(`pstatus_${estado}`)}</span>
                <span className="text-xs text-muted-foreground">
                  {conteoPorEstado.get(estado) ?? 0}
                </span>
              </button>
            )
          })}
        </div>
        {count > 0 && (
          <div className="mt-1 border-t border-border/60 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="w-full justify-start text-xs font-semibold text-muted-foreground"
            >
              <XCircle className="w-3.5 h-3.5" />
              {t('filterClear')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface SortControlProps {
  config: PanelFilterConfig
  sortKey: PanelSortKey
  sortDir: SortDirection
  onSortKeyChange: (key: PanelSortKey) => void
  onToggleDir: () => void
}

/** Selector de criterio de orden (Select) + toggle de dirección asc/desc. */
function SortControl({
  config,
  sortKey,
  sortDir,
  onSortKeyChange,
  onToggleDir,
}: SortControlProps) {
  const t = useTranslations('ProjectDetail')

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={sortKey}
        onValueChange={(value) => onSortKeyChange(value as PanelSortKey)}
      >
        <SelectTrigger size="sm" className="h-8" aria-label={t('sortAria')}>
          <ArrowDownUp className="w-3.5 h-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.sorts.map((clave) => (
            <SelectItem key={clave} value={clave}>
              {t(`sort_${clave}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onToggleDir}
        className="h-8 w-8 p-0"
        aria-label={sortDir === 'asc' ? t('sortDirAsc') : t('sortDirDesc')}
      >
        {sortDir === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
      <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
      {message}
    </div>
  )
}

function ExternalAnchor({
  href,
  label,
  icon,
  onClick,
}: {
  href: string
  label: string
  icon: ReactNode
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-magenta hover:text-magenta-foreground hover:bg-magenta/90 border border-magenta/20 bg-magenta/10 rounded px-2.5 py-1.5 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer font-sans"
    >
      {icon}
      {label}
    </a>
  )
}

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
    <div className="w-16 h-16 shrink-0 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-bold text-2xl shadow-inner border border-secondary/20">
      {iniciales}
    </div>
  )
}
