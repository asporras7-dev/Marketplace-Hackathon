'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import { serverEnv } from '@/lib/env.server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

cloudinary.config({
  cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME ?? '',
  api_key: serverEnv.CLOUDINARY_API_KEY ?? '',
  api_secret: serverEnv.CLOUDINARY_API_SECRET ?? '',
})

export async function uploadImageToCloudinary(
  formData: FormData,
  folder: string = 'imagenes',
): Promise<Result<string>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const file = formData.get('file') as File
    if (!file) {
      return err('No file provided')
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader.upload(
          base64Image,
          {
            folder,
            public_id: `user_${user.id}_${Date.now()}`,
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error)
            else if (result) resolve(result)
            else reject(new Error('Upload result is undefined'))
          },
        )
      },
    )

    return ok(uploadResult.secure_url)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unexpected_error'
    logger.error('uploadImageToCloudinary: unexpected error', {
      error: errorMsg,
    })
    return err(errorMsg)
  }
}
