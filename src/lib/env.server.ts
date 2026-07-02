import 'server-only'
import { z } from 'zod'

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GMAIL_USER: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  OPENROUTER_FILTRO_OFERTAS_API_KEY: z.string().min(1).optional(),
  OPENROUTER_FILTRO_OFERTAS_MODEL: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: source['SUPABASE_SERVICE_ROLE_KEY'],
    GMAIL_USER: source['GMAIL_USER'],
    GMAIL_APP_PASSWORD: source['GMAIL_APP_PASSWORD'],
    CLOUDINARY_CLOUD_NAME: source['CLOUDINARY_CLOUD_NAME'],
    CLOUDINARY_API_KEY: source['CLOUDINARY_API_KEY'],
    CLOUDINARY_API_SECRET: source['CLOUDINARY_API_SECRET'],
    OPENROUTER_FILTRO_OFERTAS_API_KEY:
      source['OPENROUTER_FILTRO_OFERTAS_API_KEY'],
    OPENROUTER_FILTRO_OFERTAS_MODEL: source['OPENROUTER_FILTRO_OFERTAS_MODEL'],
    NEXT_PUBLIC_APP_URL: source['NEXT_PUBLIC_APP_URL'],
  })
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ')
    throw new Error(`ENV_INVALID: ${issues}`)
  }
  return parsed.data
}

export const serverEnv = parseServerEnv(process.env)
