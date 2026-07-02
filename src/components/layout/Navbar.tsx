'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import type { UserRole } from '@/types'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'
import {
  Menu,
  X,
  Briefcase,
  Search,
  FolderOpen,
  Send,
  LayoutDashboard,
  PlusCircle,
  Building2,
  User,
  Users,
  ShieldCheck,
  MessageSquare,
  FileCheck2,
} from 'lucide-react'

import { cn } from '@/lib/utils/cn'

interface NavLink {
  href: string
  label: string
  icon: string
}

interface NavbarProps {
  heroMode?: boolean
  hideLogoOnDesktop?: boolean
  hideLinksFor?: string
}

export function Navbar({
  heroMode = false,
  hideLogoOnDesktop = false,
  hideLinksFor,
}: NavbarProps) {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { userRole: role, resetAuth } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // isHero = true solo en la landing page cuando está arriba
  const isHero = heroMode && !scrolled

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Configuracion de rol con tokens FWD (§5.1): egresado=primary, empresario=secondary, administrador=magenta.
  const roleConfig: Record<
    UserRole,
    { label: string; text: string; dot: string; chip: string; icon: ReactNode }
  > = {
    egresado: {
      label: t('roleEgresado'),
      text: 'text-primary',
      dot: 'bg-primary',
      chip: 'bg-primary text-primary-foreground',
      icon: <User className="w-3.5 h-3.5" />,
    },
    empresario: {
      label: t('roleEmpresa'),
      text: 'text-secondary',
      dot: 'bg-secondary',
      chip: 'bg-secondary text-secondary-foreground',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    administrador: {
      label: t('roleAdmin'),
      text: 'text-magenta',
      dot: 'bg-magenta',
      chip: 'bg-magenta text-magenta-foreground',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
  }

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale })
  }

  const navLinksByRole: Record<UserRole, NavLink[]> = {
    egresado: [
      { href: '/egresado', label: t('dashboard'), icon: 'dashboard' },
      {
        href: '/egresado/projects',
        label: t('searchProjects'),
        icon: 'search',
      },
      { href: '/egresado/portfolio', label: t('portfolio'), icon: 'portfolio' },
    ],
    empresario: [
      { href: '/empresario', label: t('dashboard'), icon: 'dashboard' },
      {
        href: '/empresario/new-project',
        label: t('publishProject'),
        icon: 'plus',
      },
      {
        href: '/empresario/formulario-empresa',
        label: t('myCompany'),
        icon: 'building',
      },
    ],
    administrador: [
      { href: '/admin/users', label: t('users'), icon: 'users' },
      { href: '/admin/companies', label: t('companies'), icon: 'building' },
      { href: '/admin/projects', label: t('projects'), icon: 'briefcase' },
      { href: '/admin/validations', label: t('validations'), icon: 'shield' },
    ],
  }

  const navLinks = !role || hideLinksFor === role ? [] : navLinksByRole[role]
  const activeRole = role ? roleConfig[role] : null

  const renderIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'dashboard':
        return <LayoutDashboard className={className} />
      case 'briefcase':
        return <Briefcase className={className} />
      case 'search':
        return <Search className={className} />
      case 'portfolio':
        return <FolderOpen className={className} />
      case 'send':
        return <Send className={className} />
      case 'plus':
        return <PlusCircle className={className} />
      case 'building':
        return <Building2 className={className} />
      case 'users':
        return <Users className={className} />
      case 'shield':
        return <ShieldCheck className={className} />
      case 'messages':
        return <MessageSquare className={className} />
      case 'contracts':
        return <FileCheck2 className={className} />
      default:
        return null
    }
  }

  return (
    <nav
      className={`sticky top-0 z-50 w-full animate-slide-down-fade transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] ${
        isHero
          ? 'border-b border-transparent bg-transparent py-3.5'
          : 'border-b border-border/80 bg-background/95 backdrop-blur-xl shadow-md py-2'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Main row: Logo + Inline links + Right actions */}
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div
            className={cn(
              'flex items-center gap-6 xl:gap-8',
              hideLogoOnDesktop && 'md:hidden',
            )}
          >
            <Link
              href="/"
              className="flex items-center space-x-2.5 shrink-0 group"
            >
              <FwdLogo className="w-8 h-8 group-hover:scale-105 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]" />
              <span
                className={`font-heading text-xl font-bold tracking-tight block transition-colors duration-300 ${isHero ? 'text-white' : 'text-foreground'}`}
              >
                Marketplace FWD<span className="text-primary">.</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links — INLINE when scrolled or not on landing/hero */}
          <div
            className={`hidden md:flex items-center space-x-1 lg:space-x-2 transition-all duration-300 ${
              isHero
                ? 'opacity-0 invisible absolute pointer-events-none'
                : 'opacity-100 visible'
            }`}
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={`inline-${link.href}`}
                  href={link.href}
                  className={`relative px-3.5 py-2 rounded-full text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {renderIcon(link.icon, 'w-4 h-4')}
                    <span>{link.label}</span>
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {/* Rol activo mostrado estáticamente sin opción a cambio */}
            {activeRole && (
              <div
                className={`flex items-center gap-2 border-r pr-3 mr-1 transition-colors duration-500 ${isHero ? 'border-white/30' : 'border-border/80'}`}
              >
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold select-none transition-all duration-500 ${isHero ? 'bg-white/15 border border-white/25 text-white drop-shadow-sm' : 'bg-muted/30 border border-border/50 text-foreground'}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${activeRole.dot}`}
                  />
                  <span>{activeRole.label}</span>
                </div>
              </div>
            )}

            {/* Notification Bell */}
            <NotificationBell isHero={isHero} className="shrink-0" />

            {/* Language Selector */}
            <div
              className={`relative flex items-center rounded-full p-0.5 shrink-0 transition-all duration-500 ${isHero ? 'border border-white/25 bg-white/15' : 'border border-border/60 bg-muted/30'}`}
              aria-label={t('language')}
            >
              <button
                type="button"
                onClick={() => handleLocaleChange('es')}
                className={`relative z-10 px-3 py-1 text-xs rounded-full transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] font-bold ${
                  locale === 'es'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => handleLocaleChange('en')}
                className={`relative z-10 px-3 py-1 text-xs rounded-full transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] font-bold ${
                  locale === 'en'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
            </div>

            {/* User Profile Avatar / Logout Dropdown */}
            <div className="relative group shrink-0">
              <button
                type="button"
                className={`flex items-center justify-center w-9 h-9 rounded-full shadow-sm transition-all duration-500 hover:scale-105 active:scale-95 cursor-default ${isHero ? 'bg-white/15 hover:bg-white/25 border border-white/25 text-white' : 'bg-muted hover:bg-muted-foreground/10 border border-border text-muted-foreground'}`}
                aria-label={t('profile')}
              >
                <User className="w-5 h-5 pointer-events-none" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-36 bg-card border border-border rounded-xl shadow-xl p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  type="button"
                  onClick={async () => {
                    const { signOut } = await import('@/lib/auth/actions')
                    await signOut()
                    resetAuth()
                    router.push('/login')
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center md:hidden gap-3">
            <NotificationBell isHero={isHero} className="shrink-0" />

            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-lg text-xs font-bold transition-all duration-500 hover:scale-105 active:scale-95 ${isHero ? 'text-white' : ''}`}
              onClick={() => handleLocaleChange(locale === 'es' ? 'en' : 'es')}
              aria-label={t('language')}
            >
              {locale === 'es' ? 'EN' : 'ES'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-lg transition-all duration-500 hover:scale-105 active:scale-95 ${isHero ? 'text-white' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Desktop Navigation Links — FLOATING CAPSULE PROTRUDING FROM THE BOTTOM */}
        <div
          className={`hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-20 transition-all duration-300 ${
            isHero
              ? 'opacity-100 visible scale-100'
              : 'opacity-0 invisible pointer-events-none scale-95 translate-y-0'
          }`}
        >
          <div className="flex items-center space-x-1 lg:space-x-2 bg-surface/90 dark:bg-zinc-900/90 backdrop-blur-md border border-border/80 rounded-full py-2.5 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={`float-${link.href}`}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-xs font-bold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] flex items-center gap-1.5 ${
                    isActive
                      ? 'text-ink-strong bg-primary/10'
                      : 'text-ink hover:text-ink-strong hover:bg-muted/40'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {renderIcon(link.icon, 'w-4 h-4')}
                    <span>{link.label}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`md:hidden grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-[var(--ease-in-out)] ${
          mobileMenuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div
          inert={!mobileMenuOpen}
          className={`overflow-hidden transition-opacity duration-[var(--duration-fast)] ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="border-t border-border/80 bg-background/95 backdrop-blur-xl px-4 pb-4 space-y-3">
            <div className="space-y-1 pt-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-base font-semibold transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {renderIcon(link.icon, 'w-5 h-5')}
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="border-t border-border/80 pt-3 space-y-1.5 px-3">
              {activeRole && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    {t('activeRole')}
                  </span>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2 text-sm font-bold text-foreground w-max select-none">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeRole.dot}`}
                    />
                    <span>{activeRole.label}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
