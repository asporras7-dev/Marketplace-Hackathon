'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { Mail, UserPlus, ArrowRight, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteAdmin } from '@/lib/admin/admin-actions'

interface AdminRegisterFormValues {
  correo: string
  nivelAdmin: string
}

function createSchema(t: ReturnType<typeof useTranslations<'Admin'>>) {
  return zod.object({
    correo: zod.string().email({ message: t('adminRegisterEmailInvalid') }),
    nivelAdmin: zod
      .string()
      .refine((value) => value === 'superadmin' || value === 'admin', {
        message: t('adminRegisterLevelRequired'),
      }),
  })
}

/**
 * Formulario de invitación de administrador (solo superadmin lo ve).
 * Pide correo + nivel (superadmin/admin); el nombre se completa luego en el
 * perfil. Si el correo de invitación no se envía, muestra el enlace de respaldo.
 */
export function AdminRegisterForm() {
  const t = useTranslations('Admin')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const schema = useMemo(() => createSchema(t), [t])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AdminRegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { correo: '', nivelAdmin: '' },
  })

  const onSubmit = async (values: AdminRegisterFormValues) => {
    setLoading(true)
    setInviteLink(null)
    setCopied(false)

    const result = await inviteAdmin({
      correo: values.correo,
      nivelAdmin: values.nivelAdmin as 'superadmin' | 'admin',
    })

    setLoading(false)

    if (!result.ok) {
      const message =
        result.error === 'email_already_exists'
          ? t('adminRegisterErrorEmailExists')
          : result.error === 'forbidden'
            ? t('adminRegisterErrorForbidden')
            : result.error === 'invalid_input'
              ? t('adminRegisterErrorInvalid')
              : t('adminRegisterError')
      toast.error(message)
      return
    }

    if (result.data.emailSent) {
      toast.success(t('adminRegisterSuccess', { email: values.correo }))
    } else if (result.data.inviteLink) {
      toast.success(t('adminRegisterCreatedNoEmail'))
      setInviteLink(result.data.inviteLink)
    } else {
      toast.success(t('adminRegisterCreatedNoLink'))
    }
    reset({ correo: '', nivelAdmin: '' })
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success(t('adminRegisterLinkCopied'))
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label
            htmlFor="correo"
            className="text-sm font-semibold text-foreground"
          >
            {t('adminRegisterEmailLabel')}
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="correo"
              type="email"
              autoComplete="off"
              placeholder={t('adminRegisterEmailPlaceholder')}
              className={`pl-9 ${errors.correo ? 'border-destructive' : ''}`}
              {...register('correo')}
            />
          </div>
          {errors.correo && (
            <p className="text-xs font-semibold text-destructive">
              {errors.correo.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="nivelAdmin"
            className="text-sm font-semibold text-foreground"
          >
            {t('adminRegisterLevelLabel')}
          </Label>
          <Controller
            control={control}
            name="nivelAdmin"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="nivelAdmin"
                  className={`w-full ${errors.nivelAdmin ? 'border-destructive' : ''}`}
                >
                  <SelectValue
                    placeholder={t('adminRegisterLevelPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">
                    {t('nivelSuperadmin')}
                  </SelectItem>
                  <SelectItem value="admin">{t('nivelAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.nivelAdmin && (
            <p className="text-xs font-semibold text-destructive">
              {errors.nivelAdmin.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('adminRegisterLevelHint')}
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-magenta font-semibold text-magenta-foreground hover:bg-magenta/90"
        >
          <UserPlus className="h-4 w-4" />
          {loading ? t('adminRegisterSending') : t('adminRegisterSubmit')}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      {inviteLink && (
        <div className="mt-6 space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-warning-foreground">
            {t('adminRegisterLinkLabel')}
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteLink}
              className="flex-1 font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied
                ? t('adminRegisterLinkCopied')
                : t('adminRegisterCopyLink')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
