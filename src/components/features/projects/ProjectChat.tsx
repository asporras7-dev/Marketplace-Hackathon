'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Send, Sparkles, User, Wand2, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { sendChatMessage } from '@/lib/proposal-ai/chat'
import type { HistorialEntry } from '@/lib/proposal-ai/types'

interface ProjectChatProps {
  conversationId: string
  contextoInicial: string
  historial: HistorialEntry[]
  completo: boolean
  kickoffLoading: boolean
  onHistorialChange: (historial: HistorialEntry[]) => void
  onCompletoChange: (completo: boolean) => void
  onArmarPropuesta: () => void
  armando: boolean
}

const KNOWN_ERROR_CODES = new Set([
  'invalid_input',
  'unauthorized',
  'empresario_no_encontrado',
  'save_failed',
  'no_context',
  'ai_not_configured',
  'ai_failed',
  'unexpected',
])

function ChatBubble({
  esEmpresario,
  contenido,
}: {
  esEmpresario: boolean
  contenido: string
}) {
  if (!esEmpresario) {
    return (
      <div className="flex items-start gap-4 mr-12 mr-auto text-left w-full">
        {/* Purple Sparkles icon container */}
        <div className="w-9 h-9 flex items-center justify-center bg-primary/10 text-primary rounded-xl shrink-0 mt-1 shadow-sm border border-primary/20">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        {/* White message bubble with border */}
        <div className="border border-primary/20 bg-primary/5 rounded-2xl rounded-tl-none p-4 text-sm text-ink-strong leading-relaxed max-w-[85%] shadow-sm">
          <p className="whitespace-pre-wrap">{contenido}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 ml-12 justify-end ml-auto text-right w-full">
      {/* Purple message bubble */}
      <div className="bg-magenta text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm font-medium max-w-[85%] text-left shadow-sm">
        <p className="whitespace-pre-wrap">{contenido}</p>
      </div>
      {/* Light blue/cyan user icon container */}
      <div className="w-8 h-8 flex items-center justify-center bg-magenta/10 text-magenta rounded-xl shrink-0 mt-1 shadow-sm border border-magenta/20">
        <User className="h-4.5 w-4.5" />
      </div>
    </div>
  )
}

/**
 * Chat con la IA (RF-54/55). Controlado por el wizard: el historial, `completo`
 * y el loading del saludo viven arriba. El saludo de la IA lo dispara el wizard
 * al "Continuar con la IA" (sin useEffect). "Armar propuesta" se habilita solo
 * cuando la IA marca el proyecto como completo (errolpendiente §1 paso 5-6).
 */
export function ProjectChat({
  conversationId,
  contextoInicial,
  historial,
  completo,
  kickoffLoading,
  onHistorialChange,
  onCompletoChange,
  onArmarPropuesta,
  armando,
}: ProjectChatProps) {
  const t = useTranslations('ProjectPublish')
  const locale = useLocale()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const ocupado = loading || armando || kickoffLoading

  const onSend = async () => {
    const limpio = text.trim()
    if (limpio.length === 0 || ocupado) return
    setLoading(true)
    const result = await sendChatMessage(conversationId, limpio, locale)
    setLoading(false)
    if (result.ok) {
      onHistorialChange(result.data.historial)
      onCompletoChange(result.data.completo)
      setText('')
      return
    }
    const code = KNOWN_ERROR_CODES.has(result.error)
      ? result.error
      : 'unexpected'
    toast.error(t(`errors.${code}`))
  }

  const mensajes = historial.filter((entrada) => entrada.tipo === 'mensaje')

  return (
    <div className="space-y-6 text-left flex flex-col w-full">
      <div className="space-y-6 max-h-[460px] overflow-y-auto pr-1 flex flex-col w-full">
        <ChatBubble esEmpresario contenido={contextoInicial} />
        {mensajes.map((mensaje, indice) => (
          <ChatBubble
            key={`${mensaje.fecha}-${indice}`}
            esEmpresario={mensaje.rol === 'empresario'}
            contenido={mensaje.contenido}
          />
        ))}
        {(loading || kickoffLoading) && (
          <div className="flex items-center gap-2 pl-12 text-xs text-muted-foreground">
            <span
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
            <span>{t('aiThinking')}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 items-center border border-border/80 bg-surface rounded-2xl p-2 pl-4 shadow-sm w-full transition-all focus-within:border-warning/40 focus-within:ring-2 focus-within:ring-warning/10">
        <Paperclip className="h-5 w-5 text-ink-muted shrink-0 cursor-pointer hover:text-ink transition-colors" />
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={1}
          disabled={ocupado}
          placeholder={t('chatPlaceholder')}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none focus-visible:outline-none focus:border-0 shadow-none bg-transparent py-2 text-sm outline-none placeholder:text-ink-subtle min-h-[38px] max-h-[120px] resize-none scrollbar-none p-1"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void onSend()
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void onSend()}
          disabled={ocupado || text.trim().length === 0}
          className="bg-primary hover:bg-primary/90 text-white w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-md shrink-0 disabled:opacity-50"
          aria-label={t('chatSend')}
          size="icon"
        >
          <Send className="h-4.5 w-4.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-2 pt-1 items-center w-full">
        {completo ? (
          <>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning mb-2">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              {t('readyCue')}
            </p>
            <Button
              type="button"
              onClick={onArmarPropuesta}
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 bg-magenta hover:bg-magenta/95 text-white font-bold px-6 py-3 rounded-2xl shadow-md transition-all hover:scale-[1.01]"
            >
              <Wand2 className="h-4.5 w-4.5" />
              {armando ? t('generating') : t('buildProposal')}
            </Button>
          </>
        ) : (
          <p className="text-[10px] font-extrabold text-warning/60 tracking-widest uppercase my-2 text-center">
            • {t('notReadyHint').toUpperCase().replace('.', '')} •
          </p>
        )}
      </div>
    </div>
  )
}
