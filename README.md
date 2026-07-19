# FWD Marketplace

**[🚀 Ver Demo en Vivo (Desplegado en Vercel)](https://marketplace-hackathon-three.vercel.app)**

Plataforma SaaS (Software as a Service) de talento donde empresas publican proyectos de corto plazo y egresados de Forward Costa Rica postulan para ejecutarlos; la cual, brinda también la opción de contactarse directamente con los egresados para una posible contratación o adquisición de servicios también. Una solución integral "Dual-Sided" que conecta talento tecnológico con necesidades corporativas reales, impulsada por Inteligencia Artificial y arquitecturas Serverless.

---

## Stack Tecnológico

El proyecto está construido utilizando un stack moderno y escalable, enfocado en el rendimiento y la experiencia de usuario (UX/UI).

**Frontend & Core (React / Next.js)**
- **Lenguajes Base:** TypeScript (Tipado Estricto), JavaScript (ES6+), HTML5 semántico.
- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Librería UI:** React 19
- **Estilizado (CSS3):** Tailwind CSS v4, shadcn/ui (Radix UI)
- **Validación y Formularios:** React Hook Form + Zod
- **Internacionalización:** next-intl (Soporte nativo Español/Inglés)
- **Iconografía:** Lucide React

**Backend & Servicios Cloud**
- **Base de Datos & Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth)
- **Inteligencia Artificial:** OpenAI API (Agent Conversacional)
- **Almacenamiento de Archivos:** Cloudinary
- **Correos Transaccionales:** Nodemailer

**DevOps & Testing**
- **Despliegue:** Vercel (Edge Network)
- **Testing:** Vitest (Unitario) y Playwright (E2E)
- **Control de Calidad:** ESLint, Prettier, Husky, lint-staged, commitlint (Conventional Commits)

---

## Funcionalidades Principales

La plataforma opera bajo un modelo "Dual-Sided" atendiendo a tres tipos de usuarios con flujos completamente independientes:

### 1. Perfil Empresa (Contratante)
- **Gestión de Proyectos**: Creación, edición y publicación de proyectos a corto plazo.
- **Generación IA de Proyectos**: Agente integrado (vía OpenRouter/OpenAI) que actúa como un *Generador de Propuestas*, asistiendo a las empresas a redactar proyectos estructurados rápidamente.
- **Panel de Evaluación**: Recepción de postulaciones ("sobres cerrados") que mantienen la privacidad hasta ser abiertos.
- **Evaluación Bi-direccional**: Calificación del profesional una vez finalizado el proyecto para alimentar el sistema de reputación.

### 2. Perfil Profesional (Egresado)
- **Explorador de Proyectos**: Búsqueda avanzada de proyectos con filtros por tecnología, duración y presupuesto.
- **Gestión de Postulaciones**: Seguimiento en tiempo real del estado de sus aplicaciones (Enviada, En Revisión, Adjudicada, Rechazada).
- **Reputación Pública**: Perfil enriquecido basado en las calificaciones otorgadas por empresas en proyectos finalizados.

### 3. Perfil Administrador (FWD)
- **Moderación Global**: Supervisión de empresas registradas, validación de proyectos y moderación de contenido.

### 4. Otras Funcionalidades Principales
- **Espacio de Trabajo (Workspace)**: Entorno privado habilitado al adjudicar un proyecto, incluyendo un chat de comunicación directa entre empresa/egresado y un sistema completo de gestión de entregables (aprobación y rechazo).
- **Networking y Contacto Directo**: Sistema de mensajería independiente que permite a las empresas contactar a los egresados directamente desde el directorio de talento, sin requerir una postulación previa.
- **Chat Contextual (IA)**: Agente conversacional basado en inteligencia artificial diseñado para asistir a los usuarios de manera interactiva durante su navegación y uso del sistema.

---

## Valor de Negocio y Logros Técnicos

El FWD Marketplace es un SaaS robusto "Full-Stack" construido con los estándares tecnológicos más exigentes de la industria actual, demostrando dominio en arquitecturas modernas y escalables:

