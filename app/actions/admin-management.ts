'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleScope } from '@/app/actions/rbac'

type ActionResult = { success: boolean; error?: string }

function asMoney(value: FormDataEntryValue | null): number {
  const text = String(value ?? '').trim().replace(',', '.')
  return Number(text)
}

async function resolveTargetBarbershopId(inputBarbershopId?: string): Promise<string | null> {
  const scope = await getRoleScope()
  const scopedIds = scope.barbershopIds

  if (scopedIds.length === 0) return null

  // Admin sempre opera na barbearia do proprio escopo.
  if (scope.role !== 'admin') return null
  return scopedIds[0]
}

export async function getAdminManagementData() {
  const scope = await getRoleScope()
  if (scope.role !== 'admin') {
    return { roles: [], barbers: [], services: [], barbershops: [] }
  }

  const scopedIds = scope.barbershopIds
  if (scopedIds.length === 0) {
    return { roles: [], barbers: [], services: [], barbershops: [] }
  }

  const supabase = await createClient()
  const [{ data: roles }, { data: barbers }, { data: services }, { data: shops }] =
    await Promise.all([
      supabase
        .from('user_roles')
        .select('id, user_id, role, barbershop_id, created_at')
        .in('barbershop_id', scopedIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('barbers')
        .select('id, name, barbershop_id, created_at')
        .in('barbershop_id', scopedIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('services')
        .select('id, name, description, price, duration_minutes, barbershop_id, created_at')
        .in('barbershop_id', scopedIds)
        .order('created_at', { ascending: false }),
      supabase.from('barbershops').select('id, name').in('id', scopedIds).order('name', { ascending: true }),
    ])

  return {
    roles: roles || [],
    barbers: barbers || [],
    services: (services || []).map((service: any) => ({
      ...service,
      price: Number(service.price),
      duration_minutes: Number(service.duration_minutes),
    })),
    barbershops: shops || [],
  }
}

function sanitizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
}

export async function createUserByAdmin(formData: FormData): Promise<ActionResult> {
  const scope = await getRoleScope()
  if (scope.role !== 'admin') {
    return { success: false, error: 'Sem permissao para cadastrar usuarios' }
  }

  const fullName = String(formData.get('fullName') || '').trim()
  const usernameInput = String(formData.get('username') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const role = String(formData.get('role') || '').trim() as 'admin' | 'barber'

  if (!fullName) return { success: false, error: 'Nome completo obrigatorio' }
  if (!usernameInput) return { success: false, error: 'Apelido obrigatorio' }
  if (!email) return { success: false, error: 'Email obrigatorio' }
  if (!email.includes('@')) return { success: false, error: 'Email invalido' }
  if (role !== 'admin' && role !== 'barber') {
    return { success: false, error: 'Role invalida' }
  }

  const targetBarbershopId = await resolveTargetBarbershopId()
  if (!targetBarbershopId) {
    return { success: false, error: 'Nao foi possivel determinar a barbearia do cadastro' }
  }

  const username = sanitizeUsername(usernameInput)
  if (!username) return { success: false, error: 'Apelido invalido' }

  const password = '123456'

  const adminSupabase = createAdminClient()
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Erro ao criar usuario no Auth' }
  }

  const userId = authData.user.id
  const { error: profileError } = await adminSupabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    username,
    email,
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(userId)
    return { success: false, error: profileError.message }
  }

  const { error: roleError } = await adminSupabase.from('user_roles').insert({
    user_id: userId,
    role,
    barbershop_id: targetBarbershopId,
  })

  if (roleError) {
    await adminSupabase.auth.admin.deleteUser(userId)
    return { success: false, error: roleError.message }
  }

  if (role === 'barber') {
    const { error: barberError } = await adminSupabase.from('barbers').insert({
      id: userId,
      name: fullName,
      barbershop_id: targetBarbershopId,
    })

    if (barberError) {
      await adminSupabase.auth.admin.deleteUser(userId)
      return { success: false, error: barberError.message }
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function createServiceByAdmin(formData: FormData): Promise<ActionResult> {
  const scope = await getRoleScope()
  if (scope.role !== 'admin') {
    return { success: false, error: 'Sem permissao para cadastrar servico' }
  }

  const name = String(formData.get('name') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const price = asMoney(formData.get('price'))
  const durationMinutes = Number(formData.get('durationMinutes') || 0)

  if (!name) return { success: false, error: 'Nome do servico obrigatorio' }
  if (!Number.isFinite(price) || price < 0) return { success: false, error: 'Preco invalido' }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { success: false, error: 'Duracao invalida' }
  }

  const targetBarbershopId = await resolveTargetBarbershopId()
  if (!targetBarbershopId) {
    return { success: false, error: 'Nao foi possivel determinar a barbearia do cadastro' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('services').insert({
    barbershop_id: targetBarbershopId,
    name,
    description: description || null,
    price,
    duration_minutes: durationMinutes,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
