'use client'

import { useMemo, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Bot,
  History,
  MoreVertical,
} from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { LogisticsForm } from './LogisticsForm'
import { ProjectChat } from './ProjectChat'
import { ProjectProposal } from './ProjectProposal'
import {
  buildLogisticsSchema,
  draftToFormValues,
  toLogisticaDraft,
  CONTEXTO_MIN,
  CONTEXTO_MAX,
  type LogisticaDraft,
  type LogisticsFormValues,
  type PropuestaProyecto,
} from '@/lib/projects/schemas'
import { saveLogisticsDraft, discardDraft } from '@/lib/projects/actions'
import { sendChatMessage } from '@/lib/proposal-ai/chat'
import { generateProposal } from '@/lib/proposal-ai/proposal'
import { publishProject } from '@/lib/projects/publish'
import type { HistorialEntry } from '@/lib/proposal-ai/types'
import type { ComboboxOption } from '@/components/ui/combobox'

interface ProjectWizardProps {
  conversationId: string
  isVerified: boolean
  todayIso: string
  logistica: LogisticaDraft | null
  contextoInicial: string
  historial: HistorialEntry[]
  propuesta: PropuestaProyecto | null
  countries: ComboboxOption[]
  initialRegions: ComboboxOption[]
}

const KNOWN_ERROR_CODES = new Set([
  'invalid_input',
  'unauthorized',
  'empresario_no_encontrado',
  'save_failed',
  'no_context',
  'no_proposal',
  'not_verified',
  'plazo',
  'ubicacion',
  'pais',
  'presupuesto',
  'presupuestoEntero',
  'ai_not_configured',
  'ai_failed',
  'unexpected',
])

/**
 * Orquesta el flujo de publicación en UNA ruta con tres pasos (errolpendiente §1):
 * 1 = logística + contexto, 2 = chat con la IA, 3 = propuesta (solo lectura).
 * El historial, el contexto y la propuesta viven acá para sobrevivir a los
 * cambios de paso; al retomar, se arranca en el paso que corresponda.
 */
