'use client'

import React, { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'
import { estimarConIA } from '@/lib/cotizaciones/actions'

interface AIHelpDialogProps {
  isOpen: boolean
  onClose: () => void
  onEstimateLoaded: (data: {
    semanas: number
    horas_semanales: number
    complejidad: 'baja' | 'media' | 'alta'
    funcionalidades: string[]
    explicacion: string
  }) => void
  selectedProjectStack?: string[] | undefined
}

export function AIHelpDialog({
  isOpen,
  onClose,
  onEstimateLoaded,
  selectedProjectStack = [],
}: AIHelpDialogProps) {
  const t = useTranslations('Cotizador')
  const [description, setDescription] = useState('')
  const [isEstimating, setIsEstimating] = useState(false)

  const handleEstimate = async () => {
    if (!description.trim()) {
      toast.error(t('aiDescriptionPlaceholder'))
      return
    }

    setIsEstimating(true)
    try {
      const result = await estimarConIA(description, selectedProjectStack)
      if (result.ok) {
        onEstimateLoaded(result.data)
        toast.success(t('aiSuccess'))
        onClose()
      } else {
        toast.error(t('aiError'))
      }
    } catch {
      toast.error(t('aiError'))
    } finally {
      setIsEstimating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] border border-border/80 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-heading text-foreground">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            {t('estimationHelp')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t('aiHelpDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="ai-description"
              className="text-sm font-semibold text-foreground"
            >
              {t('aiDescriptionLabel')}
            </Label>
            <Textarea
              id="ai-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('aiDescriptionPlaceholder')}
              className="h-32 text-sm leading-relaxed border-border/60 bg-background/50 focus:border-primary/50"
              disabled={isEstimating}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isEstimating}
            className="border-border/60 hover:bg-muted/50"
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleEstimate}
            disabled={isEstimating || !description.trim()}
            className="bg-gradient-to-r from-primary to-magenta text-white hover:opacity-90 font-semibold shadow-md flex items-center gap-1.5"
          >
            {isEstimating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('estimateConIA')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
