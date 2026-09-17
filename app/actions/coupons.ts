'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleScope } from '@/app/actions/rbac'
import { validateCouponForBooking, type CouponValidationResult } from '@/lib/coupons'
import type { AdminCouponItem, Service, Barbershop, DiscountType, CouponTriggerType } from '@/lib/types'

async function getCurrentClientId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  barbershopId: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const meta: any = user.user_metadata ?? {}
  let fullName: string | null = meta.full_name ?? meta.fullName ?? meta.name ?? null
  const phone: string | null = meta.phone ?? meta.phone_number ?? meta.phoneNumber ?? null

  if (!fullName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    fullName = profile?.full_name ?? null
  }

  if (!fullName && !phone) return null

  const admin = createAdminClient()
  let query = admin.from('clients').select('id').eq('barbershop_id', barbershopId)
  if (phone) query = query.eq('phone', String(phone))
  else if (fullName) query = query.eq('name', String(fullName))

  const { data } = await query.limit(1).maybeSingle()
  return data ? String((data as any).id) : null
}

export async function validateCoupon(input: {
  code: string
  barbershopId: string
  serviceId: string
}): Promise<CouponValidationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { valid: false, error: 'Você precisa estar autenticado para usar um cupom' }
  }

  const clientId = await getCurrentClientId(supabase, input.barbershopId)

  return validateCouponForBooking({
    code: input.code,
    barbershopId: input.barbershopId,
    serviceId: input.serviceId,
    clientId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACTIONS PARA CUPONS
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult = { success: boolean; error?: string }

async function requireAdminScope() {
  const scope = await getRoleScope()
  if (scope.role !== 'admin') {
    return { scope: null, error: { success: false, error: 'Acesso permitido apenas para administradores' } as ActionResult }
  }
  const barbershopId = scope.barbershopIds[0]
  if (!barbershopId) {
    return { scope: null, error: { success: false, error: 'Nenhuma barbearia vinculada ao administrador' } as ActionResult }
  }
  return { scope, barbershopId, error: null }
}

export async function getAdminCouponsData(): Promise<{
  coupons: AdminCouponItem[]
  services: Service[]
  barbershop: Barbershop | null
}> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) {
    return { coupons: [], services: [], barbershop: null }
  }

  const supabase = await createClient()
  const barbershopId = check.barbershopId

  const [{ data: shop }, { data: servicesData }, { data: couponsData }] = await Promise.all([
    supabase
      .from('barbershops')
      .select('id, owner_id, name, address, opening_time, closing_time, is_active, created_at')
      .eq('id', barbershopId)
      .single(),
    supabase
      .from('services')
      .select('id, barbershop_id, name, description, price, duration_minutes, created_at')
      .eq('barbershop_id', barbershopId)
      .order('name', { ascending: true }),
    supabase
      .from('coupons')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false }),
  ])

  const services: Service[] = (servicesData || []).map((s: any) => ({
    ...s,
    price: Number(s.price),
    duration_minutes: Number(s.duration_minutes),
  }))

  const serviceMap = new Map(services.map((s) => [s.id, s.name]))

  const rawCoupons = couponsData || []
  const couponIds = rawCoupons.map((c: any) => c.id)

  const usagesByCoupon: Record<string, { count: number; totalDiscount: number }> = {}

  if (couponIds.length > 0) {
    const { data: usages } = await supabase
      .from('coupon_usages')
      .select('coupon_id, discount_applied')
      .in('coupon_id', couponIds)

    if (usages) {
      for (const u of usages) {
        if (!usagesByCoupon[u.coupon_id]) {
          usagesByCoupon[u.coupon_id] = { count: 0, totalDiscount: 0 }
        }
        usagesByCoupon[u.coupon_id].count += 1
        usagesByCoupon[u.coupon_id].totalDiscount += Number(u.discount_applied || 0)
      }
    }
  }

  const coupons: AdminCouponItem[] = rawCoupons.map((c: any) => {
    const usage = usagesByCoupon[c.id] || { count: 0, totalDiscount: 0 }
    return {
      ...c,
      discount_value: Number(c.discount_value),
      min_service_value: Number(c.min_service_value || 0),
      max_discount_amount: c.max_discount_amount != null ? Number(c.max_discount_amount) : null,
      max_uses_global: c.max_uses_global != null ? Number(c.max_uses_global) : null,
      max_uses_per_client: c.max_uses_per_client != null ? Number(c.max_uses_per_client) : 1,
      target_service_name: c.target_service_id ? serviceMap.get(c.target_service_id) || null : null,
      totalUses: usage.count,
      totalDiscountApplied: usage.totalDiscount,
    }
  })

  return {
    coupons,
    services,
    barbershop: shop as Barbershop | null,
  }
}

