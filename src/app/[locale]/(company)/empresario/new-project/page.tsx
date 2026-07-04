import { getTranslations, getLocale } from 'next-intl/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProjectWizard } from '@/components/features/projects/ProjectWizard'
import { initProjectPublishing } from '@/lib/projects/actions'
import { getCountryOptions, getSubdivisions } from '@/lib/geo/catalog'

/**
 * Página de publicación de proyecto (flujo IA — Corte 1: Pantalla 1).
 *
 * Server Component: el rol 'empresa' y la autenticación los garantiza el layout
 * (company). Acá se resuelve la verificación del empresario y se crea/reanuda la
 * conversación de IA antes de montar el wizard. Los catálogos del fondo NO se
 * cargan en la Pantalla 1: se usan en la propuesta (Pantalla 2, corte siguiente).
 */
export default async function PublishProjectPage() {
  const tPublish = await getTranslations('ProjectPublish')

  const initRes = await initProjectPublishing()
  const todayIso = new Date().toISOString().slice(0, 10)
  const locale = await getLocale()
  const countries = getCountryOptions(locale).map((country) => ({
    value: country.code,
    label: country.name,
  }))
  const draftCountry = initRes.ok ? initRes.data.logistica?.paisIso : null
  const initialRegions = draftCountry
    ? getSubdivisions(draftCountry).map((subdivision) => ({
        value: subdivision.code,
        label: subdivision.name,
      }))
    : []

  return (
    <div
      className="flex flex-col min-h-screen relative"
      style={{
        backgroundColor: '#f6f5fb',
        backgroundImage: `
          linear-gradient(to right, rgba(102, 45, 145, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(102, 45, 145, 0.04) 1px, transparent 1px),
          radial-gradient(circle at 0% 30%, rgba(32, 190, 198, 0.16) 0%, rgba(32, 190, 198, 0.04) 50%, transparent 70%),
          radial-gradient(circle at 100% 60%, rgba(102, 45, 145, 0.22) 0%, rgba(102, 45, 145, 0.06) 55%, transparent 75%)
        `,
        backgroundSize: '48px 48px, 48px 48px, 100% 100%, 100% 100%',
        backgroundAttachment: 'fixed',
      }}
    >
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {initRes.ok ? (
          <ProjectWizard
            conversationId={initRes.data.conversationId}
            isVerified={initRes.data.isVerified}
            todayIso={todayIso}
            logistica={initRes.data.logistica}
            contextoInicial={initRes.data.contextoInicial}
            historial={initRes.data.historial}
            propuesta={initRes.data.propuesta}
            countries={countries}
            initialRegions={initialRegions}
          />
        ) : (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm font-bold text-destructive">
              {tPublish('loadErrorTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tPublish('loadErrorDesc')}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