export function ProjectWizard({
  conversationId,
  isVerified,
  todayIso,
  logistica,
  contextoInicial,
  historial: historialInicial,
  propuesta: propuestaInicial,
  countries,
  initialRegions,
}: ProjectWizardProps) {
  const t = useTranslations('ProjectPublish')
  const tEmpresa = useTranslations('Empresa')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [armando, setArmando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [historial, setHistorial] = useState<HistorialEntry[]>(historialInicial)
  const [contexto, setContexto] = useState(contextoInicial)
  const [propuesta, setPropuesta] = useState<PropuestaProyecto | null>(
    propuestaInicial,
  )
  const [logisticaActual, setLogisticaActual] = useState<LogisticaDraft | null>(
    logistica,
  )
  const [completo, setCompleto] = useState(false)
  const [kickoffLoading, setKickoffLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(
    propuestaInicial ? 3 : historialInicial.length > 0 ? 2 : 1,
  )

  const schema = useMemo(() => buildLogisticsSchema(), [])

  const form = useForm<LogisticsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: draftToFormValues(logistica, contextoInicial),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  // Largo actual del contexto para el contador (tope CONTEXTO_MAX caracteres).
  const contextoLen = (form.watch('contextoInicial') ?? '').length

  const onSubmit = async (values: LogisticsFormValues) => {
    setLoading(true)
    const result = await saveLogisticsDraft(conversationId, values)
    setLoading(false)

    if (result.ok) {
      setContexto(values.contextoInicial.trim())
      setLogisticaActual(toLogisticaDraft(values))
      toast.success(t('draftSaved'))
      setStep(2)
      // Saludo de la IA disparado por la acción del usuario (sin useEffect): solo
      // en el primer ingreso al chat (historial vacío). Reacciona al contexto.
      if (historial.length === 0) {
        setKickoffLoading(true)
        const kr = await sendChatMessage(conversationId, undefined, locale)
        setKickoffLoading(false)
        if (kr.ok) {
          setHistorial(kr.data.historial)
          setCompleto(kr.data.completo)
        } else {
          toast.error(
            t(
              `errors.${KNOWN_ERROR_CODES.has(kr.error) ? kr.error : 'unexpected'}`,
            ),
          )
        }
      }
      return
    }

    toast.error(
      t(
        `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
      ),
    )
  }

  const onArmarPropuesta = async () => {
    setArmando(true)
    const result = await generateProposal(conversationId, locale)
    setArmando(false)

    if (!result.ok) {
      toast.error(
        t(
          `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
        ),
      )
      return
    }

    if (result.data.estado === 'rechazada') {
      // La IA explica en el chat qué falta; nos quedamos en el chat.
      setHistorial(result.data.historial)
      toast(t('proposalRejected'))
      return
    }

    setHistorial(result.data.historial)
    setPropuesta(result.data.propuesta)
    setStep(3)
  }

  const onAceptar = async () => {
    setPublicando(true)
    const result = await publishProject(conversationId)
    setPublicando(false)

    if (result.ok) {
      toast.success(t('publishedSuccess'))
      router.push('/empresario')
      return
    }

    toast.error(
      t(
        `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
      ),
    )
  }

  const onDescartar = async () => {
    setDescartando(true)
    const result = await discardDraft()
    if (result.ok) {
      toast.success(t('draftDiscarded'))
      // Recarga: el server vuelve a correr initProjectPublishing y, sin una
      // conversación en_curso, arranca un borrador limpio.
      window.location.reload()
      return
    }
    setDescartando(false)
    toast.error(
      t(
        `errors.${KNOWN_ERROR_CODES.has(result.error) ? result.error : 'unexpected'}`,
      ),
    )
  }

  const botonDescartar = (
    <Button
      type="button"
      variant="ghost"
      onClick={onDescartar}
      disabled={descartando || loading || armando || publicando}
      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive"
    >
      <RotateCcw className="w-4 h-4" />
      {descartando ? t('discarding') : t('discardDraft')}
    </Button>
  )

  const backLink = (
    <div className="mb-6 flex justify-center">
      <Link
        href="/empresario"
        className="inline-flex items-center text-xs font-semibold px-4 py-1.5 border border-secondary/20 bg-secondary/5 rounded-full text-secondary hover:bg-secondary/10 transition-colors gap-1.5 uppercase tracking-wider"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {tEmpresa('backToDashboard').toUpperCase().replace(' EMPRESA', '')}
      </Link>
    </div>
  )

  const pageTitleText = tEmpresa('publishProject')
  let pageSubtitleText = t('publishSubtitle')

  if (step === 2) {
    pageSubtitleText = t('chatSubtitle')
  } else if (step === 3) {
    pageSubtitleText = t('proposalIntro')
  }

  const pageHeader = (
    <div className="text-center mb-8 space-y-3">
      {step === 1 && (
        <span className="text-[10px] font-extrabold text-secondary tracking-widest uppercase block">
          Módulos Marketplace FWD
        </span>
      )}
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-heading">
        {pageTitleText}
        <span className="text-secondary">.</span>
      </h1>
      <p className="text-muted-foreground text-sm max-w-xl mx-auto font-sans leading-relaxed">
        {pageSubtitleText}
      </p>
    </div>
  )

  const supportButton = (
    <div className="flex justify-center mt-8 mb-4">
      <button
        type="button"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-strong text-white rounded-full text-sm font-semibold hover:bg-ink-strong/90 transition-all duration-200 shadow-md cursor-pointer"
        onClick={() => {
          toast.info('Soporte técnico: contacto@fwdcostarica.com')
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-headphones"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
        ¿Necesitas ayuda técnica?
      </button>
    </div>
  )

  if (step === 3 && propuesta) {
    return (
      <div className="space-y-6">
        {backLink}
        {pageHeader}

        <Card className="border border-border/80 bg-surface rounded-3xl shadow-sm overflow-hidden mt-6">
          <CardContent className="p-6 pt-8 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-bold text-foreground">
                {t('proposalTitle')}
              </h2>
            </div>
            <ProjectProposal
              propuesta={propuesta}
              moneda={logisticaActual?.moneda ?? 'USD'}
              presupuestoMin={logisticaActual?.presupuestoMin ?? null}
              presupuestoMax={logisticaActual?.presupuestoMax ?? null}
              isVerified={isVerified}
              publicando={publicando}
              onAceptar={onAceptar}
              onPedirCambios={() => setStep(2)}
            />
            <div className="pt-3 border-t border-border/40">
              {botonDescartar}
            </div>
          </CardContent>
        </Card>

        {supportButton}
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
        {backLink}
        {pageHeader}

        <Card className="border border-border/80 bg-surface rounded-3xl shadow-sm overflow-hidden mt-6">
          {/* Card Header matching mockups */}
          <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-surface">
            <div className="flex items-center gap-3">
              {/* Purple avatar icon */}
              <div className="w-12 h-12 flex items-center justify-center bg-secondary rounded-2xl relative text-white shadow-sm">
                <Bot className="w-6 h-6" />
                {/* Green online dot */}
                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-base text-ink-strong leading-tight">
                  Asistente Al Marketplace
                </span>
                <span className="text-[10px] font-bold text-emerald-500 tracking-wider mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  EN LÍNEA AHORA
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-ink-muted hover:text-ink-strong hover:bg-muted rounded-xl transition-colors"
                onClick={() => {
                  toast.info('Historial de conversación')
                }}
              >
                <History className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-ink-muted hover:text-ink-strong hover:bg-muted rounded-xl transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <ProjectChat
              conversationId={conversationId}
              contextoInicial={contexto}
              historial={historial}
              completo={completo}
              kickoffLoading={kickoffLoading}
              onHistorialChange={setHistorial}
              onCompletoChange={setCompleto}
              onArmarPropuesta={onArmarPropuesta}
              armando={armando}
            />

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 border-border text-xs font-semibold hover:bg-muted"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('back')}
              </Button>
              {botonDescartar}
            </div>
          </CardContent>
        </Card>

        {supportButton}
      </div>
    )
  }

  return (
    <div className="space-y-6 relative pb-12">
      {backLink}
      {pageHeader}

      <Card className="border border-border/80 bg-gradient-to-br from-secondary/20 via-surface via-surface to-secondary/25 rounded-3xl shadow-sm overflow-hidden mt-6">
        <CardContent className="p-6 pt-8 space-y-6">
          {!isVerified && (
            <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
              <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-warning">
                  {t('notVerifiedTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('notVerifiedDesc')}
                </p>
              </div>
            </div>
          )}

          {/* Banner: Módulo de Asistencia Inteligente */}
          <div className="flex items-center gap-4 rounded-3xl border border-secondary/20 bg-secondary/5 p-5 text-left shadow-sm">
            <div className="w-10 h-10 flex items-center justify-center bg-surface border border-secondary/15 rounded-xl shrink-0 text-secondary shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-lightbulb"
              >
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .6 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-secondary tracking-widest uppercase">
                MÓDULO DE ASISTENCIA INTELIGENTE
              </p>
              <p className="text-xs text-ink leading-relaxed">
                Ingresá el contexto base. Nuestro motor de IA optimizará el
                título, la descripción técnica y los stacks recomendados para
                vos en tiempo real.
              </p>
            </div>
          </div>

          <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <LogisticsForm
                disabled={loading}
                todayIso={todayIso}
                countries={countries}
                initialRegions={initialRegions}
              />

              {/* Contexto Operativo Separator */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">
                    CONTEXTO OPERATIVO
                  </span>
                  <div className="flex-1 h-[1px] bg-border/80" />
                </div>

                <div className="space-y-2 text-left">
                  <Label
                    htmlFor="contextoInicial"
                    className="text-xs font-extrabold uppercase tracking-wider text-foreground"
                  >
                    {t('fieldBackground')}
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="contextoInicial"
                      rows={5}
                      maxLength={CONTEXTO_MAX}
                      disabled={loading}
                      placeholder="Describí los requerimientos técnicos, el alcance y los objetivos de negocio para que la IA estructure la propuesta ideal..."
                      className="bg-white border-border/80 rounded-2xl p-4 text-sm focus-visible:ring-secondary focus-visible:border-secondary shadow-sm transition-all placeholder:text-ink-subtle min-h-[120px] resize-y"
                      {...register('contextoInicial')}
                    />
                    {/* Resize diagonal arrow indicator styled nicely */}
                    <div className="absolute bottom-2 right-2 pointer-events-none text-ink-subtle">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-40"
                      >
                        <line x1="22" x2="6" y1="6" y2="22" />
                        <line x1="22" x2="14" y1="14" y2="22" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    {/* Dots indicator at bottom-left */}
                    <div className="flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary/80" />
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary/35" />
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary/35" />
                    </div>

                    <div className="flex justify-end">
                      {errors.contextoInicial?.message ? (
                        <p className="text-xs font-semibold text-destructive mr-3">
                          {errors.contextoInicial.message === 'fondoMin'
                            ? t('errors.fondoMin', {
                                count: String(contextoLen),
                                min: String(CONTEXTO_MIN),
                              })
                            : t(`errors.${errors.contextoInicial.message}`)}
                        </p>
                      ) : null}
                      <p className="text-[10px] font-bold text-ink-muted tracking-wide uppercase tabular-nums">
                        {contextoLen} / {CONTEXTO_MAX} CHARS · MIN{' '}
                        {CONTEXTO_MIN}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción del pie */}
              <div className="flex gap-3 items-center justify-between pt-4 border-t border-border/40">
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onDescartar}
                    disabled={descartando || loading}
                    className="text-xs font-bold tracking-wider text-ink-muted hover:text-destructive hover:bg-transparent transition-colors uppercase px-0 h-10"
                  >
                    Descartar cambios
                  </Button>
                </div>
                <div className="flex gap-3 items-center">
                  <Button
                    type="submit"
                    disabled={loading || !isVerified}
                    className="bg-secondary hover:bg-secondary/95 text-white font-bold flex items-center gap-1.5 shadow-sm px-6 py-3 rounded-2xl text-xs tracking-wider uppercase transition-all hover:scale-[1.01]"
                  >
                    {loading ? t('continuing') : t('continueWithAi')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>

      {supportButton}
    </div>
  )
}
