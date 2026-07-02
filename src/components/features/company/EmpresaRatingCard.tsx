'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { rateCompany } from '@/lib/company/ratings'

interface EmpresaRatingCardProps {
  idEmpresario: string
  idContratacion: string
  tituloProyecto: string
  existingRating: { puntuacion: number; comentario: string | null } | null
}

export function EmpresaRatingCard({
  idEmpresario,
  idContratacion,
  tituloProyecto,
  existingRating,
}: EmpresaRatingCardProps) {
  const t = useTranslations('EgresadoEmpresa')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [ratingScore, setRatingScore] = useState(
    existingRating?.puntuacion ?? 0,
  )
  const [ratingComment, setRatingComment] = useState(
    existingRating?.comentario ?? '',
  )
  const [hoverScore, setHoverScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [hasRated, setHasRated] = useState(existingRating !== null)

  return (
    <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-warning to-highlight" />
      <CardContent className="p-6 pt-8 space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold font-heading text-foreground">
            {t('rateTitle')}
            <span className="text-primary">.</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('rateDesc')}
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            <span className="font-semibold">{t('rateProjectLabel')}:</span>{' '}
            {tituloProyecto}
          </p>
        </div>

        {hasRated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground mr-1">
                {t('ratingLabel')}:
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
                  {t('commentLabel')}
                </span>
                {ratingComment}
              </div>
            )}
            <p className="text-xs text-accent font-semibold">
              {t('alreadyRated')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground">
                {t('ratingLabel')} *
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={submitting}
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(0)}
                    onClick={() => setRatingScore(star)}
                    className="focus:outline-none transition-transform hover:scale-110 cursor-pointer bg-transparent border-0 p-0"
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

            <div className="space-y-1.5">
              <label
                htmlFor="empresa-rating-comment"
                className="block text-xs font-bold text-muted-foreground"
              >
                {t('commentLabel')}
              </label>
              <textarea
                id="empresa-rating-comment"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder={t('commentPlaceholder')}
                disabled={submitting}
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              type="button"
              disabled={submitting || ratingScore === 0}
              onClick={async () => {
                if (ratingScore === 0) return
                setSubmitting(true)
                const res = await rateCompany({
                  idEmpresario,
                  idContratacion,
                  puntuacion: ratingScore,
                  comentario: ratingComment.trim() || undefined,
                })
                setSubmitting(false)
                if (res.ok) {
                  toast.success(t('rateSuccess'))
                  setHasRated(true)
                  router.refresh()
                } else {
                  toast.error(tCommon('genericError'))
                }
              }}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('submitRating')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
