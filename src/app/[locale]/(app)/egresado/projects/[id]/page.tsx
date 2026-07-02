import { notFound } from 'next/navigation'
import {
  getMarketplaceProjectById,
  checkIfApplied,
} from '@/lib/projects/marketplace'
import { ProjectDetailClient } from '@/components/features/marketplace/ProjectDetailClient'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params

  const projectResult = await getMarketplaceProjectById(id)

  if (!projectResult.ok) {
    notFound()
  }

  const appliedResult = await checkIfApplied(id)
  const alreadyApplied = appliedResult.ok ? appliedResult.data : false

  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  let studentCountry: string | null = null
  let studentRegion: string | null = null

  if (userData?.user) {
    const { data: estData } = await supabase
      .from('estudiantes')
      .select('pais_iso_residencia, region_residencia')
      .eq('id_usuario', userData.user.id)
      .maybeSingle()
    if (estData) {
      studentCountry = estData.pais_iso_residencia
      studentRegion = estData.region_residencia
    }
  }

  return (
    <ProjectDetailClient
      project={projectResult.data}
      alreadyApplied={alreadyApplied}
      studentCountry={studentCountry}
      studentRegion={studentRegion}
    />
  )
}
