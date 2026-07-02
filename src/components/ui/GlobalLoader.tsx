import React from 'react'
import { cn } from '@/lib/utils/cn'
import styles from './GlobalLoader.module.css'

interface GlobalLoaderProps {
  isLoading?: boolean
}

export function GlobalLoader({ isLoading = true }: GlobalLoaderProps) {
  return (
    <div
      className={cn(styles.overlay, isLoading && styles.overlayActive)}
      aria-hidden="true"
    >
      <img
        src="/images/logo-loader-transparent.png"
        alt="Cargando"
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
