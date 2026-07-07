'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function LocalThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('fwd-theme') as Theme | null
    if (stored) {
      setTheme(stored)
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('fwd-theme', next)
      return next
    })
  }

  // Prevenimos error de hidratación renderizando sin la clase hasta que esté montado
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        className={`flex min-h-screen flex-col bg-canvas text-foreground transition-colors duration-300 ${mounted && theme === 'dark' ? 'dark' : ''}`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useLocalTheme() {
  return useContext(ThemeContext)
}
