'use client'

import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TalentRankingItem } from '@/lib/ranking/actions'

import { Star, ChevronLeft, ChevronRight, X, Trophy } from 'lucide-react'

interface RankingListProps {
  topTalents: TalentRankingItem[]
  totalCount: number
  page: number
  pageSize: number
  categoria: string
  tecnologiaId: string
  tecnologiasDisponibles: { id: string; nombre: string }[]
}

export function RankingList({
  topTalents,
  totalCount,
  page,
  pageSize,
  categoria,
  tecnologiaId,
  tecnologiasDisponibles,
}: RankingListProps) {
  const t = useTranslations('Ranking')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 on filter change
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push(pathname)
  }

  const activeCategoriaLabel = categoria
    ? categoria.charAt(0).toUpperCase() + categoria.slice(1)
    : ''

  const activeTechLabel = tecnologiaId
    ? tecnologiasDisponibles.find((t) => t.id === tecnologiaId)?.nombre
    : ''

  // Determine hero card visibility and list slicing
  const showHero = page === 1 && topTalents.length > 0
  const heroTalent = showHero ? topTalents[0] : null
  const displayTalents = showHero ? topTalents.slice(1) : topTalents

  // Stats calculation for the SVG chart
  const feCount = topTalents.filter((t) => t.tituloFwd === 'frontend').length
  const beCount = topTalents.filter((t) => t.tituloFwd === 'backend').length
  const fsCount = topTalents.filter((t) => t.tituloFwd === 'fullstack').length
  const maxCount = Math.max(feCount, beCount, fsCount, 1)

  return (
    <div className="w-full space-y-10">
      {/* Top Hero and Announcement Section (Only on page 1) */}
      {showHero && heroTalent && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Hero Rank 1 Card */}
          <div className="relative overflow-hidden bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 sm:gap-8 lg:col-span-2 flex-[2] min-w-0">
            {/* Decors / Geometric elements from image 1 */}
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex-shrink-0 flex items-center justify-center">
              {/* Rotated frames */}
              <div className="absolute inset-2 rounded-3xl border-[3px] border-secondary/70 rotate-[14deg] transition-transform hover:rotate-[20deg] duration-500 pointer-events-none" />
              <div className="absolute inset-2 rounded-3xl border-[3px] border-primary/45 -rotate-[10deg] pointer-events-none" />

              {/* Central Box (not rotated) */}
              <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 bg-surface rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center p-3">
                {/* Rating Badge */}
                <div className="absolute -top-3 bg-warning text-warning-foreground text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  {t('destacadoBadge')}
                </div>
                {/* Score */}
                <span className="font-heading font-extrabold text-4xl sm:text-5xl text-magenta">
                  {((heroTalent.reputacion || 5.0) * 20).toFixed(0)}
                </span>
                <span className="text-[8px] tracking-widest text-ink-muted uppercase font-bold mt-1 text-center">
                  {t('scoreLabel')}
                </span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4 w-full text-center md:text-left min-w-0">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-ink-strong tracking-tight truncate">
                  {heroTalent.nombreCompleto}
                </h2>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mt-1">
                  {heroTalent.tituloFwd
                    ? t(
                        `category${heroTalent.tituloFwd.charAt(0).toUpperCase() + heroTalent.tituloFwd.slice(1)}`,
                      )
                    : t('defaultRole')}
                </p>
              </div>

              {/* Technologies list */}
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {heroTalent.tecnologias.slice(0, 5).map((tech) => (
                  <span
                    key={tech}
                    className="bg-surface-sunken border border-border text-ink text-[10px] px-2.5 py-1 rounded-full font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <hr className="border-border my-2" />

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center md:text-left pt-1">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-ink-muted font-bold">
                    {t('statsRank')}
                  </span>
                  <span className="block font-heading text-base font-extrabold text-secondary mt-0.5">
                    {t('topRankerLabel')}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-ink-muted font-bold">
                    {t('statsReputation')}
                  </span>
                  <span className="block font-heading text-base font-extrabold text-magenta mt-0.5">
                    {heroTalent.reputacion
                      ? `${heroTalent.reputacion.toFixed(1)}/5.0`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-ink-muted font-bold">
                    {t('statsTechs')}
                  </span>
                  <span className="block font-heading text-base font-extrabold text-accent mt-0.5">
                    {heroTalent.tecnologias.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Announcement/Pinnacle Card */}
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between flex-1 min-w-[280px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-ink-muted font-bold tracking-wide uppercase">
                  {t('destacadoBadge')}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-ink-strong tracking-tight">
                  {t('highlightTitle')}
                </h3>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  {t('highlightText')}
                </p>
              </div>
            </div>
            <Link
              href={`${pathname}/${heroTalent.idEstudiante}`}
              className="mt-6 w-full py-2.5 bg-surface border border-primary text-primary text-center text-xs font-semibold rounded-full hover:bg-primary/5 transition-all duration-200 shadow-sm block"
            >
              {t('highlightButton')}
            </Link>
          </div>
        </div>
      )}

      {/* Main List Section */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-strong">
            {t('risingTierTitle')}
            <span className="text-primary">.</span>
          </h2>
        </div>

        {/* Filters Panel */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {t('filterTitle')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-semibold">
                {t('filterCategory')}
              </label>
              <select
                className="w-full rounded-xl border border-input bg-surface-sunken px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
                value={categoria}
                onChange={(e) =>
                  handleFilterChange('categoria', e.target.value)
                }
              >
                <option value="">{t('filterCategory')}...</option>
                <option value="frontend">{t('categoryFrontend')}</option>
                <option value="backend">{t('categoryBackend')}</option>
                <option value="fullstack">{t('categoryFullstack')}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-semibold">
                {t('filterTech')}
              </label>
              <select
                className="w-full rounded-xl border border-input bg-surface-sunken px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
                value={tecnologiaId}
                onChange={(e) =>
                  handleFilterChange('tecnologiaId', e.target.value)
                }
              >
                <option value="">{t('filterTech')}...</option>
                {tecnologiasDisponibles.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Tags */}
          {(activeCategoriaLabel || activeTechLabel) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
              {activeCategoriaLabel && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                  {activeCategoriaLabel}
                  <button
                    onClick={() => handleFilterChange('categoria', '')}
                    className="hover:text-primary/75 p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeTechLabel && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                  {activeTechLabel}
                  <button
                    onClick={() => handleFilterChange('tecnologiaId', '')}
                    className="hover:text-primary/75 p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-xs text-ink-muted hover:text-ink font-semibold ml-2 transition-colors duration-200"
              >
                {t('clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* List Header/Subbar */}
        <div className="flex items-center justify-between text-xs text-ink-muted font-semibold">
          <span>{t('showingCount', { count: totalCount })}</span>
          <div className="flex items-center gap-2">
            <span>{t('sortByReputation')}</span>
          </div>
        </div>

        {/* Talent Rows */}
        <div className="space-y-4">
          {displayTalents.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border">
              <p className="text-ink-muted text-sm">{t('emptyState')}</p>
            </div>
          ) : (
            displayTalents.map((talent, index) => {
              // Calculate actual global rank
              const rank =
                (page - 1) * pageSize + (showHero ? index + 2 : index + 1)
              const formattedRank = rank.toString().padStart(2, '0')

              return (
                <div
                  key={talent.idEstudiante}
                  className="bg-surface hover:bg-surface-sunken hover:scale-[1.005] border border-border hover:border-border-strong hover:shadow-soft rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
                >
                  {/* Rank number */}
                  <div
                    className={`w-10 text-center font-heading font-extrabold text-xl sm:text-2xl flex-shrink-0 ${
                      rank <= 3 ? 'text-highlight' : 'text-ink-subtle'
                    }`}
                  >
                    {formattedRank}
                  </div>

                  {/* Avatar, Name & Tags */}
                  <div className="flex items-center gap-4 flex-1 w-full min-w-0">
                    {talent.fotoPerfil ? (
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-full overflow-hidden border border-border">
                        <Image
                          src={talent.fotoPerfil}
                          alt={talent.nombreCompleto}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-border bg-surface-sunken flex items-center justify-center text-lg font-bold text-ink-muted flex-shrink-0">
                        {talent.nombreCompleto.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-bold text-ink-strong text-base sm:text-lg truncate hover:text-primary transition-colors duration-200">
                        <Link href={`${pathname}/${talent.idEstudiante}`}>
                          {talent.nombreCompleto}
                        </Link>
                      </h3>
                      <p className="text-xs text-ink-muted truncate font-medium">
                        <span className="text-primary font-semibold uppercase tracking-wide mr-1.5">
                          {talent.tituloFwd
                            ? t(
                                `category${talent.tituloFwd.charAt(0).toUpperCase() + talent.tituloFwd.slice(1)}`,
                              )
                            : t('defaultRole')}
                        </span>
                        {talent.tecnologias.length > 0 &&
                          `• ${talent.tecnologias.slice(0, 3).join(' • ')}`}
                      </p>
                    </div>
                  </div>

                  {/* Reputation Progress Bar */}
                  <div className="w-full sm:w-44 md:w-56 lg:w-64 flex-shrink-0 px-2 sm:px-4 flex items-center">
                    <div className="w-full h-2 bg-surface-sunken border border-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-500 ease-[var(--ease-out)]"
                        style={{ width: `${(talent.reputacion || 0) * 20}%` }}
                      />
                    </div>
                  </div>

                  {/* Score & Profile Action */}
                  <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto flex-shrink-0">
                    <div className="text-right min-w-[80px] flex flex-col justify-center">
                      {talent.reputacion !== null ? (
                        <>
                          <div className="flex items-center justify-end gap-1 font-heading font-extrabold text-base sm:text-lg text-secondary">
                            <span>{talent.reputacion.toFixed(1)}</span>
                            <Star className="w-3.5 h-3.5 text-highlight fill-highlight" />
                          </div>
                          <span className="text-[8px] uppercase tracking-wider text-ink-muted font-bold">
                            {t('reputation')}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold text-ink-subtle">
                          {t('noReputation')}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`${pathname}/${talent.idEstudiante}`}
                      className="px-5 py-2 border border-primary text-primary text-xs font-semibold rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 whitespace-nowrap"
                    >
                      {t('viewProfile')}
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2 border border-border rounded-xl bg-surface text-ink-muted disabled:opacity-50 hover:bg-surface-sunken transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-9 h-9 rounded-xl border text-xs font-bold transition-all duration-200 ${
                  page === p
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                    : 'bg-surface border-border text-ink hover:bg-surface-sunken'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 border border-border rounded-xl bg-surface text-ink-muted disabled:opacity-50 hover:bg-surface-sunken transition-colors duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Dashboard Metrics Section */}
      {page === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          {/* Talent Distribution SVG Chart */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-extrabold tracking-tight text-ink-strong">
                {t('distributionTitle')}
              </h3>
              <span className="text-[10px] text-ink-muted font-bold tracking-wide uppercase">
                {t('distributionSubtitle')}
              </span>
            </div>

            {/* Custom Responsive SVG Chart */}
            <div className="w-full h-44 flex items-center justify-center">
              <svg viewBox="0 0 400 180" width="100%" height="100%">
                <defs>
                  <linearGradient id="feGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                  <linearGradient id="beGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="var(--secondary)" />
                    <stop offset="100%" stopColor="var(--magenta)" />
                  </linearGradient>
                  <linearGradient id="fsGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="var(--warning)" />
                    <stop offset="100%" stopColor="var(--highlight)" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line
                  x1="40"
                  y1="30"
                  x2="380"
                  y2="30"
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1="80"
                  x2="380"
                  y2="80"
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1="130"
                  x2="380"
                  y2="130"
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Y Axis line */}
                <line
                  x1="40"
                  y1="10"
                  x2="40"
                  y2="130"
                  stroke="var(--border)"
                  strokeWidth="1.5"
                />

                {/* Bars */}
                {/* Frontend (x=90) */}
                <rect
                  x="75"
                  y={130 - (maxCount > 0 ? (feCount / maxCount) * 100 : 0)}
                  width="40"
                  height={maxCount > 0 ? (feCount / maxCount) * 100 : 0}
                  fill="url(#feGrad)"
                  rx="6"
                  className="transition-all duration-1000 ease-out cursor-pointer hover:opacity-90"
                />
                <text
                  x="95"
                  y={130 - (maxCount > 0 ? (feCount / maxCount) * 100 : 0) - 8}
                  fill="var(--ink)"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {feCount}
                </text>

                {/* Backend (x=200) */}
                <rect
                  x="180"
                  y={130 - (maxCount > 0 ? (beCount / maxCount) * 100 : 0)}
                  width="40"
                  height={maxCount > 0 ? (beCount / maxCount) * 100 : 0}
                  fill="url(#beGrad)"
                  rx="6"
                  className="transition-all duration-1000 ease-out cursor-pointer hover:opacity-90"
                />
                <text
                  x="200"
                  y={130 - (maxCount > 0 ? (beCount / maxCount) * 100 : 0) - 8}
                  fill="var(--ink)"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {beCount}
                </text>

                {/* Fullstack (x=310) */}
                <rect
                  x="285"
                  y={130 - (maxCount > 0 ? (fsCount / maxCount) * 100 : 0)}
                  width="40"
                  height={maxCount > 0 ? (fsCount / maxCount) * 100 : 0}
                  fill="url(#fsGrad)"
                  rx="6"
                  className="transition-all duration-1000 ease-out cursor-pointer hover:opacity-90"
                />
                <text
                  x="305"
                  y={130 - (maxCount > 0 ? (fsCount / maxCount) * 100 : 0) - 8}
                  fill="var(--ink)"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {fsCount}
                </text>

                {/* X Axis line */}
                <line
                  x1="40"
                  y1="130"
                  x2="380"
                  y2="130"
                  stroke="var(--border)"
                  strokeWidth="1.5"
                />

                {/* Category Labels */}
                <text
                  x="95"
                  y="152"
                  fill="var(--ink-muted)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {t('categoryFrontend')}
                </text>
                <text
                  x="200"
                  y="152"
                  fill="var(--ink-muted)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {t('categoryBackend')}
                </text>
                <text
                  x="305"
                  y="152"
                  fill="var(--ink-muted)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {t('categoryFullstack')}
                </text>
              </svg>
            </div>
          </div>

          {/* System Health Card */}
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-heading text-lg font-extrabold tracking-tight text-ink-strong mb-4">
                {t('systemHealthTitle')}
              </h3>

              <div className="space-y-4">
                {/* Data Integrity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-strong">
                    <span>{t('dataIntegrity')}</span>
                    <span className="text-success font-bold">99.9%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-sunken border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: '99.9%' }}
                    />
                  </div>
                </div>

                {/* Match Accuracy */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-strong">
                    <span>{t('matchAccuracy')}</span>
                    <span className="text-primary font-bold">94.2%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-sunken border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: '94.2%' }}
                    />
                  </div>
                </div>

                {/* Recruiter Trust */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink-strong">
                    <span>{t('recruiterTrust')}</span>
                    <span className="text-warning font-bold">4.8/5</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-sunken border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full"
                      style={{ width: '96%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="w-full py-2 px-4 bg-success/5 border border-success/20 rounded-xl flex items-center justify-center gap-2 text-success text-[9px] font-extrabold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>{t('systemStatusNominal')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
