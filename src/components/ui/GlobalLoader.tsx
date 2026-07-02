import React from 'react'
import { cn } from '@/lib/utils/cn'
import { useTranslations } from 'next-intl'
import styles from './GlobalLoader.module.css'

interface GlobalLoaderProps {
  isLoading?: boolean
  isHome?: boolean
}

export function GlobalLoader({
  isLoading = true,
  isHome = false,
}: GlobalLoaderProps) {
  const t = useTranslations('Common')

  return (
    <div
      className={cn(
        styles.overlay,
        isLoading && styles.overlayActive,
        isHome && styles.overlayHome,
      )}
      aria-hidden="true"
    >
      <img
        src="/images/logo-loader-transparent.png"
        alt={t('loading')}
        className={cn(
          styles.loaderImage,
          'pointer-events-none',
          isLoading
            ? 'opacity-100 transition-none'
            : 'opacity-0 transition-opacity duration-200',
        )}
      />
    </div>
  )
}
