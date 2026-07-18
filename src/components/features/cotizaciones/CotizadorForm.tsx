'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Calculator,
  Plus,
  Trash2,
  Sparkles,
  Save,
  BookOpen,
  DollarSign,
  Briefcase,
  Layers,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AIHelpDialog } from './AIHelpDialog'
import { AITariffDialog } from './AITariffDialog'
import { guardarCotizacion } from '@/lib/cotizaciones/actions'
import {
  GuardarCotizacionSchema,
  type GuardarCotizacionInput,
} from '@/lib/cotizaciones/schema'

import { type CotizacionConProyecto } from '@/lib/cotizaciones/queries'
import { calcularCotizacion } from '@/lib/cotizaciones/calculator'

interface Project {
  id: string
  title: string
  description: string
  stack: string[]
  budget: number
  mode: 'remoto' | 'hibrido' | 'presencial'
  companyName: string
}

interface CotizadorFormProps {
  projects?: Project[]
  initialSavedCotizaciones?: CotizacionConProyecto[]
  onSaveCallback?: (id: string, totalUsd: number) => void
  embeddedProjectId?: string
}

export function CotizadorForm({
  projects = [],
  initialSavedCotizaciones = [],
  onSaveCallback,
  embeddedProjectId,
}: CotizadorFormProps) {
  const t = useTranslations('Cotizador')
  const [savedCotizaciones] = useState<CotizacionConProyecto[]>(
    initialSavedCotizaciones,
  )
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false)
  const [isTariffDialogOpen, setIsTariffDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 1. Setup Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuardarCotizacionInput>({
    resolver: zodResolver(GuardarCotizacionSchema),
    defaultValues: {
      id_proyecto: embeddedProjectId || null,
      nombre_cotizacion: '',
      duracion_semanas: 4,
      horas_estimadas: 80,
      complejidad: 'media',
      stack: ['React', 'Next.js', 'Supabase'],
      tipo_entregable: 'web_app',
      funcionalidades: [
        'Autenticación básica',
        'Panel de usuario',
        'Base de datos',
      ],
      tarifa_base_hora: 20,
      modalidad: 'remoto',
      incluye_iva: true,
      explicacion_ia: '',
    },
  })

  // useFieldArray is removed because 'funcionalidades' is a primitive array (string[]) and not an array of objects.

  // Watch values for live calculation
  const watchedValues = watch()

  // Dynamic functional tags state
  const [newFuncText, setNewFuncText] = useState('')
  const [newTechText, setNewTechText] = useState('')
  const [techList, setTechList] = useState<string[]>([
    'React',
    'Next.js',
    'Supabase',
  ])

  // Sync techList with form value
  useEffect(() => {
    setValue('stack', techList)
  }, [techList, setValue])

  // Select project listener to auto-populate fields
  const selectedProjectId = watch('id_proyecto')
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId)
  }, [selectedProjectId, projects])

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.title) {
        setValue('nombre_cotizacion', `Cotización: ${selectedProject.title}`)
      }
      if (selectedProject.stack && selectedProject.stack.length > 0) {
        setTechList(selectedProject.stack)
      }
      if (selectedProject.mode) {
        setValue('modalidad', selectedProject.mode)
      }
    }
  }, [selectedProject, setValue])

  // If embedded in apply page
  useEffect(() => {
    if (embeddedProjectId && projects.length > 0) {
      setValue('id_proyecto', embeddedProjectId)
    }
  }, [embeddedProjectId, projects, setValue])

  // 2. Perform math calculations (live update)
  const calculations = useMemo(() => {
    return calcularCotizacion({
      horas_estimadas: watchedValues.horas_estimadas,
      tarifa_base_hora: watchedValues.tarifa_base_hora,
      complejidad:
        (watchedValues.complejidad as 'baja' | 'media' | 'alta') || 'media',
      modalidad:
        (watchedValues.modalidad as 'remoto' | 'hibrido' | 'presencial') ||
        'remoto',
      incluye_iva: watchedValues.incluye_iva,
    })
  }, [
    watchedValues.horas_estimadas,
    watchedValues.tarifa_base_hora,
    watchedValues.complejidad,
    watchedValues.modalidad,
    watchedValues.incluye_iva,
  ])

  // 3. AI Assist load
  const handleAiEstimateLoaded = (data: {
    semanas: number
    horas_semanales: number
    complejidad: 'baja' | 'media' | 'alta'
    funcionalidades: string[]
    explicacion: string
  }) => {
    setValue('duracion_semanas', data.semanas)
    const totalHoras = data.semanas * data.horas_semanales
    setValue('horas_estimadas', totalHoras)
    setValue('complejidad', data.complejidad)
    setValue('explicacion_ia', data.explicacion)

    // Replace functionalities array
    // First clear existing
    setValue('funcionalidades', data.funcionalidades)
  }

  const handleOpenTariffDialog = () => {
    if (techList.length === 0) {
      toast.warning(t('emptyStackWarning'))
      return
    }
    setIsTariffDialogOpen(true)
  }

  // 4. Save form
  const handleSave = async (data: GuardarCotizacionInput) => {
    setIsSaving(true)
    try {
      const result = await guardarCotizacion(data)
      if (result.ok) {
        toast.success(t('saveSuccess'))
        // Fetch new list of cotizaciones if in standalone mode
        if (!onSaveCallback) {
          window.location.reload()
        } else {
          onSaveCallback(result.data, calculations.totalUsd)
        }
      } else {
        toast.error(t('saveError'))
      }
    } catch {
      toast.error(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  // Add custom tags helpers
  const handleAddTech = () => {
    const text = newTechText.trim()
    if (text && !techList.includes(text)) {
      setTechList([...techList, text])
      setNewTechText('')
    }
  }

  const handleRemoveTech = (index: number) => {
    setTechList(techList.filter((_, i) => i !== index))
  }

  const handleAddFunc = () => {
    const text = newFuncText.trim()
    if (text) {
      setValue('funcionalidades', [
        ...(watchedValues.funcionalidades || []),
        text,
      ])
      setNewFuncText('')
    }
  }

  // Format currency helper
  const formatCurrency = (val: number, isCRC = false) => {
    return new Intl.NumberFormat(isCRC ? 'es-CR' : 'en-US', {
      style: 'currency',
      currency: isCRC ? 'CRC' : 'USD',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* AI Estimator Modal */}
      <AIHelpDialog
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onEstimateLoaded={handleAiEstimateLoaded}
        selectedProjectStack={selectedProject?.stack}
      />

      {/* AI Tariff Suggester Modal */}
      <AITariffDialog
        isOpen={isTariffDialogOpen}
        onClose={() => setIsTariffDialogOpen(false)}
        onRateApplied={(rate) => setValue('tarifa_base_hora', rate)}
        techStack={techList}
      />

      {/* LEFT COLUMN: Input Form */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-primary" />
                  {t('title')}
                </CardTitle>
                <CardDescription className="text-xs text-ink-muted">
                  {t('subtitle')}
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => setIsAiDialogOpen(true)}
                className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                {t('estimationHelp')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              {/* Project Select Dropdown */}
              {!embeddedProjectId && (
                <div className="space-y-2">
                  <Label
                    htmlFor="id_proyecto"
                    className="text-xs font-semibold text-foreground flex items-center gap-1"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    {t('associateProject')}
                  </Label>
                  <Select
                    value={watchedValues.id_proyecto || ''}
                    onValueChange={(val) =>
                      setValue('id_proyecto', val === '' ? null : val)
                    }
                  >
                    <SelectTrigger className="border-border/60 bg-background/50 text-sm">
                      <SelectValue
                        placeholder={t('selectProjectPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-card">
                      <SelectItem value="">{t('noneOption')}</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title} ({p.companyName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedProject && (
                    <div className="mt-2 p-3 rounded-xl border border-primary/20 bg-primary/5 flex justify-between items-center text-xs">
                      <span className="font-semibold text-primary">
                        {t('projectBudget')}:
                      </span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(selectedProject.budget)} USD
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quotation Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="nombre_cotizacion"
                  className="text-xs font-semibold text-foreground"
                >
                  {t('quotationNameLabel')}
                </Label>
                <Input
                  id="nombre_cotizacion"
                  {...register('nombre_cotizacion')}
                  placeholder={t('quotationNamePlaceholder')}
                  className="border-border/60 bg-background/50 text-sm"
                />
                {errors.nombre_cotizacion && (
                  <p className="text-xs font-semibold text-magenta">
                    {errors.nombre_cotizacion.message}
                  </p>
                )}
              </div>

              {/* Grid: Hours, Weeks & Base Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="duracion_semanas"
                    className="text-xs font-semibold text-foreground"
                  >
                    {t('weeks')}
                  </Label>
                  <Input
                    id="duracion_semanas"
                    type="number"
                    {...register('duracion_semanas', { valueAsNumber: true })}
                    className="border-border/60 bg-background/50 text-sm"
                  />
                  {errors.duracion_semanas && (
                    <p className="text-xs font-semibold text-magenta">
                      {errors.duracion_semanas.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="horas_estimadas"
                    className="text-xs font-semibold text-foreground"
                  >
                    {t('hoursLabel')}
                  </Label>
                  <Input
                    id="horas_estimadas"
                    type="number"
                    {...register('horas_estimadas', { valueAsNumber: true })}
                    className="border-border/60 bg-background/50 text-sm"
                  />
                  {errors.horas_estimadas && (
                    <p className="text-xs font-semibold text-magenta">
                      {errors.horas_estimadas.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="tarifa_base_hora"
                      className="text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      {t('baseRateLabel')}
                    </Label>
                    <button
                      type="button"
                      onClick={handleOpenTariffDialog}
                      className="text-[10px] text-primary hover:text-primary/80 font-bold flex items-center gap-1 border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                      title={t('suggestRateAiTitle')}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {t('suggestRateAi')}
                    </button>
                  </div>
                  <Input
                    id="tarifa_base_hora"
                    type="number"
                    {...register('tarifa_base_hora', { valueAsNumber: true })}
                    className="border-border/60 bg-background/50 text-sm"
                  />
                  {errors.tarifa_base_hora && (
                    <p className="text-xs font-semibold text-magenta">
                      {errors.tarifa_base_hora.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Complexity (baja / media / alta) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  {t('complexity')}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['baja', 'media', 'alta'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setValue('complejidad', level)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                        watchedValues.complejidad === level
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'border-border/60 hover:bg-muted/50 text-foreground/80'
                      }`}
                    >
                      <span>{t(`complexity_${level}`)}</span>
                      <span className="text-[10px] opacity-75">
                        {level === 'baja'
                          ? 'x1.00'
                          : level === 'media'
                            ? 'x1.25'
                            : 'x1.50'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modality (remoto / hybrido / presencial) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  {t('modality')}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['remoto', 'hibrido', 'presencial'] as const).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setValue('modalidad', mode)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                          watchedValues.modalidad === mode
                            ? 'bg-secondary border-secondary text-white shadow-sm'
                            : 'border-border/60 hover:bg-muted/50 text-foreground/80'
                        }`}
                      >
                        <span>{t(`modality_${mode}`)}</span>
                        <span className="text-[10px] opacity-75">
                          {mode === 'remoto'
                            ? 'x1.00'
                            : mode === 'hibrido'
                              ? 'x1.05'
                              : 'x1.15'}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Technical Stack Tags */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {t('stack')}
                </Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {techList.map((tech, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-primary/5 border-primary/20 text-foreground text-xs py-0.5 px-2 flex items-center gap-1 rounded-full font-semibold"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(idx)}
                        className="text-magenta hover:text-magenta/80"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('addTechPlaceholder')}
                    value={newTechText}
                    onChange={(e) => setNewTechText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), handleAddTech())
                    }
                    className="border-border/60 bg-background/50 text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTech}
                    className="border-border/60 h-9 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Functionalities checklist */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  {t('featuresLabel')}
                </Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {watchedValues.funcionalidades?.map(
                    (func: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 rounded-xl bg-background/50 border border-border/40 text-xs"
                      >
                        <span className="flex items-center gap-2 text-foreground font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                          {func}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [
                              ...(watchedValues.funcionalidades || []),
                            ]
                            updated.splice(idx, 1)
                            setValue('funcionalidades', updated)
                          }}
                          className="text-ink-subtle hover:text-magenta transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('addFeaturePlaceholder')}
                    value={newFuncText}
                    onChange={(e) => setNewFuncText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), handleAddFunc())
                    }
                    className="border-border/60 bg-background/50 text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddFunc}
                    className="border-border/60 h-9 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* VAT Checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="incluye_iva"
                  checked={watchedValues.incluye_iva}
                  onCheckedChange={(checked) =>
                    setValue('incluye_iva', !!checked)
                  }
                />
                <Label
                  htmlFor="incluye_iva"
                  className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                >
                  {t('includeIva')}
                </Label>
              </div>

              {/* Action Button: Save */}
              <Button
                type="button"
                onClick={handleSubmit(handleSave)}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-primary via-secondary to-magenta text-white hover:opacity-90 transition-all py-2.5 font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {t('saveQuotation')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Live outputs and Saved calculations */}
      <div className="lg:col-span-5 space-y-6">
        {/* LIVE PRICING BREAKDOWN */}
        <Card className="border-2 border-primary/20 bg-primary/5 backdrop-blur-md shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Calculator className="w-24 h-24 text-primary" />
          </div>
          <CardHeader className="pb-2 relative z-10 border-b border-primary/10">
            <CardTitle className="text-lg font-bold font-heading text-primary">
              {t('liveBreakdown')}
            </CardTitle>
            <CardDescription className="text-[10px] text-ink-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {t('liveBreakdownDesc', { horas: watchedValues.horas_estimadas })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-5 relative z-10">
            {/* The Big Number (Estimated) */}
            <div className="text-center py-2 bg-white/40 dark:bg-black/25 rounded-2xl border border-primary/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                {t('estimated')}
              </span>
              <div className="text-3xl font-extrabold font-heading text-foreground mt-0.5">
                {formatCurrency(calculations.totalUsd)} USD
              </div>
              <div className="text-sm font-bold text-primary/80 mt-0.5">
                ≈ {formatCurrency(calculations.totalCrc, true)} CRC
              </div>
            </div>

            {/* Target range minimum - estimated - maximum */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
              <div className="p-2 bg-background/50 border border-border/40 rounded-xl">
                <span className="text-ink-muted text-[9px] uppercase">
                  {t('min')} (-15%)
                </span>
                <div className="text-foreground font-bold mt-0.5">
                  {formatCurrency(calculations.minUsd)}
                </div>
                <div className="text-primary/70 text-[9px]">
                  {formatCurrency(calculations.minCrc, true)}
                </div>
              </div>
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl scale-105 shadow-sm">
                <span className="text-primary text-[9px] uppercase font-extrabold">
                  {t('estimated')}
                </span>
                <div className="text-foreground font-extrabold mt-0.5">
                  {formatCurrency(calculations.totalUsd)}
                </div>
                <div className="text-primary/70 text-[9px]">
                  {formatCurrency(calculations.totalCrc, true)}
                </div>
              </div>
              <div className="p-2 bg-background/50 border border-border/40 rounded-xl">
                <span className="text-ink-muted text-[9px] uppercase">
                  {t('max')} (+20%)
                </span>
                <div className="text-foreground font-bold mt-0.5">
                  {formatCurrency(calculations.maxUsd)}
                </div>
                <div className="text-primary/70 text-[9px]">
                  {formatCurrency(calculations.maxCrc, true)}
                </div>
              </div>
            </div>

            {/* Detailed math breakdown */}
            <div className="space-y-2 pt-2 border-t border-primary/10 text-xs font-semibold text-ink-strong">
              <div className="flex justify-between">
                <span className="text-ink-muted">{t('baseCost')}:</span>
                <span>{formatCurrency(calculations.costoBase)} USD</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-ink-muted flex items-center gap-1">
                  Complejidad ({t(`complexity_${watchedValues.complejidad}`)}):
                </span>
                <span className="text-foreground">
                  +{formatCurrency(calculations.adicionalComplejidad)} USD
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-ink-muted flex items-center gap-1">
                  Modalidad ({t(`modality_${watchedValues.modalidad}`)}):
                </span>
                <span className="text-foreground">
                  +{formatCurrency(calculations.adicionalModalidad)} USD
                </span>
              </div>

              <div className="flex justify-between border-t border-dashed pt-1.5 mt-1">
                <span className="text-ink-muted">Subtotal:</span>
                <span>{formatCurrency(calculations.subtotalUsd)} USD</span>
              </div>

              {watchedValues.incluye_iva && (
                <div className="flex justify-between text-magenta">
                  <span>{t('iva')}:</span>
                  <span>+{formatCurrency(calculations.ivaUsd)} USD</span>
                </div>
              )}

              <div className="flex justify-between border-t-2 pt-2 mt-2 text-sm font-extrabold text-foreground">
                <span>{t('totalQuoted')}:</span>
                <span>{formatCurrency(calculations.totalUsd)} USD</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI EXPLANATION NOTE */}
        {watchedValues.explicacion_ia && (
          <Card className="border border-accent/30 bg-accent/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold font-heading text-accent flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                {t('aiJustification')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-ink leading-relaxed whitespace-pre-line">
              {watchedValues.explicacion_ia}
            </CardContent>
          </Card>
        )}

        {/* SAVED COTIZACIONES LIST (STANDALONE ONLY) */}
        {!onSaveCallback && savedCotizaciones.length > 0 && (
          <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold font-heading text-foreground flex items-center gap-1.5">
                <BookOpen className="w-4.5 h-4.5 text-primary" />
                {t('savedQuotations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {savedCotizaciones.map((c) => (
                <div
                  key={c.id_cotizacion}
                  onClick={() => {
                    setValue('id_proyecto', c.id_proyecto)
                    setValue('nombre_cotizacion', c.nombre_cotizacion)
                    setValue('duracion_semanas', c.duracion_semanas)
                    setValue('horas_estimadas', c.horas_estimadas)
                    setValue(
                      'complejidad',
                      c.complejidad as 'baja' | 'media' | 'alta',
                    )
                    setTechList(c.stack || [])
                    setValue('tipo_entregable', c.tipo_entregable)
                    setValue('funcionalidades', c.funcionalidades || [])
                    setValue('tarifa_base_hora', Number(c.tarifa_base_hora))
                    setValue(
                      'modalidad',
                      c.modalidad as 'remoto' | 'hibrido' | 'presencial',
                    )
                    setValue('incluye_iva', c.incluye_iva)
                    setValue('explicacion_ia', c.explicacion_ia)
                    toast.success(t('loadQuotationSuccess'))
                  }}
                  className="p-3 rounded-xl border border-border/50 bg-background/30 hover:bg-background/80 hover:border-primary/30 transition-all cursor-pointer text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-foreground truncate max-w-[200px]">
                      {c.nombre_cotizacion}
                    </span>
                    <Badge className="bg-primary/10 text-primary text-[9px] font-bold">
                      {c.complejidad.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-ink-muted">
                    <span>
                      {c.horas_estimadas} hrs ({c.duracion_semanas} sem)
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(Number(c.total_usd))} USD
                    </span>
                  </div>
                  {c.proyectos?.titulo && (
                    <div className="text-[10px] text-primary/80 flex items-center gap-1 font-semibold">
                      <Briefcase className="w-3 h-3" />
                      {c.proyectos.titulo}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
