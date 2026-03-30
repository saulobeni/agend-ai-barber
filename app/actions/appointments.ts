'use server'

import { createClient } from '@/lib/supabase/server'
import type { Appointment, Barber } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function getAvailableBarbers(): Promise<Barber[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('barbers')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('is_active', true)

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
  
  // Buscar horários já agendados para o barbeiro nessa data
  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('barber_id', barberId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed'])

  // Buscar bloqueios do barbeiro
  const { data: blockedTimes } = await supabase
    .from('blocked_times')
    .select('start_time, end_time')
    .eq('barber_id', barberId)
    .eq('blocked_date', date)

  // Horários de funcionamento (9h às 19h)
  const openingHour = 9
  const closingHour = 19
  const slotDuration = 60 // slots de 1 hora
  
  const availableTimes: string[] = []
  
  for (let hour = openingHour; hour < closingHour; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`
    const endHour = hour + Math.ceil(serviceDuration / 60)
    
    // Verificar se o horário não está ocupado
    const isBooked = appointments?.some(apt => {
      const aptStart = parseInt(apt.start_time.split(':')[0])
      const aptEnd = parseInt(apt.end_time.split(':')[0])
      return hour >= aptStart && hour < aptEnd
    })
    
    // Verificar se não está bloqueado
    const isBlocked = blockedTimes?.some(bt => {
      const btStart = parseInt(bt.start_time.split(':')[0])
      const btEnd = parseInt(bt.end_time.split(':')[0])
      return hour >= btStart && hour < btEnd
    })
    
    // Verificar se cabe no horário de funcionamento
    const fitsInSchedule = endHour <= closingHour
    
    if (!isBooked && !isBlocked && fitsInSchedule) {
      availableTimes.push(timeStr)
    }
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
  
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  // Buscar ou criar cliente
  let { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    // Buscar barbershop_id do barbeiro
    const { data: barber } = await supabase
      .from('barbers')
      .select('barbershop_id')
      .eq('id', data.barberId)
      .single()

    if (!barber) {
      return { success: false, error: 'Barbeiro não encontrado' }
    }

    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        barbershop_id: barber.barbershop_id,
      })
      .select('id')
      .single()

    if (clientError) {
      return { success: false, error: 'Erro ao criar cliente' }
    }
    client = newClient
  }

  // Buscar barbershop_id do barbeiro
  const { data: barber } = await supabase
    .from('barbers')
    .select('barbershop_id')
    .eq('id', data.barberId)
    .single()

  if (!barber) {
    return { success: false, error: 'Barbeiro não encontrado' }
  }

  // Calcular horário de término
  const startHour = parseInt(data.time.split(':')[0])
  const endHour = startHour + Math.ceil(data.duration / 60)
  const endTime = `${endHour.toString().padStart(2, '0')}:00`

  // Criar agendamento
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: client.id,
      barber_id: data.barberId,
      service_id: data.serviceId,
      barbershop_id: barber.barbershop_id,
      appointment_date: data.date,
      start_time: data.time,
      end_time: endTime,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating appointment:', error)
    return { success: false, error: 'Erro ao criar agendamento' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/meus-agendamentos')
  
  return { success: true, appointmentId: appointment.id }
}

export async function getUserAppointments(): Promise<Appointment[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  // Buscar cliente do usuário
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) return []

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(*),
      barber:barbers(
        *,
        profile:profiles(*)
      )
    `)
    .eq('client_id', client.id)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching appointments:', error)
    return []
  }

  return data || []
}

export async function getNextAppointment(): Promise<Appointment | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Buscar cliente do usuário
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) return null

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(*)
    `)
    .eq('client_id', client.id)
    .gte('appointment_date', today)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function cancelAppointment(appointmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)

  if (error) {
    return { success: false, error: 'Erro ao cancelar agendamento' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/meus-agendamentos')
  
  return { success: true }
}
