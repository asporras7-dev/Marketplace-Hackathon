'use client'

import React, { useState, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Upload,
  FileCheck2,
  CalendarDays,
  Clock3,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  FileText,
  Star,
  Loader2,
  X,
  Link2,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  subirHito,
  subirEntregableFinal,
  actualizarUrlProyecto,
} from '@/lib/deliverables/actions'
import { rateCompany } from '@/lib/company/ratings'
import { addRespuestaEvaluacion } from '@/lib/evaluaciones/actions'
import { logger } from '@/lib/logger'
import type {
  MiContratacion,
  EntregablePropio,
} from '@/lib/deliverables/queries'

interface ReceivedRating {
  id_evaluacion: string
  puntuacion: number
  comentario: string | null
  respuesta_evaluado: string | null
}

interface EntregablesClientProps {
  projectId: string
  projectTitle: string
  companyId: string
  contratacion: MiContratacion
  entregablesIniciales: EntregablePropio[]
  existingRating: { puntuacion: number; comentario: string | null } | null
  receivedRating?: ReceivedRating | null
}

const ESTADO_CONFIG = {
  enviado: {
    label: 'estadoEnviado',
    className: 'bg-primary/10 text-primary border border-primary/20',
    icon: Hourglass,
    accentBg: 'bg-primary',
    iconColor: 'text-primary',
  },
  en_revision: {
    label: 'estadoEnRevision',
    className: 'bg-warning/10 text-warning border border-warning/20',
    icon: Clock3,
    accentBg: 'bg-warning',
    iconColor: 'text-warning',
  },
  aprobado: {
    label: 'estadoAprobado',
    className: 'bg-accent/10 text-accent border border-accent/20',
    icon: CheckCircle2,
    accentBg: 'bg-accent',
    iconColor: 'text-accent',
  },
  con_cambios: {
    label: 'estadoConCambios',
    className: 'bg-magenta/10 text-magenta border border-magenta/20',
    icon: AlertCircle,
    accentBg: 'bg-magenta',
    iconColor: 'text-magenta',
  },
} as const

const PERIODO_CONFIG = {
  vigente: {
    label: 'periodoVigente',
    className: 'bg-accent/10 text-accent border border-accent/20',
  },
  pausado: {
    label: 'periodoPausado',
    className: 'bg-warning/10 text-warning border border-warning/20',
  },
  finalizado: {
    label: 'periodoFinalizado',
    className: 'bg-muted text-muted-foreground border border-border',
  },
  cancelado: {
    label: 'periodoCancelado',
    className: 'bg-magenta/10 text-magenta border border-magenta/20',
  },
} as const

const URL_SPLIT = /(https?:\/\/[^\s]+)/g

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}

