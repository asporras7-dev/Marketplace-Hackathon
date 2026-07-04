import { getTranslations, getLocale } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { CompanyProfileForm } from '@/components/features/companies/CompanyProfileForm'
import { getCompanyProfileForEdit } from '@/lib/company/actions'
import { getCurrentUser } from '@/lib/auth/dal'
import { getCountryOptions, getSubdivisions } from '@/lib/geo/catalog'

/**
 * Formulario de empresa. Server Component: el perfil (datos de empresa + datos
 * personales del empresario) se trae en el server y se pasa al formulario por
 * prop (sin `useEffect` de fetch). El rol y la autenticación los garantiza el
 * layout (company) + middleware.
 */
export default async function CompanyProfileFormPage() {
  const tEmpresa = await getTranslations('Empresa')
  const user = await getCurrentUser()
  const profileRes = await getCompanyProfileForEdit()
  const locale = await getLocale()
  const countries = getCountryOptions(locale).map((country) => ({
    value: country.code,
    label: country.name,
  }))
  const profileCountry = profileRes.ok ? profileRes.data.country : ''
  const initialRegions = profileCountry
    ? getSubdivisions(profileCountry).map((subdivision) => ({
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/empresario"
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {tEmpresa('backToDashboard')}
          </Link>
        </div>

        <PageTitle
          title={tEmpresa('profileTitle')}
          description={tEmpresa('profileDesc')}
          dotColor="text-secondary"
        />

        {user && profileRes.ok ? (
          <CompanyProfileForm
            initialProfile={profileRes.data}
            userId={user.id}
            countries={countries}
            initialRegions={initialRegions}
          />
        ) : (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm font-bold text-destructive">
              {tEmpresa('profileNotFound')}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
