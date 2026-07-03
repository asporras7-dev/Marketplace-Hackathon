'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ContextualChat } from '@/components/features/ai/ContextualChat'
import { cn } from '@/lib/utils/cn'

export function FloatingButterfly() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
          <ContextualChat onClose={() => setIsOpen(false)} />
        </div>
      )}

      {!isOpen && (
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
      )}
    </div>
  )
}
