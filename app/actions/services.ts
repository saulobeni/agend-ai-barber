'use server'

import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/lib/types'

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    return []
  }

  return data || []
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const supabase = await createClient()
  
  const nameMap: Record<string, string> = {
    'corte': 'Corte',
    'barba': 'Barba',
    'combo': 'Combo',
  }
  
  const serviceName = nameMap[slug.toLowerCase()]
  
  if (!serviceName) return null
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('name', serviceName)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching service:', error)
    return null
  }

  return data
}
