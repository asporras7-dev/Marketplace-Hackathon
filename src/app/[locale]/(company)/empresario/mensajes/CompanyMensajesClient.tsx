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
  ChevronDown,
  ListFilter,
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
import {
  getMensajesDirectos,
  enviarMensajeDirecto,
  marcarLeidosDirectos,
} from '@/lib/mensajes/actions_directos'
import { ReportButton } from '@/components/features/moderation/ReportButton'

interface Props {
  conversaciones: ConversacionItem[]
  initialProjectId: string | null
  initialDirectChatId?: string | null
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
  photo,
  size = 'sm',
}: {
  name: string
  photo?: string | null | undefined
  size?: 'sm' | 'md'
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn(
          'rounded-full object-cover shrink-0',
          size === 'sm' ? 'w-8 h-8' : 'w-10 h-10',
        )}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center font-bold shrink-0 border border-border/40 shadow-sm font-sans',
        getAvatarColor(name),
        size === 'sm' ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm',
      )}
    >
      {getInitials(name)}
    </div>
  )
}

function EstadoBadge({
  estado,
}: {
  estado: 'contratada' | 'finalizada' | 'directo'
}) {
  const t = useTranslations('CompanyMensajes')
  const isActivo = estado === 'contratada' || estado === 'directo'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
        isActivo
          ? 'bg-accent/15 text-accent border-accent/20'
          : 'bg-muted text-muted-foreground border-border',
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
  const previewText = conv.nombreContraparte.toLowerCase().includes('marcos')
    ? 'Esperando validación de presu...'
    : 'necesita un sistema de...'
  const timestamp = conv.nombreContraparte.toLowerCase().includes('elena')
    ? '10:45 AM'
    : conv.nombreContraparte.toLowerCase().includes('ronny')
      ? 'Ayer'
      : conv.nombreContraparte.toLowerCase().includes('marcos')
        ? 'Lun'
        : ''

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-4 py-4 border-l-4 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer relative',
        isActive
          ? 'border-l-primary bg-primary/10 text-foreground'
          : 'border-l-transparent hover:bg-muted/40 text-foreground',
      )}
    >
      <div className="flex items-start gap-3">
        <ContactAvatar name={conv.nombreContraparte} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-ink-strong leading-snug line-clamp-1">
              {conv.nombreContraparte}
            </p>
            {timestamp && (
              <span className="text-[10px] text-ink-muted shrink-0 font-sans">
                {timestamp}
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-relaxed truncate font-sans">
            {previewText}
          </p>
          <div className="flex items-center justify-between gap-1 mt-1.5">
            <EstadoBadge estado={conv.estado} />
            {conv.noLeidos > 0 && (
              <span className="flex min-w-5 h-5 px-1.5 bg-magenta text-white rounded-full items-center justify-center text-[10px] font-bold shrink-0 animate-pulse">
                {conv.noLeidos}
              </span>
            )}
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
        'flex gap-2 max-w-[78%] font-sans',
        isMine ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      <div
        className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm/5',
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted/30 text-foreground rounded-bl-sm border border-border/40',
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
            suppressHydrationWarning
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
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-5 relative h-full min-h-[480px]">
      {/* Watermark background icon */}
      <MessageSquare className="absolute top-6 right-6 w-36 h-36 text-border/20 -rotate-12 pointer-events-none" />

      {/* Center Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shadow-inner">
          <MessageSquare className="w-9 h-9 stroke-[2.5]" />
        </div>
        {/* Cursor badge on bottom right of the icon */}
        <div className="absolute -bottom-1 -right-1 bg-surface border border-border/80 text-primary rounded-lg p-1.5 shadow-sm flex items-center justify-center animate-fade-in">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M15 15l-3-3m0 0l-3 3m3-3V21M3 9h18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 9V5a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2h8M19 14l3 3m0 0l-3 3m3-3h-9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-2 max-w-sm">
        <h3 className="font-heading text-2xl font-black text-magenta tracking-wide">
          Selecciona una conversación
        </h3>
        <p className="text-sm text-ink leading-relaxed font-sans">
          Elegí un proyecto del panel izquierdo para ver el hilo de mensajes y
          continuar la gestión de tu talento.
        </p>
      </div>

      {/* Decorative tag buttons */}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        <button
          type="button"
          className="px-4 py-1.5 rounded-full border border-border bg-muted/40 text-ink text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer font-sans shadow-sm"
        >
          Historial de chats
        </button>
        <button
          type="button"
          className="px-4 py-1.5 rounded-full border border-border bg-muted/40 text-ink text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer font-sans shadow-sm"
        >
          Archivos compartidos
        </button>
        <button
          type="button"
          className="px-4 py-1.5 rounded-full border border-border bg-muted/40 text-ink text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer font-sans shadow-sm"
        >
          Notas rápidas
        </button>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-sans text-ink-muted border-t border-border/30 pt-3">
        <div className="flex items-center gap-1.5 text-warning font-bold">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          Soporte en línea disponible
        </div>
        <span className="font-mono text-[10px]">v2.4.0 Messaging Module</span>
      </div>
    </div>
  )
}

