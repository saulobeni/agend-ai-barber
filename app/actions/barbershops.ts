'use server'

import { createClient } from '@/lib/supabase/server'
import type { Barbershop } from '@/lib/types'

export async function getBarbershops(): Promise<Barbershop[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('barbershops')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching barbershops:', error)
    return []
  }

  return data || []
}
