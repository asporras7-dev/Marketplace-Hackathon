import { defineConfig, defaultExclude } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    exclude: [...defaultExclude, 'tests/demoPortafolio/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Gate de cobertura solo sobre la LÓGICA PURA de lib/ con tests unitarios
      // (reglas.md §10: "Vitest sobre la lógica pura de lib/"). Los módulos de IO
      // (server actions, queries Supabase, LLM, email) son puntos de integración,
      // no unit-testeables de forma significativa, y quedan fuera del umbral.
      include: [
        'src/lib/utils/age.ts',
        'src/lib/auth/roles.ts',
        'src/lib/auth/guards.ts',
        'src/lib/auth/egresado-allowlist.ts',
        'src/lib/auth/schemas.ts',
        'src/lib/admin/config-validation.ts',
        'src/lib/projects/project-detail-logic.ts',
        'src/lib/projects/schemas.ts',
        'src/lib/proposal-ai/proposal-mapping.ts',
        'src/lib/env.ts',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      GMAIL_USER: 'test@gmail.com',
      GMAIL_APP_PASSWORD: 'test-app-password',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // server-only lanza fuera de un contexto RSC; en tests lo resolvemos a su
      // variante no-op (la misma que Next usa bajo la condición react-server).
      'server-only': fileURLToPath(
        new URL('./node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
})
