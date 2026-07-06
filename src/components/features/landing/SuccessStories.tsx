'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PlayCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface SuccessStoryItem {
  id: string
  image: string
  tagKey: string
  quoteKey: string
  videoUrl: string
}

const STORIES: SuccessStoryItem[] = [
  {
    id: 'valeria',
    image: '/images/valeria_noticia_final.png',
    tagKey: 'successStory1Tag',
    quoteKey: 'successStory1Quote',
    videoUrl: 'https://youtu.be/4eZVLfRG9k0',
  },
  {
    id: 'ricardo',
    image: '/images/ricardo_workspace_final.jpg',
    tagKey: 'successStory2Tag',
    quoteKey: 'successStory2Quote',
    videoUrl: 'https://youtu.be/jgXKz7O0cOU',
  },
  {
    id: 'clara',
    image: '/images/clara_que_es_final.png',
    tagKey: 'successStory3Tag',
    quoteKey: 'successStory3Quote',
    videoUrl: 'https://youtu.be/LxEUZc08N1o',
  },
]

export function SuccessStories() {
  const t = useTranslations('Landing')
  const [selectedStory, setSelectedStory] = useState<SuccessStoryItem | null>(
    null,
  )

  const handleOpenVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <section className="py-20 lg:py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-ink-strong">
              {t('successStoriesTitle')}
            </h2>
            <p className="text-lg text-ink-muted leading-relaxed">
              {t('successStoriesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STORIES.map((story) => (
              <div key={story.id} className="space-y-4">
                <div
                  onClick={() => setSelectedStory(story)}
                  className="relative group overflow-hidden rounded-2xl aspect-[16/10] bg-surface-sunken shadow-sm border border-border cursor-pointer transition-all duration-300 hover:shadow-md hover:border-ink-muted/30"
                >
                  <Image
                    src={story.image}
                    alt={t(story.tagKey)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center transition-colors group-hover:bg-black/35">
                    <PlayCircle className="w-16 h-16 text-white/90 drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <p className="text-sm sm:text-base italic text-ink leading-relaxed">
                  {t(story.quoteKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal Dialog ("Otro apartado") */}
      <Dialog
        open={!!selectedStory}
        onOpenChange={(open) => !open && setSelectedStory(null)}
      >
        {selectedStory && (
          <DialogContent className="max-w-2xl bg-surface/95 backdrop-blur-md border border-border/50 shadow-2xl p-6 sm:p-8">
            <DialogHeader className="space-y-3">
              <span className="text-xs font-bold tracking-widest text-primary uppercase">
                {t('successStoriesTitle')}
              </span>
              <DialogTitle className="text-2xl font-extrabold text-ink-strong font-heading">
                {t(selectedStory.tagKey)}
              </DialogTitle>
              <DialogDescription className="text-sm text-ink-muted leading-relaxed italic">
                {t(selectedStory.quoteKey)}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-ink-muted text-center font-medium">
                {t('videoModalInstructions')}
              </p>

              <div
                onClick={() => handleOpenVideo(selectedStory.videoUrl)}
                className="relative group overflow-hidden rounded-2xl aspect-[16/10] bg-surface-sunken shadow-lg border border-border cursor-pointer"
              >
                <Image
                  src={selectedStory.image}
                  alt={t(selectedStory.tagKey)}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Custom glowing hover & pulse overlay */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 transition-colors duration-300 group-hover:bg-black/50">
                  <div className="relative flex items-center justify-center w-20 h-20 bg-primary/95 text-primary-foreground rounded-full shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-primary">
                    <PlayCircle className="w-12 h-12 fill-current" />
                  </div>
                  <span className="text-white font-bold text-xs tracking-wider uppercase bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 group-hover:bg-black/60 transition-colors">
                    {t('videoModalCta')}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
