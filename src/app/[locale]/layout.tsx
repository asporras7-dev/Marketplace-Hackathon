import type { ReactNode } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Archivo_Narrow, Figtree, JetBrains_Mono } from 'next/font/google'
import { routing } from '@/i18n/routing'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { getCurrentUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeRole } from '@/lib/auth/roles'
import type { UserRole } from '@/types'
import { Toaster } from '@/components/ui/sonner'
import { FloatingButterfly } from '@/components/ui/FloatingButterfly'
import '../globals.css'

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo-narrow',
})

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

import { GlobalLoaderProvider } from '@/components/layout/GlobalLoaderProvider'
import { LocalThemeProvider } from '@/components/layout/ThemeContext'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  // Rol autoritativo desde el servidor: el cliente ya no depende solo de
  // localStorage para conocer el rol, evitando que un empresario vea la vista
  // de egresado por un valor rancio. Solo se consulta si hay sesion.
  const user = await getCurrentUser()
  let initialRole: UserRole | null = null
  if (user) {
    const supabase = await createSupabaseServerClient()
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    initialRole = normalizeRole(roleRaw as string | null)
  }

  return (
    <html
      lang={locale}
      className={`${archivoNarrow.variable} ${figtree.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider initialRole={initialRole}>
            <LocalThemeProvider>
              <GlobalLoaderProvider>{children}</GlobalLoaderProvider>
              <Toaster richColors position="top-right" />
              <FloatingButterfly />
            </LocalThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
