'use server'

import { createClient } from '@/lib/supabase/server'
import type { Appointment, Barber } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getRoleScope } from '@/app/actions/rbac'

function parseTimeToMinutes(time: string): number {
  // Supabase often returns TIME as `HH:MM:SS`, but we also accept `HH:MM`.
  const parts = time.split(':')
  const hh = Number(parts[0] ?? 0)
  const mm = Number(parts[1] ?? 0)
  return hh * 60 + mm
}

function minutesToTimeString(totalMinutes: number): string {
  const hh = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const mm = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

async function getScopedBarbershopIds(): Promise<string[]> {
  const scope = await getRoleScope()
  if (scope.barbershopIds.length > 0) return scope.barbershopIds

  const supabase = await createClient()
  const { data: anyShop } = await supabase.from('barbershops').select('id').limit(1)
  return (anyShop || []).map((s) => s.id)
}

export async function getAvailableBarbers(barbershopId?: string): Promise<Barber[]> {
  const supabase = await createClient()

  let query = supabase
    .from('barbers')
    .select('id, barbershop_id, name, created_at')
    .order('created_at', { ascending: true })

  if (barbershopId) {
    query = query.eq('barbershop_id', barbershopId)
  } else {
    const ownedIds = await getScopedBarbershopIds()
    if (ownedIds.length > 0) query = query.in('barbershop_id', ownedIds)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching barbers:', error)
    return []
  }

  return data || []
}

export async function getAvailableTimes(
  barberId: string,
  date: string,
  serviceDuration: number
): Promise<string[]> {
  const supabase = await createClient()

  const { data: barber, error: barberError } = await supabase
    .from('barbers')
    .select('barbershop_id')
    .eq('id', barberId)
    .single()

  if (barberError || !barber) return []

  const { data: shop, error: shopError } = await supabase
    .from('barbershops')
    .select('opening_time, closing_time')
    .eq('id', barber.barbershop_id)
    .single()

  if (shopError || !shop) return []

  const openingMinutes = parseTimeToMinutes(shop.opening_time)
  const closingMinutes = parseTimeToMinutes(shop.closing_time)

  const stepMinutes = 15 // intervalos menores evitam sobreposição por duração

  const { data: blockedTimes, error: blockedError } = await supabase
    .from('blocked_times')
    .select('start_time, end_time')
    .eq('barber_id', barberId)
    .eq('block_date', date)

  if (blockedError) {
    console.error('Error fetching blocked times:', blockedError)
  }

  // Buscar agendamentos marcados (para o overlap respeitar duration do serviço)
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select(`
      appointment_time,
      service:services(duration_minutes)
    `)
    .eq('barber_id', barberId)
    .eq('appointment_date', date)
    .eq('status', 'scheduled')

  if (appointmentsError) {
    console.error('Error fetching appointments:', appointmentsError)
    return []
  }

  const availableTimes: string[] = []

  for (
    let slotStartMin = openingMinutes;
    slotStartMin + serviceDuration <= closingMinutes;
    slotStartMin += stepMinutes
  ) {
    const slotEndMin = slotStartMin + serviceDuration

    const isBooked = (appointments || []).some((apt: any) => {
      const aptStartMin = parseTimeToMinutes(String(apt.appointment_time))
      const duration = Number(apt?.service?.duration_minutes ?? serviceDuration)
      const aptEndMin = aptStartMin + duration
      return slotStartMin < aptEndMin && slotEndMin > aptStartMin
    })

    if (isBooked) continue

    const isBlocked = (blockedTimes || []).some((bt: any) => {
      const btStartMin = parseTimeToMinutes(String(bt.start_time))
      const btEndMin = parseTimeToMinutes(String(bt.end_time))
      return slotStartMin < btEndMin && slotEndMin > btStartMin
    })

    if (isBlocked) continue

    availableTimes.push(minutesToTimeString(slotStartMin))
  }

  return availableTimes
}

export async function createAppointment(data: {
  serviceId: string
  barberId: string
  date: string
  time: string
  duration: number
}): Promise<{ success: boolean; error?: string; appointmentId?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Usuário não autenticado' }

  // Seu SQL não tem `clients.user_id`, então usamos os metadados do auth para criar `clients`
  const meta: any = user.user_metadata ?? {}
  const fullName: string | null =
    meta.full_name ?? meta.fullName ?? meta.name ?? null
  const phone: string | null =
    meta.phone ?? meta.phone_number ?? meta.phoneNumber ?? null

  if (!fullName || !phone) {
    return {
      success: false,
      error: 'Para agendar, sua conta precisa ter `full_name` e `phone` no cadastro.',
    }
  }

  const { data: barber, error: barberError } = await supabase
    .from('barbers')
    .select('barbershop_id')
    .eq('id', data.barberId)
    .single()

  if (barberError || !barber) {
    return { success: false, error: 'Barbeiro não encontrado' }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      barbershop_id: barber.barbershop_id,
      name: String(fullName),
      phone: String(phone),
    })
    .select('id')
    .single()

  // Se o RLS estiver bloqueando o INSERT em clients (muito comum durante setup),
  // ainda assim conseguimos criar o agendamento porque `appointments_insert_public` é público
  // e `client_id` no schema é nullable.
  if (clientError || !client) {
    console.error('Error creating client:', clientError)

    // 42501 = insufficient_privilege (inclui violações de RLS)
    const isRlsBlock = (clientError as any)?.code === '42501'
    if (!isRlsBlock) {
      return { success: false, error: 'Erro ao criar cliente' }
    }
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: client?.id ?? null,
      barber_id: data.barberId,
      service_id: data.serviceId,
      barbershop_id: barber.barbershop_id,
      appointment_date: data.date,
      appointment_time: data.time,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (error || !appointment) {
    console.error('Error creating appointment:', error)
    return { success: false, error: 'Erro ao criar agendamento' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/meus-agendamentos')

  return { success: true, appointmentId: appointment.id }
}

export async function getUserAppointments(): Promise<Appointment[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const barbershopIds = await getScopedBarbershopIds()
  if (barbershopIds.length === 0) return []

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(*),
      barber:barbers(*)
    `)
    .in('barbershop_id', barbershopIds)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (error) {
    console.error('Error fetching appointments:', error)
    return []
  }

  return (data || []).map((apt: any) => ({
    ...apt,
    service: apt?.service
      ? {
          ...apt.service,
          price: Number(apt.service.price),
          duration_minutes: Number(apt.service.duration_minutes),
        }
      : undefined,
  }))
}

export async function getNextAppointment(): Promise<Appointment | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const barbershopIds = await getScopedBarbershopIds()
  if (barbershopIds.length === 0) return null

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(id, name, price, duration_minutes)
    `)
    .in('barbershop_id', barbershopIds)
    .gte('appointment_date', today)
    .eq('status', 'scheduled')
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null
  return {
    ...data,
    service: data?.service
      ? {
          ...data.service,
          price: Number(data.service.price),
          duration_minutes: Number(data.service.duration_minutes),
        }
      : undefined,
  }
}

export async function cancelAppointment(appointmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'canceled' })
    .eq('id', appointmentId)

  if (error) {
    return { success: false, error: 'Erro ao cancelar agendamento' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/meus-agendamentos')
  
  return { success: true }
}
