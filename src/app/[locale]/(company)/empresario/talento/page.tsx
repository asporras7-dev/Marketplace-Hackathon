import { getPublicProfiles } from '@/lib/talento/actions'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { getTranslations } from 'next-intl/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TalentoClientList } from './TalentoClientList'

import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'

export default async function TalentoPage() {
  const t = await getTranslations('EmpresaPerfil')

  const profilesResult = await getPublicProfiles()
  const profiles = profilesResult.ok ? profilesResult.data : []

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageTitle
            title={t('menuTalento')}
            description="Encuentra al mejor talento de FWD Costa Rica para tus proyectos."
            dotColor="text-primary"
          />

          <div className="mt-8">
            <TalentoClientList initialProfiles={profiles} />
          </div>
        </main>
      </div>
    </CompanyShell>
  )
}
