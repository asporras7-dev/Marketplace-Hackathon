'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Send, X, Bot } from 'lucide-react'
import Image from 'next/image'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

export function ContextualChat({ onClose }: { onClose: () => void }) {
  const t = useTranslations('ChatIA')
  const locale = useLocale()
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  )
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pageContext, setPageContext] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Capturar el texto de la página al abrir
    // Excluimos el propio chat para no hacer ruido
    const chatElement = document.getElementById('contextual-chat-widget')
    if (chatElement) {
      chatElement.style.display = 'none'
    }
    const text = document.body.innerText.substring(0, 10000) // Limitar tamaño
    if (chatElement) {
      chatElement.style.display = 'flex'
    }
    setPageContext(text)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: pageContext,
          locale,
        }),
      })

      if (!response.ok) throw new Error('Error API')

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let done = false
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          const chunkValue = decoder.decode(value, { stream: true })

          setMessages((prev) => {
            const newMessages = [...prev]
            const lastIndex = newMessages.length - 1
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: newMessages[lastIndex].content + chunkValue,
            }
            return newMessages
          })
        }
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('error') },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card
      id="contextual-chat-widget"
      className="w-80 sm:w-96 h-[500px] flex flex-col shadow-elevated border-primary/20 bg-surface overflow-hidden"
    >
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5 shrink-0">
            <Image
              src="/images/LogoMariposa.png"
              alt="Bot"
              fill
              sizes="20px"
              className="object-contain drop-shadow-sm"
            />
          </div>
          <CardTitle className="text-sm font-medium">{t('title')}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 hover:bg-primary-foreground/20 text-primary-foreground rounded-full shrink-0"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-sunken">
        {messages.length === 0 && (
          <div className="text-center text-ink-muted text-sm my-10 px-4">
            {locale === 'en'
              ? 'Ask me anything about this page!'
              : '¡Pregúntame cualquier cosa sobre esta página!'}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'flex w-full',
              m.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-surface border border-border shadow-soft rounded-tl-sm text-ink-strong',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-surface border border-border shadow-soft rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-ink-muted flex items-center gap-2">
              <span className="animate-pulse">{t('typing')}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="p-3 border-t bg-surface">
        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            className="flex-1 rounded-full bg-surface-sunken border-border focus-visible:ring-primary shadow-inner"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full shrink-0 shadow-soft"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
