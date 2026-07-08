'use server'

import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { getAiConfig } from '@/lib/proposal-ai/config'
import OpenAI from 'openai'
import { type GuardarCotizacionInput } from './schema'
import { calcularCotizacion } from './calculator'

/**
 * Guarda una cotización en la base de datos asociada al egresado logueado.
 */
export async function guardarCotizacion(
  input: GuardarCotizacionInput,
): Promise<Result<string>> {
  try {
    const roleResult = await requireRole('egresado')
    if (!roleResult.ok) return err('unauthorized')

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthenticated')

    const { data: estudiante, error: estError } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()

    if (estError || !estudiante) return err('estudiante_not_found')

    // Calcular montos en el servidor para evitar discrepancias
    const calc = calcularCotizacion({
      horas_estimadas: input.horas_estimadas,
      tarifa_base_hora: input.tarifa_base_hora,
      complejidad: input.complejidad,
      modalidad: input.modalidad,
      incluye_iva: input.incluye_iva,
    })

    const desgloseCalculo = {
      tasaDeCambio: calc.tasaDeCambio,
      costoBase: calc.costoBase,
      adicionalComplejidad: calc.adicionalComplejidad,
      adicionalModalidad: calc.adicionalModalidad,
      multComplejidad: calc.multComplejidad,
      multModalidad: calc.multModalidad,
    }

    const { data, error } = await supabase
      .from('cotizaciones')
      .insert({
        id_estudiante: estudiante.id_estudiante,
        id_proyecto: input.id_proyecto ?? null,
        nombre_cotizacion: input.nombre_cotizacion,
        duracion_semanas: input.duracion_semanas,
        horas_estimadas: input.horas_estimadas,
        complejidad: input.complejidad,
        stack: input.stack,
        tipo_entregable: input.tipo_entregable,
        funcionalidades: input.funcionalidades,
        tarifa_base_hora: input.tarifa_base_hora,
        modalidad: input.modalidad,
        incluye_iva: input.incluye_iva,
        subtotal_usd: calc.subtotalUsd,
        subtotal_crc: calc.subtotalCrc,
        iva_usd: calc.ivaUsd,
        iva_crc: calc.ivaCrc,
        total_usd: calc.totalUsd,
        total_crc: calc.totalCrc,
        rango_min_usd: calc.minUsd,
        rango_max_usd: calc.maxUsd,
        rango_min_crc: calc.minCrc,
        rango_max_crc: calc.maxCrc,
        desglose_calculo: desgloseCalculo,
        explicacion_ia: input.explicacion_ia ?? null,
      })
      .select('id_cotizacion')
      .single()

    if (error) {
      return err('database_error')
    }
    return ok(data.id_cotizacion)
  } catch {
    return err('unexpected')
  }
}

/**
 * Llama a OpenRouter para estimar un proyecto en base a su descripción y stack.
 */
export async function estimarConIA(
  descripcionProyecto: string,
  stackProyecto: string[] = [],
): Promise<
  Result<{
    semanas: number
    horas_semanales: number
    complejidad: 'baja' | 'media' | 'alta'
    funcionalidades: string[]
    explicacion: string
  }>
> {
  try {
    const aiConfig = getAiConfig()
    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseUrl,
    })

    const prompt = `Analiza la siguiente descripción de un proyecto de software y su stack técnico sugerido para estimar el esfuerzo y proponer un desglose de funcionalidades.
Descripción: "${descripcionProyecto}"
Stack técnico: [${stackProyecto.join(', ')}]

Genera una respuesta en formato JSON con la siguiente estructura (estricta, responde únicamente con el JSON sin formato Markdown):
{
  "semanas": 4,
  "horas_semanales": 20,
  "complejidad": "media",
  "funcionalidades": ["Autenticación con Supabase", "Panel de administración básico"],
  "explicacion": "Una explicación sencilla y empática en español (máx 3 párrafos) de por qué se asigna esta complejidad, qué consideraciones tomar en cuenta al programarlo y cómo explicárselo al cliente."
}`

    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content:
            'Sos un asistente experto en estimación de proyectos de software para desarrolladores junior. Tu salida debe ser únicamente JSON válido y limpio sin formato Markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    })

    const text = completion.choices[0]?.message?.content?.trim() || ''
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return err('ai_invalid_response')
    }

    const cleanJson = text.slice(jsonStart, jsonEnd + 1)
    const result = JSON.parse(cleanJson)

    return ok({
      semanas: Number(result.semanas) || 4,
      horas_semanales: Number(result.horas_semanales) || 20,
      complejidad: ['baja', 'media', 'alta'].includes(result.complejidad)
        ? result.complejidad
        : 'media',
      funcionalidades: Array.isArray(result.funcionalidades)
        ? result.funcionalidades
        : [],
      explicacion: result.explicacion || 'No se pudo generar explicación.',
    })
  } catch {
    return err('ai_failed')
  }
}

/**
 * Sugiere una tarifa por hora razonable en USD basada en el stack técnico provisto,
 * orientada a desarrolladores junior/iniciantes en el mercado local/global.
 */
export async function sugerirTarifaConIA(stack: string[]): Promise<
  Result<{
    tarifaSugerida: number
    rangoMin: number
    rangoMax: number
    explicacion: string
  }>
> {
  try {
    const aiConfig = getAiConfig()
    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseUrl,
    })

    const prompt = `Como mentor experto de desarrollo de software para juniors iniciantes en Latinoamérica/remoto, analiza el siguiente stack de tecnologías (lenguajes, frameworks, bases de datos):
Stack técnico: [${stack.join(', ')}]

Estima y sugiere una tarifa por hora razonable en dólares (USD) para un desarrollador junior.
La tarifa recomendada para un junior en LatAm/remoto típicamente ronda entre $10 y $35 por hora, dependiendo de la demanda y complejidad de su stack. Por ejemplo:
- Maquetación básica (HTML, CSS): $10-$15
- Frontend/Backend estándar (React, Node, PHP): $15-$25
- Fullstack o tecnologías más avanzadas/demandadas (Next.js, NestJS, Cloud, Docker): $22-$35

Genera una respuesta en formato JSON con la siguiente estructura (estricta, responde únicamente con el JSON sin formato Markdown):
{
  "tarifaSugerida": 20,
  "rangoMin": 15,
  "rangoMax": 25,
  "explicacion": "Una explicación sencilla, amigable y muy motivadora en español (máx 2 párrafos) explicando por qué este stack vale esto, qué tecnologías de su stack son las más cotizadas y un tip de negociación para un junior."
}`

    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content:
            'Sos un asistente mentor de desarrolladores junior. Tu salida debe ser únicamente JSON válido y limpio sin formato Markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const text = completion.choices[0]?.message?.content?.trim() || ''
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return err('ai_invalid_response')
    }

    const cleanJson = text.slice(jsonStart, jsonEnd + 1)
    const result = JSON.parse(cleanJson)

    return ok({
      tarifaSugerida: Number(result.tarifaSugerida) || 15,
      rangoMin: Number(result.rangoMin) || 12,
      rangoMax: Number(result.rangoMax) || 20,
      explicacion: result.explicacion || 'No se pudo generar explicación.',
    })
  } catch {
    return err('ai_failed')
  }
}