- **Arquitectura Monolítica Serverless (Next.js 15 App Router)**: Empleo profundo de *React Server Components* (RSC) y *Server Actions* para la mutación segura de datos, eliminando la necesidad de crear APIs REST tradicionales y garantizando un SEO técnico superior junto con cargas ultrarrápidas.
- **Diseño de Base de Datos y RLS Perimetral**: Integración nativa con **Supabase (PostgreSQL)**. Empleo de control de accesos a nivel de fila (*Row Level Security - RLS*) directamente en la base de datos, lo que blinda la privacidad corporativa impidiendo que usuarios no autorizados consulten proyectos ajenos.
- **Inteligencia Artificial y Lógica Compleja (Dual-Sided Marketplace)**: Integración asíncrona de la API de OpenAI para un agente de soporte especializado. Asimismo, incluye el desarrollo algorítmico de máquinas de estado para ofertas/postulaciones y cálculos automatizados de reputación bi-direccional a través de *Triggers* y *RPCs* en SQL.
- **End-to-End Type Safety**: Tipado estricto desde la base de datos (con tipos autogenerados de Supabase) hasta el cliente, utilizando **Zod** para la validación de esquemas en *Server Actions* y formularios, asegurando que no existan errores de tiempo de ejecución por datos malformados.
- **Desarrollo Global "Day-One" (i18n)**: Aplicación estructurada para múltiples mercados internacionales desde su concepción, implementando una sólida lógica de enrutamiento localizado con `next-intl` (ej: `/es/`, `/en/`).
- **Cultura de Calidad y DevOps (Testing)**: Un ecosistema de desarrollo impecable respaldado por **Vitest** (Unitario) y **Playwright** (E2E), junto a políticas de *Conventional Commits* (Husky) y validaciones estrictas en TypeScript.

---

## Arquitectura de Despliegue (Producción en Vercel)

El proyecto se encuentra totalmente desplegado en producción, habiéndose estructurado bajo protocolos corporativos para garantizar una ejecución en la nube ágil y de alcance global:

- **Frontend & Serverless Backend (Edge Computing)**: Al usar el framework Next.js, la plataforma está desplegada nativamente en **Vercel**. Las vistas estáticas (SSG) se distribuyen instantáneamente a través de su CDN global (*Edge Network*), mientras que las *Server Actions* operan como **Serverless Functions** bajo demanda, garantizando escalabilidad automática y *Zero Downtime*.
- **Base de Datos en la Nube (Supabase)**: La base de datos de producción (PostgreSQL) está alojada en Supabase y se gestiona estrictamente a través de *Supabase Migrations*. Esto permite versionar los cambios del esquema local y sincronizarlos con el servidor de producción (`supabase db push`) de forma segura y controlada.
- **Ecosistema CI/CD Integrado**: El repositorio está conectado al pipeline de automatización. Cada *push* o *Pull Request* se somete a validaciones (Lint, Typecheck, Unit Tests con Vitest) antes de desencadenar un *Deploy Automático* en Vercel, asegurando integración y entrega continua sin regresiones.
- **Desacoplamiento de Servicios**: Uso de **Cloudinary** para el alojamiento y distribución optimizada de imágenes, descargando la carga binaria de Vercel y Supabase.

---

## Instalación y Ejecución Local (Guía Paso a Paso)
<details>
<summary><b>🛠️ Haz clic aquí para ver la Guía de Instalación y Ejecución Local</b></summary>

