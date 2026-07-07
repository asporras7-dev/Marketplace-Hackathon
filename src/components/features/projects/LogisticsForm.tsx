'use client'

import { useFormContext, Controller, useWatch } from 'react-hook-form'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MODALIDADES,
  MONEDAS,
  parsePlazo,
  PLAZO_MAX_DIAS,
  PLAZO_MIN_DIAS,
  type LogisticsFormValues,
} from '@/lib/projects/schemas'
import { CountryRegionFields } from '@/components/features/geo/CountryRegionFields'
import type { ComboboxOption } from '@/components/ui/combobox'

interface LogisticsFormProps {
  disabled: boolean
  todayIso: string
  countries: ComboboxOption[]
  initialRegions: ComboboxOption[]
}

/** Opciones del plazo de recepción (RF-21): 5..15 días. */
const PLAZO_OPCIONES = Array.from(
  { length: PLAZO_MAX_DIAS - PLAZO_MIN_DIAS + 1 },
  (_, i) => PLAZO_MIN_DIAS + i,
)

/**
 * Fecha de cierre estimada para mostrarle al empresario: `todayIso` + plazo, en
 * UTC (consistente server/cliente, sin desajuste de hidratación). Es solo una
 * referencia visual; la fecha real la fija el RPC con `now()` al publicar.
 */
