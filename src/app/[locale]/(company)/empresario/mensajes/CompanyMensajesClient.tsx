'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  MessageSquare,
  Send,
  Lock,
  CheckCircle2,
  Check,
  CheckCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  getMensajesDeProyecto,
  enviarMensaje,
  marcarLeidos,
  type Mensaje,
  type ConversacionItem,
} from '@/lib/mensajes/actions'
import { ReportButton } from '@/components/features/moderation/ReportButton'

interface Props {
  conversaciones: ConversacionItem[]
  initialProjectId: string | null
  initialMensajes: { mensajes: Mensaje[]; puedeEnviar: boolean } | null
  currentUserId: string
}

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-secondary/20 text-secondary',
  'bg-accent/20 text-accent',
  'bg-warning/20 text-warning',
  'bg-magenta/20 text-magenta',
  'bg-highlight/20 text-foreground',
]

const FALLBACK_AVATAR_COLOR = 'bg-primary/20 text-primary'

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash] ?? FALLBACK_AVATAR_COLOR
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(' ')
    .filter((p) => p.length > 0)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}

function formatHora(fechaEnvio: string): string {
  return new Date(fechaEnvio).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ContactAvatar({
  name,
  size = 'sm',
}: {
  name: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold shrink-0',
        getAvatarColor(name),
        size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm',
      )}
    >
      {getInitials(name)}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: 'contratada' | 'finalizada' }) {
  const t = useTranslations('CompanyMensajes')
  const isActivo = estado === 'contratada'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        isActivo
          ? 'bg-accent/15 text-accent'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isActivo ? 'bg-accent animate-pulse' : 'bg-muted-foreground/50',
        )}
      />
      {isActivo ? t('estadoActivo') : t('estadoFinalizado')}
    </span>
  )
}

function ConversacionRow({
  conv,
  isActive,
  onSelect,
}: {
  conv: ConversacionItem
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-3 border-l-4 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        isActive
          ? 'border-l-primary bg-primary/10 text-foreground'
          : 'border-l-transparent hover:bg-muted/40 text-foreground',
      )}
    >
      <div className="flex items-start gap-2.5">
        <ContactAvatar name={conv.nombreContraparte} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5 mb-0.5">
            <p className="text-sm font-semibold leading-snug line-clamp-1 flex-1">
              {conv.tituloProyecto}
            </p>
            {conv.noLeidos > 0 && (
              <span className="flex min-w-5 h-5 px-1.5 bg-magenta text-white rounded-full items-center justify-center text-[10px] font-bold shrink-0">
                {conv.noLeidos}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs text-muted-foreground truncate">
              {conv.nombreContraparte}
            </p>
            <EstadoBadge estado={conv.estado} />
          </div>
        </div>
      </div>
    </button>
  )
}

function ChatBubble({
  mensaje,
  isMine,
}: {
  mensaje: Mensaje
  isMine: boolean
}) {
  const t = useTranslations('CompanyMensajes')

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[78%]',
        isMine ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary/10 text-foreground rounded-bl-sm border border-secondary/15',
        )}
      >
        <p>{mensaje.contenido}</p>
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isMine ? 'justify-end' : 'justify-start',
          )}
        >
          <p
            className={cn(
              'text-[10px]',
              isMine ? 'text-primary-foreground/60' : 'text-muted-foreground',
            )}
          >
            {formatHora(mensaje.fechaEnvio)}
          </p>
          {isMine &&
            (mensaje.leido ? (
              <CheckCheck
                className="w-3.5 h-3.5 text-accent shrink-0"
                aria-label={t('msgLeido')}
              />
            ) : (
              <Check
                className="w-3.5 h-3.5 text-primary-foreground/50 shrink-0"
                aria-label={t('msgNoLeido')}
              />
            ))}
        </div>
      </div>
      {!isMine && (
        <div className="flex items-center">
          <ReportButton
            target={{ tipo: 'mensaje', id: mensaje.idMensaje }}
            iconOnly
          />
        </div>
      )}
    </div>
  )
}

function ChatEmptyState() {
  const t = useTranslations('CompanyMensajes')
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
      <div className="p-4 bg-gradient-to-br from-primary/15 to-secondary/10 rounded-full text-primary">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <p className="font-semibold text-foreground">{t('mensajesEmpty')}</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t('mensajesEmptyDesc')}
      </p>
    </div>
  )
}