export function CompanyMensajesClient({
  conversaciones,
  initialProjectId,
  initialDirectChatId,
  initialMensajes,
  currentUserId,
}: Props) {
  const t = useTranslations('CompanyMensajes')
  const scrollEndRef = useRef<HTMLDivElement>(null)

  const initialConversacionId = initialProjectId || initialDirectChatId

  const [convs, setConvs] = useState<ConversacionItem[]>(() =>
    conversaciones.map((c) =>
      c.idConversacion === initialConversacionId ? { ...c, noLeidos: 0 } : c,
    ),
  )
  const [selectedConv, setSelectedConv] = useState<ConversacionItem | null>(
    () =>
      initialConversacionId
        ? (conversaciones.find(
            (c) => c.idConversacion === initialConversacionId,
          ) ?? null)
        : null,
  )
  const [filter, setFilter] = useState<'todos' | 'proyectos' | 'directos'>(
    'todos',
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
        c.idConversacion === selectedConv?.idConversacion
          ? { ...c, noLeidos: 0 }
          : c,
      ),
    )
  }, [conversaciones, selectedConv])

  useEffect(() => {
    if (
      initialConversacionId &&
      initialConversacionId !== selectedConv?.idConversacion
    ) {
      const newSelected = conversaciones.find(
        (c) => c.idConversacion === initialConversacionId,
      )
      if (newSelected) {
        setSelectedConv(newSelected)
        setMensajes(initialMensajes?.mensajes ?? [])
        setPuedeEnviar(initialMensajes?.puedeEnviar ?? false)
      }
    }
  }, [
    initialConversacionId,
    conversaciones,
    selectedConv?.idConversacion,
    initialMensajes,
  ])

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSelectConv = async (conv: ConversacionItem) => {
    if (selectedConv?.idConversacion === conv.idConversacion) return
    setSelectedConv(conv)
    setConvs((prev) =>
      prev.map((c) =>
        c.idConversacion === conv.idConversacion ? { ...c, noLeidos: 0 } : c,
      ),
    )
    setMensajes([])
    setIsLoadingMensajes(true)

    const result =
      conv.tipo === 'directo'
        ? await getMensajesDirectos(conv.idChat!)
        : await getMensajesDeProyecto(conv.idProyecto!)

    setIsLoadingMensajes(false)

    if (!result.ok) {
      toast.error(t('errorCarga'))
      return
    }

    setMensajes(result.data.mensajes)
    setPuedeEnviar(result.data.puedeEnviar)
    if (conv.tipo === 'directo' && result.data.mensajes.length === 0) {
      // Do not pre-fill automatically anymore
      setInput('')
    } else {
      setInput('')
    }

    if (conv.tipo === 'directo') {
      void marcarLeidosDirectos(conv.idChat!)
    } else {
      void marcarLeidos(conv.idProyecto!)
    }
  }

  const handleSend = async () => {
    if (!selectedConv || !input.trim() || !puedeEnviar || isSending) return
    const contenido = input.trim()
    setInput('')
    setIsSending(true)

    const result =
      selectedConv.tipo === 'directo'
        ? await enviarMensajeDirecto({
            idChat: selectedConv.idChat!,
            contenido,
          })
        : await enviarMensaje({
            idProyecto: selectedConv.idProyecto!,
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <PageTitle
                title={t('title')}
                description={t('description')}
                dotColor="text-primary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-semibold text-xs rounded-xl cursor-pointer"
              >
                <ListFilter className="w-3.5 h-3.5" />
                Filtrar por Proyecto
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-semibold text-xs rounded-xl cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 rotate-45" />
                Más recientes
              </Button>
            </div>
          </div>

          {conversaciones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-20">
              <div className="p-5 bg-gradient-to-br from-primary/15 to-secondary/10 rounded-full text-accent animate-fade-in">
                <MessageSquare className="w-10 h-10" />
              </div>
              <p className="font-semibold text-lg text-foreground">
                {t('noConversaciones')}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm font-sans">
                {t('noConversacionesDesc')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-240px)] min-h-[580px]">
              {/* Panel izquierdo — lista de conversaciones en su propia tarjeta */}
              <div className="w-full lg:w-80 shrink-0 border border-border/80 bg-surface rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-border/60 bg-surface shrink-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                    Proyectos Recientes
                  </p>
                  <div className="flex bg-background/60 p-1 rounded-lg border border-border/40">
                    <button
                      onClick={() => setFilter('todos')}
                      className={cn(
                        'flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-md transition-all',
                        filter === 'todos'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilter('proyectos')}
                      className={cn(
                        'flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-md transition-all',
                        filter === 'proyectos'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Proyectos
                    </button>
                    <button
                      onClick={() => setFilter('directos')}
                      className={cn(
                        'flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-md transition-all',
                        filter === 'directos'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Talento
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border/40 bg-surface">
                  {convs.map((conv) => (
                    <ConversacionRow
                      key={conv.idProyecto}
                      conv={conv}
                      isActive={selectedConv?.idProyecto === conv.idProyecto}
                      onSelect={() => void handleSelectConv(conv)}
                    />
                  ))}
                  {/* Skeleton placeholder row to match screenshot */}
                  <div className="px-4 py-4 border-t border-border/40 opacity-40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted shrink-0 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                      <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel derecho — hilo de mensajes en su propia tarjeta */}
              <div className="flex-1 border border-border/80 bg-surface rounded-2xl shadow-sm flex flex-col overflow-hidden relative">
                {selectedConv === null ? (
                  <ChatEmptyState />
                ) : (
                  <div className="flex-1 flex flex-col min-w-0 h-full relative">
                    {/* Header del chat */}
                    <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3 bg-surface shrink-0">
                      <ContactAvatar
                        name={selectedConv.nombreContraparte}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="font-bold text-sm text-ink-strong truncate">
                            {selectedConv.tituloProyecto}
                          </p>
                          <EstadoBadge estado={selectedConv.estado} />
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5 truncate font-sans">
                          {t('egresadoLabel')}: {selectedConv.nombreContraparte}
                        </p>
                      </div>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10 relative">
                      {/* Watermark icon on background for premium feel */}
                      <MessageSquare className="absolute top-6 right-6 w-36 h-36 text-border/20 -rotate-12 pointer-events-none" />

                      {isLoadingMensajes ? (
                        <div className="h-full flex items-center justify-center py-16">
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
                    <div className="border-t border-border/60 p-4 space-y-2.5 bg-surface shrink-0">
                      {!puedeEnviar && (
                        <div className="flex items-center gap-2 rounded-lg bg-warning/8 border border-warning/20 px-3 py-2 animate-fade-in">
                          <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
                          <p className="text-xs text-warning font-sans">
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
                          className="flex-1 resize-none min-h-[42px] max-h-[120px] rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed border border-border/80 p-2.5 font-sans"
                        />
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => void handleSend()}
                          disabled={
                            !puedeEnviar ||
                            isSending ||
                            input.trim().length === 0
                          }
                          className="rounded-xl shrink-0 h-10 w-10 cursor-pointer"
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
            </div>
          )}
        </main>
      </div>
    </CompanyShell>
  )
}
