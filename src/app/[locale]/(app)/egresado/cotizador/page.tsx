import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { CotizadorForm } from '@/components/features/cotizaciones/CotizadorForm'
import { getMarketplaceProjects } from '@/lib/projects/marketplace'
import { getMisCotizaciones } from '@/lib/cotizaciones/queries'

export default async function CotizadorPage() {
  const [projectsResult, cotizacionesResult] = await Promise.all([
    getMarketplaceProjects(),
    getMisCotizaciones(),
  ])

  const projects = projectsResult.ok ? projectsResult.data : []
  const savedCotizaciones = cotizacionesResult.ok ? cotizacionesResult.data : []

  return (
    <EgresadoShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <CotizadorForm
          projects={projects}
          initialSavedCotizaciones={savedCotizaciones}
        />
      </div>
    </EgresadoShell>
  )
}
