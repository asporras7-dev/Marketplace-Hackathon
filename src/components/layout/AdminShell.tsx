'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import {
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useSidebarHidden } from '@/hooks/use-sidebar-hidden'
import { SidebarAdmin } from './SidebarAdmin'
import { ThemeToggle } from './ThemeToggle'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'
import { cn } from '@/lib/utils/cn'

interface AdminShellProps {
  children: ReactNode
  isSuperadmin?: boolean
}

/**
 * Marco del panel admin — diseño con sidebar morado oscuro + header morado FWD
 * y contenido sobre fondo blanco limpio (§5.7).
 */
export function AdminShell({
  children,
  isSuperadmin = false,
}: AdminShellProps) {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { resetAuth, currentUser } = useAuth()
  const { isHidden: isSidebarHidden, toggle: toggleSidebar } =
    useSidebarHidden()

  const [mobileOpen, setMobileOpen] = useState(false)

  const adminName =
    (typeof currentUser?.user_metadata?.['full_name'] === 'string'
      ? currentUser.user_metadata['full_name']
      : undefined) ??
    currentUser?.email?.split('@')[0] ??
    'Admin'
  const adminEmail = currentUser?.email ?? ''

  const initials = adminName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const closeMobile = () => setMobileOpen(false)

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale })
  }

  const handleLogout = async () => {
    const { signOut } = await import('@/lib/auth/actions')
    await signOut()
    resetAuth()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Desktop Sidebar ── */}
      {!isSidebarHidden && (
        <SidebarAdmin
          id="admin-sidebar"
          className="hidden md:flex md:sticky md:top-0 md:h-screen md:self-start"
          onLogout={handleLogout}
          isSuperadmin={isSuperadmin}
        />
      )}

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={closeMobile}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 z-10">
            <SidebarAdmin
              className="h-full"
              onNavigate={closeMobile}
              onLogout={handleLogout}
              isSuperadmin={isSuperadmin}
            />
          </div>
        </div>
      )}

      {/* ── Main content column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top Header Bar (White / very light gray) ── */}
        <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 px-5 border-b border-border shadow-sm bg-surface">
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-sunken md:hidden transition-colors"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Desktop sidebar toggle */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarHidden ? t('showSidebar') : t('hideSidebar')}
            aria-expanded={!isSidebarHidden}
            aria-controls="admin-sidebar"
            className="hidden md:inline-flex rounded-lg p-1.5 text-muted-foreground hover:bg-surface-sunken transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            {isSidebarHidden ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>

          {/* Foundation brand pill */}
          <span className="flex items-center gap-2 mr-2">
            <ShieldCheck className="h-4 w-4 text-purple-700 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground hidden sm:inline">
              {t('adminEyebrow')}
            </span>
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notification bell */}
          <NotificationBell className="shrink-0" />

          {/* Language switcher */}
          <div
            className="flex items-center rounded-full border border-border bg-surface-sunken p-0.5"
            aria-label={t('language')}
          >
            <button
              type="button"
              onClick={() => handleLocaleChange('es')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-all duration-[var(--duration-fast)]',
                locale === 'es'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-all duration-[var(--duration-fast)]',
                locale === 'en'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              EN
            </button>
          </div>

          {/* Role badge */}
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-3 py-1 text-xs font-bold text-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" />
            {t('roleAdmin')}
          </span>

          {/* User avatar + info */}
          <button
            type="button"
            title={adminEmail || undefined}
            className="flex items-center gap-2.5 rounded-full border border-border bg-surface-sunken pl-1 pr-3 py-1 hover:bg-surface transition-colors"
          >
            {/* Avatar circle */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-magenta text-[10px] font-bold text-white">
              {initials || '?'}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight max-w-[10rem]">
              <span className="truncate text-xs font-bold text-foreground leading-none">
                {adminName}
              </span>
              <span className="truncate text-[10px] text-muted-foreground leading-none mt-0.5">
                {adminEmail}
              </span>
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block shrink-0" />
          </button>
        </header>

        {/* ── Rainbow brand stripe ── */}
        <div className="flex h-[3px] w-full shrink-0" aria-hidden="true">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-secondary" />
          <div className="flex-1 bg-accent" />
          <div className="flex-1 bg-highlight" />
          <div className="flex-1 bg-warning" />
          <div className="flex-1 bg-magenta" />
        </div>

        {/* ── Page content with watermark background ── */}
        <main className="flex-1 overflow-x-hidden bg-canvas relative">
          {/* Bottom-left blurred watermark */}
          <div className="absolute -bottom-24 -left-24 z-0 w-96 h-96 opacity-[0.04] blur-[1px] pointer-events-none">
            <FwdLogo className="w-full h-full" />
          </div>

          {/* Real children wrapper */}
          <div className="relative z-10 min-h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
