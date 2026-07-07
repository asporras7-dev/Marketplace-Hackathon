'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/AuthContext'
import { ContextualChat } from '@/components/features/ai/ContextualChat'
import { cn } from '@/lib/utils/cn'

export function FloatingButterfly() {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [introPhase, setIntroPhase] = useState<
    'hidden' | 'center' | 'flying' | 'done'
  >('hidden')

  // Obtener nombre del usuario para el saludo
  const displayName =
    (typeof currentUser?.user_metadata?.['full_name'] === 'string'
      ? currentUser.user_metadata['full_name']
      : undefined) ??
    (typeof currentUser?.user_metadata?.['nombre'] === 'string'
      ? currentUser.user_metadata['nombre']
      : undefined) ??
    currentUser?.email?.split('@')[0] ??
    ''

  useEffect(() => {
    const messages = [
      'Puedes preguntarme cualquier cosa sobre la página. ¡Estoy aquí para ayudarte!',
      '¡Recuerda que me puedes hacer preguntas si tienes algún problema!',
    ]
    let currentIndex = 0

    // Mostrar el primer mensaje de inmediato
    setNotification(messages[0] ?? null)

    // Cambiar el mensaje cada 1 minuto
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length
      setNotification(messages[currentIndex] ?? null)
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

  // Lógica de la animación de introducción (se reproduce solo UNA VEZ por sesión)
  useEffect(() => {
    // Solo mostramos la animación si el usuario está logueado y no está en una página de login/registro.
    // También verificamos que esté en la raíz ('/es' o '/en') si queremos limitarlo al landing page,
    // pero como el usuario especificó "en la dirección ''", nos aseguramos de que corra.
    const isLanding =
      pathname === '/' || pathname === '/es' || pathname === '/en'

    if (currentUser && isLanding && !isAuthPage) {
      // Usamos una nueva clave en sessionStorage (v4) para asegurar que el intento fallido anterior
      // (por la falta de imagen) no impida que se ejecute ahora.
      const hasSeenIntro = sessionStorage.getItem('fwd_intro_played_v4')

      if (!hasSeenIntro) {
        setIntroPhase('center')

        // 1. Mostrar la mariposa en el centro durante 2.5 segundos
        const flyTimer = setTimeout(() => {
          setIntroPhase('flying')

          // 2. Animación de vuelo dura 1 segundo, luego termina
          const doneTimer = setTimeout(() => {
            setIntroPhase('done')
            sessionStorage.setItem('fwd_intro_played_v4', 'true')
          }, 1000)

          return () => clearTimeout(doneTimer)
        }, 2500)

        return () => clearTimeout(flyTimer)
      } else {
        setIntroPhase('done')
      }
    } else if (!currentUser || isAuthPage) {
      setIntroPhase('done')
      // Si el usuario cierra sesión (currentUser es null), borramos el registro
      // para que la próxima vez que inicie sesión, vuelva a ver la animación.
      if (!currentUser) {
        sessionStorage.removeItem('fwd_intro_played_v4')
      }
    }
  }, [currentUser, pathname, isAuthPage])

  if (isAuthPage) {
    return null
  }

  // Si está en la animación de intro, renderizamos el overlay a pantalla completa
  if (introPhase === 'center' || introPhase === 'flying') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
        {/* Fondo oscurecido con blur que se desvanece al volar */}
        <div
          className={cn(
            'absolute inset-0 bg-secondary/40 backdrop-blur-sm transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-in-out)]',
            introPhase === 'center' ? 'opacity-100' : 'opacity-0',
          )}
        />

        <div
          className={cn(
            'absolute flex flex-col items-center justify-center transition-all duration-[1000ms] ease-[var(--ease-in-out)]',
            introPhase === 'center'
              ? 'bottom-[50%] right-[50%] translate-x-[50%] translate-y-[50%] scale-100 opacity-100'
              : 'bottom-[64px] right-[64px] translate-x-[50%] translate-y-[50%] scale-[0.416] opacity-0',
          )}
        >
          <div className="relative w-48 h-48 animate-float">
            {/* Brillo mágico (glow) detrás de la mariposa */}
            <div
              className={cn(
                'absolute inset-0 bg-primary/60 blur-[60px] rounded-full transition-all duration-[var(--duration-slow)] ease-[var(--ease-in-out)]',
                introPhase === 'center'
                  ? 'opacity-100 scale-150'
                  : 'opacity-0 scale-50',
              )}
            />

            {/* Destellos/partículas que saltan hacia el usuario (efecto 3D warp constante) */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-500',
                introPhase === 'center' ? 'opacity-100' : 'opacity-0',
              )}
            >
              <style>{`
                @keyframes spark-forward {
                  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                  10% { opacity: 1; }
                  70% { opacity: 1; }
                  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(6); opacity: 0; }
                }
                .fwd-spark {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  border-radius: 50%;
                  animation: spark-forward var(--duration, 2s) ease-out infinite;
                  animation-delay: var(--delay, 0s);
                }
              `}</style>
              <div
                className="fwd-spark w-3 h-3 bg-highlight"
                style={
                  {
                    '--tx': '-250px',
                    '--ty': '-200px',
                    '--duration': '1.2s',
                    '--delay': '0s',
                    boxShadow: '0 0 20px 4px var(--highlight)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-4 h-4 bg-accent"
                style={
                  {
                    '--tx': '230px',
                    '--ty': '-250px',
                    '--duration': '1.5s',
                    '--delay': '0.3s',
                    boxShadow: '0 0 25px 5px var(--accent)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-3 h-3 bg-magenta"
                style={
                  {
                    '--tx': '-280px',
                    '--ty': '150px',
                    '--duration': '1.8s',
                    '--delay': '0.6s',
                    boxShadow: '0 0 20px 4px var(--magenta)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-5 h-5 bg-primary"
                style={
                  {
                    '--tx': '260px',
                    '--ty': '230px',
                    '--duration': '2s',
                    '--delay': '0.9s',
                    boxShadow: '0 0 30px 6px var(--primary)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-3 h-3 bg-warning"
                style={
                  {
                    '--tx': '0px',
                    '--ty': '-300px',
                    '--duration': '1.4s',
                    '--delay': '1.1s',
                    boxShadow: '0 0 20px 4px var(--warning)',
                  } as React.CSSProperties
                }
              />

              <div
                className="fwd-spark w-3 h-3 bg-highlight"
                style={
                  {
                    '--tx': '-220px',
                    '--ty': '280px',
                    '--duration': '1.6s',
                    '--delay': '0.2s',
                    boxShadow: '0 0 20px 4px var(--highlight)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-4 h-4 bg-accent"
                style={
                  {
                    '--tx': '300px',
                    '--ty': '-80px',
                    '--duration': '1.9s',
                    '--delay': '0.7s',
                    boxShadow: '0 0 25px 5px var(--accent)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-3 h-3 bg-magenta"
                style={
                  {
                    '--tx': '-150px',
                    '--ty': '-290px',
                    '--duration': '1.7s',
                    '--delay': '1.3s',
                    boxShadow: '0 0 20px 4px var(--magenta)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-2 h-2 bg-primary"
                style={
                  {
                    '--tx': '120px',
                    '--ty': '320px',
                    '--duration': '1.3s',
                    '--delay': '0.4s',
                    boxShadow: '0 0 15px 3px var(--primary)',
                  } as React.CSSProperties
                }
              />
              <div
                className="fwd-spark w-3 h-3 bg-warning"
                style={
                  {
                    '--tx': '-320px',
                    '--ty': '-40px',
                    '--duration': '2.1s',
                    '--delay': '0.8s',
                    boxShadow: '0 0 20px 4px var(--warning)',
                  } as React.CSSProperties
                }
              />
            </div>

            <Image
              src="/images/LogoMariposa.png"
              alt="FWD AI Assistant Intro"
              fill
              sizes="192px"
              className="object-contain relative z-10 drop-shadow-2xl animate-flap"
              priority
            />
          </div>
          <div
            className={cn(
              'absolute top-full mt-8 px-8 py-4 bg-surface/95 backdrop-blur-md border border-primary/30 rounded-2xl shadow-elevated text-3xl md:text-4xl font-bold whitespace-nowrap transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)]',
              introPhase === 'center' ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span className="bg-clip-text text-transparent bg-[linear-gradient(to_right,var(--warning),var(--secondary),var(--primary),var(--magenta))]">
              {displayName ? `¡Bienvenido, ${displayName}!` : '¡Bienvenido!'}
            </span>
          </div>
        </div>
      </div>
    )
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
