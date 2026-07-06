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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import {
  PlusCircle,
  Pencil,
  Trash2,
  ExternalLink,
  GitBranch,
  Globe,
  Lock,
  BookOpen,
  Loader2,
  Star,
  Camera,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Info,
  MapPin,
  TrendingUp,
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
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)

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
      if (newVis === 'publico') setIsPublishDialogOpen(false)
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

  const handleEditSkill = (skill: StudentSkill) => {
    setEditingSkill(skill)
    setIsSkillDialogOpen(true)
  }

  const handleAddNewSkill = () => {
    setEditingSkill(undefined)
    setIsSkillDialogOpen(true)
  }

  return (
    <div className="space-y-12">
      {/* Visibility Settings, Biography Editor & Profile Preview (RF-14 & RF-15) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Settings */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('formVisibilityLabel')}
              </CardTitle>
              <CardDescription>{t('visibilityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={visibility === 'publico' ? 'default' : 'outline'}
                  className="flex-1 justify-center gap-2"
                  disabled={isSavingVis}
                  onClick={() => {
                    if (visibility !== 'publico') {
                      toast.info(
                        "Para publicar tu perfil, presiona el botón 'Publicar' que se encuentra abajo en la vista previa.",
                      )
                    }
                  }}
                >
                  <Globe className="h-4 w-4" />
                  {t('visibilityPublic')}
                </Button>
                <Button
                  type="button"
                  variant={visibility === 'empresas' ? 'default' : 'outline'}
                  className="flex-1 justify-center gap-2"
                  onClick={() => handleVisibilityChange('empresas')}
                  disabled={isSavingVis}
                >
                  <Lock className="h-4 w-4" />
                  {t('visibilityCompanies')}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                {visibility === 'publico'
                  ? t('visibilityPublicDesc')
                  : t('visibilityCompaniesDesc')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('bioTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleBioSubmit(handleBioSave)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="portfolio-bio-textarea" className="sr-only">
                    {t('bioTitle')}
                  </Label>
                  <Textarea
                    id="portfolio-bio-textarea"
                    placeholder={t('bioPlaceholder')}
                    {...registerBio('bio')}
                    rows={6}
                  />
                  {bioErrors.bio && (
                    <p className="text-xs text-destructive">
                      {bioErrors.bio.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSavingBio}>
                  {t('saveBio')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('locationLabel')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleLocationSubmit(handleLocationSave)}
                className="space-y-4"
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSavingLocation}
                >
                  Guardar Ubicación
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t('portfolioCvTitle')}
              </CardTitle>
              <CardDescription>{t('portfolioCvDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleCvSubmit(handleCvSave)}
                className="space-y-4"
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
                <Button type="submit" className="w-full" disabled={isSavingCv}>
                  {t('portfolioCvSave')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7">
          <Card className="h-full border border-primary/20 bg-surface shadow-sm overflow-hidden">
            <CardHeader className="relative pb-5 pt-7 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-secondary to-accent" />
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
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
                            className="w-16 h-16 rounded-full object-cover"
                            style={{ opacity: isUploadingPhoto ? 0.5 : 1 }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl">
                            {initialProfile?.firstName?.charAt(0) || 'U'}
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
                          className="w-32 h-32 rounded-full object-cover border shadow-sm"
                          style={{ opacity: isUploadingPhoto ? 0.5 : 1 }}
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
                          Selecciona una nueva imagen para actualizar tu
                          identidad visual en la plataforma.
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

                  <Dialog
                    open={isCropModalOpen}
                    onOpenChange={setIsCropModalOpen}
                  >
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
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold font-display leading-tight">
                      {initialProfile?.firstName} {initialProfile?.lastName1}{' '}
                      {initialProfile?.lastName2}
                    </CardTitle>
                    <p className="text-sm font-semibold text-primary capitalize">
                      {initialProfile?.tituloFwd || t('defaultRole')}
                    </p>
                    {initialProfile?.reputacion !== null &&
                      initialProfile?.reputacion !== undefined &&
                      initialProfile.reputacion > 0 && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= Math.round(initialProfile.reputacion!) ? 'fill-highlight text-highlight' : 'text-muted-foreground/25'}`}
                            />
                          ))}
                          <span className="text-xs font-bold text-foreground">
                            {Number(initialProfile.reputacion).toFixed(1)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
                <Badge
                  variant={visibility === 'publico' ? 'default' : 'secondary'}
                  className="gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shrink-0"
                >
                  {visibility === 'publico' ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {visibility === 'publico'
                    ? t('visibilityPublic')
                    : t('visibilityCompanies')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5 font-sans">
              {/* === Biografía === */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold tracking-widest text-primary/70 uppercase font-display">
                  {t('bioSection')}
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {portfolioBio ? (
                    portfolioBio
                  ) : (
                    <span className="text-muted-foreground italic">
                      {t('noBio')}
                    </span>
                  )}
                </p>
              </div>

              <div className="h-px bg-border/50" />

              {/* === Habilidades === */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold tracking-widest text-primary/70 uppercase font-display">
                  {t('skillsSection')}
                </p>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {t('noSkills')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => {
                      const levelClass =
                        skill.level === 'avanzado'
                          ? 'bg-accent/10 text-accent border-accent/20'
                          : skill.level === 'intermedio'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-muted text-muted-foreground border-border'
                      const levelLabel =
                        skill.level === 'avanzado'
                          ? t('levelAdvanced')
                          : skill.level === 'intermedio'
                            ? t('levelIntermediate')
                            : t('levelBasic')
                      return (
                        <span
                          key={skill.id}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${levelClass}`}
                        >
                          {skill.name}
                          <span className="opacity-60 text-[10px]">
                            · {levelLabel}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* === Ubicación === */}
              {(portfolioCountryName || portfolioRegionName) && (
                <>
                  <div className="h-px bg-border/50" />
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold tracking-widest text-primary/70 uppercase font-display">
                      {t('locationLabel')}
                    </p>
                    <p className="text-sm text-foreground">
                      {[portfolioRegionName, portfolioCountryName]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </>
              )}

              <div className="h-px bg-border/50" />

              {/* === Proyectos === */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold tracking-widest text-primary/70 uppercase font-display">
                  {t('projectsSection')}
                </p>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {t('noProjects')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5"
                      >
                        <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                          <span>{proj.title}</span>
                          {proj.completionDate && (
                            <span className="text-xs text-muted-foreground font-normal">
                              (
                              {new Date(
                                proj.completionDate,
                              ).toLocaleDateString()}
                              )
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                        {proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {proj.technologies.map((tech) => (
                              <span
                                key={tech}
                                className="rounded-full bg-secondary/10 border border-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1 text-xs">
                          {proj.repositoryUrl && (
                            <a
                              href={proj.repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              <GitBranch className="h-3 w-3" /> {t('repo')}
                            </a>
                          )}
                          {proj.demoUrl && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                                  <ExternalLink className="h-3 w-3" />{' '}
                                  {t('demo')}
                                </button>
                              </DialogTrigger>
                              <DialogContent
                                showCloseButton={false}
                                className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0 overflow-hidden bg-background rounded-xl"
                              >
                                <DialogHeader className="p-3 border-b bg-muted/30 flex flex-row items-center">
                                  <div className="flex items-center gap-2 pl-1">
                                    <DialogClose asChild>
                                      <button
                                        className="w-3 h-3 rounded-full bg-magenta hover:bg-magenta/80 focus:outline-none"
                                        aria-label="Cerrar modal"
                                      />
                                    </DialogClose>
                                    <a
                                      href={proj.demoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-3 h-3 rounded-full bg-success hover:bg-success/80 focus:outline-none"
                                      aria-label="Abrir en otra ventana"
                                    />
                                  </div>
                                  <DialogTitle className="flex-1 text-center text-xs font-medium text-muted-foreground pr-10">
                                    {proj.title} Demo
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 w-full bg-muted/10 relative">
                                  <iframe
                                    src={proj.demoUrl}
                                    className="w-full h-full border-0"
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-border/50" />

              <div className="space-y-3">
                <p className="text-[11px] font-bold tracking-widest text-primary/70 uppercase font-display">
                  Publicación
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-sm text-foreground">
                    {visibility === 'publico'
                      ? 'Tu perfil profesional ya está publicado en el apartado de búsqueda de empleo.'
                      : '¿Deseas publicar tu perfil profesional a nuestro apartado de búsqueda de empleo?'}
                  </p>
                  <Button
                    onClick={() =>
                      handleVisibilityChange(
                        'publico',
                        'Tu perfil profesional se ha publicado exitosamente',
                      )
                    }
                    disabled={isSavingVis || visibility === 'publico'}
                    variant={visibility === 'publico' ? 'secondary' : 'default'}
                    className="shrink-0"
                  >
                    {isSavingVis ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : visibility === 'publico' ? (
                      'Publicado'
                    ) : (
                      'Publicar'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6 pt-8 border-t">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {t('managerTitle')}
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('addProject')}
              </Button>
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
                {...(editingProject ? { initialData: editingProject } : {})}
                onSave={handleSave}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">{t('noProjects')}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t('finishedPrefix')}{' '}
                    {new Date(project.completionDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm mt-4">
                    {project.repositoryUrl && (
                      <a
                        href={project.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline"
                      >
                        <GitBranch className="mr-1 h-4 w-4" /> {t('repo')}
                      </a>
                    )}
                    {project.demoUrl && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="flex items-center text-primary hover:underline cursor-pointer">
                            <ExternalLink className="mr-1 h-4 w-4" />{' '}
                            {t('demo')}
                          </button>
                        </DialogTrigger>
                        <DialogContent
                          showCloseButton={false}
                          className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0 overflow-hidden bg-background rounded-xl"
                        >
                          <DialogHeader className="p-3 border-b bg-muted/30 flex flex-row items-center">
                            <div className="flex items-center gap-2 pl-1">
                              <DialogClose asChild>
                                <button
                                  className="w-3 h-3 rounded-full bg-magenta hover:bg-magenta/80 focus:outline-none"
                                  aria-label="Cerrar modal"
                                />
                              </DialogClose>
                              <a
                                href={project.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-3 h-3 rounded-full bg-success hover:bg-success/80 focus:outline-none"
                                aria-label="Abrir en otra ventana"
                              />
                            </div>
                            <DialogTitle className="flex-1 text-center text-xs font-medium text-muted-foreground pr-10">
                              {project.title} Demo
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 w-full bg-muted/10 relative">
                            <iframe
                              src={project.demoUrl}
                              className="w-full h-full border-0"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(project)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
                  </Button>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Calificaciones recibidas */}
      <div className="space-y-6 pt-8 border-t">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {t('ratingsSection')}
          </h2>
          {initialProfile?.reputacion !== null &&
            initialProfile?.reputacion !== undefined &&
            initialProfile.reputacion > 0 && (
              <div className="flex items-center gap-2 bg-highlight/10 border border-highlight/30 rounded-full px-4 py-1.5">
                <Star className="w-4 h-4 fill-highlight text-highlight" />
                <span className="text-sm font-bold text-foreground">
                  {Number(initialProfile.reputacion).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5.0</span>
              </div>
            )}
        </div>

        {calificaciones.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed">
            <p className="text-sm text-muted-foreground">{t('noRatings')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calificaciones.map((cal) => (
              <Card
                key={cal.id_evaluacion}
                className="border border-border/80 bg-card/60"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {cal.tituloProyecto}
                      </p>
                      <p className="text-xs text-primary font-medium">
                        {cal.nombreEmpresa}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= cal.puntuacion ? 'fill-highlight text-highlight' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {cal.comentario && (
                    <p className="text-xs text-muted-foreground leading-relaxed italic border-t border-border/40 pt-2">
                      &quot;{cal.comentario}&quot;
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(cal.evaluado_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {t('skillsTitle')}
          </h2>
          <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNewSkill}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('addSkill')}
              </Button>
            </DialogTrigger>
            <DialogContent id="skill-dialog" className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSkill ? t('editSkill') : t('newSkill')}
                </DialogTitle>
              </DialogHeader>
              <SkillForm
                {...(editingSkill ? { initialData: editingSkill } : {})}
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
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">{t('noSkills')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Card key={skill.id}>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex justify-between items-center">
                    {skill.name}
                    <Badge
                      variant={
                        skill.level === 'avanzado'
                          ? 'default'
                          : skill.level === 'intermedio'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {skill.level === 'avanzado'
                        ? t('levelAdvanced')
                        : skill.level === 'intermedio'
                          ? t('levelIntermediate')
                          : t('levelBasic')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2 py-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSkill(skill)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => handleDeleteSkill(skill.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
