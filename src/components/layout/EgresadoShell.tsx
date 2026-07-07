import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { SidebarEgresado } from './SidebarEgresado'

interface EgresadoShellProps {
  children: ReactNode
}

export function EgresadoShell({ children }: EgresadoShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />
      <div className="flex flex-1 max-w-full relative">
        <div className="sticky top-[64px] h-[calc(100vh-64px)] hidden md:block z-10 shrink-0">
          <SidebarEgresado />
        </div>
        <main className="flex-1 flex flex-col min-w-0 pb-10">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