### 1. Prerrequisitos
- [Node.js](https://nodejs.org/) (Versión 20 LTS o superior).
- Git para clonar el repositorio.
- Cuenta en [Supabase](https://supabase.com/) (para levantar la BD local o usar una en la nube).

### 2. Clonar el Repositorio e Instalar Dependencias
```bash
git clone https://github.com/asporras7-dev/Marketplace-Hackathon.git
cd Marketplace-Hackathon
npm install
```

### ⚙️ 3. Configuración de Variables de Entorno
Copia el archivo de ejemplo y configura tus credenciales:
```bash
cp .env.local.example .env.local
```
Deberás configurar las variables requeridas de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Opcionalmente, para habilitar notificaciones transaccionales y la generación de IA, configura `GMAIL_USER` y `PROPOSAL_AI_API_KEY` (OpenRouter/OpenAI).

### 4. Base de Datos (Migraciones)
Si utilizas el CLI de Supabase para desarrollo local, aplica las migraciones:
```bash
npx supabase db push
```

### 5. Ejecutar el Servidor
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000` (con redirección automática al idioma por defecto, ej: `/es`).

</details>

---

## Estructura del Proyecto

El proyecto sigue una arquitectura de carpetas limpia y orientada a características (*Feature-Sliced* adaptado a Next.js App Router):

<details>
<summary><b>Haz clic aquí para desplegar la Arquitectura de Carpetas Avanzada</b></summary>

```text
Marketplace-Hackathon/
├── .github/              # Workflows de CI/CD (GitHub Actions)
├── .husky/               # Git hooks (lint-staged, commitlint)
├── docs/                 # Documentación técnica y especificaciones
├── messages/             # Diccionarios de internacionalización (.json)
├── public/               # Archivos estáticos y media
├── scripts/              # Scripts de utilidad (procesamiento de imágenes)
├── src/                  # Código fuente de la aplicación Next.js
│   ├── app/              # App Router avanzado (Next.js 15)
│   │   ├── [locale]/     # Rutas con i18n (next-intl)
│   │   │   ├── (public)/ # landing, auth, onboarding, verify-email
│   │   │   ├── (app)/    # junior autenticado (layout = guard de rol)
│   │   │   │   └── junior/, applications/, marketplace/
│   │   │   ├── (company)/# empresa contratante (layout = guard de rol)
│   │   │   │   └── empresa/, candidates/, projects/
│   │   │   ├── (admin)/  # panel admin FWD (layout = guard de rol)
│   │   │   │   └── admin/, dashboard/, companies/, moderation/
│   │   │   ├── 403/      # Acceso denegado
│   │   │   ├── showcase/ # Catálogo de design system (dev)
│   │   │   ├── layout.tsx# Root layout: next/font + NextIntlClientProvider
│   │   │   └── page.tsx  # Landing page
│   │   └── auth/callback/# Intercambio de sesión OAuth (sin locale)
│   ├── components/       # Arquitectura de UI en "Barrels"
│   │   ├── ui/           # Primitivos shadcn (button, card, dialog, sonner)
│   │   ├── layout/       # Chrome global (Navbar, SidebarAdmin, Shells)
│   │   └── features/     # Componentes de producto específicos
│   │       ├── brand/    # Identidad (FwdLogo, BrandPatterns)
│   │       ├── shared/   # Reutilizables (StatusPill, EmptyState)
│   │       ├── auth/     # Flujos de autenticación (AuthCard)
│   │       ├── applications/ # Lógica visual de postulaciones
│   │       ├── companies/# Tarjetas y perfiles de empresa
│   │       └── marketplace/  # Filtros, listados, skill picker
│   ├── lib/              # Core y Lógica de Negocio
│   │   ├── supabase/     # Clientes SSR, Browser y Auth Admin
│   │   ├── auth/         # Gestión de roles (normalizeRole)
│   │   ├── ai-filtro.../ # Lógica del generador IA (OpenRouter/OpenAI)
│   │   └── result.ts     # Implementación del patrón Result<T, E> seguro
│   ├── i18n/             # Configuración de next-intl (routing.ts, request.ts)
│   ├── types/            # Tipos globales TypeScript y genéricos
│   └── middleware.ts     # Guardias de sesión perimetral y locale (next-intl)
├── supabase/             # Entorno local de Supabase
│   ├── migrations/       # Migraciones SQL versionadas
│   └── seeds/            # Datos semilla para la base de datos
├── tests/                # Ecosistema de control de calidad
│   ├── unit/             # Pruebas unitarias (Vitest)
│   └── e2e/              # Pruebas End-to-End (Playwright)
├── next.config.ts        # Configuración del framework Next.js
├── tsconfig.json         # Reglas estrictas de compilación TypeScript
├── components.json       # Configuración de los componentes shadcn/ui
├── vitest.config.ts      # Configuración del entorno de testing
├── package.json          # Registro de dependencias y scripts
└── .env.local.example    # Plantilla de variables de entorno seguras
```
</details>

---

## Decisiones Técnicas y Arquitectura

- **Gestión de UI mediante "Barrels" y Primitivos**: Separación estricta entre componentes primitivos (`components/ui`) y componentes de características específicas (`components/features`). Esto previene el acoplamiento y facilita el mantenimiento a largo plazo.
- **Máquinas de Estado Derivadas (En Base de Datos)**: Para evitar conflictos de lectura sucia, el estado de una participación se *deriva al leer* en lugar de mutar registros fijos. Si un proyecto es cancelado, todas sus ofertas se calculan como `canceladas` en tiempo real de cara al usuario, preservando el estado original real en la base de datos para la empresa.
- **Manejo de Errores con el Patrón `Result<T, E>`**: Implementación de un patrón de resultados (común en lenguajes como Rust) para las *Server Actions*, garantizando que los errores en el servidor sean manejados de manera predecible y fuertemente tipada en el cliente, en lugar de utilizar `try/catch` globales inestables.

