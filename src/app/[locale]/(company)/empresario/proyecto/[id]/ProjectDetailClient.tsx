'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowLeft, Package, Pencil, XCircle } from 'lucide-react'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Link, useRouter } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { cancelProject } from '@/lib/projects/dashboard'
import { editProjectDescription } from '@/lib/projects/edit-description'
import { canEditProjectDescription } from '@/lib/projects/edit-description-logic'
import type { PublishedProject } from '@/lib/projects/dashboard'
import type { ParticipacionEmpresario } from '@/lib/projects/project-detail'
import type { EntregableEmpresario } from '@/lib/deliverables/queries'
import type { Result } from '@/lib/result'
import { PANEL_FILTER_DETALLE } from '@/lib/projects/project-detail-logic'
import {
  StatusPill,
  formatBudget,
} from '@/components/features/projects/PublishedProjectsBoard'
import { ParticipationsPanel } from '@/components/features/projects/ParticipationsPanel'
import { EntregablesEmpresario } from '@/components/features/deliverables/EntregablesEmpresario'

const ENTREGABLES_VISIBLE_STATES = new Set([
  'adjudicado',
  'en_desarrollo',
  'finalizado',
])

interface ProjectDetailClientProps {
  project: PublishedProject
  participationsResult: Result<ParticipacionEmpresario[]>
  entregablesResult: Result<EntregableEmpresario[]>
}

const KNOWN_CANCEL_ERRORS = new Set([
  'unauthorized',
  'empresario_no_encontrado',
  'cancel_failed',
  'unexpected',
])

// Códigos de error de editProjectDescription con copy propio; el resto cae a 'generic'.
const KNOWN_EDIT_ERRORS = new Set([
  'no_editable',
  'ai_failed',
  'ai_not_configured',
  'invalid_input',
])

function isCancelable(estado: PublishedProject['estado']): boolean {
  return estado !== 'finalizado' && estado !== 'cancelado'
}

