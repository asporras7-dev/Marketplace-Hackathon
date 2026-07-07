import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  CheckCircle2,
  Sparkles,
  Building2,
  GraduationCap,
  Code2,
  Database,
  Cloud,
  Palette,
} from 'lucide-react'
import { HeroBgCarousel } from '@/components/ui/HeroBgCarousel'
import { LandingHeroCtas } from '@/components/features/landing/LandingHeroCtas'
import { SuccessStories } from '@/components/features/landing/SuccessStories'

const CAROUSEL_SLIDES = [
  { src: '/images/carousel/carousel-1.png', alt: 'Equipo FWD trabajando' },
  { src: '/images/carousel/carousel-2.png', alt: 'Espacio de trabajo FWD' },
  { src: '/images/carousel/carousel-3.png', alt: 'Comunidad FWD' },
  { src: '/images/carousel/carousel-4.png', alt: 'Talento FWD' },
]

export default async function LandingPage() {
  const tLanding = await getTranslations('Landing')

  /*
  """ ANTES """
  La sección de beneficios de la landing page usaba claves 'juniorTitle', 'juniorDesc' y 'juniorBenefit1/2/3' que causaban errores de traducción next-intl.
  
  """ DESPUES """
  Se cambiaron a 'egresadoTitle', 'egresadoDesc' y 'egresadoBenefit1/2/3' para alinearse con las claves correctas definidas en messages/es.json y messages/en.json.
  */

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero — carrusel de fondo */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: '620px',
            display: 'flex',
            alignItems: 'center',
          }}
          className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8"
        >
          {/* ── Imágenes de fondo en carrusel ── */}
          <HeroBgCarousel slides={CAROUSEL_SLIDES} interval={5000} />

          {/* ── Overlay degradado para legibilidad ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, color-mix(in oklch, var(--ink-strong) 72%, transparent) 0%, color-mix(in oklch, var(--secondary) 50%, transparent) 60%, color-mix(in oklch, var(--ink-strong) 35%, transparent) 100%)',
              zIndex: 1,
            }}
          />

          {/* ── Contenido encima del fondo ── */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-8 space-y-6 text-left">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    background:
                      'color-mix(in oklch, var(--surface) 15%, transparent)',
                    borderColor:
                      'color-mix(in oklch, var(--surface) 30%, transparent)',
                    color: 'var(--surface)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {tLanding('badgeVersion')}
                </div>

                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading"
                  style={{
                    color: 'var(--surface)',
                    textShadow:
                      '0 2px 16px color-mix(in oklch, var(--ink-strong) 40%, transparent)',
                  }}
                >
                  {tLanding('heroTitle')}
                  <span style={{ color: 'var(--accent)' }}>.</span>
                </h1>

                <p
                  className="text-lg leading-relaxed max-w-xl"
                  style={{
                    color:
                      'color-mix(in oklch, var(--surface) 85%, transparent)',
                  }}
                >
                  {tLanding('heroSubtitle')}
                </p>

                <LandingHeroCtas />
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-secondary text-secondary-foreground py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-4">
              <p className="text-3xl font-extrabold text-accent font-heading">
                {tLanding('statsProjectsNumber')}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsProjectsLabel')}
              </p>
            </div>
            <div className="p-4 border-y md:border-y-0 md:border-x border-secondary-foreground/20">
              <p className="text-3xl font-extrabold text-highlight font-heading">
                {tLanding('statsTalentNumber')}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsTalentLabel')}
              </p>
            </div>
            <div className="p-4">
              <p className="text-3xl font-extrabold text-magenta font-heading">
                {tLanding('statsCompaniesNumber')}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsCompaniesLabel')}
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 lg:py-32 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-ink-strong">
                {tLanding('howItWorksTitle')}
              </h2>
              <p className="text-lg text-ink-muted leading-relaxed">
                {tLanding('howItWorksSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* For Companies Card */}
              <div className="bg-secondary text-secondary-foreground p-8 sm:p-10 rounded-3xl shadow-lg flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01]">
                <div className="space-y-6">
                  <div className="p-3 bg-white/10 text-white w-fit rounded-2xl">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-white">
                    {tLanding('howItWorksCompanyTitle')}
                  </h3>
                  <ul className="space-y-4">
                    {[
                      tLanding('howItWorksCompanyBenefit1'),
                      tLanding('howItWorksCompanyBenefit2'),
                      tLanding('howItWorksCompanyBenefit3'),
                    ].map((benefit, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base text-white/90 leading-relaxed">
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* For Graduates Card */}
              <div className="bg-accent text-white p-8 sm:p-10 rounded-3xl shadow-lg flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01] hover:shadow-md">
                <div className="space-y-6">
                  <div className="p-3 bg-white/20 text-white w-fit rounded-2xl">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-white">
                    {tLanding('howItWorksGraduateTitle')}
                  </h3>
                  <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                    {tLanding('howItWorksGraduateDesc')}
                  </p>
                  <ul className="space-y-4">
                    {[
                      tLanding('egresadoBenefit1'),
                      tLanding('egresadoBenefit2'),
                      tLanding('egresadoBenefit3'),
                    ].map((benefit, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base text-white/95 leading-relaxed">
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vanguard Domain Section */}
        <section className="py-20 lg:py-32 bg-surface-sunken">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-ink-strong">
                  {tLanding('vanguardTitle')}
                </h2>
                <p className="text-lg text-ink-muted leading-relaxed">
                  {tLanding('vanguardSubtitle')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-secondary/10 text-secondary tracking-wider font-heading">
                  {tLanding('vanguardTagFrontend')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary tracking-wider font-heading">
                  {tLanding('vanguardTagBackend')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-accent/20 text-accent-foreground tracking-wider font-heading">
                  {tLanding('vanguardTagCloud')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md hover:scale-[1.02]">
                <div className="p-4 bg-primary/10 text-primary rounded-2xl mb-6">
                  <Code2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold font-heading text-ink-strong mb-2">
                  {tLanding('vanguardCard1Title')}
                </h4>
                <p className="text-xs text-ink-muted">
                  {tLanding('vanguardCard1Desc')}
                </p>
              </div>
              {/* Card 2 */}
              <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md hover:scale-[1.02]">
                <div className="p-4 bg-warning/10 text-warning rounded-2xl mb-6">
                  <Database className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold font-heading text-ink-strong mb-2">
                  {tLanding('vanguardCard2Title')}
                </h4>
                <p className="text-xs text-ink-muted">
                  {tLanding('vanguardCard2Desc')}
                </p>
              </div>
              {/* Card 3 */}
              <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md hover:scale-[1.02]">
                <div className="p-4 bg-accent/10 text-accent rounded-2xl mb-6">
                  <Cloud className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold font-heading text-ink-strong mb-2">
                  {tLanding('vanguardCard3Title')}
                </h4>
                <p className="text-xs text-ink-muted">
                  {tLanding('vanguardCard3Desc')}
                </p>
              </div>
              {/* Card 4 */}
              <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md hover:scale-[1.02]">
                <div className="p-4 bg-magenta/10 text-magenta rounded-2xl mb-6">
                  <Palette className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold font-heading text-ink-strong mb-2">
                  {tLanding('vanguardCard4Title')}
                </h4>
                <p className="text-xs text-ink-muted">
                  {tLanding('vanguardCard4Desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Success Stories Section */}
        <SuccessStories />

        {/* Join Section */}
        <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-surface-sunken">
          <div className="max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-secondary text-secondary-foreground shadow-xl">
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-[50%] h-full opacity-10 bg-radial-gradient from-accent to-transparent pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center p-8 sm:p-12 lg:p-16">
                {/* Content Column */}
                <div className="lg:col-span-7 space-y-6 text-left">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-heading text-white leading-tight">
                    {tLanding('joinTitle')}
                  </h2>
                  <p className="text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
                    {tLanding('joinSubtitle')}
                  </p>
                  {/* Buttons removed */}
                </div>

                {/* Code Window Mockup Column */}
                <div className="lg:col-span-5 hidden lg:block">
                  <div className="bg-ink-strong/95 border border-white/10 rounded-2xl shadow-elevated overflow-hidden font-mono text-xs text-white/70 select-none">
                    {/* Window Header */}
                    <div className="bg-ink-strong/80 px-4 py-3 border-b border-white/5 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-success/80" />
                    </div>
                    {/* Window Body */}
                    <div className="p-6 space-y-2 leading-relaxed text-white/60">
                      <div>
                        <span className="text-accent">const</span>{' '}
                        <span className="text-white">talent</span> ={' '}
                        <span className="text-accent">await</span>{' '}
                        <span className="text-highlight">FWD</span>.
                        <span className="text-primary-foreground">
                          findCandidate
                        </span>
                        (&#123;
                      </div>
                      <div className="pl-4">
                        <span className="text-magenta">skills</span>: [
                        <span className="text-warning">&apos;React&apos;</span>,{' '}
                        <span className="text-warning">&apos;Node&apos;</span>],
                      </div>
                      <div className="pl-4">
                        <span className="text-magenta">location</span>:{' '}
                        <span className="text-warning">
                          &apos;Costa Rica&apos;
                        </span>
                      </div>
                      <div>&#125;);</div>
                      <div className="pt-2">
                        <span className="text-accent">if</span> (talent) &#123;
                      </div>
                      <div className="pl-4">
                        <span className="text-highlight">hiringMode</span>.
                        <span className="text-primary-foreground">
                          activate
                        </span>
                        ();
                      </div>
                      <div>&#125;</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
