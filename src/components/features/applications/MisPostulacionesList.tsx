'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Briefcase, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { retirarPostulacion } from '@/lib/applications/actions'
import {
  PostulacionCard,
  type PostulacionPropia,
} from '@/components/features/applications/PostulacionCard'

interface MisPostulacionesListProps {
  postulaciones: PostulacionPropia[]
}

export function MisPostulacionesList({
  postulaciones,
}: MisPostulacionesListProps) {
  const router = useRouter()
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')

  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleWithdrawConfirm = async () => {
    if (!pendingId) return
    setIsSubmitting(true)
    const result = await retirarPostulacion({ id_participacion: pendingId })
    setIsSubmitting(false)
    if (!result.ok) {
      toast.error(tEgresado('withdrawError'))
      return
    }
    setPendingId(null)
    toast.success(tEgresado('withdrawSuccess'))
    router.refresh()
  }

  if (postulaciones.length === 0) {
    return (
      <EmptyState
        title={tEgresado('emptyApplications')}
        description={tEgresado('emptyApplicationsDesc')}
        icon={Briefcase}
        actionText={tEgresado('exploreMarketplace')}
        onAction={() => {
          window.location.href = '/egresado/projects'
        }}
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        {postulaciones.map((postulacion) => (
          <PostulacionCard
            key={postulacion.id_participacion}
            postulacion={postulacion}
            onWithdraw={() => setPendingId(postulacion.id_participacion)}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/egresado/projects"
          className="text-sm font-semibold text-secondary hover:underline"
        >
          {tEgresado('exploreMoreProjects')}
        </Link>
      </div>

      <Dialog
        open={pendingId !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setPendingId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tEgresado('withdrawDialogTitle')}</DialogTitle>
            <DialogDescription>
              {tEgresado('confirmWithdraw')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setPendingId(null)}
              className="font-semibold"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="magenta"
              disabled={isSubmitting}
              onClick={() => void handleWithdrawConfirm()}
              className="font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {tCommon('loading')}
                </span>
              ) : (
                tEgresado('withdrawOffer')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
