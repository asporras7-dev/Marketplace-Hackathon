'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Star } from 'lucide-react'
import type { Company, CompanyStatus } from '@/types'

const VERIF_BADGE: Record<
  CompanyStatus,
  { key: 'verifVerified' | 'verifPending' | 'verifRejected'; className: string }
> = {
  approved: {
    key: 'verifVerified',
    className: 'bg-accent/25 border-accent/40 text-accent',
  },
  pending: {
    key: 'verifPending',
    className: 'bg-warning/25 border-warning/40 text-warning',
  },
  rejected: {
    key: 'verifRejected',
    className: 'bg-destructive/25 border-destructive/40 text-destructive',
  },
}

interface CompanyProfileBannerProps {
  company: Company | undefined
}

export function CompanyProfileBanner({ company }: CompanyProfileBannerProps) {
  const t = useTranslations('EmpresaPerfil')
  const badge = VERIF_BADGE[company?.status ?? 'pending']

  return (
    <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-r from-secondary via-primary to-accent p-6 md:p-8 pt-20 md:pt-28 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-surface border-4 border-surface shadow-lg rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
          {company?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo}
              alt={company.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-extrabold text-4xl sm:text-5xl tracking-tighter">
                {company?.name
                  ? company.name.substring(0, 3).toUpperCase()
                  : 'FWD'}
              </span>
            </div>
          )}
        </div>

        <div className="text-left space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-primary-foreground tracking-tight drop-shadow-md">
              {company?.name}
            </h1>
            <span
              className={`backdrop-blur-md border font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.className}`}
            >
              {t(badge.key)}
            </span>
            <Link
              href="/empresario/formulario-empresa"
              className="bg-white/10 hover:bg-white/20 border border-white/25 text-primary-foreground font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full transition-all"
            >
              {t('editProfile')}
            </Link>
          </div>
          <p className="text-xs text-primary-foreground/95 max-w-md drop-shadow-sm leading-relaxed">
            {company?.sector}
          </p>
          {company?.reputacion !== undefined &&
            company?.reputacion !== null && (
              <div className="flex items-center gap-1.5 mt-1 text-primary-foreground/95 drop-shadow-sm">
                <Star className="w-3.5 h-3.5 fill-highlight text-highlight shrink-0" />
                <span className="text-xs font-bold font-heading">
                  {company.reputacion > 0
                    ? `${Number(company.reputacion).toFixed(1)} / 5.0`
                    : t('noRatings')}
                </span>
                {company.reputacion > 0 && (
                  <span className="text-[10px] opacity-85 font-medium font-sans">
                    ({t('reputation')})
                  </span>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Efecto de fondo geométrico (decorativo, sin datos) */}
      <div className="absolute right-0 top-0 w-1/3 h-full bg-surface/5 skew-x-12 transform origin-top-right pointer-events-none" />
    </div>
  )
}
