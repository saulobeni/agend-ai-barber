'use server'

import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/lib/types'
import { getRoleScope } from '@/app/actions/rbac'

export async function getServices(barbershopId?: string): Promise<Service[]> {
  const supabase = await createClient()

  const scope = await getRoleScope()
  // Cliente (role user ou sem role) visualiza todos os servicos publicos das barbearias ativas.
  if (!scope.role || scope.role === 'user') {
    const { data: activeShops } = await supabase
      .from('barbershops')
      .select('id')
      .eq('is_active', true)

    const activeIds = (activeShops || []).map((s: any) => s.id)
    if (activeIds.length === 0) return []

    let query = supabase
      .from('services')
      .select('*')
      .in('barbershop_id', activeIds)
      .order('price', { ascending: true })

    if (barbershopId) {
      query = query.eq('barbershop_id', barbershopId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }

    return (data || []).map((s: any) => ({
      ...s,
      price: Number(s.price),
      duration_minutes: Number(s.duration_minutes),
    }))
  }

  const barbershopIds = scope.barbershopIds
  if (barbershopIds.length === 0) return []

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .in('barbershop_id', barbershopIds)
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    return []
  }

  return (data || []).map((s: any) => ({
    ...s,
    price: Number(s.price),
    duration_minutes: Number(s.duration_minutes),
  }))
}

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const services = await getServices()
  const decoded = decodeURIComponent(slug)
  return (
    services.find((s) => s.id === decoded) ??
    services.find((s) => toSlug(s.name) === toSlug(decoded)) ??
    null
  )
}
