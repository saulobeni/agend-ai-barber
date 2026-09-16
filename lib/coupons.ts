import { createAdminClient } from '@/lib/supabase/admin'

export interface CouponValidationResult {
  valid: boolean
  error?: string
  coupon?: {
    id: string
    code: string
    name: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    discountAmount: number
    finalPrice: number
  }
}

export async function validateCouponForBooking(params: {
  code: string
  barbershopId: string
  serviceId: string
  clientId?: string | null
}): Promise<CouponValidationResult> {
  const code = params.code.trim().toUpperCase()
  if (!code) {
    return { valid: false, error: 'Informe um código de cupom' }
  }

  const admin = createAdminClient()

  const { data: service, error: serviceError } = await admin
    .from('services')
    .select('id, price, barbershop_id')
    .eq('id', params.serviceId)
    .single()

  if (serviceError || !service || String(service.barbershop_id) !== params.barbershopId) {
    return { valid: false, error: 'Serviço inválido para este cupom' }
  }

  const { data: coupon, error: couponError } = await admin
    .from('coupons')
    .select('*')
    .eq('barbershop_id', params.barbershopId)
    .eq('trigger_type', 'manual_code')
    .not('code', 'is', null)
    .ilike('code', code)
    .maybeSingle()

  if (couponError || !coupon) {
    return { valid: false, error: 'Cupom não encontrado' }
  }

  if (!coupon.is_active) {
    return { valid: false, error: 'Este cupom não está mais ativo' }
  }

  const now = new Date()
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, error: 'Este cupom ainda não está válido' }
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, error: 'Este cupom expirou' }
  }

  if (coupon.target_service_id && String(coupon.target_service_id) !== params.serviceId) {
    return { valid: false, error: 'Cupom não é válido para este serviço' }
  }

  const price = Number(service.price)
  const minValue = Number(coupon.min_service_value || 0)
  if (price < minValue) {
    return {
      valid: false,
      error: `Cupom válido apenas para serviços a partir de R$${minValue.toFixed(2)}`,
    }
  }

  if (coupon.max_uses_global != null) {
    const { count, error: countError } = await admin
      .from('coupon_usages')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)

    if (countError) {
      console.error('Error counting coupon usages:', countError)
      return { valid: false, error: 'Erro ao validar cupom' }
    }

    if ((count || 0) >= coupon.max_uses_global) {
      return { valid: false, error: 'Este cupom atingiu o limite máximo de usos' }
    }
  }

  if (params.clientId && coupon.max_uses_per_client != null) {
    const { count, error: countError } = await admin
      .from('coupon_usages')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('client_id', params.clientId)

    if (countError) {
      console.error('Error counting coupon usages per client:', countError)
      return { valid: false, error: 'Erro ao validar cupom' }
    }

    if ((count || 0) >= coupon.max_uses_per_client) {
      return { valid: false, error: 'Você já utilizou este cupom o número máximo de vezes permitido' }
    }
  }

  let discountAmount = 0
  if (coupon.discount_type === 'percentage') {
    discountAmount = price * (Number(coupon.discount_value) / 100)
    if (coupon.max_discount_amount != null) {
      discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount))
    }
  } else {
    discountAmount = Number(coupon.discount_value)
  }

  discountAmount = Math.min(Math.max(0, discountAmount), price)
  discountAmount = Math.round(discountAmount * 100) / 100

  const finalPrice = Math.max(0, price - discountAmount)

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      discountAmount,
      finalPrice,
    },
  }
}
