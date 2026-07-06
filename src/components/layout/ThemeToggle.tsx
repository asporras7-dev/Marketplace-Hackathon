'use client'

import { useTranslations } from 'next-intl'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalTheme } from './ThemeContext'

export function ThemeToggle() {
  const context = useLocalTheme()
  const t = useTranslations('Theme')

  if (!context) return null

  const { theme, toggleTheme } = context

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={t('toggle')}
      className="rounded-full w-9 h-9 border border-border/50 bg-surface text-ink-muted hover:text-ink-strong hover:bg-surface-sunken"
    >
      {theme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">{t('toggle')}</span>
    </Button>
  )
}
