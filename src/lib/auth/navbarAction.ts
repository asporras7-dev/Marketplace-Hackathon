'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ok, err, type Result } from '@/lib/result'

export async function getNavbarAvatarForcefully(): Promise<
  Result<string | null>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    // Bypass RLS to guarantee we see the photo if it exists
    const admin = createSupabaseAdminClient()
    const { data: userData } = await admin
      .from('usuarios')
      .select('foto_perfil')
      .eq('id_usuario', user.id)
      .maybeSingle()

    let avatarUrl = userData?.foto_perfil ?? null

    if (!avatarUrl) {
      const { data: empData } = await admin
        .from('empresarios')
        .select('logo')
        .eq('id_usuario', user.id)
        .maybeSingle()
      if (empData?.logo) {
        avatarUrl = empData.logo
      }
    }

    return ok(avatarUrl)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateProfilePhotoAction(
  photoUrl: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const admin = createSupabaseAdminClient()
    await admin
      .from('usuarios')
      .update({ foto_perfil: photoUrl })
      .eq('id_usuario', user.id)

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}