export async function createCouponByAdmin(formData: FormData): Promise<ActionResult & { couponId?: string }> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) return check.error as ActionResult

  const name = String(formData.get('name') || '').trim()
  const rawCode = String(formData.get('code') || '').trim().toUpperCase().replace(/\s+/g, '')
  const description = String(formData.get('description') || '').trim() || null
  const discountType = (formData.get('discountType') || 'percentage') as DiscountType
  const discountValue = Number(String(formData.get('discountValue') || '').replace(',', '.'))
  const minServiceValue = Number(String(formData.get('minServiceValue') || '0').replace(',', '.'))
  const rawMaxDiscount = formData.get('maxDiscountAmount')
  const maxDiscountAmount = rawMaxDiscount ? Number(String(rawMaxDiscount).replace(',', '.')) : null
  const rawMaxUsesGlobal = formData.get('maxUsesGlobal')
  const maxUsesGlobal = rawMaxUsesGlobal ? parseInt(String(rawMaxUsesGlobal), 10) : null
  const rawMaxUsesPerClient = formData.get('maxUsesPerClient')
  const maxUsesPerClient = rawMaxUsesPerClient ? parseInt(String(rawMaxUsesPerClient), 10) : 1
  const targetServiceId = String(formData.get('targetServiceId') || '').trim() || null
  const rawStartsAt = formData.get('startsAt')
  const startsAt = rawStartsAt ? new Date(String(rawStartsAt)).toISOString() : null
  const rawExpiresAt = formData.get('expiresAt')
  const expiresAt = rawExpiresAt ? new Date(String(rawExpiresAt)).toISOString() : null
  const isActive = formData.get('isActive') !== 'false'

  if (!name) return { success: false, error: 'O nome do cupom é obrigatório' }
  if (!rawCode) return { success: false, error: 'O código do cupom é obrigatório' }
  if (rawCode.length < 3 || rawCode.length > 50) {
    return { success: false, error: 'O código deve ter entre 3 e 50 caracteres' }
  }

  if (discountType !== 'percentage' && discountType !== 'fixed') {
    return { success: false, error: 'Tipo de desconto inválido' }
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { success: false, error: 'O valor do desconto deve ser maior que zero' }
  }

  if (discountType === 'percentage' && discountValue > 100) {
    return { success: false, error: 'O percentual de desconto não pode ser maior que 100%' }
  }

  if (minServiceValue < 0) {
    return { success: false, error: 'O valor mínimo do serviço não pode ser negativo' }
  }

  if (maxDiscountAmount !== null && (maxDiscountAmount <= 0 || isNaN(maxDiscountAmount))) {
    return { success: false, error: 'O teto de desconto deve ser maior que zero' }
  }

  if (maxUsesGlobal !== null && (isNaN(maxUsesGlobal) || maxUsesGlobal <= 0)) {
    return { success: false, error: 'O limite geral de usos deve ser um número inteiro positivo' }
  }

  if (maxUsesPerClient !== null && (isNaN(maxUsesPerClient) || maxUsesPerClient <= 0)) {
    return { success: false, error: 'O limite por cliente deve ser um número inteiro positivo' }
  }

  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
    return { success: false, error: 'A data de expiração deve ser posterior à data de início' }
  }

  const supabase = await createClient()

  // Verifica duplicidade de código na mesma barbearia
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('barbershop_id', check.barbershopId)
    .ilike('code', rawCode)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Já existe um cupom com este código nesta barbearia' }
  }

  const { data: created, error } = await supabase
    .from('coupons')
    .insert({
      barbershop_id: check.barbershopId,
      name,
      code: rawCode,
      description,
      trigger_type: 'manual_code',
      discount_type: discountType,
      discount_value: discountValue,
      min_service_value: minServiceValue,
      max_discount_amount: maxDiscountAmount,
      max_uses_global: maxUsesGlobal,
      max_uses_per_client: maxUsesPerClient,
      target_service_id: targetServiceId,
      starts_at: startsAt,
      expires_at: expiresAt,
      is_active: isActive,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('Error creating coupon:', error)
    if (error?.code === '23505') {
      return { success: false, error: 'Já existe um cupom com este código nesta barbearia' }
    }
    return { success: false, error: error?.message || 'Erro ao cadastrar cupom' }
  }

  revalidatePath('/cupons')
  revalidatePath('/dashboard')
  return { success: true, couponId: String(created.id) }
}