export function CompanyMensajesClient({
  conversaciones,
  initialProjectId,
  initialMensajes,
  currentUserId,
}: Props) {
  const t = useTranslations('CompanyMensajes')
  const scrollEndRef = useRef<HTMLDivElement>(null)

  const [convs, setConvs] = useState<ConversacionItem[]>(() =>
    conversaciones.map((c) =>
      c.idProyecto === initialProjectId ? { ...c, noLeidos: 0 } : c,
    ),
  )
  const [selectedConv, setSelectedConv] = useState<ConversacionItem | null>(
    () =>
      initialProjectId
        ? (conversaciones.find((c) => c.idProyecto === initialProjectId) ??
          null)
        : null,
  )
  const [mensajes, setMensajes] = useState<Mensaje[]>(
    initialMensajes?.mensajes ?? [],
  )
  const [puedeEnviar, setPuedeEnviar] = useState<boolean>(
    initialMensajes?.puedeEnviar ?? false,
  )
  const [isLoadingMensajes, setIsLoadingMensajes] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    setConvs(
      conversaciones.map((c) =>
        c.idProyecto === selectedConv?.idProyecto ? { ...c, noLeidos: 0 } : c,
      ),
    )
  }, [conversaciones, selectedConv])

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSelectConv = async (conv: ConversacionItem) => {
    if (selectedConv?.idProyecto === conv.idProyecto) return
    setSelectedConv(conv)
    setConvs((prev) =>
      prev.map((c) =>
        c.idProyecto === conv.idProyecto ? { ...c, noLeidos: 0 } : c,
      ),
    )
    setMensajes([])
    setIsLoadingMensajes(true)

    const result = await getMensajesDeProyecto(conv.idProyecto)
    setIsLoadingMensajes(false)

    if (!result.ok) {
      toast.error(t('errorCarga'))
      return
    }

    setMensajes(result.data.mensajes)
    setPuedeEnviar(result.data.puedeEnviar)
    void marcarLeidos(conv.idProyecto)
  }

  const handleSend = async () => {
    if (!selectedConv || !input.trim() || !puedeEnviar || isSending) return
    const contenido = input.trim()
    setInput('')
    setIsSending(true)

    const result = await enviarMensaje({
      idProyecto: selectedConv.idProyecto,
      contenido,
    })
    setIsSending(false)

    if (!result.ok) {
      setInput(contenido)
      toast.error(t('errorEnvio'))
      return
    }

    setMensajes((prev) => [...prev, result.data])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 min-w-0">
          <PageTitle title={t('title')} description={t('description')} />

          {conversaciones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-20">
              <div className="p-5 bg-gradient-to-br from-primary/15 to-secondary/10 rounded-full text-primary">
                <MessageSquare className="w-10 h-10" />
              </div>
              <p className="font-semibold text-lg text-foreground">
                {t('noConversaciones')}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('noConversacionesDesc')}
              </p>
            </div>
          ) : (
            <div
              className="flex border border-border/60 rounded-2xl overflow-hidden bg-card/20 shadow-sm"
              style={{ height: 'calc(100vh - 280px)', minHeight: '560px' }}
            >
              {/* Panel izquierdo — lista de conversaciones */}
              <div className="w-72 shrink-0 border-r border-border/60 flex flex-col bg-gradient-to-b from-secondary/5 to-card/20">
                <div className="px-4 py-3.5 border-b border-border/40 bg-gradient-to-r from-primary/10 to-secondary/5">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    {t('proyectoLabel')}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                  {convs.map((conv) => (
                    <ConversacionRow
                      key={conv.idProyecto}
                      conv={conv}
                      isActive={selectedConv?.idProyecto === conv.idProyecto}
                      onSelect={() => void handleSelectConv(conv)}
                    />
                  ))}
                </div>
              </div>

              {/* Panel derecho — hilo de mensajes */}
              {selectedConv === null ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/8 rounded-full text-primary">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-foreground">
                    {t('selectConversacion')}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t('selectConversacionDesc')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Header del chat */}
                  <div className="px-5 py-3.5 border-b border-border/40 flex items-center gap-3 bg-gradient-to-r from-primary/8 to-secondary/5">
                    <ContactAvatar
                      name={selectedConv.nombreContraparte}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {selectedConv.tituloProyecto}
                        </p>
                        <EstadoBadge estado={selectedConv.estado} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {t('egresadoLabel')}: {selectedConv.nombreContraparte}
                      </p>
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingMensajes ? (
                      <div className="flex-1 flex items-center justify-center py-16">
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      </div>
                    ) : mensajes.length === 0 ? (
                      <ChatEmptyState />
                    ) : (
                      mensajes.map((msg) => (
                        <ChatBubble
                          key={msg.idMensaje}
                          mensaje={msg}
                          isMine={msg.idRemitente === currentUserId}
                        />
                      ))
                    )}
                    <div ref={scrollEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-border/40 p-4 space-y-2.5 bg-card/10">
                    {!puedeEnviar && (
                      <div className="flex items-center gap-2 rounded-lg bg-warning/8 border border-warning/20 px-3 py-2">
                        <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
                        <p className="text-xs text-warning">
                          {t('inputDisabledHint')}
                        </p>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={puedeEnviar ? t('inputPlaceholder') : ''}
                        disabled={!puedeEnviar || isSending}
                        rows={1}
                        className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => void handleSend()}
                        disabled={
                          !puedeEnviar || isSending || input.trim().length === 0
                        }
                        className="rounded-xl shrink-0 h-10 w-10"
                        aria-label={t('sendBtn')}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </CompanyShell>
  )
}
