import { getProjectMatches } from '@/lib/projects/match-actions'
import { PortfolioViewer } from '@/components/features/marketplace/PortfolioViewer'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Target } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{
    locale: string
    id: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

export default async function ProjectMatchesPage(props: PageProps) {
  const { locale, id } = await props.params
  const searchParams = await props.searchParams

  const tEgresado = await getTranslations({ locale, namespace: 'Egresado' })

  const page = parseInt(searchParams.page || '1', 10)
  const pageSize = 1

  const matchResult = await getProjectMatches(id, page, pageSize)

  if (!matchResult.ok) {
    return (
      <div className="p-8 text-center text-destructive">
        Error cargando los matches. Por favor intente más tarde.
      </div>
    )
  }

  const { items, totalCount } = matchResult.data
  const totalPages = Math.ceil(totalCount / pageSize)

  if (totalCount === 0) {
    return (
      <div className="container py-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display text-primary flex items-center gap-2">
            <Target className="h-6 w-6" />
            Matches con Egresados
          </h1>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/empresario`}>Volver a mis proyectos</Link>
          </Button>
        </div>
        <div className="p-8 text-center border rounded-lg bg-surface text-muted-foreground">
          No se encontraron egresados con habilidades técnicas que coincidan con
          las requeridas por este proyecto.
        </div>
      </div>
    )
  }

  // Singular pagination logic
  const currentMatch = items[0]
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary flex items-center gap-3">
            {currentMatch?.profile?.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentMatch.profile.profilePhoto}
                alt="Foto"
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary font-bold">
                {currentMatch?.profile?.firstName?.charAt(0) || 'U'}
              </div>
            )}
            {tEgresado('matchTitle', {
              firstName: currentMatch?.profile?.firstName || '',
              lastName: currentMatch?.profile?.lastName1 || '',
            })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
            Revisando candidatos compatibles ({page} de {totalCount})
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/empresario`}>Volver a mis proyectos</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between py-4 bg-muted/20 px-4 rounded-lg border">
        <Button variant="outline" disabled={!hasPrevPage} asChild={hasPrevPage}>
          {hasPrevPage ? (
            <Link
              href={`/${locale}/empresario/proyectos/${id}/matches?page=${page - 1}`}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior Match
            </Link>
          ) : (
            <span>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior Match
            </span>
          )}
        </Button>

        <span className="text-sm font-semibold text-foreground">
          {page} / {totalPages}
        </span>

        <Button variant="outline" disabled={!hasNextPage} asChild={hasNextPage}>
          {hasNextPage ? (
            <Link
              href={`/${locale}/empresario/proyectos/${id}/matches?page=${page + 1}`}
            >
              Siguiente Match
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          ) : (
            <span>
              Siguiente Match
              <ChevronRight className="w-4 h-4 ml-2" />
            </span>
          )}
        </Button>
      </div>

      {currentMatch && (
        <PortfolioViewer
          profile={currentMatch.profile}
          matchScore={currentMatch.matchScore}
          matchDetalles={currentMatch.matchDetalles}
        />
      )}
    </div>
  )
}
