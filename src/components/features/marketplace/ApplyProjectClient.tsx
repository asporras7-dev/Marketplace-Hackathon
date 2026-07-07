'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Send,
  FileText,
  Link2,
  Plus,
  X,
  Lightbulb,
  Play,
  ChevronDown,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { postularse } from '@/lib/applications/actions'

const MAX_CARTA_LEN = 2800
const MIN_PLANTEAMIENTO_LEN = 30
const MAX_ENLACE_LEN = 500
const MAX_ENLACES_EXTRA = 3

type ApplyFormValues = zod.infer<ReturnType<typeof createApplySchema>>

function createApplySchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
  tCommon: ReturnType<typeof useTranslations<'Common'>>,
) {
  return zod.object({
    coverLetter: zod
      .string()
      .min(30, { message: t('coverLetterMin') })
      .max(MAX_CARTA_LEN, { message: t('coverLetterMax') }),
    planteamientoSolucion: zod
      .string()
      .min(MIN_PLANTEAMIENTO_LEN, { message: t('solutionApproachMin') }),
    prototipoUrl: zod
      .string()
      .min(1, { message: t('prototypeRequired') })
      .url({ message: t('linkInvalid') })
      .max(MAX_ENLACE_LEN, { message: t('linkMax') }),
    enlacesExtra: zod
      .array(
        zod.object({
          value: zod
            .string()
            .url({ message: t('linkInvalid') })
            .max(MAX_ENLACE_LEN, { message: t('linkMax') })
            .or(zod.literal('')),
        }),
      )
      .max(MAX_ENLACES_EXTRA),
    documentacionTecnica:
      typeof window === 'undefined'
        ? zod.any()
        : zod.any().refine((files) => files && files.length > 0, {
            message: tCommon('required'),
          }),
  })
}

interface ApplyProjectClientProps {
  projectId: string
  projectTitle: string
  projectCompanyName: string
}