function calcularCierreEstimado(
  todayIso: string,
  plazoDias: string,
  locale: string,
): string | null {
  const dias = parsePlazo(plazoDias)
  if (dias === null || dias < PLAZO_MIN_DIAS || dias > PLAZO_MAX_DIAS) {
    return null
  }
  const base = Date.parse(`${todayIso}T00:00:00.000Z`)
  if (Number.isNaN(base)) return null
  const cierre = new Date(base + dias * 86_400_000)
  return cierre.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function FieldError({ code }: { code?: string | undefined }) {
  const t = useTranslations('ProjectPublish')
  if (!code) return null
  return (
    <p className="text-xs font-semibold text-destructive">
      {t(`errors.${code}`)}
    </p>
  )
}

/**
 * Pantalla 1 — logística (errolpendiente §1): modalidad, moneda, presupuesto,
 * fecha de cierre, país/ciudad (solo si la modalidad ≠ remoto) y `titulo`
 * OPCIONAL. El fondo (descripción, área, categorías, tecnologías) NO va acá: lo
 * produce la IA y se revisa en la propuesta (Pantalla 2).
 */
export function LogisticsForm({
  disabled,
  todayIso,
  countries,
  initialRegions,
}: LogisticsFormProps) {
  const t = useTranslations('ProjectPublish')
  const tCommon = useTranslations('Common')
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<LogisticsFormValues>()

  const locale = useLocale()
  const modalidad = useWatch({ control, name: 'modalidad' })
  const requiereUbicacion = modalidad !== '' && modalidad !== 'remoto'
  const paisIso = useWatch({ control, name: 'paisIso' })
  const region = useWatch({ control, name: 'region' })

  // Decimales por defecto (USD); en colones solo enteros (céntimos en desuso).
  // El `step` lo refleja en el input; la validación dura vive en el schema/backend.
  const moneda = useWatch({ control, name: 'moneda' })
  const montoStep = moneda === 'CRC' ? '1' : '0.01'

  const plazoDias = useWatch({ control, name: 'plazoDias' })
  const cierreEstimado = calcularCierreEstimado(todayIso, plazoDias, locale)

  return (
    <section className="space-y-6">
      <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted text-left">
        {t('sectionLogistics')}
      </h2>

      <div className="space-y-2 text-left">
        <Label
          htmlFor="titulo"
          className="text-xs font-extrabold uppercase tracking-wider text-foreground flex justify-between gap-2 items-center"
        >
          <span>{t('fieldTitle')}</span>
          <span className="text-[9px] font-extrabold bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 tracking-wider uppercase">
            IA GENERATED · OPTIONAL
          </span>
        </Label>
        <Input
          id="titulo"
          type="text"
          disabled={disabled}
          placeholder="Ej. Arquitectura Microservicios Next.js"
          className="bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus-visible:ring-secondary focus-visible:border-secondary shadow-sm transition-all placeholder:text-ink-subtle"
          {...register('titulo')}
        />
        <FieldError code={errors.titulo?.message} />
      </div>

      <div className="space-y-2 text-left">
        <Label
          htmlFor="modalidad"
          className="text-xs font-extrabold uppercase tracking-wider text-foreground"
        >
          {t('fieldModality')}
        </Label>
        <Controller
          name="modalidad"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="modalidad"
                className="w-full bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus:ring-secondary focus:border-secondary shadow-sm transition-all"
              >
                <SelectValue placeholder={t('fieldModalityPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((modo) => (
                  <SelectItem key={modo} value={modo}>
                    {tCommon(modo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError code={errors.modalidad?.message} />
      </div>

      {requiereUbicacion && (
        <div className="space-y-2 text-left">
          <CountryRegionFields
            countries={countries}
            initialRegions={initialRegions}
            countryValue={paisIso ?? ''}
            regionValue={region ?? ''}
            onCountryChange={(code) =>
              setValue('paisIso', code, { shouldValidate: true })
            }
            onRegionChange={(code) =>
              setValue('region', code, { shouldValidate: true })
            }
            countryLabel={t('fieldCountry')}
            countryId="paisIso"
            regionId="region"
            disabled={disabled}
            countryInvalid={Boolean(errors.paisIso)}
            comboboxClassName="bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus:ring-secondary focus:border-secondary shadow-sm transition-all"
          />
          <FieldError code={errors.paisIso?.message} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="space-y-2">
          <Label
            htmlFor="moneda"
            className="text-xs font-extrabold uppercase tracking-wider text-foreground"
          >
            {t('fieldCurrency')}
          </Label>
          <Controller
            name="moneda"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="moneda"
                  className="w-full bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus:ring-secondary focus:border-secondary shadow-sm transition-all"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((codigo) => (
                    <SelectItem key={codigo} value={codigo}>
                      {codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="presupuestoMin"
            className="text-xs font-extrabold uppercase tracking-wider text-foreground"
          >
            {t('fieldBudgetMin')}
          </Label>
          <Input
            id="presupuestoMin"
            type="number"
            min={1}
            step={montoStep}
            disabled={disabled}
            placeholder="0.00"
            className="bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus-visible:ring-secondary focus-visible:border-secondary shadow-sm transition-all placeholder:text-ink-subtle"
            {...register('presupuestoMin')}
          />
          <FieldError code={errors.presupuestoMin?.message} />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="presupuestoMax"
            className="text-xs font-extrabold uppercase tracking-wider text-foreground"
          >
            {t('fieldBudgetMax')}
          </Label>
          <Input
            id="presupuestoMax"
            type="number"
            min={1}
            step={montoStep}
            disabled={disabled}
            placeholder="0.00"
            className="bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus-visible:ring-secondary focus-visible:border-secondary shadow-sm transition-all placeholder:text-ink-subtle"
            {...register('presupuestoMax')}
          />
          <FieldError code={errors.presupuestoMax?.message} />
        </div>
      </div>

      <div className="space-y-2 text-left">
        <Label
          htmlFor="plazoDias"
          className="text-xs font-extrabold uppercase tracking-wider text-foreground"
        >
          {t('fieldDeadline')}
        </Label>
        <Controller
          name="plazoDias"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="plazoDias"
                className="w-full bg-white border-border/80 rounded-2xl h-11 px-4 text-sm focus:ring-secondary focus:border-secondary shadow-sm transition-all"
              >
                <SelectValue placeholder="Definir ventana de tiempo" />
              </SelectTrigger>
              <SelectContent>
                {PLAZO_OPCIONES.map((dias) => (
                  <SelectItem key={dias} value={String(dias)}>
                    {t('deadlineDays', { dias })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError code={errors.plazoDias?.message} />
        <p className="text-[9px] font-extrabold text-warning tracking-widest uppercase mt-1.5">
          RANGO SUGERIDO: {PLAZO_MIN_DIAS} - {PLAZO_MAX_DIAS} DÍAS
        </p>
        {cierreEstimado && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('deadlineEstimate', { fecha: cierreEstimado })}{' '}
            {t('deadlineEstimateHint')}
          </p>
        )}
      </div>
    </section>
  )
}