export function ProjectDetailClient({
  project,
  participationsResult,
  entregablesResult,
}: ProjectDetailClientProps) {
  const t = useTranslations('ProjectDetail')
  const tBoard = useTranslations('ProjectsBoard')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const { isPending } = useAccountStatus()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelChecked, setCancelChecked] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [editRejection, setEditRejection] = useState<{
    razones: string[]
    ajustes: string[]
  } | null>(null)

  const locale = useLocale()

  const cancelable = isCancelable(project.estado)
  const descriptionEditable =
    !isPending && canEditProjectDescription(project.estadoEfectivo)
  const budget = formatBudget(
    project.moneda,
    project.presupuestoMin,
    project.presupuestoMax,
    tBoard('budgetNonNegotiable'),
  )

  const cerrarCancel = () => {
    setCancelOpen(false)
    setCancelChecked(false)
    setCancelMotivo('')
  }

  const confirmCancel = async () => {
    if (!cancelChecked || cancelling) return
    setCancelling(true)
    const res = await cancelProject(project.id, cancelMotivo)
    setCancelling(false)
    if (res.ok) {
      toast.success(tBoard('cancelSuccess'))
      cerrarCancel()
      router.refresh()
      return
    }
    const code = KNOWN_CANCEL_ERRORS.has(res.error) ? res.error : 'unexpected'
    toast.error(tBoard(`errors.${code}`))
  }

  const abrirEdit = () => {
    setEditValue(project.descripcion)
    setEditRejection(null)
    setEditOpen(true)
  }

  const cerrarEdit = () => {
    setEditOpen(false)
    setEditRejection(null)
  }

  const confirmEdit = async () => {
    if (editing) return
    const value = editValue.trim()
    if (value.length === 0) return
    setEditing(true)
    setEditRejection(null)
    const res = await editProjectDescription(
      {
        idProyecto: project.id,
        descripcion: value,
      },
      locale,
    )
    setEditing(false)
    if (!res.ok) {
      const code = KNOWN_EDIT_ERRORS.has(res.error) ? res.error : 'generic'
      toast.error(t(`errors.${code}`))
      return
    }
    if (res.data.estado === 'rechazada') {
      setEditRejection({
        razones: res.data.razones,
        ajustes: res.data.ajustes,
      })
      return
    }
    if (res.data.estado === 'sin_cambios') {
      toast(t('editDescriptionNoChanges'))
      cerrarEdit()
      return
    }
    toast.success(
      res.data.notificados > 0
        ? t('editDescriptionSuccessNotified', { count: res.data.notificados })
        : t('editDescriptionSuccess'),
    )
    cerrarEdit()
    router.refresh()
  }

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Link
            href="/empresario"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Link>

          <PageTitle
            title={project.titulo}
            description={
              budget ? `${tCommon(project.modalidad)} · ${budget}` : undefined
            }
            dotColor="text-secondary"
            action={
              <StatusPill
                estado={project.estadoEfectivo}
                label={tBoard(`status_${project.estadoEfectivo}`)}
              />
            }
          />

          <Card className="border border-border/80 bg-card/40">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <h2 className="text-lg font-bold font-heading text-foreground">
                  {t('projectInfoTitle')}
                </h2>
                {descriptionEditable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={abrirEdit}
                    className="font-semibold text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t('editDescriptionAction')}
                  </Button>
                )}
              </div>
              <DetailField label={tBoard('descriptionLabel')}>
                <p className="text-foreground whitespace-pre-wrap text-sm">
                  {project.descripcion}
                </p>
              </DetailField>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.areaNombre && (
                  <DetailField label={tBoard('areaLabel')}>
                    {project.areaNombre}
                  </DetailField>
                )}
                <DetailField label={tBoard('modalityLabel')}>
                  {tCommon(project.modalidad)}
                </DetailField>
                {budget && (
                  <DetailField label={tBoard('budgetLabel')}>
                    {budget}
                  </DetailField>
                )}
                {project.modalidad !== 'remoto' &&
                  (project.paisProyecto || project.ciudadProyecto) && (
                    <DetailField label={tBoard('locationLabel')}>
                      {[project.ciudadProyecto, project.paisProyecto]
                        .filter(Boolean)
                        .join(', ')}
                    </DetailField>
                  )}
                {project.fechaPublicacion && (
                  <DetailField label={tBoard('publishDateLabel')}>
                    {project.fechaPublicacion.slice(0, 10)}
                  </DetailField>
                )}
                {project.fechaCierre && (
                  <DetailField label={tBoard('closeDateLabel')}>
                    {project.fechaCierre.slice(0, 10)}
                  </DetailField>
                )}
              </div>
              {project.categorias.length > 0 && (
                <DetailField label={tBoard('categoriesLabel')}>
                  <ChipRow items={project.categorias} />
                </DetailField>
              )}
              {project.tecnologias.length > 0 && (
                <DetailField label={tBoard('technologiesLabel')}>
                  <ChipRow items={project.tecnologias} />
                </DetailField>
              )}
              {project.involucraIa && (
                <ChipRow items={[tBoard('involvesAi')]} />
              )}
              {cancelable && !isPending && (
                <div className="pt-4 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCancelOpen(true)}
                    className="font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4" />
                    {tBoard('cancelAction')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading flex items-center gap-2">
                {t('participationsTitle')}
                <span className="text-accent">.</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('participationsDesc')}
              </p>
            </div>
            <ParticipationsPanel
              result={participationsResult}
              filterConfig={PANEL_FILTER_DETALLE}
              projectId={project.id}
              projectEstado={project.estadoEfectivo}
            />
          </section>

          {ENTREGABLES_VISIBLE_STATES.has(project.estado) && (
            <section className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold tracking-tight text-foreground font-heading flex items-center gap-2">
                  <Package className="w-5 h-5 text-accent" />
                  {t('entregablesTitle')}
                  <span className="text-accent">.</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('entregablesDesc')}
                </p>
              </div>
              <EntregablesEmpresario entregablesResult={entregablesResult} />
            </section>
          )}
        </main>
      </div>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => !open && cerrarCancel()}
      >
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-destructive">
              {tBoard('cancelDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              {tBoard('cancelDialogWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="text-base font-semibold text-foreground truncate">
              {project.titulo}
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cancelMotivo" className="text-base font-semibold">
                {tBoard('cancelMotivoLabel')}
              </Label>
              <Textarea
                id="cancelMotivo"
                rows={2}
                value={cancelMotivo}
                onChange={(event) => setCancelMotivo(event.target.value)}
                disabled={cancelling}
                placeholder={tBoard('cancelMotivoPlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-destructive resize-none"
              />
            </div>
            <label className="flex items-start gap-2 text-base text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={cancelChecked}
                onChange={(event) => setCancelChecked(event.target.checked)}
                disabled={cancelling}
                className="mt-0.5 accent-[var(--color-destructive)]"
              />
              {tBoard('cancelCheckbox')}
            </label>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={cerrarCancel}
              disabled={cancelling}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmCancel()}
              disabled={!cancelChecked || cancelling}
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? tBoard('cancelling') : tBoard('cancelConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => !open && cerrarEdit()}>
        <DialogContent className="sm:max-w-lg border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {t('editDescriptionTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('editDescriptionDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="editDescription"
                className="text-sm font-semibold"
              >
                {t('editDescriptionLabel')}
              </Label>
              <Textarea
                id="editDescription"
                rows={10}
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                disabled={editing}
                placeholder={t('editDescriptionPlaceholder')}
                className="bg-card/50 border-border resize-none"
              />
            </div>
            {editRejection && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 space-y-2">
                <p className="text-sm font-bold text-warning flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {t('editDescriptionRejectedTitle')}
                </p>
                {editRejection.razones.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('editDescriptionRejectedReasons')}
                    </p>
                    <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">
                      {editRejection.razones.map((razon) => (
                        <li key={razon}>{razon}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {editRejection.ajustes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('editDescriptionRejectedAdjustments')}
                    </p>
                    <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">
                      {editRejection.ajustes.map((ajuste) => (
                        <li key={ajuste}>{ajuste}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={cerrarEdit}
              disabled={editing}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void confirmEdit()}
              disabled={editing || editValue.trim().length === 0}
              className="font-semibold"
            >
              {editing
                ? t('editDescriptionReviewing')
                : t('editDescriptionSubmit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyShell>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h4>
      <div className="text-foreground">{children}</div>
    </div>
  )
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((etiqueta) => (
        <span
          key={etiqueta}
          className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {etiqueta}
        </span>
      ))}
    </div>
  )
}
