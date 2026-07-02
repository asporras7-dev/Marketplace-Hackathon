'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { ArrowRight, Database, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { completarOnboarding } from '@/lib/auth/actions'

type TituloFwd = 'frontend' | 'backend' | 'fullstack' | ''

export function EgresadoConsentScreen() {
  const tO = useTranslations('Onboarding')
  const router = useRouter()

  const [tituloFwd, setTituloFwd] = useState<TituloFwd>('')
  const [consentFWD, setConsentFWD] = useState(false)
  const [consentTerminos, setConsentTerminos] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (tituloFwd === '') {
      toast.error(tO('tituloFwdRequired'))
      return
    }
    if (!consentFWD) {
      toast.error(tO('consentRequired'))
      return
    }
    if (!consentTerminos) {
      toast.error(tO('terminosRequired'))
      return
    }

    setLoading(true)
    const result = await completarOnboarding({
      role: 'egresado',
      tituloFwd,
      aceptaTerminos: true,
      aceptaCotejo: true,
    })
    setLoading(false)

    if (result.ok) {
      router.push('/pending-approval')
      return
    }
    if (result.error === 'email_not_allowed') {
      toast.error(tO('emailNotAllowed'))
      return
    }
    toast.error(tO('errorGeneric'))
  }

  const selectClass =
    'w-full h-12 rounded-xl border border-border bg-surface-sunken/50 px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer'

  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Database className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold font-heading text-ink-strong">
            {tO('egresadoTitle')}
            <span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            {tO('egresadoMessage')}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="tituloFwd"
            className="text-xs font-bold text-ink uppercase tracking-wider"
          >
            {tO('labelTituloFwd')}
          </Label>
          <select
            id="tituloFwd"
            value={tituloFwd}
            onChange={(e) => setTituloFwd(e.target.value as TituloFwd)}
            className={selectClass}
          >
            <option value="" disabled>
              {tO('tituloFwdPlaceholder')}
            </option>
            <option value="frontend">{tO('tituloFrontend')}</option>
            <option value="backend">{tO('tituloBackend')}</option>
            <option value="fullstack">{tO('tituloFullstack')}</option>
          </select>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            <input
              type="checkbox"
              checked={consentFWD}
              onChange={(e) => setConsentFWD(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              {tO('consentLabel')}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            <input
              type="checkbox"
              checked={consentTerminos}
              onChange={(e) => setConsentTerminos(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              {tO('terminosLabel')}
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleContinue}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] cursor-pointer"
          >
            {loading ? tO('loading') : tO('saveProfile')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={async () => {
                const { signOut } = await import('@/lib/auth/actions')
                await signOut()
                router.push('/login')
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-ink-subtle hover:text-primary transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {tO('logout')}
            </button>
          </div>
        </div>
      </div>
    </AuthCard>
  )
}
