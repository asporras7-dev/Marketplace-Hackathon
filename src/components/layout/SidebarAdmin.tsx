'use client'

import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  ShieldCheck,
  Settings,
  LogOut,
  AlertTriangle,
  Star,
  LifeBuoy,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { cn } from '@/lib/utils/cn'

type AdminNavLabel =
  | 'dashboard'
  | 'users'
  | 'adminRegister'
  | 'projects'
  | 'validations'
  | 'settings'
  | 'moderation'
  | 'ratings'
  | 'support'
  | 'reports'

interface AdminNavItem {
  href: string
  labelKey: AdminNavLabel
  icon: LucideIcon
  /** Si es true, el ítem solo se muestra a un superadmin. */
  superadminOnly?: boolean
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/users', labelKey: 'users', icon: Users },
  {
    href: '/admin/registro-admin',
    labelKey: 'adminRegister',
    icon: UserPlus,
    superadminOnly: true,
  },
  { href: '/admin/projects', labelKey: 'projects', icon: Briefcase },
  { href: '/admin/validations', labelKey: 'validations', icon: ShieldCheck },
  { href: '/admin/moderation', labelKey: 'moderation', icon: AlertTriangle },
  { href: '/admin/calificaciones', labelKey: 'ratings', icon: Star },
  { href: '/admin/reports', labelKey: 'reports', icon: BarChart3 },
  { href: '/admin/soporte', labelKey: 'support', icon: LifeBuoy },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings },
]

interface SidebarAdminProps {
  id?: string | undefined
  className?: string | undefined
  onNavigate?: (() => void) | undefined
  onLogout?: (() => void) | undefined
  isSuperadmin?: boolean | undefined
}

export function SidebarAdmin({
  id,
  className,
  onNavigate,
  onLogout,
  isSuperadmin = false,
}: SidebarAdminProps) {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  const navItems = ADMIN_NAV.filter(
    (item) => !item.superadminOnly || isSuperadmin,
  )

  return (
    <nav
      id={id}
      aria-label={t('roleAdmin')}
      className={cn(
        'flex w-56 shrink-0 flex-col bg-secondary text-white relative overflow-hidden',
        className,
      )}
      style={{
        backgroundColor: 'var(--surface-admin)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 0 L30 30 L0 60 Z M60 0 L30 30 L60 60 Z' fill='%23f7f9fa' fill-opacity='0.03'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Logo + Brand */}
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5 hover:opacity-90 transition-opacity z-10 group"
      >
        <img
          src="/images/logo-fwd-icon.png"
          alt="Logo FWD"
          className="w-10 h-10 object-contain transition-transform duration-500 group-hover:rotate-180 group-hover:scale-110 shrink-0"
        />
        <span className="font-heading text-base font-bold tracking-tight leading-tight text-white">
          Marketplace<span className="text-magenta"> FWD</span>
        </span>
      </Link>

      {/* Divider */}
      <div className="mx-4 mb-3 h-px bg-white/10 z-10" />

      {/* Nav Items */}
      <div className="flex flex-col gap-1.5 px-3 flex-1 z-10">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive =
            href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                isActive
                  ? 'bg-gradient-to-r from-primary to-magenta text-white shadow-md'
                  : 'text-white/75 hover:bg-white/10 hover:text-white/90',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-white/60',
                )}
                aria-hidden="true"
              />
              <span>{t(labelKey)}</span>
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      {onLogout && (
        <div className="p-3 pt-0">
          <div className="h-px bg-white/10 mb-3" />
          <ConfirmButton
            onConfirm={onLogout}
            title={t('confirmLogoutTitle')}
            description={t('confirmLogoutDesc')}
            confirmLabel={t('logout')}
            variant="ghost"
            size="default"
            className="w-full flex items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/8 hover:text-white/90 transition-all"
          >
            <LogOut
              className="h-4 w-4 shrink-0 text-white/55"
              aria-hidden="true"
            />
            {t('logout')}
          </ConfirmButton>
        </div>
      )}
    </nav>
  )
}
