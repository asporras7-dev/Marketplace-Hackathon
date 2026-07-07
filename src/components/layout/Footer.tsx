import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('Footer')
  const year = new Date().getFullYear()

  return (
    <footer className="w-full bg-secondary text-secondary-foreground border-t border-secondary-foreground/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <img
                src="/images/logo-fwd-icon.png"
                alt="Logo FWD"
                className="w-8 h-8 group-hover:scale-105 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] object-contain"
              />
              <span className="font-heading text-xl font-bold tracking-tight text-secondary-foreground">
                Marketplace FWD<span className="text-highlight">.</span>
              </span>
            </Link>
            <p className="text-sm text-secondary-foreground/70 max-w-sm leading-relaxed">
              {t('tagline')}
            </p>
          </div>

          {/* Junior Sections */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent font-heading">
              {t('egresadoTitle')}
            </h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li>
                <Link
                  href="/egresado/projects"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('searchProjects')}
                </Link>
              </li>
              <li>
                <Link
                  href="/egresado/applications"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('myApplications')}
                </Link>
              </li>
              <li>
                <span className="text-secondary-foreground/50 cursor-not-allowed">
                  {t('careerGuides')}
                </span>
              </li>
            </ul>
          </div>

          {/* Company Sections */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent font-heading">
              {t('companyTitle')}
            </h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li>
                <Link
                  href="/empresario/new-project"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('publishProject')}
                </Link>
              </li>
              <li>
                <Link
                  href="/empresario"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('searchGraduates')}
                </Link>
              </li>
              <li>
                <span className="text-secondary-foreground/50 cursor-not-allowed">
                  {t('pricing')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-secondary-foreground/50">
          <p>{t('rights', { year })}</p>
          <div className="flex space-x-4">
            <span className="hover:text-secondary-foreground/70 cursor-pointer">
              {t('terms')}
            </span>
            <span className="hover:text-secondary-foreground/70 cursor-pointer">
              {t('privacy')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
