'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PortfolioProjectForm } from './PortfolioProjectForm'
import { CountryRegionFields } from '@/components/features/geo/CountryRegionFields'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import {
  saveStudentProfile,
  addStudentSkill,
  deleteStudentSkill,
  getActiveTechnologies,
  savePortfolioProject,
  deletePortfolioProject,
  uploadAndSaveProfilePhoto,
  type StudentProfileView,
} from '@/lib/portfolio/actions'
import type { ComboboxOption } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Pencil,
  Trash2,
  ExternalLink,
  GitBranch,
  Globe,
  Lock,
  BookOpen,
  Loader2,
  Star,
  MapPin,
  Award,
  FileText,
} from 'lucide-react'
import type { PortfolioProject, StudentSkill } from '@/types'
import type { CalificacionRecibida } from '@/lib/evaluaciones/actions'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Cropper from 'react-easy-crop'

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
): Promise<File | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  canvas.width = 500
  canvas.height = 500

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    500,
    500,
  )

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null)
        const file = new File([blob], 'profile_photo.jpg', {
          type: 'image/jpeg',
        })
        resolve(file)
      },
      'image/jpeg',
      0.9,
    )
  })
}

function SkillForm({
  initialData,
  availableTechnologies,
  existingSkills,
  isSaving,
  onSave,
  onCancel,
}: {
  initialData?: StudentSkill
  availableTechnologies: { id: string; name: string }[]
  existingSkills: StudentSkill[]
  isSaving: boolean
  onSave: (skill: StudentSkill) => void
  onCancel: () => void
}) {
  const t = useTranslations('Portfolio')

  const skillSchema = React.useMemo(() => {
    return z.object({
      name: z
        .string()
        .min(2, t('errorTitleReq'))
        .refine(
          (val) => {
            if (initialData && initialData.name === val) return true
            return !existingSkills.some((s) => s.name === val)
          },
          t('errorSkillExists') || 'Esta habilidad ya existe',
        ),
      level: z.enum(['basico', 'intermedio', 'avanzado']),
    })
  }, [t, initialData, existingSkills])
  type SkillFormValues = z.infer<typeof skillSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: initialData?.name || '',
      level: initialData?.level || 'basico',
    },
  })

  const onSubmit = (data: SkillFormValues) => {
    onSave({
      id: initialData?.id || `skill-${Date.now()}`,
      name: data.name,
      level: data.level,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="skill-name" className="text-sm font-medium">
          {t('skillName')}
        </label>
        <select
          id="skill-name"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('name')}
        >
          <option value="">{t('selectSkillPlaceholder')}</option>
          {availableTechnologies.map((tech) => (
            <option key={tech.id} value={tech.name}>
              {tech.name}
            </option>
          ))}
        </select>
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="skill-level" className="text-sm font-medium">
          {t('skillLevel')}
        </label>
        <select
          id="skill-level"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('level')}
        >
          <option value="basico">{t('levelBasic')}</option>
          <option value="intermedio">{t('levelIntermediate')}</option>
          <option value="avanzado">{t('levelAdvanced')}</option>
        </select>
        {errors.level && (
          <p className="text-xs text-destructive">{errors.level.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveSkill')
          )}
        </Button>
      </div>
    </form>
  )
}

