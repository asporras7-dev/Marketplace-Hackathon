'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Label } from '@/components/ui/label'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { Subdivision } from '@/lib/geo/catalog-logic'

interface CountryRegionFieldsProps {
  /** Países resueltos al locale (provistos por el server). */
  countries: ComboboxOption[]
  /** Subdivisiones del país inicial, precargadas en el server (vacío si no hay). */
  initialRegions: ComboboxOption[]
  countryValue: string
  regionValue: string
  onCountryChange: (code: string) => void
  onCountryNameChange?: (name: string) => void
  onRegionChange: (code: string) => void
  onRegionNameChange?: (name: string) => void
  /** Etiqueta del país, propia de cada formulario ("País" / "País del proyecto"). */
  countryLabel: string
  countryId: string
  regionId: string
  /** Etiqueta de la región (por defecto usa t('regionLabel')). */
  regionLabel?: string
  /** Ocultar la etiqueta "(opcional)" al lado de la región. */
  hideRegionOptional?: boolean
  disabled?: boolean
  countryInvalid?: boolean
  comboboxClassName?: string | undefined
}

function toRegionOptions(subdivisions: Subdivision[]): ComboboxOption[] {
  return subdivisions.map((subdivision) => ({
    value: subdivision.code,
    label: subdivision.name,
  }))
}

/**
 * País (ISO 3166-1) + región (ISO 3166-2) como selectores dependientes. La
 * región solo ofrece subdivisiones del país elegido, así que la combinación
 * imposible (ej. San José + Brasil) no existe. Las subdivisiones del país
 * inicial llegan precargadas por el server; al cambiar de país se piden al
 * route handler. Se evita `useEffect` de estado: el fetch vive en el handler.
 */
export function CountryRegionFields({
  countries,
  initialRegions,
  countryValue,
  regionValue,
  onCountryChange,
  onCountryNameChange,
  onRegionChange,
  onRegionNameChange,
  countryLabel,
  countryId,
  regionId,
  regionLabel,
  hideRegionOptional = false,
  disabled = false,
  countryInvalid = false,
  comboboxClassName,
}: CountryRegionFieldsProps) {
  const t = useTranslations('Geo')
  const [regions, setRegions] = React.useState<ComboboxOption[]>(initialRegions)
  const [loading, setLoading] = React.useState(false)
  // Última selección pedida: descarta respuestas que llegan fuera de orden.
  const lastRequested = React.useRef(countryValue)

  async function handleCountryChange(code: string) {
    onCountryChange(code)
    const countryName = countries.find((c) => c.value === code)?.label || ''
    if (onCountryNameChange) onCountryNameChange(countryName)

    onRegionChange('') // la región anterior no pertenece al nuevo país
    if (onRegionNameChange) onRegionNameChange('')
    lastRequested.current = code

    if (!code) {
      setRegions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/geo/subdivisions?country=${encodeURIComponent(code)}`,
      )
      const data: { subdivisions: Subdivision[] } = response.ok
        ? await response.json()
        : { subdivisions: [] }
      if (lastRequested.current !== code) return
      setRegions(toRegionOptions(data.subdivisions))
    } catch {
      if (lastRequested.current === code) setRegions([])
    } finally {
      if (lastRequested.current === code) setLoading(false)
    }
  }

  const regionPlaceholder = !countryValue
    ? t('selectCountryFirst')
    : loading
      ? t('loadingRegions')
      : regions.length === 0
        ? t('noRegionsForCountry')
        : t('selectRegion')

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={countryId} className="text-sm font-bold">
          {countryLabel}
        </Label>
        <Combobox
          id={countryId}
          options={countries}
          value={countryValue}
          onValueChange={handleCountryChange}
          placeholder={t('selectCountry')}
          searchPlaceholder={t('searchCountry')}
          emptyText={t('noCountry')}
          disabled={disabled}
          ariaInvalid={countryInvalid}
          className={comboboxClassName}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor={regionId}
          className="flex justify-between gap-2 text-sm font-bold"
        >
          <span>{regionLabel || t('regionLabel')}</span>
          {!hideRegionOptional && (
            <span className="text-muted-foreground text-xs font-normal">
              {t('regionOptional')}
            </span>
          )}
        </Label>
        <Combobox
          id={regionId}
          options={regions}
          value={regionValue}
          onValueChange={(code) => {
            onRegionChange(code)
            const regionName =
              regions.find((r) => r.value === code)?.label || ''
            if (onRegionNameChange) onRegionNameChange(regionName)
          }}
          placeholder={regionPlaceholder}
          searchPlaceholder={t('searchRegion')}
          emptyText={t('noRegion')}
          disabled={disabled || !countryValue || loading}
          className={comboboxClassName}
        />
      </div>
    </div>
  )
}
