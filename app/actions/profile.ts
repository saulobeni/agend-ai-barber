'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  const fullName = String(formData.get('fullName') || '').trim()
  const phone = String(formData.get('phone') || '').trim()

  if (!fullName) return { success: false, error: 'Nome obrigatorio' }

  const adminSupabase = createAdminClient()

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    user_metadata: { full_name: fullName, phone },
  })
  if (authError) return { success: false, error: authError.message }

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)
  if (profileError) return { success: false, error: profileError.message }

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  revalidatePath('/barber/dashboard')
  return { success: true }
}

export async function getProfileData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, email')
    .eq('id', user.id)
    .single()

  return {
    email: user.email || '',
    fullName: profile?.full_name || user.user_metadata?.full_name || '',
    phone: user.user_metadata?.phone || '',
  }
}
