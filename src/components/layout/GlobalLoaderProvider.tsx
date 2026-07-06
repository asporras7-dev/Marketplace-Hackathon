'use client'

import React, { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { GlobalLoader } from '@/components/ui/GlobalLoader'

export function GlobalLoaderProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const loadStartTime = useRef<number>(0)
  const minLoadTime = 200 // Reducido a 200ms para que se sienta más rápido

  // Detener el loader cuando cambie la ruta actual (significa que Next.js terminó de cargar)
  useEffect(() => {
    const timeElapsed = Date.now() - loadStartTime.current
    if (timeElapsed < minLoadTime) {
      const timeoutId = setTimeout(() => {
        setIsLoading(false)
      }, minLoadTime - timeElapsed)
      return () => clearTimeout(timeoutId)
    } else {
      setIsLoading(false)
    }
  }, [pathname, searchParams]) // Dependencias: se dispara cuando la ruta se resuelve

  // Interceptar clicks en los links para activar el loader inmediatamente
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const targetAttr = anchor.getAttribute('target')

      // Ignorar links inválidos, anclas, descargas o nuevas pestañas
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        targetAttr === '_blank'
      )
        return

      // Extraer el origin de la URL
      let url: URL
      try {
        url = new URL(anchor.href)
      } catch {
        return
      }

      // Solo si navegamos a una página interna distinta de la actual
      const isInternal = url.origin === window.location.origin
      const isDifferentPath =
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search

      if (isInternal && isDifferentPath) {
        // Ignorar clicks si tienen teclas especiales (abren nueva pestaña)
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return

        // Omitir por completo la aparición del loader si se va al módulo de login o mensajes
        if (
          url.pathname.includes('/login') ||
          url.pathname.includes('/mensajes')
        )
          return

        loadStartTime.current = Date.now()
        setIsLoading(true)
      }
    }

    document.addEventListener('click', handleAnchorClick, true)
    return () => document.removeEventListener('click', handleAnchorClick, true)
  }, [])

  // Interceptar botones del navegador (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      loadStartTime.current = Date.now()
      setIsLoading(true)
    }
    const handleCustomTrigger = () => {
      loadStartTime.current = Date.now()
      setIsLoading(true)
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('trigger-global-loader', handleCustomTrigger)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('trigger-global-loader', handleCustomTrigger)
    }
  }, [])

  // Detectar si estamos en el inicio para aplicar más transparencia al fondo
  const isHome = pathname === '/' || pathname === '/es' || pathname === '/en'

  return (
    <>
      {children}
      <GlobalLoader isLoading={isLoading} isHome={isHome} />
    </>
  )
}
