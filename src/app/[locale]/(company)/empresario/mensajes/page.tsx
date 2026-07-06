import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { getCurrentUser } from '@/lib/auth/dal'
import {
  getConversacionesEmpresario,
  getMensajesDeProyecto,
} from '@/lib/mensajes/actions'
import {
  getConversacionesDirectas,
  getMensajesDirectos,
} from '@/lib/mensajes/actions_directos'
import { CompanyMensajesClient } from './CompanyMensajesClient'

export default async function CompanyMensajesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const params = await searchParams
  const proyectoParam = params['proyecto']
  const directoParam = params['directo']

  const initialProjectId =
    typeof proyectoParam === 'string' ? proyectoParam : null
  const initialDirectChatId =
    typeof directoParam === 'string' ? directoParam : null

  const [conversacionesResult, directasResult, user] = await Promise.all([
    getConversacionesEmpresario(),
    getConversacionesDirectas('empresario'),
    getCurrentUser(),
  ])

  const conversaciones = conversacionesResult.ok
    ? conversacionesResult.data
    : []
  const directas = directasResult.ok ? directasResult.data : []
  const allConversaciones = [...conversaciones, ...directas]

  let initialMensajes: {
    mensajes: import('@/lib/mensajes/actions').Mensaje[]
    puedeEnviar: boolean
  } | null = null

  if (initialProjectId) {
    const result = await getMensajesDeProyecto(initialProjectId)
    if (result.ok) initialMensajes = result.data
  } else if (initialDirectChatId) {
    const result = await getMensajesDirectos(initialDirectChatId)
    if (result.ok) initialMensajes = result.data
  }

  return (
    <CompanyMensajesClient
      conversaciones={allConversaciones}
      initialProjectId={initialProjectId}
      initialDirectChatId={initialDirectChatId}
      initialMensajes={initialMensajes}
      currentUserId={user?.id ?? ''}
    />
  )
}
