'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getPostLoginRedirectPath } from '@/app/actions/rbac'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  const redirectPath = await getPostLoginRedirectPath()
  redirect(redirectPath)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        full_name: fullName,
        phone: phone,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user?.id) {
    const adminSupabase = createAdminClient()
    const { error: roleError } = await adminSupabase
      .from('user_roles')
      .insert({ user_id: data.user.id, role: 'user', barbershop_id: null })

    if (roleError) {
      return { error: `Usuario criado, mas falhou ao atribuir role user: ${roleError.message}` }
    }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: 'Usuario nao autenticado' }
  }

  const currentPassword = String(formData.get('currentPassword') || '')
  const newPassword = String(formData.get('newPassword') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')

  if (!currentPassword) {
    return { error: 'Senha atual obrigatoria' }
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Nova senha deve ter pelo menos 6 caracteres' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'A confirmacao da nova senha nao confere' }
  }

  if (currentPassword === newPassword) {
    return { error: 'A nova senha deve ser diferente da senha atual' }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { error: 'Senha atual incorreta' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
