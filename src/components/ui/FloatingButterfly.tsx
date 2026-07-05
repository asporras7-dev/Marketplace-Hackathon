'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { ContextualChat } from '@/components/features/ai/ContextualChat'
import { cn } from '@/lib/utils/cn'

export function FloatingButterfly() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    const messages = [
      'Puedes preguntarme cualquier cosa sobre la página. ¡Estoy aquí para ayudarte!',
      '¡Recuerda que me puedes hacer preguntas si tienes algún problema!',
    ]
    let currentIndex = 0

    // Mostrar el primer mensaje de inmediato
    setNotification(messages[0])

    // Cambiar el mensaje cada 1 minuto
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length
      setNotification(messages[currentIndex])
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Ocultar la notificación después de 10 segundos
  useEffect(() => {
    if (notification) {
      const timeout = setTimeout(() => {
        setNotification(null)
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [notification])

  // Ocultar solo en páginas de autenticación (login/registro/recuperación)
  const isAuthPage =
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/reset-password')

  if (isAuthPage) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
          <ContextualChat onClose={() => setIsOpen(false)} />
        </div>
      )}

      {!isOpen && (
        <div className="relative flex flex-col items-end">
          {notification && (
            <div className="mb-2 mr-2 w-[220px] animate-in fade-in zoom-in-95 duration-500 p-[1.5px] rounded-2xl shadow-elevated relative z-10 bg-[linear-gradient(to_right,var(--warning),var(--secondary),var(--primary),var(--magenta))]">
              <div className="bg-surface/95 backdrop-blur-sm p-3 rounded-[15px] w-full h-full">
                <p className="text-foreground text-[13px] leading-relaxed font-medium">
                  {notification}
                </p>
              </div>
              {/* Triángulo apuntando hacia la mariposa con borde gradiente en la 'V' */}
              {/* Capa base: Gradiente */}
              <div className="absolute -bottom-[7px] right-8 w-4 h-4 bg-[linear-gradient(to_right,var(--warning),var(--secondary),var(--primary),var(--magenta))] transform rotate-45 z-[-2]" />
              {/* Capa superior: Fondo blanco desplazado hacia arriba-izquierda */}
              <div className="absolute -bottom-[5px] right-[33.5px] w-4 h-4 bg-surface/95 transform rotate-45 z-[-1]" />
            </div>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              'relative w-20 h-20',
              'hover:scale-110 transition-transform duration-300',
              'animate-float cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full',
            )}
            aria-label="Abrir asistente de IA"
          >
            <div className="relative w-full h-full animate-flap">
              <Image
                src="/images/LogoMariposa.png"
                alt="FWD AI Assistant"
                fill
                sizes="(max-width: 80px) 100vw, 80px"
                className="object-contain relative z-10 drop-shadow-lg"
              />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
