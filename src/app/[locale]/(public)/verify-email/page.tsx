'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Edit2, ShieldCheck } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { resendVerificationEmail } from '@/lib/auth/actions'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { VerificationMessage } from '@/components/features/auth/VerificationMessage'

export default function VerifyEmailPage() {
  const tAuth = useTranslations('Auth')
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')

  // El correo llega como query param desde el registro (?email=...). Si falta
  // (p. ej. el usuario llegó con sesión sin confirmar), se toma de la sesión.
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('email')
    if (fromQuery) {
      setEmail(fromQuery)
      return
    }
    const fetchUserEmail = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase.auth.getUser()
      if (data.user?.email) setEmail(data.user.email)
    }
    void fetchUserEmail()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error(tAuth('resendNoEmail'))
      return
    }
    if (code.trim().length === 0) {
      toast.error(tAuth('codeRequired'))
      return
    }
    setVerifying(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    setVerifying(false)
    if (error) {
      toast.error(tAuth('verifyCodeError'))
      return
    }
    toast.success(tAuth('verifySuccess'))
    // Con la sesión ya creada y el correo confirmado, el destino lo resuelve la
    // página de espera (al panel si está verificado, o "en revisión").
    router.push('/pending-approval')
  }

  const handleResend = async () => {
    if (!email) {
      toast.error(tAuth('resendNoEmail'))
      return
    }
    setResending(true)
    const result = await resendVerificationEmail(email)
    setResending(false)
    if (!result.ok) {
      toast.error(tAuth('errorUnexpected'))
      return
    }
    toast.success(tAuth('resendSuccess'))
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <VerificationMessage
          title={tAuth('verifyTitle')}
          description={tAuth('verifySubtitle')}
          success={false}
        />

        <form onSubmit={handleVerify} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label
              htmlFor="code"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              {tAuth('codeLabel')}
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={tAuth('codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 rounded-xl bg-surface-sunken/50 border-border text-center tracking-[0.4em] font-mono text-lg focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
            />
          </div>

          <Button
            type="submit"
            disabled={verifying || !email}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
          >
            <ShieldCheck className="w-4 h-4" />
            {verifying ? tAuth('verifying') : tAuth('verifyButton')}
          </Button>
        </form>

        <div className="space-y-3 pt-1">
          <Button
            onClick={handleResend}
            disabled={resending || !email}
            variant="outline"
            className="w-full h-12 rounded-xl border border-border-strong hover:bg-surface-sunken bg-surface font-bold text-ink text-sm flex items-center justify-center gap-2 transition-all duration-200"
          >
            <RefreshCw
              className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`}
            />
            {resending ? tAuth('resending') : tAuth('resendEmail')}
          </Button>

          <Link href="/register" className="block w-full">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl hover:bg-surface-sunken font-bold text-primary text-sm flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Edit2 className="w-4 h-4" />
              {tAuth('changeEmail')}
            </Button>
          </Link>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {tAuth('signIn')}
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