export function PortfolioManager({
  initialProfile,
  countries = [],
  initialRegions = [],
  calificaciones = [],
}: {
  initialProfile?: StudentProfileView | null
  countries?: ComboboxOption[]
  initialRegions?: ComboboxOption[]
  calificaciones?: CalificacionRecibida[]
}) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false)
  const [availableTechnologies, setAvailableTechnologies] = useState<
    { id: string; name: string }[]
  >([])
  const [isSavingVis, setIsSavingVis] = useState(false)
  const [isSavingBio, setIsSavingBio] = useState(false)
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [visibility, setVisibility] = useState<'publico' | 'empresas'>(
    initialProfile?.portafolio_visible_publicamente === true
      ? 'publico'
      : 'empresas',
  )
  const [editingProject, setEditingProject] = useState<
    PortfolioProject | undefined
  >(undefined)
  const [editingSkill, setEditingSkill] = useState<StudentSkill | undefined>(
    undefined,
  )
  const [portfolioCountryName, setPortfolioCountryName] = useState(
    initialProfile?.paisNombre || '',
  )
  const [portfolioRegionName, setPortfolioRegionName] = useState(
    initialProfile?.regionNombre || '',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null)
  const [isBioEditOpen, setIsBioEditOpen] = useState(false)
  const [isLocationEditOpen, setIsLocationEditOpen] = useState(false)
  const [isCvEditOpen, setIsCvEditOpen] = useState(false)

  // Crop state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)

  const t = useTranslations('Portfolio')

  useEffect(() => {
    getActiveTechnologies().then((res) => {
      if (res.ok) setAvailableTechnologies(res.data)
    })
  }, [])

  useEffect(() => {
    // No-op for analytics/tracking (retained structure)
  }, [initialProfile])

  const bioSchema = React.useMemo(() => {
    return z.object({
      bio: z.string().max(2000, t('errorBioMax')),
    })
  }, [t])
  type BioValues = z.infer<typeof bioSchema>

  const projects = initialProfile?.projects || []
  const skills = initialProfile?.skills || []

  const [portfolioBio, setPortfolioBio] = useState(
    initialProfile?.descripcion || '',
  )

  const {
    register: registerBio,
    handleSubmit: handleBioSubmit,
    formState: { errors: bioErrors },
    reset: resetBio,
  } = useForm<BioValues>({
    resolver: zodResolver(bioSchema),
    defaultValues: {
      bio: portfolioBio || '',
    },
  })

  useEffect(() => {
    resetBio({ bio: portfolioBio || '' })
  }, [portfolioBio, resetBio])

  const locationSchema = React.useMemo(() => {
    return z.object({
      country: z.string().optional(),
      region: z.string().optional(),
    })
  }, [])
  type LocationValues = z.infer<typeof locationSchema>

  const [portfolioCountry, setPortfolioCountry] = useState(
    initialProfile?.paisIsoResidencia || '',
  )
  const [portfolioRegion, setPortfolioRegion] = useState(
    initialProfile?.regionResidencia || '',
  )

  const cvSchema = React.useMemo(
    () =>
      z.object({
        url: z.union([z.literal(''), z.string().url('URL inválida')]),
      }),
    [],
  )
  type CvValues = z.infer<typeof cvSchema>

  const [portfolioCv, setPortfolioCv] = useState(
    initialProfile?.urlCurriculum || '',
  )
  const [isSavingCv, setIsSavingCv] = useState(false)
  const {
    register: registerCv,
    handleSubmit: handleCvSubmit,
    formState: { errors: cvErrors },
    reset: resetCv,
  } = useForm<CvValues>({
    resolver: zodResolver(cvSchema),
    defaultValues: { url: portfolioCv },
  })
  useEffect(() => resetCv({ url: portfolioCv }), [portfolioCv, resetCv])

  const {
    handleSubmit: handleLocationSubmit,
    formState: { errors: locationErrors },
    watch: watchLocation,
    setValue: setValueLocation,
    reset: resetLocation,
  } = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      country: portfolioCountry,
      region: portfolioRegion,
    },
  })

  useEffect(() => {
    resetLocation({
      country: portfolioCountry,
      region: portfolioRegion,
    })
  }, [portfolioCountry, portfolioRegion, resetLocation])

  const handleVisibilityChange = async (
    newVis: 'publico' | 'empresas',
    customMessage?: string,
  ) => {
    setIsSavingVis(true)
    const res = await saveStudentProfile({
      portafolio_visible_publicamente: newVis === 'publico',
    })
    setIsSavingVis(false)

    if (res.ok) {
      setVisibility(newVis)
      toast.success(customMessage || t('toastVisibilityUpdated'), {
        duration: 2000,
      })
    } else {
      toast.error('Error al actualizar la visibilidad')
    }
  }

  const handleBioSave = async (data: BioValues) => {
    setIsSavingBio(true)
    const res = await saveStudentProfile({
      descripcion: data.bio || '',
    })
    setIsSavingBio(false)

    if (res.ok) {
      setPortfolioBio(data.bio || '')
      toast.success(t('toastBioSaved'))
      setIsBioEditOpen(false)
    } else {
      toast.error('Error al guardar la biografía')
    }
  }

  const handleLocationSave = async (data: LocationValues) => {
    setIsSavingLocation(true)
    const res = await saveStudentProfile({
      paisIsoResidencia: data.country || null,
      regionResidencia: data.region || null,
    })
    setIsSavingLocation(false)

    if (res.ok) {
      setPortfolioCountry(data.country || '')
      setPortfolioRegion(data.region || '')
      toast.success('Ubicación guardada correctamente')
      router.refresh()
      setIsLocationEditOpen(false)
    } else {
      toast.error('Error al guardar la ubicación')
    }
  }

  const handleCvSave = async (data: CvValues) => {
    setIsSavingCv(true)
    const res = await saveStudentProfile({
      urlCurriculum: data.url || null,
    })
    setIsSavingCv(false)
    if (res.ok) {
      setPortfolioCv(data.url || '')
      toast.success(t('portfolioCvSaved'))
      router.refresh()
      setIsCvEditOpen(false)
    } else {
      toast.error(t('portfolioCvError'))
    }
  }

  const handleSave = async (project: PortfolioProject) => {
    setIsSavingBio(true) // Usando como indicador de carga
    const res = await savePortfolioProject(project, editingProject?.id)
    setIsSavingBio(false)

    if (res.ok) {
      toast.success(
        t('toastBioSaved', { defaultValue: 'Proyecto guardado correctamente' }),
      )
      router.refresh()
      setIsDialogOpen(false)
      setEditingProject(undefined)
    } else {
      toast.error('Error al guardar el proyecto')
    }
  }

  const handleDelete = async (id: string) => {
    setIsSavingBio(true)
    const res = await deletePortfolioProject(id)
    setIsSavingBio(false)

    if (res.ok) {
      toast.success('Proyecto eliminado correctamente')
      router.refresh()
    } else {
      toast.error('Error al eliminar el proyecto')
    }
  }

  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project)
    setIsDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingProject(undefined)
    setIsDialogOpen(true)
  }

  const handleSaveSkill = async (skill: StudentSkill) => {
    setIsSavingBio(true)
    const res = await addStudentSkill(skill.name, skill.level)
    setIsSavingBio(false)

    if (res.ok) {
      toast.success('Habilidad guardada correctamente')
      router.refresh()
      setIsSkillDialogOpen(false)
      setEditingSkill(undefined)
    } else {
      toast.error('Error al guardar habilidad')
    }
  }

  const handleDeleteSkill = async (id: string) => {
    setIsSavingBio(true)
    const res = await deleteStudentSkill(id)
    setIsSavingBio(false)

    if (res.ok) {
      toast.success('Habilidad eliminada correctamente')
      router.refresh()
    } else {
      toast.error('Error al eliminar habilidad')
    }
  }

  const handleAddNewSkill = () => {
    setEditingSkill(undefined)
    setIsSkillDialogOpen(true)
  }

  return (
    <div className="space-y-12">
      {/* Visibility Settings, Biography Editor & Profile Preview (RF-14 & RF-15) */}
      <div className="w-full space-y-6">
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              Estado de Publicación
            </p>
            <p className="text-sm text-ink-muted leading-relaxed">
              {visibility === 'publico'
                ? 'Tu portafolio está publicado y visible para empresas y reclutadores.'
                : 'Tu portafolio está guardado en modo borrador.'}
            </p>
          </div>
          <Button
            onClick={() =>
              handleVisibilityChange(
                'publico',
                'Tu perfil profesional se ha publicado exitosamente',
              )
            }
            disabled={isSavingVis || visibility === 'publico'}
            variant={visibility === 'publico' ? 'secondary' : 'default'}
            className="shrink-0 font-bold rounded-xl h-10 w-full sm:w-auto"
          >
            {isSavingVis ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : visibility === 'publico' ? (
              'Publicado'
            ) : (
              'Publicar Perfil'
            )}
          </Button>
        </div>

        {/* Premium Portfolio Mockup */}
        <div className="border border-border/80 bg-surface rounded-2xl shadow-md overflow-hidden flex flex-col min-h-[800px]">
          {/* Preview Header / Navbar */}
          <div className="h-16 border-b border-border/40 px-6 flex items-center justify-between bg-surface shrink-0">
            <span className="font-heading font-extrabold text-sm text-ink-strong">
              {initialProfile?.firstName || 'Ronny'}{' '}
              {initialProfile?.lastName1 || 'Fernández'}
            </span>
            <div className="hidden sm:flex items-center gap-6 text-[11px] font-bold text-ink-muted">
              <span className="text-primary border-b-2 border-primary py-1">
                Biography
              </span>
              <span>Skills</span>
              <span>Projects</span>
              <span>Contact</span>
            </div>
            <Button
              size="sm"
              variant="default"
              className="h-8 text-[10px] font-bold tracking-wider uppercase rounded-lg px-4"
              asChild
            >
              <a
                href={initialProfile?.urlCurriculum || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                Resume
              </a>
            </Button>
          </div>

          {/* Preview Body */}
          <div className="p-8 space-y-6 bg-surface-sunken/10 flex-1 flex flex-col justify-start">
            {/* Profile Card / Header Info */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-surface p-6 rounded-2xl border border-border/40 shadow-sm">
              {/* Avatar Container */}
              <div className="relative shrink-0">
                <Dialog
                  open={isPhotoModalOpen}
                  onOpenChange={setIsPhotoModalOpen}
                >
                  <DialogTrigger asChild>
                    <button className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-primary/20 ring-offset-2">
                      {localPhotoUrl || initialProfile?.profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            (localPhotoUrl ||
                              initialProfile?.profilePhoto) as string
                          }
                          alt="Profile"
                          className={cn(
                            'w-24 h-24 rounded-full object-cover',
                            isUploadingPhoto && 'opacity-50',
                          )}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-4xl shadow-inner">
                          {initialProfile?.firstName?.charAt(0) || 'R'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-4 h-4" />
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] flex flex-col items-center text-center p-8 gap-6">
                    {localPhotoUrl || initialProfile?.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          (localPhotoUrl ||
                            initialProfile?.profilePhoto) as string
                        }
                        alt="Profile preview"
                        className={cn(
                          'w-32 h-32 rounded-full object-cover border shadow-sm',
                          isUploadingPhoto && 'opacity-50',
                        )}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border text-primary font-bold text-4xl shadow-sm">
                        {initialProfile?.firstName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="space-y-2">
                      <DialogTitle className="text-xl font-semibold">
                        Editar foto de perfil
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Selecciona una nueva imagen para actualizar tu identidad
                        visual en la plataforma.
                      </p>
                    </div>
                    <div className="flex w-full justify-end bg-muted/20 p-4 -mx-8 -mb-8 mt-2 rounded-b-xl gap-2">
                      <DialogClose asChild>
                        <Button
                          variant="ghost"
                          className="font-semibold text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                        onClick={() => {
                          fileInputRef.current?.click()
                          setIsPhotoModalOpen(false)
                        }}
                      >
                        Aceptar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-surface rounded-full shadow-sm" />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  const isValidType = [
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                  ].includes(file.type)
                  const isValidSize = file.size <= 5 * 1024 * 1024

                  if (!isValidType || !isValidSize) {
                    toast.error(
                      'La imagen debe ser JPG, PNG o WEBP y menor a 5MB.',
                    )
                    return
                  }

                  const reader = new FileReader()
                  reader.readAsDataURL(file)
                  reader.onload = () => {
                    setImageToCrop(reader.result as string)
                    setIsCropModalOpen(true)
                    setIsPhotoModalOpen(false)
                  }

                  e.target.value = ''
                }}
              />

              <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
                <DialogContent className="sm:max-w-[600px] flex flex-col gap-0 p-0 overflow-hidden bg-surface rounded-xl">
                  <DialogHeader className="p-4 border-b bg-muted/30">
                    <DialogTitle className="text-center font-medium">
                      {t('cropImageTitle')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('cropImageDesc')}
                      </p>
                    </div>
                    <div className="relative w-full h-[400px] bg-black/5 rounded-md overflow-hidden">
                      {imageToCrop && (
                        <Cropper
                          image={imageToCrop}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          cropShape="rect"
                          showGrid={true}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={(_, croppedPixels) => {
                            setCroppedAreaPixels(croppedPixels)
                          }}
                        />
                      )}
                    </div>
                    <div className="flex w-full justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setIsCropModalOpen(false)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isUploadingPhoto}
                        onClick={async () => {
                          if (!imageToCrop || !croppedAreaPixels) return
                          setIsUploadingPhoto(true)
                          const toastId = toast.loading(
                            'Subiendo foto de perfil...',
                          )
                          try {
                            const croppedFile = await getCroppedImg(
                              imageToCrop,
                              croppedAreaPixels,
                            )
                            if (!croppedFile)
                              throw new Error('Error al recortar la imagen')

                            const formData = new FormData()
                            formData.append('file', croppedFile)

                            const result =
                              await uploadAndSaveProfilePhoto(formData)

                            if (result.ok) {
                              // @ts-expect-error cloudinary result contains secureUrl in data but typing might vary
                              setLocalPhotoUrl(result.data || result.value)
                              toast.success(
                                'Foto de perfil actualizada exitosamente.',
                                { id: toastId },
                              )
                              setIsCropModalOpen(false)
                            } else {
                              toast.error(
                                'Hubo un error al actualizar la foto de perfil.',
                                { id: toastId },
                              )
                            }
                          } catch {
                            toast.error(
                              'Ocurrió un error inesperado al subir la imagen.',
                              { id: toastId },
                            )
                          } finally {
                            setIsUploadingPhoto(false)
                          }
                        }}
                      >
                        {isUploadingPhoto ? '...' : t('cropAndUpload')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Profile details */}
              <div className="flex-grow text-center md:text-left space-y-1.5 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2.5 justify-center md:justify-start">
                  <h1 className="text-2xl font-bold font-heading text-ink-strong tracking-tight">
                    {initialProfile?.firstName || 'Ronny'}{' '}
                    {initialProfile?.lastName1 || 'Fernández'}{' '}
                    {initialProfile?.lastName2 || ''}
                  </h1>
                  <button
                    onClick={() =>
                      handleVisibilityChange(
                        visibility === 'publico' ? 'empresas' : 'publico',
                        visibility === 'publico'
                          ? 'Visibilidad cambiada a Solo Empresas'
                          : 'Visibilidad cambiada a Público',
                      )
                    }
                    className="focus:outline-none"
                  >
                    <Badge
                      variant={
                        visibility === 'publico' ? 'default' : 'secondary'
                      }
                      className="gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                    >
                      {visibility === 'publico' ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {visibility === 'publico' ? 'Público' : 'Solo Empresas'}
                    </Badge>
                  </button>
                </div>
                <p className="text-base font-bold text-primary font-heading tracking-wide">
                  {initialProfile?.tituloFwd || 'Fullstack Developer'}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {[portfolioRegionName, portfolioCountryName]
                        .filter(Boolean)
                        .join(', ') || 'Santiago, República Dominicana'}
                    </span>
                  </div>
                  {initialProfile?.urlCurriculum && (
                    <a
                      href={initialProfile.urlCurriculum}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[150px]">
                        {initialProfile.urlCurriculum.replace(
                          /^https?:\/\//i,
                          '',
                        )}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Biography & Resume/Location Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Biografía Card */}
              <div className="md:col-span-2 bg-surface p-6 rounded-2xl border border-border/40 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-ink-strong flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Biografía
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-primary hover:text-primary/80"
                    onClick={() => setIsBioEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </h3>
                <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  {portfolioBio ||
                    'Soy un desarrollador Fullstack apasionado por crear soluciones tecnológicas robustas y escalables. Mi enfoque combina la precisión técnica con una visión centrada en el usuario, permitiéndome construir aplicaciones que no solo funcionan a la perfección, sino que también ofrecen experiencias intuitivas.\n\nCon experiencia en arquitecturas modernas y un compromiso constante con el aprendizaje, me especializo en transformar ideas complejas en productos digitales de alto rendimiento.'}
                </p>
              </div>

              {/* Right Mini Cards column */}
              <div className="space-y-6">
                {/* Curriculum Card */}
                <div className="bg-surface p-6 rounded-2xl border border-border/40 shadow-sm flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-ink-strong">
                        Currículum
                      </h4>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-primary hover:text-primary/80"
                        onClick={() => setIsCvEditOpen(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-ink-muted">
                      {initialProfile?.urlCurriculum ? (
                        <a
                          href={initialProfile.urlCurriculum}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1 text-primary"
                        >
                          Ver CV <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        'Descargar versión PDF'
                      )}
                    </p>
                  </div>
                </div>

                {/* Ubicación Card */}
                <div className="bg-surface p-6 rounded-2xl border border-border/40 shadow-sm flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-ink-strong">
                        Ubicación
                      </h4>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-primary hover:text-primary/80"
                        onClick={() => setIsLocationEditOpen(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Disponible para trabajo remoto
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proyectos del Portafolio Card */}
            <div className="bg-surface p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="text-sm font-bold text-ink-strong flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Proyectos del Portafolio
                </h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      onClick={handleAddNew}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
                    >
                      + Agregar
                    </button>
                  </DialogTrigger>
                  <DialogContent
                    id="portfolio-dialog"
                    className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
                  >
                    <DialogHeader>
                      <DialogTitle>
                        {editingProject ? t('editProject') : t('newProject')}
                      </DialogTitle>
                    </DialogHeader>
                    <PortfolioProjectForm
                      {...((editingProject
                        ? { initialData: editingProject }
                        : {}) as Record<string, unknown>)}
                      onSave={handleSave}
                      onCancel={() => setIsDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {projects.length === 0 ? (
                <div className="border border-dashed border-border/85 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-4 bg-muted/40 rounded-full text-ink-muted">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <p className="font-bold text-sm text-ink-strong">
                      Aún no hay proyectos
                    </p>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      El portafolio se está actualizando. Pronto podrás ver las
                      soluciones tecnológicas que he desarrollado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="rounded-xl border border-border/60 bg-surface-sunken/40 p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="font-bold text-sm text-ink-strong flex items-center justify-between">
                          <span>{proj.title}</span>
                          {proj.completionDate && (
                            <span className="text-[10px] text-ink-muted font-normal font-sans">
                              {new Date(
                                proj.completionDate,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border/40 mt-3">
                        {proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {proj.technologies.map((tech) => (
                              <Badge
                                key={tech}
                                variant="outline"
                                className="px-2 py-0.5 text-[9px] font-bold font-sans bg-primary/5 text-primary border-primary/20"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-3 text-xs pt-1 items-center">
                          {proj.repositoryUrl && (
                            <a
                              href={proj.repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-bold text-[9px] uppercase"
                            >
                              <GitBranch className="h-3 w-3" /> {t('repo')}
                            </a>
                          )}
                          {proj.demoUrl && (
                            <a
                              href={proj.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-bold text-[9px] uppercase"
                            >
                              <ExternalLink className="h-3 w-3" /> {t('demo')}
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(proj)}
                            className="text-primary hover:underline flex items-center gap-1 font-bold text-[9px] uppercase ml-auto"
                          >
                            <Pencil className="h-2.5 w-2.5" /> {t('edit')}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  '¿Deseas eliminar este proyecto?',
                                )
                              ) {
                                handleDelete(proj.id)
                              }
                            }}
                            className="text-destructive hover:underline flex items-center gap-1 font-bold text-[9px] uppercase"
                          >
                            <Trash2 className="h-2.5 w-2.5" /> {t('delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Habilidades & Calificaciones Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Habilidades Card */}
              <div className="bg-surface p-6 rounded-2xl border border-border/40 shadow-sm space-y-4 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-sm font-bold text-ink-strong flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Habilidades
                  </h3>
                  <Dialog
                    open={isSkillDialogOpen}
                    onOpenChange={setIsSkillDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <button
                        onClick={handleAddNewSkill}
                        className="text-primary hover:text-primary/80 text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                      >
                        + Agregar
                      </button>
                    </DialogTrigger>
                    <DialogContent
                      id="skill-dialog"
                      className="sm:max-w-[425px]"
                    >
                      <DialogHeader>
                        <DialogTitle>
                          {editingSkill ? t('editSkill') : t('newSkill')}
                        </DialogTitle>
                      </DialogHeader>
                      <SkillForm
                        {...((editingSkill
                          ? { initialData: editingSkill }
                          : {}) as Record<string, unknown>)}
                        availableTechnologies={availableTechnologies}
                        existingSkills={skills}
                        isSaving={isSavingBio}
                        onSave={handleSaveSkill}
                        onCancel={() => setIsSkillDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {skills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center gap-2 flex-grow py-4">
                    <div className="p-2.5 bg-muted/40 rounded-full text-ink-muted">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-ink-muted font-bold">
                      Sección en construcción
                    </p>
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      <span className="w-1.5 h-1.5 rounded-full bg-border animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-border" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 py-2 flex-grow align-top">
                    {skills.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="secondary"
                        className="px-2.5 py-1 text-xs font-medium font-sans gap-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors group relative cursor-pointer"
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Deseas eliminar la habilidad ${skill.name}?`,
                            )
                          ) {
                            handleDeleteSkill(skill.id)
                          }
                        }}
                      >
                        <span>{skill.name}</span>
                        <span className="opacity-60 text-[10px] uppercase font-display tracking-wider">
                          •{' '}
                          {skill.level === 'avanzado'
                            ? t('levelAdvanced')
                            : skill.level === 'intermedio'
                              ? t('levelIntermediate')
                              : t('levelBasic')}
                        </span>
                        <span className="text-[10px] text-destructive opacity-0 group-hover:opacity-100 font-bold ml-1">
                          ×
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Calificaciones Card */}
              <div className="bg-surface p-6 rounded-2xl border border-border/40 shadow-sm space-y-4 flex flex-col justify-between min-h-[160px]">
                <h3 className="text-sm font-bold text-ink-strong flex items-center gap-2 border-b border-border/40 pb-2">
                  <Star className="h-4 w-4 text-primary" />
                  Calificaciones
                </h3>
                {calificaciones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center gap-2 flex-grow py-4">
                    <div className="p-2.5 bg-muted/40 rounded-full text-ink-muted animate-pulse">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l9-5-9-5-9 5 9 5z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-ink-muted font-bold">
                      Cargando credenciales...
                    </p>
                    <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-primary animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-2 flex-grow overflow-y-auto max-h-[150px]">
                    {calificaciones.map((cal) => (
                      <div
                        key={cal.id_evaluacion}
                        className="text-xs space-y-1 bg-surface-sunken p-2.5 rounded-lg border border-border/50 text-left"
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-ink-strong truncate max-w-[120px]">
                            {cal.tituloProyecto}
                          </span>
                          <div className="flex items-center gap-0.5 text-highlight shrink-0">
                            <Star className="w-3 h-3 fill-highlight" />
                            <span>{cal.puntuacion.toFixed(1)}</span>
                          </div>
                        </div>
                        {cal.comentario && (
                          <p className="text-ink-muted italic">
                            &quot;{cal.comentario}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Footer */}
          <div className="border-t border-border/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10 shrink-0 text-[10px] text-ink-muted font-sans mt-auto">
            <div className="text-center sm:text-left space-y-1">
              <p className="font-bold text-ink-strong">
                {initialProfile?.firstName || 'Ronny'}{' '}
                {initialProfile?.lastName1 || 'Fernández'}
              </p>
              <p>
                © 2026 {initialProfile?.firstName || 'Ronny'}{' '}
                {initialProfile?.lastName1 || 'Fernández'}. Built with technical
                precision and architectural clarity.
              </p>
            </div>
            <div className="flex items-center gap-4 font-bold text-ink-strong">
              <span>LinkedIn</span>
              <span>GitHub</span>
              <span>Source Code</span>
            </div>
          </div>
        </div>
      </div>

      {/* Biography Edit Dialog */}
      <Dialog open={isBioEditOpen} onOpenChange={setIsBioEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('bioTitle')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleBioSubmit(handleBioSave)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label htmlFor="portfolio-bio-textarea" className="sr-only">
                {t('bioTitle')}
              </Label>
              <Textarea
                id="portfolio-bio-textarea"
                placeholder={t('bioPlaceholder')}
                {...registerBio('bio')}
                rows={8}
              />
              {bioErrors.bio && (
                <p className="text-xs text-destructive">
                  {bioErrors.bio.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBioEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingBio}>
                {t('saveBio')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Location Edit Dialog */}
      <Dialog open={isLocationEditOpen} onOpenChange={setIsLocationEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('locationLabel')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleLocationSubmit(handleLocationSave)}
            className="space-y-4 pt-2"
          >
            <CountryRegionFields
              countries={countries}
              initialRegions={initialRegions}
              countryValue={watchLocation('country') ?? ''}
              onCountryChange={(code) =>
                setValueLocation('country', code, { shouldValidate: true })
              }
              onCountryNameChange={(name) => setPortfolioCountryName(name)}
              regionValue={watchLocation('region') ?? ''}
              onRegionChange={(code) =>
                setValueLocation('region', code, { shouldValidate: true })
              }
              onRegionNameChange={(name) => setPortfolioRegionName(name)}
              countryLabel={t('countryLabel')}
              countryId="portfolio-country"
              countryInvalid={Boolean(locationErrors.country)}
              regionId="portfolio-region"
              regionLabel={t('regionLabel')}
              hideRegionOptional={true}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingLocation}>
                Guardar Ubicación
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CV Edit Dialog */}
      <Dialog open={isCvEditOpen} onOpenChange={setIsCvEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('portfolioCvTitle')}</DialogTitle>
            <DialogDescription>{t('portfolioCvDesc')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleCvSubmit(handleCvSave)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label htmlFor="portfolio-cv-url" className="sr-only">
                {t('portfolioCvLabel')}
              </Label>
              <Input
                id="portfolio-cv-url"
                placeholder={t('portfolioCvPlaceholder')}
                {...registerCv('url')}
              />
              {cvErrors.url && (
                <p className="text-xs text-destructive">
                  {cvErrors.url.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCvEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingCv}>
                {t('portfolioCvSave')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
