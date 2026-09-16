'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCouponForBooking, type CouponValidationResult } from '@/lib/coupons'

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
