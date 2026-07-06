'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  MapPin,
  Code2,
  MessageSquare,
  Loader2,
  GitBranch,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { StudentProfileView } from '@/lib/portfolio/actions'
import { useTranslations } from 'next-intl'
// We will need a server action to create the chat
import { crearChatDirecto } from '@/lib/talento/actions'

import { useRouter } from 'next/navigation'

export function TalentoClientList({
  initialProfiles,
}: {
  initialProfiles: StudentProfileView[]
}) {
  const [selectedProfile, setSelectedProfile] =
    useState<StudentProfileView | null>(null)
  const [isContacting, setIsContacting] = useState(false)
  const [contactSuccess, setContactSuccess] = useState(false)
  const t = useTranslations('EmpresaPerfil')
  const tEgresado = useTranslations('Egresado')
  const router = useRouter()

  const handleContactar = async () => {
    if (!selectedProfile) return
    setIsContacting(true)
    const result = await crearChatDirecto(selectedProfile.id_estudiante)
    setIsContacting(false)

    if (result.ok) {
      setContactSuccess(true)
      router.push(`/empresario/mensajes?directo=${result.data.idChat}`)
    } else {
      toast.error(
        `Hubo un error al intentar contactar al talento. Código: ${result.error}`,
      )
    }
  }

  if (initialProfiles.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          No hay perfiles públicos disponibles en este momento.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialProfiles.map((profile) => (
          <Card
            key={profile.id_estudiante}
            className="flex flex-col cursor-pointer hover:shadow-lg transition-all duration-200 border-primary/20"
            onClick={() => setSelectedProfile(profile)}
          >
            <CardHeader className="relative pb-4">
              <div className="flex items-center gap-4">
                {profile.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePhoto}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-sm">
                    {profile.firstName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="space-y-1 overflow-hidden">
                  <CardTitle className="text-lg font-bold font-display leading-tight truncate">
                    {profile.firstName} {profile.lastName1} {profile.lastName2}
                  </CardTitle>
                  <p className="text-xs font-semibold text-primary capitalize truncate">
                    {profile.tituloFwd || 'Egresado'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {(profile.paisNombre || profile.regionNombre) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px]">
                      {[profile.regionNombre, profile.paisNombre]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {profile.reputacion !== null && profile.reputacion > 0 && (
                  <div className="flex items-center gap-1 text-highlight font-bold">
                    <Star className="w-3.5 h-3.5 fill-highlight" />
                    <span>{Number(profile.reputacion).toFixed(1)}</span>
                  </div>
                )}
              </div>

              {profile.descripcion && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {profile.descripcion}
                </p>
              )}

              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {profile.skills.slice(0, 5).map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {skill.name}
                    </Badge>
                  ))}
                  {profile.skills.length > 5 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      +{profile.skills.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedProfile}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader className="pb-4 border-b border-border/40">
                <div className="flex items-center gap-5">
                  {selectedProfile.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedProfile.profilePhoto}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover shadow-sm border border-primary/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-3xl shadow-sm">
                      {selectedProfile.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <DialogTitle className="text-2xl font-bold font-display">
                      {selectedProfile.firstName} {selectedProfile.lastName1}{' '}
                      {selectedProfile.lastName2}
                    </DialogTitle>
                    <p className="text-sm font-semibold text-primary capitalize">
                      {selectedProfile.tituloFwd || 'Egresado'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {(selectedProfile.paisNombre ||
                        selectedProfile.regionNombre) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>
                            {[
                              selectedProfile.regionNombre,
                              selectedProfile.paisNombre,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                      {selectedProfile.reputacion !== null &&
                        selectedProfile.reputacion > 0 && (
                          <div className="flex items-center gap-1 text-highlight font-bold">
                            <Star className="w-3.5 h-3.5 fill-highlight" />
                            <span>
                              {Number(selectedProfile.reputacion).toFixed(1)} /
                              5.0
                            </span>
                          </div>
                        )}
                    </div>
                    {selectedProfile.urlCurriculum && (
                      <div className="pt-2">
                        <a
                          href={selectedProfile.urlCurriculum}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {tEgresado('portfolioCvView')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="py-6 space-y-8">
                {/* About */}
                <div className="space-y-3">
                  <h3 className="text-[12px] font-bold tracking-widest text-primary/70 uppercase font-display flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Sobre mí
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedProfile.descripcion ||
                      'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Skills */}
                {selectedProfile.skills.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[12px] font-bold tracking-widest text-primary/70 uppercase font-display flex items-center gap-2">
                      <Code2 className="w-4 h-4" /> Habilidades Técnicas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.skills.map((skill) => (
                        <Badge
                          key={skill.id}
                          variant="secondary"
                          className="px-3 py-1 text-xs"
                        >
                          {skill.name}{' '}
                          <span className="opacity-60 ml-1">
                            · {skill.level}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {selectedProfile.projects.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[12px] font-bold tracking-widest text-primary/70 uppercase font-display">
                      Proyectos Destacados
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedProfile.projects.map((proj) => (
                        <div
                          key={proj.id}
                          className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3 flex flex-col"
                        >
                          <h4 className="font-semibold text-sm text-foreground">
                            {proj.title}
                          </h4>
                          <p className="text-xs text-muted-foreground flex-1 whitespace-pre-wrap leading-relaxed">
                            {proj.description}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {proj.technologies.map((tech) => (
                              <span
                                key={tech}
                                className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] text-secondary font-medium"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                          {(proj.repositoryUrl || proj.demoUrl) && (
                            <div className="flex items-center gap-3 pt-2 mt-auto border-t border-border/40">
                              {proj.repositoryUrl && (
                                <a
                                  href={proj.repositoryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                                >
                                  <GitBranch className="w-3 h-3" />
                                  Repositorio
                                </a>
                              )}
                              {proj.demoUrl && (
                                <a
                                  href={proj.demoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Demo
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border/40 flex flex-col items-center justify-center gap-4 bg-primary/5 -mx-6 -mb-6 p-6">
                {!contactSuccess ? (
                  <>
                    <p className="text-sm font-medium text-foreground text-center">
                      ¿Desearía comunicarse con nuestro egresado?
                    </p>
                    <div className="flex justify-center gap-3 w-full max-w-sm">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedProfile(null)}
                        disabled={isContacting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleContactar}
                        disabled={isContacting}
                      >
                        {isContacting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {isContacting ? 'Contactando...' : 'Aceptar'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-primary font-semibold p-4">
                    Abriendo chat...
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
