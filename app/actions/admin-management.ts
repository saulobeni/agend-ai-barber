'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleScope } from '@/app/actions/rbac'

type ActionResult = { success: boolean; error?: string }
type EditableRole = 'admin' | 'barber'

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
  if (scope.role !== 'admin' && scope.role !== 'super_admin') {
    return { roles: [], barbers: [], services: [], barbershops: [] }
  }

  const scopedIds = scope.barbershopIds
  if (scopedIds.length === 0) {
    return { roles: [], barbers: [], services: [], barbershops: [] }
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
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
      supabase
        .from('barbershops')
        .select('id, owner_id, name, address, opening_time, closing_time, created_at')
        .in('id', scopedIds)
        .order('name', { ascending: true }),
    ])

  const userIds = Array.from(new Set((roles || []).map((item: any) => item.user_id).filter(Boolean)))
  const { data: profiles } =
    userIds.length > 0
      ? await adminSupabase.from('profiles').select('id, full_name, username, email').in('id', userIds)
      : { data: [] as any[] }

  const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]))
  const users = (roles || []).map((roleItem: any) => {
    const profile = profileById.get(roleItem.user_id)
    return {
      id: roleItem.user_id,
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      email: profile?.email || '',
      role: roleItem.role || 'user',
      barbershop_id: roleItem.barbershop_id || null,
    }
  })

  return {
    roles: roles || [],
    barbers: barbers || [],
    services: (services || []).map((service: any) => ({
      ...service,
      price: Number(service.price),
      duration_minutes: Number(service.duration_minutes),
    })),
    barbershops: shops || [],
    users,
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
  if (scope.role !== 'admin' && scope.role !== 'super_admin') {
    return { success: false, error: 'Sem permissao para cadastrar usuarios' }
  }

  const fullName = String(formData.get('fullName') || '').trim()
  const usernameInput = String(formData.get('username') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const role = String(formData.get('role') || '').trim() as 'admin' | 'barber'
  const barbershopIdForm = String(formData.get('barbershopId') || '').trim()

  if (!fullName) return { success: false, error: 'Nome completo obrigatorio' }
  if (!usernameInput) return { success: false, error: 'Apelido obrigatorio' }
  if (!email) return { success: false, error: 'Email obrigatorio' }
  if (!email.includes('@')) return { success: false, error: 'Email invalido' }
  if (role !== 'admin' && role !== 'barber') {
    return { success: false, error: 'Role invalida' }
  }

  let targetBarbershopId: string | null = null
  if (scope.role === 'super_admin') {
    if (!barbershopIdForm) return { success: false, error: 'Barbearia obrigatoria para super admin' }
    targetBarbershopId = barbershopIdForm
  } else {
    targetBarbershopId = await resolveTargetBarbershopId()
  }

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
  if (scope.role !== 'admin' && scope.role !== 'super_admin') {
    return { success: false, error: 'Sem permissao para cadastrar servico' }
  }

  const name = String(formData.get('name') || '').trim()
  const price = asMoney(formData.get('price'))
  const durationMinutes = Number(formData.get('durationMinutes') || 0)
  const barbershopIdForm = String(formData.get('barbershopId') || '').trim()

  if (!name) return { success: false, error: 'Nome do servico obrigatorio' }
  if (!Number.isFinite(price) || price < 0) return { success: false, error: 'Preco invalido' }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { success: false, error: 'Duracao invalida' }
  }

  const targetBarbershopId =
    scope.role === 'super_admin'
      ? barbershopIdForm
      : await resolveTargetBarbershopId()
  if (!targetBarbershopId) {
    return { success: false, error: 'Nao foi possivel determinar a barbearia do cadastro' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('services').insert({
    barbershop_id: targetBarbershopId,
    name,
    description: null,
    price,
    duration_minutes: durationMinutes,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

function canAccessBarbershop(scopedIds: string[], barbershopId: string | null | undefined) {
  if (!barbershopId) return false
  return scopedIds.includes(barbershopId)
}

async function requireAdminScope() {
  const scope = await getRoleScope()
  if (scope.role !== 'admin' && scope.role !== 'super_admin') {
    return { scope: null, error: { success: false, error: 'Sem permissao administrativa' } as ActionResult }
  }
  return { scope, error: null }
}

export async function updateServiceByAdmin(formData: FormData): Promise<ActionResult> {
  const data = await requireAdminScope()
  if (!data.scope) return data.error as ActionResult

  const serviceId = String(formData.get('serviceId') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const price = asMoney(formData.get('price'))
  const durationMinutes = Number(formData.get('durationMinutes') || 0)

  if (!serviceId) return { success: false, error: 'Servico invalido' }
  if (!name) return { success: false, error: 'Nome do servico obrigatorio' }
  if (!Number.isFinite(price) || price < 0) return { success: false, error: 'Preco invalido' }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { success: false, error: 'Duracao invalida' }
  }

  const supabase = await createClient()
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, barbershop_id')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) return { success: false, error: 'Servico nao encontrado' }
  if (!canAccessBarbershop(data.scope.barbershopIds, service.barbershop_id)) {
    return { success: false, error: 'Servico fora do seu escopo' }
  }

  const { error } = await supabase
    .from('services')
    .update({ name, price, duration_minutes: durationMinutes, description: null })
    .eq('id', serviceId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteServiceByAdmin(formData: FormData): Promise<ActionResult> {
  const data = await requireAdminScope()
  if (!data.scope) return data.error as ActionResult

  const serviceId = String(formData.get('serviceId') || '').trim()
  if (!serviceId) return { success: false, error: 'Servico invalido' }

  const supabase = await createClient()
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, barbershop_id')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) return { success: false, error: 'Servico nao encontrado' }
  if (!canAccessBarbershop(data.scope.barbershopIds, service.barbershop_id)) {
    return { success: false, error: 'Servico fora do seu escopo' }
  }

  const { error } = await supabase.from('services').delete().eq('id', serviceId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBarberByAdmin(formData: FormData): Promise<ActionResult> {
  const data = await requireAdminScope()
  if (!data.scope) return data.error as ActionResult

  const barberId = String(formData.get('barberId') || '').trim()
  const name = String(formData.get('name') || '').trim()
  if (!barberId) return { success: false, error: 'Barbeiro invalido' }
  if (!name) return { success: false, error: 'Nome obrigatorio' }

  const supabase = await createClient()
  const { data: barber, error: barberError } = await supabase
    .from('barbers')
    .select('id, barbershop_id')
    .eq('id', barberId)
    .single()

  if (barberError || !barber) return { success: false, error: 'Barbeiro nao encontrado' }
  if (!canAccessBarbershop(data.scope.barbershopIds, barber.barbershop_id)) {
    return { success: false, error: 'Barbeiro fora do seu escopo' }
  }

  const adminSupabase = createAdminClient()
  const { error: updateBarberError } = await adminSupabase.from('barbers').update({ name }).eq('id', barberId)
  if (updateBarberError) return { success: false, error: updateBarberError.message }

  const { error: updateProfileError } = await adminSupabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', barberId)
  if (updateProfileError) return { success: false, error: updateProfileError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteBarberByAdmin(formData: FormData): Promise<ActionResult> {
  const data = await requireAdminScope()
  if (!data.scope) return data.error as ActionResult

  const barberId = String(formData.get('barberId') || '').trim()
  if (!barberId) return { success: false, error: 'Barbeiro invalido' }

  const supabase = await createClient()
  const { data: barber, error: barberError } = await supabase
    .from('barbers')
    .select('id, barbershop_id')
    .eq('id', barberId)
    .single()

  if (barberError || !barber) return { success: false, error: 'Barbeiro nao encontrado' }
  if (!canAccessBarbershop(data.scope.barbershopIds, barber.barbershop_id)) {
    return { success: false, error: 'Barbeiro fora do seu escopo' }
  }

  const { error } = await supabase.from('barbers').delete().eq('id', barberId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateUserByAdmin(formData: FormData): Promise<ActionResult> {
  const data = await requireAdminScope()
  if (!data.scope) return data.error as ActionResult

  const userId = String(formData.get('userId') || '').trim()
  const fullName = String(formData.get('fullName') || '').trim()
  const username = sanitizeUsername(String(formData.get('username') || '').trim())
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const role = String(formData.get('role') || '').trim() as EditableRole

  if (!userId) return { success: false, error: 'Usuario invalido' }
  if (!fullName) return { success: false, error: 'Nome obrigatorio' }
  if (!username) return { success: false, error: 'Apelido invalido' }
  if (!email || !email.includes('@')) return { success: false, error: 'Email invalido' }
  if (role !== 'admin' && role !== 'barber') return { success: false, error: 'Role invalida' }

  const supabase = await createClient()
  const { data: roleRow, error: roleRowError } = await supabase
    .from('user_roles')
    .select('id, barbershop_id')
    .eq('user_id', userId)
    .in('role', ['admin', 'barber'])
    .maybeSingle()

  if (roleRowError || !roleRow) return { success: false, error: 'Usuario nao encontrado no escopo' }
  if (!canAccessBarbershop(data.scope.barbershopIds, roleRow.barbershop_id)) {
    return { success: false, error: 'Usuario fora do seu escopo' }
  }

  const adminSupabase = createAdminClient()
  const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(userId, {
    email,
    user_metadata: { full_name: fullName, username },
  })
  if (authUpdateError) return { success: false, error: authUpdateError.message }

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({ full_name: fullName, username, email })
    .eq('id', userId)
  if (profileError) return { success: false, error: profileError.message }

  const { error: updateRoleError } = await adminSupabase.from('user_roles').update({ role }).eq('id', roleRow.id)
  if (updateRoleError) return { success: false, error: updateRoleError.message }

  if (role === 'barber') {
    const { error: ensureBarberError } = await adminSupabase
      .from('barbers')
      .upsert({ id: userId, name: fullName, barbershop_id: roleRow.barbershop_id })
    if (ensureBarberError) return { success: false, error: ensureBarberError.message }
  } else {
    const { error: removeBarberError } = await adminSupabase.from('barbers').delete().eq('id', userId)
    if (removeBarberError) return { success: false, error: removeBarberError.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteUserByAdmin(formData: FormData): Promise<ActionResult> {
  const data = await requireAdminScope()
  if (!data.scope) return data.error as ActionResult

  const userId = String(formData.get('userId') || '').trim()
  if (!userId) return { success: false, error: 'Usuario invalido' }
  if (data.scope.userId === userId) return { success: false, error: 'Nao pode excluir seu proprio usuario' }

  const supabase = await createClient()
  const { data: roleRow, error: roleRowError } = await supabase
    .from('user_roles')
    .select('id, barbershop_id')
    .eq('user_id', userId)
    .in('role', ['admin', 'barber'])
    .maybeSingle()

  if (roleRowError || !roleRow) return { success: false, error: 'Usuario nao encontrado no escopo' }
  if (!canAccessBarbershop(data.scope.barbershopIds, roleRow.barbershop_id)) {
    return { success: false, error: 'Usuario fora do seu escopo' }
  }

  const adminSupabase = createAdminClient()
  await adminSupabase.from('barbers').delete().eq('id', userId)
  await adminSupabase.from('user_roles').delete().eq('user_id', userId)
  await adminSupabase.from('profiles').delete().eq('id', userId)
  const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId)
  if (deleteAuthError) return { success: false, error: deleteAuthError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function createBarbershopBySuperAdmin(formData: FormData): Promise<ActionResult> {
  const scope = await getRoleScope()
  if (scope.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admin pode cadastrar barbearias' }
  }

  const name = String(formData.get('name') || '').trim()
  const address = String(formData.get('address') || '').trim()
  const openingTime = String(formData.get('openingTime') || '').trim() || '09:00:00'
  const closingTime = String(formData.get('closingTime') || '').trim() || '18:00:00'

  if (!name) return { success: false, error: 'Nome da barbearia obrigatorio' }

  const supabase = await createClient()
  const { error } = await supabase.from('barbershops').insert({
    owner_id: scope.userId,
    name,
    address: address || null,
    opening_time: openingTime,
    closing_time: closingTime,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBarbershopBySuperAdmin(formData: FormData): Promise<ActionResult> {
  const scope = await getRoleScope()
  if (scope.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admin pode editar barbearias' }
  }

  const barbershopId = String(formData.get('barbershopId') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const address = String(formData.get('address') || '').trim()
  const openingTime = String(formData.get('openingTime') || '').trim() || '09:00:00'
  const closingTime = String(formData.get('closingTime') || '').trim() || '18:00:00'

  if (!barbershopId) return { success: false, error: 'Barbearia invalida' }
  if (!name) return { success: false, error: 'Nome da barbearia obrigatorio' }
  if (!scope.barbershopIds.includes(barbershopId)) {
    return { success: false, error: 'Barbearia fora do seu escopo' }
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('barbershops')
    .update({
      name,
      address: address || null,
      opening_time: openingTime,
      closing_time: closingTime,
    })
    .eq('id', barbershopId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteBarbershopBySuperAdmin(formData: FormData): Promise<ActionResult> {
  const scope = await getRoleScope()
  if (scope.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admin pode excluir barbearias' }
  }

  const barbershopId = String(formData.get('barbershopId') || '').trim()
  if (!barbershopId) return { success: false, error: 'Barbearia invalida' }
  if (!scope.barbershopIds.includes(barbershopId)) {
    return { success: false, error: 'Barbearia fora do seu escopo' }
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from('barbershops').delete().eq('id', barbershopId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleBarbershopActivationBySuperAdmin(formData: FormData): Promise<ActionResult> {
  const scope = await getRoleScope()
  if (scope.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admin pode gerenciar ativacao de barbearias' }
  }

  const barbershopId = String(formData.get('barbershopId') || '').trim()
  if (!barbershopId) return { success: false, error: 'Barbearia invalida' }

  const adminSupabase = createAdminClient()
  
  // Fetch current status
  const { data: shop, error: fetchError } = await adminSupabase
    .from('barbershops')
    .select('id, is_active')
    .eq('id', barbershopId)
    .single()

  if (fetchError || !shop) {
    return { success: false, error: 'Barbearia nao encontrada' }
  }

  const nextStatus = shop.is_active === false ? true : false

  const { error: updateError } = await adminSupabase
    .from('barbershops')
    .update({ is_active: nextStatus })
    .eq('id', barbershopId)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath('/dashboard')
  return { success: true }
}

