'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SupportTicketDialog } from '@/components/features/shared/SupportTicketDialog'
import {
  Loader2,
  Send,
  MessageSquare,
  HelpCircle,
  Users,
  Star,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { useSidebarHidden } from '@/hooks/use-sidebar-hidden'
import { useAuth } from '@/lib/auth/AuthContext'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'

interface NavItem {
  id: string
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

export function SidebarEmpresaNuevo() {
  const t = useTranslations('EmpresaPerfil')
  const tNav = useTranslations('Nav')
  const pathname = usePathname()
  const router = useRouter()
  const { resetAuth } = useAuth()
  const { isHidden, toggle } = useSidebarHidden()
  const handleLogout = async () => {
    const { signOut } = await import('@/lib/auth/actions')
    await signOut()
    resetAuth()
    router.push('/login')
  }

  // El highlight sigue la SECCIÓN, no solo la URL exacta: las subrutas de
  // proyecto/new-project cuentan como Panel; formulario-empresa como Perfil.
  const navItems: NavItem[] = [
    {
      id: 'postulaciones',
      href: '/empresario/postulaciones',
      label: t('menuPostulaciones'),
      icon: Send,
      isActive: (path) => path.startsWith('/empresario/postulaciones'),
    },
    {
      id: 'talento',
      href: '/empresario/talento',
      label: t('menuTalento'),
      icon: Star,
      isActive: (path) => path.startsWith('/empresario/talento'),
    },
    {
      id: 'contrataciones',
      href: '/empresario/contrataciones',
      label: t('menuContrataciones'),
      icon: Users,
      isActive: (path) => path.startsWith('/empresario/contrataciones'),
    },
    {
      id: 'mensajes',
      href: '/empresario/mensajes',
      label: t('menuMensajes'),
      icon: MessageSquare,
      isActive: (path) => path.startsWith('/empresario/mensajes'),
    },
  ]

  if (isHidden) {
    return (
      <div className="w-full lg:w-auto shrink-0">
        <button
          type="button"
          onClick={toggle}
          aria-label={tNav('showSidebar')}
          aria-expanded={false}
          className="inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]"
        >
          <PanelLeftOpen className="w-5 h-5 shrink-0" />
        </button>
      </div>
    )
  }

  return (
    <aside
      id="empresario-sidebar"
      className="w-full lg:w-64 shrink-0 flex flex-col gap-6 bg-secondary text-white p-4 lg:p-6 rounded-3xl lg:rounded-none border lg:border-none lg:border-r border-white/10 shadow-lg lg:shadow-none relative overflow-hidden lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 0 L30 30 L0 60 Z M60 0 L30 30 L60 60 Z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E")`,
      }}
    >
      <nav className="flex flex-col gap-1 px-1 flex-1">
        <div className="flex justify-end px-1 pb-1">
          <button
            type="button"
            onClick={toggle}
            aria-label={tNav('hideSidebar')}
            aria-expanded={true}
            aria-controls="empresario-sidebar"
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <PanelLeftClose className="w-4 h-4 shrink-0" />
          </button>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                active
                  ? 'bg-gradient-to-r from-primary to-magenta text-white shadow-md font-bold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
        {/* Ayuda / Soporte Técnico abre el Dialog */}
        <SupportTicketDialog>
          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>{t('menuAyuda')}</span>
          </button>
        </SupportTicketDialog>
      </nav>

      {/* Cerrar sesión (mismo patrón con confirmación que el admin) */}
      <div className="px-1">
        <div className="h-px bg-white/10 mb-2" />
        <ConfirmButton
          onConfirm={handleLogout}
          title={tNav('confirmLogoutTitle')}
          description={tNav('confirmLogoutDesc')}
          confirmLabel={tNav('logout')}
          variant="ghost"
          size="default"
          className="w-full flex items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/8 hover:text-white/90 transition-all"
        >
          <LogOut
            className="w-4 h-4 shrink-0 text-white/55"
            aria-hidden="true"
          />
          {tNav('logout')}
        </ConfirmButton>
      </div>
    </aside>
  )
}
