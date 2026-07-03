import { getTranslations } from 'next-intl/server'
import { RankingList } from '@/components/features/ranking/RankingList'
import {
  getTalentRanking,
  getActiveTechnologies,
  TituloFwd,
} from '@/lib/ranking/actions'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { BackButton } from '@/components/features/shared'

interface RankingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EmpresaRankingPage({
  searchParams,
}: RankingPageProps) {
  const params = await searchParams
  const t = await getTranslations('Common')
  const tRanking = await getTranslations('Ranking')

  const pageParam = typeof params.page === 'string' ? params.page : '1'
  const page = parseInt(pageParam || '1')
  const pageSize = 10
  const categoria = (
    typeof params.categoria === 'string' ? params.categoria : undefined
  ) as TituloFwd | undefined
  const tecnologiaId =
    typeof params.tecnologiaId === 'string' ? params.tecnologiaId : undefined

  const [rankingResult, techResult] = await Promise.all([
    getTalentRanking({ page, pageSize, categoria, tecnologiaId }),
    getActiveTechnologies(),
  ])

  const topTalents = rankingResult.ok ? rankingResult.data.items : []
  const totalCount = rankingResult.ok ? rankingResult.data.totalCount : 0
  const tecnologiasDisponibles = techResult.ok ? techResult.data : []

  // Strip trailing dot if present to append the signature blue dot manually
  const pageTitleBase = tRanking('pageTitle').endsWith('.')
    ? tRanking('pageTitle').slice(0, -1)
    : tRanking('pageTitle')

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col gap-6">
            <div>
              <BackButton label={t('back')} />
            </div>

            {/* Page Header */}
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-6">
              <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-strong">
                {pageTitleBase}
                <span className="text-primary">.</span>
              </h1>
              <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                {tRanking('pageDescription')}
              </p>
            </div>
          </div>

          <RankingList
            topTalents={topTalents}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            categoria={categoria || ''}
            tecnologiaId={tecnologiaId || ''}
            tecnologiasDisponibles={tecnologiasDisponibles}
          />
        </main>
      </div>
    </CompanyShell>
  )
}
