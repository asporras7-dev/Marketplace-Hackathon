'use client'

import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/routing'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Save,
  Upload,
  ImageIcon,
  Loader2,
  User,
  Building2,
  ShieldCheck,
  Lock,
  Globe,
} from 'lucide-react'
import {
  createCompanyProfileSchema,
  MINIMUM_EMPRESARIO_AGE,
  type CompanyProfileInput,
  type CompanyProfileView,
  type VerificationStatus,
} from '@/lib/company/schemas'
import { maxBirthDateForMinAge } from '@/lib/utils/age'
import { saveCompanyProfile } from '@/lib/company/actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import imageCompression from 'browser-image-compression'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'
import { CountryRegionFields } from '@/components/features/geo/CountryRegionFields'
import type { ComboboxOption } from '@/components/ui/combobox'

interface CompanyProfileFormProps {
  initialProfile: CompanyProfileView
  userId: string
  countries: ComboboxOption[]
  initialRegions: ComboboxOption[]
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const VERIF_KEY: Record<VerificationStatus, string> = {
  pendiente: 'verifPendiente',
  verificado: 'verifVerificado',
  rechazado: 'verifRechazado',
}

export function CompanyProfileForm({
  initialProfile,
  userId,
  countries,
  initialRegions,
}: CompanyProfileFormProps) {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const tValidation = useTranslations('Validation')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialProfile.profilePhoto || null,
  )
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialProfile.logo || null,
  )
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const profileSchema = useMemo(
    () => createCompanyProfileSchema(tValidation),
    [tValidation],
  )
  // Tope del selector: la fecha de quien cumple la mayoría de edad justo hoy.
  const maxBirthDate = useMemo(
    () => maxBirthDateForMinAge(MINIMUM_EMPRESARIO_AGE, new Date()),
    [],
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialProfile.firstName,
      lastName1: initialProfile.lastName1,
      lastName2: initialProfile.lastName2 ?? '',
      birthDate: initialProfile.birthDate ?? '',
      profilePhoto: initialProfile.profilePhoto,
      name: initialProfile.name,
      companyType: initialProfile.companyType,
      sector: initialProfile.sector,
      cedula: initialProfile.cedula ?? '',
      description: initialProfile.description,
      contactEmail: initialProfile.contactEmail,
      website: initialProfile.website,
      logo: initialProfile.logo,
      country: initialProfile.country ?? '',
      city: initialProfile.city ?? '',
      ...(initialProfile.operatingScope
        ? { operatingScope: initialProfile.operatingScope }
        : {}),
    },
  })

  const watchedType = watch('companyType')

  const validateImage = (file: File): boolean => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(tEmpresa('fileTooLarge'))
      return false
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(tEmpresa('fileFormatInvalid'))
      return false
    }
    return true
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateImage(file)) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateImage(file)) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const uploadImage = async (
    bucket: string,
    file: File,
    userId: string,
  ): Promise<string> => {
    // Comprimir la imagen antes de subirla
    const options = {
      maxSizeMB: 0.5, // 500KB máximo
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    }
    const compressedFile = await imageCompression(file, options)

    const ext = compressedFile.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${bucket}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, compressedFile, { upsert: true })
    if (error) {
      throw new Error(error.message)
    }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const onSubmit = async (values: CompanyProfileInput) => {
    setLoading(true)
    try {
      // La foto va al bucket fotos-perfil (no exige fila empresario).
      let photoUrl = values.profilePhoto
      if (photoFile) {
        setUploadingPhoto(true)
        photoUrl = await uploadImage('fotos-perfil', photoFile, userId)
        setUploadingPhoto(false)
      }

      // Guardar primero crea/actualiza la fila empresario → habilita la RLS de
      // logos (que exige que el empresario ya exista).
      const baseProfile: CompanyProfileInput = {
        ...values,
        profilePhoto: photoUrl,
      }
      const firstSave = await saveCompanyProfile(baseProfile)
      if (!firstSave.ok) {
        throw new Error(firstSave.error)
      }

      let logoUrl = values.logo
      if (logoFile) {
        setUploadingLogo(true)
        logoUrl = await uploadImage('logos', logoFile, userId)
        setUploadingLogo(false)
        const logoSave = await saveCompanyProfile({
          ...baseProfile,
          logo: logoUrl,
        })
        if (!logoSave.ok) {
          throw new Error(logoSave.error)
        }
      }

      toast.success(tEmpresa('profileSaved'))
      router.push('/empresario/perfil')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setLoading(false)
      setUploadingPhoto(false)
      setUploadingLogo(false)
    }
  }

  const verif = initialProfile.verificationStatus

  return (
    <Card className="border border-border/85 bg-white rounded-3xl shadow-xl mt-6 overflow-hidden">
      {/* Estado de verificación (solo lectura) */}
      <div className="bg-[#f8fafd] px-6 py-5 border-b border-border/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center text-warning">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              {tEmpresa('verificationLabel')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tEmpresa('verificationHint')}
            </p>
          </div>
        </div>
        {verif ? (
          <span
            className={cn(
              'text-xs font-extrabold px-5 py-2 rounded-full text-white bg-warning shadow-sm',
            )}
          >
            {verif === 'verificado'
              ? tEmpresa('selloConfianza')
              : tEmpresa(VERIF_KEY[verif])}
          </span>
        ) : (
          <span className="text-xs font-bold px-4 py-1.5 rounded-full border border-border bg-muted text-muted-foreground">
            {tEmpresa('verifNone')}
          </span>
        )}
      </div>

      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Sección: datos personales */}
          <section className="space-y-6">
            <SectionHeading
              icon={<User className="w-5 h-5" />}
              title={tEmpresa('sectionPersonalTitle')}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field
                id="firstName"
                label={tEmpresa('fieldFirstName')}
                error={errors.firstName?.message}
              >
                <Input
                  id="firstName"
                  type="text"
                  placeholder={tEmpresa('fieldFirstNamePlaceholder')}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('firstName')}
                />
              </Field>
              <Field
                id="lastName1"
                label={tEmpresa('fieldLastName1')}
                error={errors.lastName1?.message}
              >
                <Input
                  id="lastName1"
                  type="text"
                  placeholder={tEmpresa('fieldLastName1Placeholder')}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('lastName1')}
                />
              </Field>
              <Field
                id="lastName2"
                label={tEmpresa('fieldLastName2')}
                optional={tEmpresa('optionalTag')}
                error={errors.lastName2?.message}
              >
                <Input
                  id="lastName2"
                  type="text"
                  placeholder={tEmpresa('fieldLastName2Placeholder')}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('lastName2')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                id="birthDate"
                label={tEmpresa('fieldBirthDate')}
                error={errors.birthDate?.message}
              >
                <Input
                  id="birthDate"
                  type="date"
                  max={maxBirthDate}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('birthDate')}
                />
              </Field>
              <ReadonlyField
                label={tEmpresa('emailReadonly')}
                value={initialProfile.contactEmail}
                hint={tEmpresa('emailReadonlyHint')}
              />
            </div>

            <ImageUploadField
              label={tEmpresa('fieldPhoto')}
              title={tEmpresa('uploadPhotoTitle')}
              preview={photoPreview}
              uploading={uploadingPhoto}
              disabled={loading}
              variant="avatar"
              onSelect={handlePhotoChange}
            />
          </section>

          {/* Sección: datos de la empresa */}
          <section className="space-y-6 pt-6 border-t border-border/40">
            <SectionHeading
              icon={<Building2 className="w-5 h-5" />}
              title={tEmpresa('sectionCompanyTitle')}
            />

            <Field
              id="name"
              label={tEmpresa('fieldName')}
              error={errors.name?.message}
            >
              <Input
                id="name"
                type="text"
                placeholder={tEmpresa('fieldNamePlaceholder')}
                className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                {...register('name')}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                id="companyType"
                label={tEmpresa('fieldType')}
                error={errors.companyType?.message}
              >
                <Controller
                  name="companyType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus:ring-primary text-foreground font-medium transition-all">
                        <SelectValue
                          placeholder={tEmpresa('selectTypePlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">
                          {tEmpresa('typeFormal')}
                        </SelectItem>
                        <SelectItem value="emprendedor">
                          {tEmpresa('typeEmprendedor')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field
                id="sector"
                label={tEmpresa('fieldSector')}
                error={errors.sector?.message}
              >
                <Input
                  id="sector"
                  type="text"
                  placeholder={tEmpresa('fieldSectorPlaceholder')}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('sector')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                id="cedula"
                label={
                  watchedType === 'emprendedor'
                    ? tEmpresa('fieldCedulaIdentidad')
                    : tEmpresa('fieldCedulaJuridica')
                }
                error={errors.cedula?.message}
              >
                <Input
                  id="cedula"
                  type="text"
                  placeholder={tEmpresa('fieldCedulaPlaceholder')}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('cedula')}
                />
              </Field>

              <Field
                id="operatingScope"
                label={tEmpresa('fieldScope')}
                error={errors.operatingScope?.message}
              >
                <Controller
                  name="operatingScope"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus:ring-primary text-foreground font-medium transition-all">
                        <SelectValue
                          placeholder={tEmpresa('selectScopePlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">
                          {tEmpresa('scopeNacional')}
                        </SelectItem>
                        <SelectItem value="internacional">
                          {tEmpresa('scopeInternacional')}
                        </SelectItem>
                        <SelectItem value="ambos">
                          {tEmpresa('scopeAmbos')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <CountryRegionFields
              countries={countries}
              initialRegions={initialRegions}
              countryValue={watch('country') ?? ''}
              regionValue={watch('city') ?? ''}
              onCountryChange={(code) =>
                setValue('country', code, { shouldValidate: true })
              }
              onRegionChange={(code) =>
                setValue('city', code, { shouldValidate: true })
              }
              countryLabel={tEmpresa('fieldCountry')}
              countryId="country"
              regionId="city"
              countryInvalid={Boolean(errors.country)}
              comboboxClassName="bg-[#f1f3fd] border-transparent rounded-2xl h-11 focus:ring-primary text-foreground font-medium transition-all"
            />

            <Field
              id="website"
              label={tEmpresa('fieldWebsite')}
              optional={tEmpresa('optionalTag')}
              error={errors.website?.message}
            >
              <div className="relative">
                <Input
                  id="website"
                  type="url"
                  placeholder={tEmpresa('fieldWebsitePlaceholder')}
                  className="bg-[#f1f3fd] border-transparent rounded-2xl h-11 pl-10 focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                  {...register('website')}
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
            </Field>

            <Field
              id="description"
              label={tEmpresa('fieldDescription')}
              optional={tEmpresa('optionalTag')}
              hint={tCommon('minCharsLabel', { n: 20 })}
              error={errors.description?.message}
            >
              <Textarea
                id="description"
                rows={4}
                placeholder={tEmpresa('fieldDescriptionPlaceholder')}
                className="bg-[#f1f3fd] border-transparent rounded-2xl focus-visible:ring-primary focus-visible:bg-white text-foreground font-medium transition-all"
                {...register('description')}
              />
            </Field>

            <input type="hidden" {...register('logo')} />
            <ImageUploadField
              label={tEmpresa('fieldLogoUpload')}
              title={tEmpresa('uploadLogoTitle')}
              preview={logoPreview}
              uploading={uploadingLogo}
              disabled={loading}
              variant="logo"
              onSelect={handleLogoChange}
            />
            {errors.logo?.message && (
              <p className="text-xs font-semibold text-destructive">
                {errors.logo.message}
              </p>
            )}
          </section>

          {/* El correo viaja oculto (no editable); la BD lo congela igual. */}
          <input type="hidden" {...register('contactEmail')} />
          <input type="hidden" {...register('profilePhoto')} />

          <div className="flex items-center justify-between pt-6 border-t border-border/40">
            <Link
              href="/empresario"
              className="text-muted-foreground hover:text-foreground font-extrabold text-xs tracking-wider uppercase px-4 py-2 transition-colors"
            >
              {tEmpresa('discardChanges')}
            </Link>

            <Button
              type="submit"
              disabled={loading}
              className="bg-magenta hover:bg-magenta/95 text-white font-extrabold text-xs tracking-wider uppercase px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white">
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </span>
              {loading ? tCommon('loading') : tEmpresa('saveProfile')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white shadow-sm">
        {icon}
      </span>
      <h3 className="text-lg font-extrabold text-foreground tracking-tight">
        {title}
      </h3>
    </div>
  )
}

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  optional?: string | undefined
  hint?: string | undefined
  error?: string | undefined
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-extrabold tracking-wider uppercase text-foreground/80 flex justify-between items-center gap-2"
      >
        <span>
          {label}
          {optional && (
            <span className="ml-1 text-xs font-normal text-muted-foreground/60 lowercase">
              ({optional})
            </span>
          )}
        </span>
        {hint && (
          <span className="text-[10px] font-normal text-muted-foreground/50 lowercase">
            {hint}
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      )}
    </div>
  )
}

function ReadonlyField({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-extrabold tracking-wider uppercase text-foreground/80 block">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          value={value}
          readOnly
          disabled
          className="bg-[#f1f3fd] border-transparent text-foreground/60 rounded-2xl h-11 pr-10 cursor-not-allowed select-none"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
          <Lock className="w-4 h-4" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function ImageUploadField({
  label,
  title,
  preview,
  uploading,
  disabled,
  variant,
  onSelect,
}: {
  label: string
  title: string
  preview: string | null
  uploading: boolean
  disabled: boolean
  variant: 'avatar' | 'logo'
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const tEmpresa = useTranslations('Empresa')

  return (
    <div className="space-y-2">
      <Label className="text-xs font-extrabold tracking-wider uppercase text-foreground/80 block text-left">
        {label}
      </Label>

      {variant === 'avatar' ? (
        <div className="flex flex-col sm:flex-row gap-5 items-center p-5 bg-[#f1f4fe]/45 border border-dashed border-magenta/20 rounded-3xl transition-colors duration-200">
          <div className="w-20 h-20 bg-white flex items-center justify-center shrink-0 border border-magenta/15 rounded-full overflow-hidden relative shadow-sm">
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </>
            ) : (
              <div className="w-full h-full bg-[#f1f3fd] flex items-center justify-center text-magenta">
                <User className="w-9 h-9" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-magenta" />
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <p className="text-sm font-extrabold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {tEmpresa('uploadFormats')}
            </p>
            <label className="inline-block mt-1">
              <span className="cursor-pointer inline-flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-[#eff3fd] border border-magenta text-magenta hover:border-magenta/80 text-xs font-extrabold rounded-full shadow-sm transition-all duration-200">
                <Upload className="w-3.5 h-3.5" />
                {tEmpresa('selectFile')}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={disabled}
                onChange={onSelect}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-secondary/30 rounded-3xl bg-white p-8 text-center hover:border-secondary/60 transition-colors duration-200">
          {preview ? (
            <div className="w-24 h-24 mx-auto mb-4 bg-muted flex items-center justify-center border border-border rounded-2xl overflow-hidden relative shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-14 h-14 bg-[#f1f4fe] flex items-center justify-center rounded-2xl mx-auto mb-3 text-secondary shadow-sm">
              <ImageIcon className="w-7 h-7 text-secondary" />
            </div>
          )}
          <p className="text-sm font-extrabold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {tEmpresa('uploadFormats')}
          </p>
          <label className="inline-block">
            <span className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/95 text-white text-xs font-extrabold tracking-wider uppercase rounded-full shadow-md transition-all duration-200">
              <Upload className="w-4 h-4" />
              {tEmpresa('selectFile')}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={disabled}
              onChange={onSelect}
            />
          </label>
        </div>
      )}
    </div>
  )
}