export function ApplyProjectClient({
  projectId,
  projectTitle,
  projectCompanyName,
}: ApplyProjectClientProps) {
  const router = useRouter()
  const tCommon = useTranslations('Common')
  const tEgresado = useTranslations('Egresado')
  const tValidation = useTranslations('Validation')
  const tAccount = useTranslations('Account')

  const { isPending } = useAccountStatus()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const applySchema = useMemo(
    () => createApplySchema(tValidation, tCommon),
    [tValidation, tCommon],
  )

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      coverLetter: '',
      planteamientoSolucion: '',
      prototipoUrl: '',
      enlacesExtra: [],
      // documentacionTecnica is uncontrolled for type="file"
    },
  })

  const watchedFile = watch('documentacionTecnica')
  const fileName = watchedFile?.[0]?.name

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'enlacesExtra',
  })

  const onSubmit = async (data: ApplyFormValues) => {
    setIsSubmitting(true)

    try {
      const file = data.documentacionTecnica[0] as File

      const extras = data.enlacesExtra
        .map((enlace) => enlace.value.trim())
        .filter((value) => value.length > 0)
      const prototipoEnlaces = [data.prototipoUrl.trim(), ...extras]

      // El documento se sube en el SERVIDOR (la postulación recibe FormData): el
      // cliente browser de Supabase cuelga storage.upload(). El bucket es privado;
      // la action guarda el path y lo firma al leerlo.
      const formData = new FormData()
      formData.append('id_proyecto', projectId)
      formData.append('planteamiento_solucion', data.planteamientoSolucion)
      formData.append('carta_postulacion', data.coverLetter.trim())
      formData.append('prototipo_enlaces', JSON.stringify(prototipoEnlaces))
      formData.append('file', file)

      const result = await postularse(formData)

      if (!result.ok) {
        if (
          typeof result.error === 'string' &&
          result.error.startsWith('AI_REJECTED::')
        ) {
          const reason = result.error.replace('AI_REJECTED::', '')
          toast.error(tEgresado('applyErrorAiRejected', { reason }))
        } else {
          const errorMessages: Partial<Record<string, string>> = {
            cuenta_no_verificada: tEgresado('applyErrorCuentaNoVerificada'),
            cupo_excedido: tEgresado('applyErrorCupoExcedido'),
            proyecto_cerrado: tEgresado('applyErrorProyectoCerrado'),
            plazo_vencido: tEgresado('applyErrorPlazoVencido'),
            proyecto_not_found: tEgresado('applyErrorProyectoCerrado'),
            estudiante_not_found: tEgresado('applyErrorPerfil'),
            unauthenticated: tEgresado('applyErrorSesion'),
            database_error: tEgresado('applyErrorDatabase'),
            archivo_requerido: tEgresado('applyErrorArchivoRequerido'),
            archivo_muy_grande: tEgresado('applyErrorArchivoGrande'),
            tipo_archivo_invalido: tEgresado('applyErrorArchivoTipo'),
            storage_error: tEgresado('applyErrorArchivoSubida'),
          }
          toast.error(errorMessages[result.error] ?? tEgresado('applyError'))
        }
      } else {
        toast.success(tEgresado('applySuccess'))
        router.push('/egresado/applications')
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : tEgresado('unexpectedError'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        {/* Back Link */}
        <div className="flex justify-start mb-6">
          <Link
            href={`/egresado/projects/${projectId}`}
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {tEgresado('backToProjectDetail')}
          </Link>
        </div>

        {/* Title Block */}
        <div className="space-y-2 text-left mb-8">
          <h1 className="text-3xl font-bold font-heading text-ink-strong tracking-tight">
            {tEgresado('applyFormTitle')}
            <span className="text-primary">.</span>
          </h1>
          <p className="text-sm font-sans text-ink-muted">
            Proyecto:{' '}
            <span className="font-semibold text-ink-strong">
              {projectTitle}
            </span>
          </p>
        </div>

        {/* AI Assistant Help Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex gap-4 text-left mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 self-start">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold font-heading uppercase tracking-wider text-primary">
              MÓDULO DE ASISTENCIA INTELIGENTE
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed font-sans">
              Ingresa el contexto base. Nuestro motor de IA optimizará el
              título, la descripción técnica y los stacks recomendados para vos
              en tiempo real.
            </p>
          </div>
        </div>

        {/* Main Form Container Card */}
        <Card className="border border-border/40 bg-surface shadow-md rounded-3xl overflow-hidden text-left">
          <CardContent className="p-8 space-y-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-8 font-sans"
            >
              {/* LOGÍSTICA DEL PROYECTO */}
              <div className="space-y-5">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-ink-muted border-b border-border/40 pb-2">
                  Logística del proyecto
                </h3>

                {/* TÍTULO DEL PROYECTO */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                    <Label htmlFor="tituloProyectoMock">
                      Título del proyecto
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/5 text-primary border-primary/20 border"
                    >
                      IA GENERATED • OPTIONAL
                    </Badge>
                  </div>
                  <Input
                    id="tituloProyectoMock"
                    placeholder="Ej: Rediseño UX App Pedidos"
                    className="bg-slate-100/80 border-border/80 text-ink-strong"
                    readOnly
                    value={'Propuesta para ' + projectTitle}
                  />
                </div>

                {/* MODALIDAD DE TRABAJO */}
                <div className="space-y-2">
                  <Label
                    htmlFor="modalidadTrabajoMock"
                    className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted"
                  >
                    Modalidad de trabajo
                  </Label>
                  <div className="relative">
                    <select
                      id="modalidadTrabajoMock"
                      className="w-full bg-slate-100/80 border border-border/80 rounded-lg px-3 py-2 text-sm text-ink-strong appearance-none focus:outline-none cursor-not-allowed"
                      disabled
                      value="remoto"
                    >
                      <option value="remoto">Remoto</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                {/* Column Row: MONEDA, PRESUPUESTO MINIMO, PRESUPUESTO MAXIMO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="monedaMock"
                      className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted"
                    >
                      Moneda
                    </Label>
                    <div className="relative">
                      <select
                        id="monedaMock"
                        className="w-full bg-slate-100/80 border border-border/80 rounded-lg px-3 py-2 text-sm text-ink-strong appearance-none focus:outline-none cursor-not-allowed"
                        disabled
                        value="USD"
                      >
                        <option value="USD">USD</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="presupuestoMinMock"
                      className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted"
                    >
                      Presupuesto mínimo
                    </Label>
                    <Input
                      id="presupuestoMinMock"
                      type="text"
                      placeholder="1000"
                      value="1000"
                      className="bg-slate-100/80 border-border/80 text-ink-strong cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="presupuestoMaxMock"
                      className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted"
                    >
                      Presupuesto máximo
                    </Label>
                    <Input
                      id="presupuestoMaxMock"
                      type="text"
                      placeholder="2000"
                      value="2000"
                      className="bg-slate-100/80 border-border/80 text-ink-strong cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>

                {/* PLAZO DE RECEPCIÓN DE OFERTAS */}
                <div className="space-y-2">
                  <Label
                    htmlFor="plazoMock"
                    className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted"
                  >
                    Plazo de recepción de ofertas
                  </Label>
                  <div className="relative">
                    <select
                      id="plazoMock"
                      className="w-full bg-slate-100/80 border border-border/80 rounded-lg px-3 py-2 text-sm text-ink-strong appearance-none focus:outline-none cursor-not-allowed"
                      disabled
                      value="10_dias"
                    >
                      <option value="10_dias">10 días</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                  <p className="text-[9px] font-extrabold text-orange-600 tracking-wider uppercase pt-0.5">
                    RANGO SUGERIDO: 5 - 15 DIAS
                  </p>
                </div>
              </div>

              {/* PROPUESTA TÉCNICA */}
              <div className="space-y-6 pt-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-ink-muted border-b border-border/40 pb-2">
                  Propuesta técnica
                </h3>

                {/* PLANTEAMIENTO DE SOLUCIÓN */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                    <Label htmlFor="planteamientoSolucion">
                      Planteamiento de solución
                    </Label>
                    <span className="font-normal text-ink-muted">
                      Mínimo {MIN_PLANTEAMIENTO_LEN} caracteres
                    </span>
                  </div>
                  <Textarea
                    id="planteamientoSolucion"
                    rows={6}
                    placeholder="Explica cómo resolverías el reto de este proyecto..."
                    className={`bg-card border-border/80 text-ink-strong ${errors.planteamientoSolucion ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                    {...register('planteamientoSolucion')}
                  />
                  {errors.planteamientoSolucion && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.planteamientoSolucion.message}
                    </p>
                  )}
                </div>

                {/* ENLACE DEL PROTOTIPO */}
                <div className="space-y-2">
                  <Label
                    htmlFor="prototipoUrl"
                    className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted"
                  >
                    Enlace del prototipo
                  </Label>
                  <Input
                    id="prototipoUrl"
                    type="url"
                    placeholder="https://framer.com/..."
                    className={`bg-card border-border/80 text-ink-strong ${errors.prototipoUrl ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                    {...register('prototipoUrl')}
                  />
                  {errors.prototipoUrl && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.prototipoUrl.message}
                    </p>
                  )}
                </div>

                {/* CARTA DE PRESENTACIÓN */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                    <Label htmlFor="coverLetter">Carta de presentación</Label>
                    <span className="font-normal text-ink-muted">
                      Máximo {MAX_CARTA_LEN} caracteres
                    </span>
                  </div>
                  <Textarea
                    id="coverLetter"
                    rows={6}
                    placeholder="Cuéntale a la empresa por qué eres el candidato ideal..."
                    className={`bg-card border-border/80 text-ink-strong ${errors.coverLetter ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                    {...register('coverLetter')}
                  />
                  {errors.coverLetter && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.coverLetter.message}
                    </p>
                  )}
                </div>

                {/* DOCUMENTACIÓN TÉCNICA (PDF O ZIP) */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                    Documentación técnica (PDF o ZIP)
                  </Label>
                  <label
                    htmlFor="documentacionTecnica"
                    className="cursor-pointer border border-dashed border-border/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2 bg-surface hover:bg-muted/10 transition-colors"
                  >
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-ink-strong">
                      {fileName
                        ? `Archivo: ${fileName}`
                        : 'Haz clic para subir o arrastra y suelta'}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      PDF o ZIP (máx. 5 MB)
                    </p>
                  </label>
                  <input
                    id="documentacionTecnica"
                    type="file"
                    accept=".pdf,.zip"
                    className="hidden"
                    {...register('documentacionTecnica')}
                  />
                  {errors.documentacionTecnica?.message && (
                    <p className="text-xs font-semibold text-destructive">
                      {String(errors.documentacionTecnica.message)}
                    </p>
                  )}
                </div>

                {/* ENLACES EXTRA (Opcionales) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                      Enlaces adicionales
                    </Label>
                    {fields.length < MAX_ENLACES_EXTRA && (
                      <button
                        type="button"
                        onClick={() => append({ value: '' })}
                        className="text-[10px] font-extrabold uppercase text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {tEgresado('addLink')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-2">
                        <div className="flex-grow">
                          <Input
                            type="url"
                            placeholder="https://..."
                            className={`bg-card border-border/80 text-ink-strong ${errors.enlacesExtra?.[index]?.value ? 'border-destructive' : 'focus-visible:ring-primary'}`}
                            {...register(`enlacesExtra.${index}.value`)}
                          />
                          {errors.enlacesExtra?.[index]?.value && (
                            <p className="mt-1 text-xs font-semibold text-destructive">
                              {errors.enlacesExtra[index]?.value?.message}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isPending && (
                <p className="text-xs font-semibold text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                  {tAccount('actionDisabledPending')}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-6 pt-6 border-t border-border/40 mt-8">
                <Link
                  href={`/egresado/projects/${projectId}`}
                  className="text-sm font-extrabold text-ink-muted hover:text-ink-strong transition-colors cursor-pointer"
                >
                  Cancelar
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting || isPending}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  Enviar Postulación
                  <Play className="w-3 h-3 fill-white" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
