import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Globe, Star } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Card, CardContent } from '@/components/ui/card'
import { getPublicCompanyProfile } from '@/lib/company/public-profile'
import { getFinalizedContractWithCompany } from '@/lib/company/ratings'
import { EmpresaRatingCard } from '@/components/features/company/EmpresaRatingCard'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EmpresaPublicPage({ params }: PageProps) {
  const { id } = await params
  const t = await getTranslations('EgresadoEmpresa')

  const [result, contractResult] = await Promise.all([
    getPublicCompanyProfile(id),
    getFinalizedContractWithCompany(id),
  ])

  if (!result.ok || !result.data) notFound()

  const empresa = result.data
  const finalizedContract = contractResult.ok ? contractResult.data : null

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/egresado/contrataciones"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToContracts')}
        </Link>

        <PageTitle title={t('pageTitle')} dotColor="text-primary" />

        <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-sm">
          <CardContent className="p-6 space-y-5">
            {/* Header: logo + nombre */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-primary/20 shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl font-display">
                {empresa.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={empresa.logo}
                    alt={empresa.nombre_empresa}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  empresa.nombre_empresa.charAt(0).toUpperCase()
                )}
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold font-display text-foreground">
                  {empresa.nombre_empresa}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    empresa.tipo_empresario === 'empresa_formal'
                      ? 'tipoEmpresa'
                      : 'tipoEmprendedor',
                  )}
                </p>
                {empresa.reputacion !== null && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.round(empresa.reputacion ?? 0)
                              ? 'text-highlight fill-highlight'
                              : 'text-muted-foreground/25'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {empresa.reputacion.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Sector */}
            {empresa.sector && (
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t('sector')}
                </p>
                <p className="text-sm text-foreground">{empresa.sector}</p>
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t('descripcion')}
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {empresa.descripcion ?? (
                  <span className="italic text-muted-foreground">
                    {t('noDesc')}
                  </span>
                )}
              </p>
            </div>

            {/* Sitio web */}
            {empresa.sitio_web && (
              <a
                href={empresa.sitio_web}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
              >
                <Globe className="w-3.5 h-3.5" />
                {empresa.sitio_web}
              </a>
            )}
          </CardContent>
        </Card>

        {finalizedContract && (
          <EmpresaRatingCard
            idEmpresario={id}
            idContratacion={finalizedContract.idContratacion}
            tituloProyecto={finalizedContract.tituloProyecto}
            existingRating={finalizedContract.existingRating}
          />
        )}
      </div>
    </EgresadoShell>
  )
}
