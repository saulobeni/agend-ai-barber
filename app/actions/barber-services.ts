'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRoleScope } from '@/app/actions/rbac'
import type { AdminBarberServiceItem, Service } from '@/lib/types'

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

function canAccessBarbershop(scopedIds: string[], barbershopId: string | null | undefined) {
  if (!barbershopId) return false
  return scopedIds.includes(barbershopId)
}

// Retorna: barbeiros do shop do admin + servicos do shop + o mapa
// barbeiro -> ids de servicos atualmente vinculados.
export async function getAdminBarberServicesData(): Promise<{
  barbers: AdminBarberServiceItem[]
  services: Service[]
}> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) return { barbers: [], services: [] }

  const supabase = await createClient()
  const barbershopId = check.barbershopId

  const [{ data: barbersData }, { data: servicesData }] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, name, barbershop_id, created_at')
      .eq('barbershop_id', barbershopId)
      .order('name', { ascending: true }),
    supabase
      .from('services')
      .select('id, barbershop_id, name, description, price, duration_minutes, created_at')
      .eq('barbershop_id', barbershopId)
      .order('name', { ascending: true }),
  ])

  const barberIds = (barbersData || []).map((b: any) => b.id)
  const linksByBarber = new Map<string, string[]>()
  if (barberIds.length > 0) {
    const { data: links } = await supabase
      .from('barber_services')
      .select('barber_id, service_id')
      .in('barber_id', barberIds)

    for (const l of links || []) {
      const arr = linksByBarber.get(l.barber_id) || []
      arr.push(l.service_id)
      linksByBarber.set(l.barber_id, arr)
    }
  }

  const barbers: AdminBarberServiceItem[] = (barbersData || []).map((b: any) => ({
    barber_id: b.id,
    barber_name: b.name,
    service_ids: linksByBarber.get(b.id) || [],
  }))

  const services: Service[] = (servicesData || []).map((s: any) => ({
    ...s,
    price: Number(s.price),
    duration_minutes: Number(s.duration_minutes),
  }))

  return { barbers, services }
}

// Substitui por completo o conjunto de servicos de um barbeiro
// (delete-all-then-insert-selected, dentro do escopo do admin).
export async function setBarberServices(barberId: string, serviceIds: string[]): Promise<ActionResult> {
  const check = await requireAdminScope()
  if (!check.scope || !check.barbershopId) return check.error as ActionResult

  if (!barberId) return { success: false, error: 'Barbeiro inválido' }

  const supabase = await createClient()

  const { data: barber, error: barberError } = await supabase
    .from('barbers')
    .select('id, barbershop_id')
    .eq('id', barberId)
    .single()

  if (barberError || !barber) return { success: false, error: 'Barbeiro não encontrado' }
  if (!canAccessBarbershop(check.scope.barbershopIds, barber.barbershop_id)) {
    return { success: false, error: 'Barbeiro fora do seu escopo' }
  }

  // Garante que todos os serviceIds pertencem ao mesmo shop do barbeiro
  // (evita vincular servico de outra barbearia via payload adulterado).
  const uniqueServiceIds = Array.from(new Set(serviceIds)).filter(Boolean)
  if (uniqueServiceIds.length > 0) {
    const { data: validServices, error: validServicesError } = await supabase
      .from('services')
      .select('id')
      .eq('barbershop_id', barber.barbershop_id)
      .in('id', uniqueServiceIds)

    if (validServicesError) return { success: false, error: validServicesError.message }
    const validIds = new Set((validServices || []).map((s: any) => s.id))
    if (validIds.size !== uniqueServiceIds.length) {
      return { success: false, error: 'Um ou mais serviços não pertencem a esta barbearia' }
    }
  }

  const { error: deleteError } = await supabase.from('barber_services').delete().eq('barber_id', barberId)

  if (deleteError) return { success: false, error: deleteError.message }

  if (uniqueServiceIds.length > 0) {
    const { error: insertError } = await supabase
      .from('barber_services')
      .insert(uniqueServiceIds.map((serviceId) => ({ barber_id: barberId, service_id: serviceId })))

    if (insertError) return { success: false, error: insertError.message }
  }

  revalidatePath('/servicos-por-barbeiro')
  revalidatePath('/dashboard')
  return { success: true }
}
