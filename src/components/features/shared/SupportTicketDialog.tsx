'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createSupportTicket } from '@/lib/company/actions'
import {
  Loader2,
  Clock,
  MessageSquare,
  Headphones,
  Settings,
  Briefcase,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SupportTicketDialogProps {
  children: React.ReactNode
}

export function SupportTicketDialog({ children }: SupportTicketDialogProps) {
  const t = useTranslations('EmpresaPerfil')
  const [isOpen, setIsOpen] = useState(false)
  const [ticketType, setTicketType] = useState<'tecnico' | 'negocio'>('tecnico')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim().length < 15) {
      toast.error(t('supportMinLength'))
      return
    }

    setIsSubmitting(true)
    const formattedDesc = `[TIPO: ${ticketType.toUpperCase()}] ${description.trim()}`
    const res = await createSupportTicket(formattedDesc)
    setIsSubmitting(false)

    if (res.ok) {
      toast.success(t('supportSuccess'))
      setDescription('')
      setIsOpen(false)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 overflow-hidden sm:max-w-[760px] gap-0 border-border bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-3 w-full h-full min-h-[480px]">
          {/* Columna Izquierda: Información de Soporte */}
          <div className="bg-gradient-to-b from-[#e3eeff] to-[#f0f5ff] p-8 flex flex-col justify-between border-r border-border/40">
            <div>
              {/* Bot Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-6 shadow-sm/5">
                <Headphones className="w-6 h-6 stroke-[2.2]" />
              </div>

              {/* Título y descripción */}
              <h3 className="font-heading text-xl font-bold text-ink-strong leading-tight">
                ¿En qué podemos ayudarte?
              </h3>
              <p className="text-xs text-ink/80 leading-relaxed mt-3 font-sans">
                Describe tu problema técnico o necesidad de negocio. El equipo
                de administración revisará tu reporte de inmediato.
              </p>
            </div>

            {/* Info Cards */}
            <div className="space-y-3 mt-6 font-sans">
              <div className="bg-surface/90 border border-border/30 rounded-xl p-3 flex items-center gap-3 shadow-sm/5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-strong leading-none">
                    Respuesta rápida
                  </p>
                  <p className="text-[10px] text-ink-muted mt-1 leading-none">
                    &lt; 15 minutos
                  </p>
                </div>
              </div>

              <div className="bg-surface/90 border border-border/30 rounded-xl p-3 flex items-center gap-3 shadow-sm/5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-strong leading-none">
                    Chat en vivo
                  </p>
                  <p className="text-[10px] text-ink-muted mt-1 leading-none">
                    Lunes a Viernes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="col-span-2 p-8 flex flex-col justify-between bg-surface relative">
            <form
              onSubmit={handleSubmit}
              className="h-full flex flex-col justify-between"
            >
              <div>
                {/* Header Solicitud */}
                <div className="mb-6">
                  <span className="text-primary font-bold text-[10px] tracking-widest uppercase font-sans">
                    NUEVA SOLICITUD
                  </span>
                  <h2 className="font-heading text-xl font-black text-ink-strong mt-1">
                    Soporte Técnico y Necesidades
                  </h2>
                </div>

                {/* Selección de Tipo de Solicitud */}
                <div className="mb-5">
                  <label className="block text-[10px] font-bold text-ink-muted tracking-wider uppercase mb-2 font-sans">
                    TIPO DE SOLICITUD
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTicketType('tecnico')}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer font-sans',
                        ticketType === 'tecnico'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border bg-surface text-ink-muted hover:text-ink hover:border-border-hover',
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      Técnico
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketType('negocio')}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer font-sans',
                        ticketType === 'negocio'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border bg-surface text-ink-muted hover:text-ink hover:border-border-hover',
                      )}
                    >
                      <Briefcase className="w-4 h-4" />
                      Negocio
                    </button>
                  </div>
                </div>

                {/* Descripción Detallada */}
                <div className="mb-6">
                  <label className="block text-[10px] font-bold text-ink-muted tracking-wider uppercase mb-2 font-sans">
                    DESCRIPCIÓN DETALLADA
                  </label>
                  <div className="relative">
                    <Textarea
                      id="description"
                      rows={5}
                      placeholder="Describe detalladamente cuál es el problema o la necesidad técnica de tu negocio..."
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, 500))
                      }
                      className="w-full bg-surface border border-border focus-visible:ring-primary rounded-xl p-3 text-sm resize-none pb-8 font-sans"
                    />
                    <span className="absolute bottom-2.5 right-3.5 text-[10px] text-ink-muted font-sans font-medium">
                      {description.length} /500 caracteres
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-bold text-ink hover:text-ink-strong transition-colors cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-2.5 px-6 rounded-xl flex items-center gap-1.5 transition-all text-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Enviar reporte</span>
                  )}
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
