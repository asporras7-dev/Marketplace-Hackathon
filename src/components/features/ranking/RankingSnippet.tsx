'use client'

import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { TalentRankingItem } from '@/lib/ranking/actions'
import { Award, Star } from 'lucide-react'

interface RankingSnippetProps {
  topTalents: TalentRankingItem[]
  rankingUrl: string
}

export function RankingSnippet({
  topTalents,
  rankingUrl,
}: RankingSnippetProps) {
  const t = useTranslations('Ranking')

  if (!topTalents || topTalents.length === 0) {
    return null
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-highlight/10 text-highlight rounded-lg">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{t('snippetTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('snippetSubtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap flex-1 justify-center">
        {topTalents.slice(0, 2).map((talent, index) => {
          const displayRating = talent.reputacion

          return (
            <div
              key={talent.idEstudiante}
              className="flex items-center gap-3 bg-muted/50 rounded-full pr-4 pl-1 py-1 border border-border"
            >
              <div className="relative">
                {talent.fotoPerfil ? (
                  <Image
                    src={talent.fotoPerfil}
                    alt={talent.nombreCompleto}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border-2 border-background shadow-sm object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-background shadow-sm bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {talent.nombreCompleto.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                  {index + 1}
                </div>
              </div>
              <span className="text-sm font-medium text-foreground">
                {talent.nombreCompleto}
              </span>
              {displayRating !== null ? (
                <span className="text-sm font-semibold text-highlight flex items-center gap-1">
                  {displayRating.toFixed(1)}{' '}
                  <Star className="w-3 h-3 fill-current" />
                </span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  N/A
                </span>
              )}
            </div>
          )
        })}
      </div>

      <Link
        href={rankingUrl}
        className="px-6 py-2 bg-magenta text-white text-sm font-medium rounded-lg hover:bg-magenta/90 transition-colors whitespace-nowrap"
      >
        {t('viewAll')}
      </Link>
    </div>
  )
}
