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
  const minLoadTime = 600 // 600ms para asegurar que la animación se vea bien y fluida

  // Detener el loader cuando cambie la ruta actual (significa que Next.js terminó de cargar)
  useEffect(() => {
    if (isLoading) {
      const timeElapsed = Date.now() - loadStartTime.current
      if (timeElapsed < minLoadTime) {
        const timeoutId = setTimeout(() => {
          setIsLoading(false)
        }, minLoadTime - timeElapsed)
        return () => clearTimeout(timeoutId)
      } else {
        setIsLoading(false)
      }
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

        loadStartTime.current = Date.now()
        setIsLoading(true)
      }
    }

    document.addEventListener('click', handleAnchorClick, true)
    return () => document.removeEventListener('click', handleAnchorClick, true)
  }, [])

  // Interceptar navegación programática y botones del navegador
  useEffect(() => {
    const handlePopState = () => {
      loadStartTime.current = Date.now()
      setIsLoading(true)
    }

    const originalPushState = window.history.pushState
    window.history.pushState = function (...args) {
      loadStartTime.current = Date.now()
      setIsLoading(true)
      return originalPushState.apply(window.history, args)
    }

    const originalReplaceState = window.history.replaceState
    window.history.replaceState = function (...args) {
      // Ignoramos replaceState si es solo un update de estado interno sin cambio real
      return originalReplaceState.apply(window.history, args)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [])

  return (
    <>
      {children}
      <GlobalLoader isLoading={isLoading} />
    </>
  )
}