export async function updateCouponByAdmin(formData: FormData): Promise<ActionResult> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) return check.error as ActionResult

  const couponId = String(formData.get('couponId') || '').trim()
  if (!couponId) return { success: false, error: 'Cupom inválido' }

  const name = String(formData.get('name') || '').trim()
  const rawCode = String(formData.get('code') || '').trim().toUpperCase().replace(/\s+/g, '')
  const description = String(formData.get('description') || '').trim() || null
  const discountType = (formData.get('discountType') || 'percentage') as DiscountType
  const discountValue = Number(String(formData.get('discountValue') || '').replace(',', '.'))
  const minServiceValue = Number(String(formData.get('minServiceValue') || '0').replace(',', '.'))
  const rawMaxDiscount = formData.get('maxDiscountAmount')
  const maxDiscountAmount = rawMaxDiscount ? Number(String(rawMaxDiscount).replace(',', '.')) : null
  const rawMaxUsesGlobal = formData.get('maxUsesGlobal')
  const maxUsesGlobal = rawMaxUsesGlobal ? parseInt(String(rawMaxUsesGlobal), 10) : null
  const rawMaxUsesPerClient = formData.get('maxUsesPerClient')
  const maxUsesPerClient = rawMaxUsesPerClient ? parseInt(String(rawMaxUsesPerClient), 10) : 1
  const targetServiceId = String(formData.get('targetServiceId') || '').trim() || null
  const rawStartsAt = formData.get('startsAt')
  const startsAt = rawStartsAt ? new Date(String(rawStartsAt)).toISOString() : null
  const rawExpiresAt = formData.get('expiresAt')
  const expiresAt = rawExpiresAt ? new Date(String(rawExpiresAt)).toISOString() : null
  const isActive = formData.get('isActive') !== 'false'

  if (!name) return { success: false, error: 'O nome do cupom é obrigatório' }
  if (!rawCode) return { success: false, error: 'O código do cupom é obrigatório' }
  if (rawCode.length < 3 || rawCode.length > 50) {
    return { success: false, error: 'O código deve ter entre 3 e 50 caracteres' }
  }

  if (discountType !== 'percentage' && discountType !== 'fixed') {
    return { success: false, error: 'Tipo de desconto inválido' }
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { success: false, error: 'O valor do desconto deve ser maior que zero' }
  }

  if (discountType === 'percentage' && discountValue > 100) {
    return { success: false, error: 'O percentual de desconto não pode ser maior que 100%' }
  }

  if (minServiceValue < 0) {
    return { success: false, error: 'O valor mínimo do serviço não pode ser negativo' }
  }

  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
    return { success: false, error: 'A data de expiração deve ser posterior à data de início' }
  }

  const supabase = await createClient()

  // Verifica que o cupom pertence à barbearia do admin
  const { data: currentCoupon, error: findError } = await supabase
    .from('coupons')
    .select('id, barbershop_id')
    .eq('id', couponId)
    .eq('barbershop_id', check.barbershopId)
    .single()

  if (findError || !currentCoupon) {
    return { success: false, error: 'Cupom não encontrado na sua barbearia' }
  }

  // Verifica se código conflita com outro cupom
  const { data: conflict } = await supabase
    .from('coupons')
    .select('id')
    .eq('barbershop_id', check.barbershopId)
    .ilike('code', rawCode)
    .neq('id', couponId)
    .maybeSingle()

  if (conflict) {
    return { success: false, error: 'Já existe outro cupom com este código nesta barbearia' }
  }

  const { error } = await supabase
    .from('coupons')
    .update({
      name,
      code: rawCode,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      min_service_value: minServiceValue,
      max_discount_amount: maxDiscountAmount,
      max_uses_global: maxUsesGlobal,
      max_uses_per_client: maxUsesPerClient,
      target_service_id: targetServiceId,
      starts_at: startsAt,
      expires_at: expiresAt,
      is_active: isActive,
    })
    .eq('id', couponId)
    .eq('barbershop_id', check.barbershopId)

  if (error) {
    console.error('Error updating coupon:', error)
    return { success: false, error: error.message || 'Erro ao atualizar cupom' }
  }

  revalidatePath('/cupons')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleCouponStatusByAdmin(couponId: string, isActive: boolean): Promise<ActionResult> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) return check.error as ActionResult

  const supabase = await createClient()
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', couponId)
    .eq('barbershop_id', check.barbershopId)

  if (error) {
    console.error('Error toggling coupon status:', error)
    return { success: false, error: error.message || 'Erro ao alterar status do cupom' }
  }

  revalidatePath('/cupons')
  return { success: true }
}

export async function deleteCouponByAdmin(couponId: string): Promise<ActionResult> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) return check.error as ActionResult

  const supabase = await createClient()

  // Verifica se o cupom já tem utilizações registradas
  const { count, error: countError } = await supabase
    .from('coupon_usages')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', couponId)

  if (countError) {
    console.error('Error checking coupon usages:', countError)
  }

  if (count && count > 0) {
    return {
      success: false,
      error: 'Este cupom já foi utilizado por clientes em agendamentos e não pode ser excluído do histórico. Para que não seja mais aceito, você pode desativá-lo.',
    }
  }

  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId)
    .eq('barbershop_id', check.barbershopId)

  if (error) {
    console.error('Error deleting coupon:', error)
    return { success: false, error: error.message || 'Erro ao excluir cupom' }
  }

  revalidatePath('/cupons')
  revalidatePath('/dashboard')
  return { success: true }
}
