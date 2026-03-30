'use server'

import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/lib/types'

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Busca barbearias do dono (owner_id = auth.uid()).
  // Se não tiver nenhuma (ex.: barbearia demo com owner_id nulo), faz fallback pra qualquer barbearia pública.
  let barbershopIds: string[] = []
  if (user) {
    const { data: owned, error: ownedError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)

    if (!ownedError && owned) {
      barbershopIds = owned.map((s) => s.id)
    }
  }

  if (barbershopIds.length === 0) {
    const { data: anyShop } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)

    barbershopIds = (anyShop || []).map((s) => s.id)
  }

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

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const nameMap: Record<string, string> = {
    'corte': 'Corte',
    'barba': 'Barba',
    'combo': 'Combo',
  }
  
  const serviceName = nameMap[slug.toLowerCase()]
  
  if (!serviceName) return null

  // Reaproveita a lógica de “escopo” do getServices() pra evitar erro de múltiplas linhas.
  const services = await getServices()
  return services.find((s) => s.name === serviceName) ?? null
}
