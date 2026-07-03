import OpenAI from 'openai'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, context, locale } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Mensajes inválidos' }), {
        status: 400,
      })
    }

    const apiKey = process.env.CHAT_AI_API_KEY
    const baseURL = process.env.CHAT_AI_BASE_URL
    const model = process.env.CHAT_AI_MODEL || 'openai/gpt-4o-mini'

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración de IA faltante' }),
        { status: 500 },
      )
    }

    const openai = new OpenAI({
      apiKey,
      baseURL,
    })

    const languageStr = locale === 'en' ? 'inglés' : 'español'

    const systemPrompt = {
      role: 'system',
      content: `Eres el Asistente virtual de FWD Talent. 
Ayudas a los usuarios (egresados y empresas) a navegar y entender la plataforma.
Debes responder SIEMPRE en ${languageStr}.

A continuación, tienes el contexto (texto visible) de la página actual donde el usuario abrió el chat:
---
${context || 'Sin contexto disponible.'}
---

Utiliza este contexto para dar respuestas precisas si te preguntan sobre la información que están viendo. Si la respuesta no está en el contexto, usa tus conocimientos generales pero siempre en un tono amable, profesional y conciso, enfocado en tecnología y talento.`,
    }

    const response = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [systemPrompt, ...messages],
      temperature: 0.3,
    })

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            controller.enqueue(new TextEncoder().encode(text))
          }
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500 },
    )
  }
}
