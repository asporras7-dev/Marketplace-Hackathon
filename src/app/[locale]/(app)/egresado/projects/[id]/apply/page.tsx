import { getMarketplaceProjectById } from '@/lib/projects/marketplace'
import { ApplyProjectClient } from '@/components/features/marketplace/ApplyProjectClient'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApplyProjectPage({ params }: PageProps) {
  const { id } = await params

  const projectResult = await getMarketplaceProjectById(id)

  if (!projectResult.ok) {
    notFound()
  }
  const {
    id: projectId,
    title,
    companyName,
    description,
    budget,
    stack,
    mode,
  } = projectResult.data

  return (
    <ApplyProjectClient
      projectId={projectId}
      projectTitle={title}
      projectCompanyName={companyName}
      projectDescription={description}
      projectBudget={budget}
      projectStack={stack}
      projectMode={mode}
    />
  )
}
