'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Upload, ArrowRight, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/utils/image'
import { completarOnboarding } from '@/lib/auth/actions'
import { CountryRegionFields } from '@/components/features/geo/CountryRegionFields'
import type { ComboboxOption } from '@/components/ui/combobox'
import { ImageCropperDialog } from '@/components/features/ui/ImageCropperDialog'
import { uploadImageToCloudinary } from '@/lib/upload/actions'

interface EmpresarioOnboardingFormProps {
  userId: string
  countries: ComboboxOption[]
}

export function EmpresarioOnboardingForm({
  userId,
  countries,
}: EmpresarioOnboardingFormProps) {
  const tO = useTranslations('Onboarding')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [tempPhotoFile, setTempPhotoFile] = useState<File | null>(null)

  const maxBirthDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().split('T')[0]
  }, [])

  const schema = useMemo(
    () =>
      z.object({
        nombre: z
          .string()
          .min(2, tO('errorNombre'))
          .max(80, tO('errorNombreMax')),
        primer_apellido: z
          .string()
          .min(2, tO('errorPrimerApellido'))
          .max(80, tO('errorPrimerApellidoMax')),
        segundo_apellido: z
          .string()
          .max(80, tO('errorSegundoApellidoMax'))
          .optional(),
        fecha_nacimiento: z
          .string()
          .min(1, tO('errorFechaNacimiento'))
          .regex(/^\d{4}-\d{2}-\d{2}$/, tO('errorFechaFormato'))
          .refine((val) => {
            const birth = new Date(val + 'T00:00:00')
            const now = new Date()
            const age = now.getFullYear() - birth.getFullYear()
            const m = now.getMonth() - birth.getMonth()
            return (
              age > 18 ||
              (age === 18 &&
                (m > 0 || (m === 0 && now.getDate() >= birth.getDate())))
            )
          }, tO('errorMustBe18')),
        nombre_empresa: z
          .string()
          .min(2, tO('errorNombreEmpresa'))
          .max(150, tO('errorNombreEmpresaMax')),
        cedula: z.string().min(1, tO('errorCedula')).max(50, tO('errorCedula')),
        sitio_web: z
          .string()
          .url(tO('errorSitioWeb'))
          .max(200, tO('errorSitioWeb'))
          .or(z.literal(''))
          .optional(),
        tipo_empresario: z.enum(['empresa_formal', 'emprendedor'], {
          message: tO('errorTipoEmpresario'),
        }),
        pais: z.string().min(2, tO('errorPais')),
        ciudad: z.string(),
        alcance_operativo: z.enum(['nacional', 'internacional', 'ambos'], {
          message: tO('errorAlcance'),
        }),
        acepta_terminos: z.boolean().refine((v) => v === true, {
          message: tO('errorTerminos'),
        }),
      }),
    [tO],
  )

  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acepta_terminos: false, pais: '', ciudad: '' },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValidType = ['image/jpeg', 'image/png'].includes(file.type)
    const isValidSize = file.size <= 5 * 1024 * 1024

    if (!isValidType || !isValidSize) {
      toast.error(tO('fotoError'))
      return
    }

    setTempPhotoFile(file)
    setCropperOpen(true)
    e.target.value = '' // Allow selecting the same file again
  }

  const handleCropSubmit = async (croppedFile: File) => {
    setCropperOpen(false)
    setTempPhotoFile(null)
    setFotoPreview(URL.createObjectURL(croppedFile))
    setPhotoUploading(true)

    const formData = new FormData()
    formData.append('file', croppedFile)
    const uploadRes = await uploadImageToCloudinary(formData, 'imagenes')

    if (!uploadRes.ok) {
      toast.error(tO('fotoError'))
      setPhotoUploading(false)
      return
    }

    setFotoUrl(uploadRes.data)
    setPhotoUploading(false)
  }

  const handleCropCancel = () => {
    setCropperOpen(false)
    setTempPhotoFile(null)
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    const result = await completarOnboarding({
      role: 'empresario',
      tipoEmpresario: data.tipo_empresario,
      nombreEmpresa: data.nombre_empresa,
      cedula: data.cedula,
      ...(data.sitio_web ? { sitioWeb: data.sitio_web } : {}),
      nombre: data.nombre,
      primerApellido: data.primer_apellido,
      ...(data.segundo_apellido
        ? { segundoApellido: data.segundo_apellido }
        : {}),
      fechaNacimiento: data.fecha_nacimiento,
      ...(fotoUrl ? { fotoPerfilUrl: fotoUrl } : {}),
      pais: data.pais,
      region: data.ciudad,
      alcanceOperativo: data.alcance_operativo,
      aceptaTerminos: true,
    })
    setLoading(false)

    if (result.ok) {
      toast.success(tO('profileSaved'))
      router.push('/pending-approval')
      return
    }

    toast.error(tO('profileSaveError'))
  }

  const onInvalid = (formErrors: typeof errors) => {
    // Buscar el primer campo con error y mostrar un toast específico.
    const fieldOrder: (keyof typeof formErrors)[] = [
      'nombre',
      'primer_apellido',
      'segundo_apellido',
      'fecha_nacimiento',
      'nombre_empresa',
      'cedula',
      'sitio_web',
      'tipo_empresario',
      'pais',
      'ciudad',
      'alcance_operativo',
      'acepta_terminos',
    ]
    for (const field of fieldOrder) {
      const msg = formErrors[field]?.message
      if (msg) {
        toast.error(msg)
        return
      }
    }
    toast.error(tO('errorSubmitFields'))
  }

  const inputClass =
    'pl-0 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all'
  const inputErrorClass =
    'pl-0 h-12 rounded-xl bg-surface-sunken/50 border-destructive focus-visible:ring-1 focus-visible:ring-destructive focus-visible:border-destructive transition-all'
  const selectClass =
    'w-full h-12 rounded-xl border border-border bg-surface-sunken/50 px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer'
  const selectErrorClass =
    'w-full h-12 rounded-xl border border-destructive bg-surface-sunken/50 px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-destructive focus:border-destructive transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer'
  const labelClass = 'text-xs font-bold text-ink uppercase tracking-wider'
  const errorClass = 'text-xs font-semibold text-destructive mt-1'
  const sectionHeadingClass =
    'text-[10px] font-bold uppercase tracking-widest text-ink-subtle border-b border-border pb-2 mb-4'

  return (
    <>
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageFile={tempPhotoFile}
        onCropSubmit={handleCropSubmit}
        onCancel={handleCropCancel}
      />
      <AuthCard wide>
        <div className="space-y-6">
          <AuthHeader
            welcomeText={tO('sectionPersonal')}
            title={tO('empresarioTitle')}
            subtitle={tO('empresarioSubtitle')}
          />

          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-8"
            noValidate
          >
            {/* ── Datos personales ── */}
            <section className="space-y-4">
              <p className={sectionHeadingClass}>{tO('sectionPersonal')}</p>

              {/* Foto de perfil — opcional */}
              <div className="space-y-1.5">
                <Label className={labelClass}>
                  {tO('labelFotoPerfil')}
                  <span className="ml-1 text-ink-subtle font-normal normal-case tracking-normal">
                    (opcional)
                  </span>
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-surface-sunken border border-border flex items-center justify-center overflow-hidden shrink-0">
                    {fotoPreview ? (
                      // Preview local (blob de URL.createObjectURL): next/image no
                      // optimiza object URLs; `<img>` es lo correcto para previsualizar.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fotoPreview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-ink-subtle" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      className="rounded-xl h-9 text-xs font-bold border-border hover:bg-surface-sunken"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {photoUploading ? tO('fotoUploading') : tO('fotoUpload')}
                    </Button>
                    <p className="text-[11px] text-ink-subtle">
                      {tO('fotoHint')}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>{tO('labelNombre')}</Label>
                  <Input
                    {...register('nombre')}
                    type="text"
                    autoComplete="given-name"
                    placeholder={tO('labelNombre')}
                    className={errors.nombre ? inputErrorClass : inputClass}
                  />
                  {errors.nombre && (
                    <p className={errorClass}>{errors.nombre.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>
                    {tO('labelPrimerApellido')}
                  </Label>
                  <Input
                    {...register('primer_apellido')}
                    type="text"
                    autoComplete="family-name"
                    placeholder={tO('labelPrimerApellido')}
                    className={
                      errors.primer_apellido ? inputErrorClass : inputClass
                    }
                  />
                  {errors.primer_apellido && (
                    <p className={errorClass}>
                      {errors.primer_apellido.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>
                    {tO('labelSegundoApellido')}
                    <span className="ml-1 text-ink-subtle font-normal normal-case tracking-normal">
                      (opcional)
                    </span>
                  </Label>
                  <Input
                    {...register('segundo_apellido')}
                    type="text"
                    placeholder={tO('labelSegundoApellido')}
                    className={
                      errors.segundo_apellido ? inputErrorClass : inputClass
                    }
                  />
                  {errors.segundo_apellido && (
                    <p className={errorClass}>
                      {errors.segundo_apellido.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>
                    {tO('labelFechaNacimiento')}
                  </Label>
                  <Input
                    {...register('fecha_nacimiento')}
                    type="date"
                    max={maxBirthDate}
                    className={
                      errors.fecha_nacimiento ? inputErrorClass : inputClass
                    }
                  />
                  {errors.fecha_nacimiento && (
                    <p className={errorClass}>
                      {errors.fecha_nacimiento.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Datos de la empresa ── */}
            <section className="space-y-4">
              <p className={sectionHeadingClass}>{tO('sectionEmpresa')}</p>

              <div className="space-y-1.5">
                <Label className={labelClass}>{tO('labelNombreEmpresa')}</Label>
                <Input
                  {...register('nombre_empresa')}
                  type="text"
                  placeholder={tO('labelNombreEmpresa')}
                  className={
                    errors.nombre_empresa ? inputErrorClass : inputClass
                  }
                />
                {errors.nombre_empresa && (
                  <p className={errorClass}>{errors.nombre_empresa.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>{tO('labelCedula')}</Label>
                <Input
                  {...register('cedula')}
                  type="text"
                  placeholder={tO('labelCedula')}
                  className={errors.cedula ? inputErrorClass : inputClass}
                />
                {errors.cedula && (
                  <p className={errorClass}>{errors.cedula.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>{tO('labelSitioWeb')}</Label>
                <Input
                  {...register('sitio_web')}
                  type="url"
                  placeholder="https://"
                  className={errors.sitio_web ? inputErrorClass : inputClass}
                />
                {errors.sitio_web && (
                  <p className={errorClass}>{errors.sitio_web.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>
                  {tO('labelTipoEmpresario')}
                </Label>
                <select
                  {...register('tipo_empresario')}
                  className={
                    errors.tipo_empresario ? selectErrorClass : selectClass
                  }
                >
                  <option value="">{tO('tipoSelectPlaceholder')}</option>
                  <option value="emprendedor">{tO('tipoEmprendedor')}</option>
                  <option value="empresa_formal">
                    {tO('tipoEmpresaFormal')}
                  </option>
                </select>
                {errors.tipo_empresario && (
                  <p className={errorClass}>{errors.tipo_empresario.message}</p>
                )}
              </div>

              <CountryRegionFields
                countries={countries}
                initialRegions={[]}
                countryValue={watch('pais') ?? ''}
                regionValue={watch('ciudad') ?? ''}
                onCountryChange={(code) =>
                  setValue('pais', code, { shouldValidate: true })
                }
                onRegionChange={(code) =>
                  setValue('ciudad', code, { shouldValidate: true })
                }
                countryLabel={tO('labelPais')}
                countryId="pais"
                regionId="ciudad"
                countryInvalid={Boolean(errors.pais)}
              />
              {errors.pais && (
                <p className={errorClass}>{errors.pais.message}</p>
              )}

              <div className="space-y-1.5">
                <Label className={labelClass}>{tO('labelAlcance')}</Label>
                <select
                  {...register('alcance_operativo')}
                  className={
                    errors.alcance_operativo ? selectErrorClass : selectClass
                  }
                >
                  <option value="">{tO('tipoSelectPlaceholder')}</option>
                  <option value="nacional">{tO('alcanceNacional')}</option>
                  <option value="internacional">
                    {tO('alcanceInternacional')}
                  </option>
                  <option value="ambos">{tO('alcanceAmbos')}</option>
                </select>
                {errors.alcance_operativo && (
                  <p className={errorClass}>
                    {errors.alcance_operativo.message}
                  </p>
                )}
              </div>
            </section>

            {/* ── Términos y condiciones ── */}
            <div className="space-y-1.5">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  errors.acepta_terminos
                    ? 'border-destructive bg-destructive/5'
                    : 'border-border/80 bg-surface-sunken/40'
                }`}
              >
                <input
                  type="checkbox"
                  {...register('acepta_terminos')}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-ink-muted leading-relaxed">
                  {tO('terminosLabel')}
                </span>
              </label>
              {errors.acepta_terminos && (
                <p className={errorClass}>{errors.acepta_terminos.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || photoUploading}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] cursor-pointer"
              >
                {loading ? tO('saving') : tO('saveProfile')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const { signOut } = await import('@/lib/auth/actions')
                    await signOut()
                    router.push('/login')
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-ink-subtle hover:text-primary transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {tO('logout')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </AuthCard>
    </>
  )
}
