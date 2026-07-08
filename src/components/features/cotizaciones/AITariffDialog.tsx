'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Sparkles, Loader2, Coins, TrendingUp, HelpCircle } from 'lucide-react'
import { sugerirTarifaConIA } from '@/lib/cotizaciones/actions'

interface AITariffDialogProps {
  isOpen: boolean
  onClose: () => void
  onRateApplied: (rate: number) => void
  techStack: string[]
}

export function AITariffDialog({
  isOpen,
  onClose,
  onRateApplied,
  techStack = [],
}: AITariffDialogProps) {
  const t = useTranslations('Cotizador')
  const [isCalculating, setIsCalculating] = useState(false)
  const [suggestion, setSuggestion] = useState<{
    tarifaSugerida: number
    rangoMin: number
    rangoMax: number
    explicacion: string
  } | null>(null)

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true)
    try {
      const result = await sugerirTarifaConIA(techStack)
      if (result.ok) {
        setSuggestion(result.data)
        toast.success(t('aiTariffSuccess'))
      } else {
        toast.error(t('aiTariffError'))
        onClose()
      }
    } catch {
      toast.error(t('aiTariffError'))
      onClose()
    } finally {
      setIsCalculating(false)
    }
  }, [techStack, t, onClose])

  useEffect(() => {
    if (isOpen && techStack.length > 0) {
      handleCalculate()
    }
  }, [isOpen, techStack.length, handleCalculate])

  const handleApply = () => {
    if (suggestion) {
      onRateApplied(suggestion.tarifaSugerida)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] border border-border/80 bg-card/95 backdrop-blur-md overflow-hidden rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-heading text-foreground">
            <Sparkles className="w-5 h-5 text-primary animate-pulse shrink-0" />
            {t('aiTariffTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-sans">
            {t('aiTariffDesc')}
          </DialogDescription>
        </DialogHeader>

        {isCalculating ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-semibold text-ink-muted animate-pulse font-sans">
              {t('aiTariffLoading')}
            </p>
          </div>
        ) : (
          suggestion && (
            <div className="space-y-6 py-4 font-sans">
              {/* Tarifa Sugerida Display */}
              <div className="relative bg-gradient-to-br from-primary/10 via-magenta/5 to-transparent border border-primary/20 rounded-2xl p-6 text-center shadow-inner overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-15">
                  <Coins className="w-16 h-16 text-primary" />
                </div>
                <span className="text-xs uppercase tracking-widest font-extrabold text-primary block mb-1">
                  {t('rateSuggested')}
                </span>
                <span className="text-4xl font-extrabold font-heading text-ink-strong tracking-tight">
                  ${suggestion.tarifaSugerida}{' '}
                  <span className="text-base font-semibold text-ink-muted">
                    {t('usdPerHour')}
                  </span>
                </span>
              </div>

              {/* Rango Visual Indicator */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-ink-strong flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-magenta shrink-0" />
                  {t('marketRange')}
                </h4>

                {/* Visual Progress Bar/Range Indicator */}
                <div className="relative h-2.5 w-full bg-surface-sunken border border-border/30 rounded-full">
                  {/* Highlight bar between Min and Max */}
                  <div className="absolute h-full rounded-full bg-gradient-to-r from-primary/50 to-magenta/60 left-[20%] right-[20%]" />
                  {/* Dot for suggested rate */}
                  <div className="absolute -top-1.5 w-5 h-5 rounded-full bg-foreground border-2 border-surface shadow-md flex items-center justify-center left-1/2 -translate-x-1/2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 text-[10px] font-extrabold text-ink-muted uppercase tracking-wider text-center pt-1">
                  <div>
                    <span className="block font-sans text-xs text-foreground">
                      ${suggestion.rangoMin} USD
                    </span>
                    <span>{t('minRate')}</span>
                  </div>
                  <div>
                    <span className="block font-sans text-xs text-primary font-bold">
                      ${suggestion.tarifaSugerida} USD
                    </span>
                    <span>{t('recommended')}</span>
                  </div>
                  <div>
                    <span className="block font-sans text-xs text-foreground">
                      ${suggestion.rangoMax} USD
                    </span>
                    <span>{t('maxRate')}</span>
                  </div>
                </div>
              </div>

              {/* Explanation Card */}
              <div className="bg-surface-sunken/40 border border-border/40 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-ink-strong flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  {t('whySuggested')}
                </h4>
                <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-line">
                  {suggestion.explicacion}
                </p>
              </div>
            </div>
          )
        )}

        <DialogFooter className="gap-2 sm:gap-0 border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCalculating}
            className="border-border/60 hover:bg-muted/50 rounded-xl"
          >
            {t('cancel')}
          </Button>
          {suggestion && (
            <Button
              type="button"
              onClick={handleApply}
              disabled={isCalculating}
              className="bg-gradient-to-r from-primary to-magenta text-white hover:opacity-90 font-semibold shadow-md rounded-xl flex items-center gap-1.5"
            >
              {t('applyRate')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