function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_SPLIT).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 break-all hover:text-primary/80"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function EntregablesClient({
  projectId,
  projectTitle,
  companyId,
  contratacion,
  entregablesIniciales,
  existingRating,
  receivedRating,
}: EntregablesClientProps) {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [uploadingHito, setUploadingHito] = useState(false)
  const [uploadingFinal, setUploadingFinal] = useState(false)
  const [selectedHito, setSelectedHito] = useState<File | null>(null)
  const [selectedFinal, setSelectedFinal] = useState<File | null>(null)
  const [ratingScore, setRatingScore] = useState(
    existingRating?.puntuacion ?? 0,
  )
  const [ratingComment, setRatingComment] = useState(
    existingRating?.comentario ?? '',
  )
  const [hoverScore, setHoverScore] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [hasRated, setHasRated] = useState(existingRating !== null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [urlRepositorio, setUrlRepositorio] = useState(
    contratacion.url_repositorio_proyecto,
  )
  const [editingLink, setEditingLink] = useState(false)
  const [linkValue, setLinkValue] = useState(
    contratacion.url_repositorio_proyecto ?? '',
  )
  const [savingLink, setSavingLink] = useState(false)
  const hitoRef = useRef<HTMLInputElement>(null)
  const finalRef = useRef<HTMLInputElement>(null)

  const periodo =
    PERIODO_CONFIG[contratacion.estado_periodo as keyof typeof PERIODO_CONFIG]

  const handleSaveLink = async () => {
    const urlTrimmed = linkValue.trim() || null
    setSavingLink(true)
    const res = await actualizarUrlProyecto({
      idParticipacion: contratacion.id_participacion,
      url: urlTrimmed,
    })
    setSavingLink(false)
    if (res.ok) {
      setUrlRepositorio(urlTrimmed)
      setEditingLink(false)
      toast.success(tEgresado('projectLinkSaveSuccess'))
    } else {
      toast.error(tEgresado('projectLinkSaveError'))
    }
  }

  const handleUpload = async (
    file: File,
    tipo: 'parcial' | 'final',
    setLoading: (v: boolean) => void,
    clearInput: () => void,
  ) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('idContratacion', contratacion.id_contratacion)
      formData.append('idProyecto', projectId)

      const action = tipo === 'parcial' ? subirHito : subirEntregableFinal
      const result = await action(formData)

      if (!result.ok) {
        logger.error('handleUpload: la server action devolvio error', {
          tipo,
          error: result.error,
        })
        toast.error(
          result.error === 'archivo_duplicado'
            ? tEgresado('uploadDuplicate')
            : tEgresado('uploadError'),
        )
        return
      }

      toast.success(tEgresado('uploadSuccess'))
      clearInput()
      router.refresh()
    } catch (error) {
      logger.error('handleUpload: excepcion no controlada', {
        tipo,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
      })
      toast.error(tEgresado('uploadError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabecera de página: ancho completo */}
        <div className="space-y-6 mb-8">
          <Link
            href={`/egresado/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <ArrowLeft className="w-4 h-4" />
            {tEgresado('backToProjectDetail')}
          </Link>

          <PageTitle
            title={projectTitle}
            description={tEgresado('deliverablesDesc')}
            dotColor="text-primary"
          />
        </div>

        {/* Barra de contrato: slim, full-width, encima del grid */}
        <Card className="border border-border/60 bg-card/30 mb-6">
          <CardContent className="px-5 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {periodo && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${periodo.className}`}
                >
                  {tEgresado(periodo.label as Parameters<typeof tEgresado>[0])}
                </span>
              )}
              {contratacion.fecha_inicio && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium">
                    {tEgresado('contratacionInicio')}:
                  </span>
                  <span className="font-semibold text-foreground">
                    {contratacion.fecha_inicio.slice(0, 10)}
                  </span>
                </span>
              )}
              {contratacion.fecha_fin_estimada && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span className="font-medium">
                    {tEgresado('contratacionFinEstimada')}:
                  </span>
                  <span className="font-semibold text-foreground">
                    {contratacion.fecha_fin_estimada.slice(0, 10)}
                  </span>
                </span>
              )}
              {urlRepositorio && (
                <a
                  href={urlRepositorio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] max-w-[280px]"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{urlRepositorio}</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grid de dos columnas:
            - vigente    → izq: panel de carga   | der: entregables
            - finalizado → izq: calificaciones   | der: entregables
            - pausado/cancelado → izq: aviso     | der: entregables */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_1fr] lg:gap-6 lg:items-start">
          {/* ── Columna izquierda ── */}
          <div className="space-y-6">
            {/* ESTADO: vigente → panel de carga */}
            {contratacion.estado_periodo === 'vigente' && (
              <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />
                <CardContent className="p-6 pt-8 space-y-6">
                  <SectionHeading>
                    {tEgresado('uploadSectionTitle')}
                  </SectionHeading>

                  {/* Zona de hito parcial */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground">
                        {tEgresado('uploadHito')}
                      </p>
                    </div>

                    <label
                      htmlFor="hito-file"
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed min-h-[96px] px-4 py-4 cursor-pointer select-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                        uploadingHito
                          ? 'opacity-50 cursor-not-allowed border-border/40'
                          : selectedHito
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/50 hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      {uploadingHito ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : selectedHito ? (
                        <>
                          <FileText className="w-5 h-5 text-primary" />
                          <p className="text-[11px] font-medium text-foreground text-center break-all line-clamp-2 px-1">
                            {selectedHito.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground text-center">
                            {tEgresado('uploadClickToSelect')}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50">
                            {tEgresado('uploadMaxSize')}
                          </p>
                        </>
                      )}
                    </label>

                    <input
                      id="hito-file"
                      ref={hitoRef}
                      type="file"
                      className="sr-only"
                      disabled={uploadingHito}
                      onChange={(e) =>
                        setSelectedHito(e.target.files?.[0] ?? null)
                      }
                    />

                    <div className="flex items-center gap-2">
                      {selectedHito && !uploadingHito && (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors duration-[var(--duration-fast)] shrink-0 flex items-center gap-1"
                          onClick={() => {
                            setSelectedHito(null)
                            if (hitoRef.current) hitoRef.current.value = ''
                          }}
                        >
                          <X className="w-3 h-3" />
                          {tEgresado('uploadRemoveFile')}
                        </button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingHito || !selectedHito}
                        className="font-semibold flex-1"
                        onClick={() => {
                          if (!selectedHito) return
                          handleUpload(
                            selectedHito,
                            'parcial',
                            setUploadingHito,
                            () => {
                              if (hitoRef.current) hitoRef.current.value = ''
                              setSelectedHito(null)
                            },
                          )
                        }}
                      >
                        {uploadingHito ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {tCommon('loading')}
                          </span>
                        ) : (
                          tEgresado('uploadHito')
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border/40" />

                  {/* Zona de entregable final */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-accent" />
                      <p className="text-xs font-semibold text-foreground">
                        {tEgresado('uploadFinal')}
                      </p>
                    </div>

                    <label
                      htmlFor="final-file"
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed min-h-[96px] px-4 py-4 cursor-pointer select-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                        uploadingFinal
                          ? 'opacity-50 cursor-not-allowed border-border/40'
                          : selectedFinal
                            ? 'border-accent/50 bg-accent/5'
                            : 'border-border/50 hover:border-accent/40 hover:bg-accent/5'
                      }`}
                    >
                      {uploadingFinal ? (
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                      ) : selectedFinal ? (
                        <>
                          <FileCheck2 className="w-5 h-5 text-accent" />
                          <p className="text-[11px] font-medium text-foreground text-center break-all line-clamp-2 px-1">
                            {selectedFinal.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <FileCheck2 className="w-5 h-5 text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground text-center">
                            {tEgresado('uploadClickToSelect')}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50">
                            {tEgresado('uploadMaxSize')}
                          </p>
                        </>
                      )}
                    </label>

                    <input
                      id="final-file"
                      ref={finalRef}
                      type="file"
                      className="sr-only"
                      disabled={uploadingFinal}
                      onChange={(e) =>
                        setSelectedFinal(e.target.files?.[0] ?? null)
                      }
                    />

                    <div className="flex items-center gap-2">
                      {selectedFinal && !uploadingFinal && (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors duration-[var(--duration-fast)] shrink-0 flex items-center gap-1"
                          onClick={() => {
                            setSelectedFinal(null)
                            if (finalRef.current) finalRef.current.value = ''
                          }}
                        >
                          <X className="w-3 h-3" />
                          {tEgresado('uploadRemoveFile')}
                        </button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uploadingFinal || !selectedFinal}
                        className="font-semibold flex-1"
                        onClick={() => {
                          if (!selectedFinal) return
                          handleUpload(
                            selectedFinal,
                            'final',
                            setUploadingFinal,
                            () => {
                              if (finalRef.current) finalRef.current.value = ''
                              setSelectedFinal(null)
                            },
                          )
                        }}
                      >
                        {uploadingFinal ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {tCommon('loading')}
                          </span>
                        ) : (
                          tEgresado('uploadFinal')
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border/40" />

                  {/* Enlace del proyecto */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-secondary" />
                      <p className="text-xs font-semibold text-foreground">
                        {tEgresado('projectLinkLabel')}
                      </p>
                    </div>

                    {editingLink ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="url"
                          value={linkValue}
                          onChange={(e) => setLinkValue(e.target.value)}
                          placeholder={tEgresado('projectLinkPlaceholder')}
                          maxLength={150}
                          disabled={savingLink}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingLink}
                            className="flex-1 font-semibold text-xs"
                            onClick={handleSaveLink}
                          >
                            {savingLink ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              tEgresado('projectLinkSave')
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={savingLink}
                            className="font-semibold text-xs"
                            onClick={() => {
                              setLinkValue(urlRepositorio ?? '')
                              setEditingLink(false)
                            }}
                          >
                            {tEgresado('projectLinkCancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {urlRepositorio ? (
                          <a
                            href={urlRepositorio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline underline-offset-2 truncate flex-1 hover:text-primary/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                          >
                            {urlRepositorio}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/70 flex-1">
                            {tEgresado('projectLinkEmpty')}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="shrink-0 h-7 w-7 p-0"
                          onClick={() => {
                            setLinkValue(urlRepositorio ?? '')
                            setEditingLink(true)
                          }}
                          aria-label={tEgresado('projectLinkEdit')}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ESTADO: finalizado → cards de calificación */}
            {contratacion.estado_periodo === 'finalizado' && (
              <>
                {/* Calificación de la Empresa */}
                <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-warning to-highlight" />
                  <CardContent className="p-6 pt-8 space-y-6">
                    <div className="space-y-1 text-left">
                      <h3 className="text-base font-extrabold font-heading text-foreground">
                        {tEgresado('rateCompanyTitle')}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tEgresado('rateCompanyDesc')}
                      </p>
                    </div>

                    {hasRated ? (
                      <div className="space-y-4 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-muted-foreground mr-2">
                            {tEgresado('ratingLabel')}:
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= ratingScore
                                    ? 'text-highlight fill-highlight'
                                    : 'text-muted-foreground/25'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {ratingComment && (
                          <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 text-xs text-foreground/90">
                            <span className="font-bold block mb-1 text-muted-foreground uppercase text-[10px]">
                              {tEgresado('commentLabel')}
                            </span>
                            {ratingComment}
                          </div>
                        )}
                        <p className="text-xs text-accent font-semibold">
                          {tEgresado('alreadyRated')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground">
                            {tEgresado('ratingLabel')} *
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={submittingRating}
                                onMouseEnter={() => setHoverScore(star)}
                                onMouseLeave={() => setHoverScore(0)}
                                onClick={() => setRatingScore(star)}
                                className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= (hoverScore || ratingScore)
                                      ? 'text-highlight fill-highlight'
                                      : 'text-muted-foreground/30'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="rating-comment"
                            className="block text-xs font-bold text-muted-foreground"
                          >
                            {tEgresado('commentLabel')}
                          </label>
                          <textarea
                            id="rating-comment"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder={tEgresado('rateCompanyDesc')}
                            disabled={submittingRating}
                            rows={3}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            maxLength={1000}
                          />
                        </div>

                        <Button
                          type="button"
                          disabled={submittingRating || ratingScore === 0}
                          onClick={async () => {
                            if (ratingScore === 0) return
                            setSubmittingRating(true)
                            const res = await rateCompany({
                              idEmpresario: companyId,
                              idContratacion: contratacion.id_contratacion,
                              puntuacion: ratingScore,
                              comentario: ratingComment.trim() || undefined,
                            })
                            setSubmittingRating(false)
                            if (res.ok) {
                              toast.success(tEgresado('rateCompanySuccess'))
                              setHasRated(true)
                              router.refresh()
                            } else {
                              toast.error(res.error)
                            }
                          }}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs flex items-center gap-1.5"
                        >
                          {submittingRating && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          )}
                          {tEgresado('submitRating')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Calificación recibida del empresario (RF-49 + RF-53 réplica) */}
                <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-accent to-primary" />
                  <CardContent className="p-6 pt-8 space-y-6">
                    <div className="space-y-1 text-left">
                      <h3 className="text-base font-extrabold font-heading text-foreground">
                        {tEgresado('receivedRatingTitle')}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tEgresado('receivedRatingDesc')}
                      </p>
                    </div>

                    {receivedRating ? (
                      <div className="space-y-4 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-muted-foreground mr-2">
                            {tEgresado('ratingLabel')}:
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= receivedRating.puntuacion
                                    ? 'text-highlight fill-highlight'
                                    : 'text-muted-foreground/25'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {receivedRating.comentario && (
                          <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 text-xs text-foreground/90">
                            <span className="font-bold block mb-1 text-muted-foreground uppercase text-[10px]">
                              {tEgresado('commentLabel')}
                            </span>
                            {receivedRating.comentario}
                          </div>
                        )}
                        {receivedRating.respuesta_evaluado ? (
                          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground/90">
                            <span className="font-bold block mb-1 text-primary uppercase text-[10px]">
                              {tEgresado('alreadyReplied')}
                            </span>
                            {receivedRating.respuesta_evaluado}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label
                              htmlFor="reply-comment"
                              className="block text-xs font-bold text-muted-foreground"
                            >
                              {tEgresado('replyLabel')}
                            </label>
                            <textarea
                              id="reply-comment"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={tEgresado('replyPlaceholder')}
                              disabled={submittingReply}
                              rows={3}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              maxLength={1000}
                            />
                            <Button
                              type="button"
                              disabled={
                                submittingReply || replyText.trim() === ''
                              }
                              onClick={async () => {
                                if (replyText.trim() === '') return
                                setSubmittingReply(true)
                                const res = await addRespuestaEvaluacion({
                                  idEvaluacion: receivedRating.id_evaluacion,
                                  respuesta: replyText.trim(),
                                })
                                setSubmittingReply(false)
                                if (res.ok) {
                                  toast.success(tEgresado('replySuccess'))
                                  router.refresh()
                                } else {
                                  toast.error(tEgresado('replyError'))
                                }
                              }}
                              className="text-xs font-semibold flex items-center gap-1.5"
                            >
                              {submittingReply && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              {submittingReply
                                ? tEgresado('replySubmitting')
                                : tEgresado('replySubmit')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {tEgresado('receivedRatingNone')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ESTADO: pausado / cancelado → aviso sin panel de carga */}
            {contratacion.estado_periodo !== 'vigente' &&
              contratacion.estado_periodo !== 'finalizado' && (
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {tEgresado('uploadDisabledNotVigente')}
                </div>
              )}
          </div>

          {/* ── Columna derecha: lista de entregables (siempre visible) ── */}
          <div>
            <Card className="border border-border/80 bg-card/40">
              <CardContent className="p-6 space-y-4">
                <SectionHeading>
                  {tEgresado('entregablesListTitle')}
                </SectionHeading>

                {entregablesIniciales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                    <FileText className="w-10 h-10 opacity-30" />
                    <p className="text-sm">{tEgresado('noEntregables')}</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {entregablesIniciales.map((e) => {
                      const config =
                        ESTADO_CONFIG[e.estado as keyof typeof ESTADO_CONFIG]
                      const Icon = config?.icon ?? FileCheck2
                      return (
                        <li
                          key={e.id_entregable}
                          className="relative flex flex-col rounded-xl border border-border/60 bg-background/60 overflow-hidden"
                        >
                          {/* Franja de color lateral según estado */}
                          <div
                            className={`absolute inset-y-0 left-0 w-[3px] ${config?.accentBg ?? 'bg-muted'}`}
                          />

                          {/* Cabecera del entregable */}
                          <div className="pl-5 pr-4 pt-3 pb-2 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${config?.iconColor ?? 'text-muted-foreground'}`}
                              />
                              <span className="text-sm font-semibold text-foreground truncate">
                                {e.tipo_entregable === 'final'
                                  ? tEgresado('tipoFinal')
                                  : tEgresado('tipoParcial')}
                              </span>
                              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                                {tEgresado('versionLabel', { n: e.version })}
                              </span>
                            </div>
                            {config && (
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${config.className}`}
                              >
                                {tEgresado(
                                  config.label as Parameters<
                                    typeof tEgresado
                                  >[0],
                                )}
                              </span>
                            )}
                          </div>

                          <p className="pl-5 pr-4 pb-2 text-xs text-muted-foreground">
                            {tEgresado('uploadedAtLabel')}{' '}
                            {new Date(e.cargado_at).toLocaleDateString()}
                          </p>

                          {/* Hilo de comentarios del empresario */}
                          {e.comentarios.length > 0 && (
                            <div className="mx-4 mb-3 border-t border-border/40 pt-2.5 space-y-1.5">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {tEgresado('threadTitle')}
                              </p>
                              <ul className="space-y-1.5">
                                {e.comentarios.map((c) => (
                                  <li
                                    key={c.id_comentario_entregable}
                                    className="rounded-md bg-warning/5 border border-warning/20 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                                      <span className="font-bold text-warning">
                                        {tEgresado('authorCompany')}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {new Date(
                                          c.comentado_at,
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/85 whitespace-pre-wrap break-words">
                                      <LinkifiedText text={c.contenido} />
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
