'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  return []
}

async function resolveBarberIdsForCurrentUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  barbershopIds: string[],
): Promise<string[]> {
  if (barbershopIds.length === 0) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: ownProfile } = await supabase
    .from('profiles')
    .select('full_name, username, email')
    .eq('id', userId)
    .single()

  const { data: barberRows } = await supabase
    .from('barbers')
    .select('id, name')
    .in('barbershop_id', barbershopIds)

  const normalizeText = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const profileName = String(ownProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim()
  const profileUsername = String(ownProfile?.username || user?.user_metadata?.username || '').trim()
  const profileEmail = String(ownProfile?.email || user?.email || '').trim().toLowerCase()
  const emailLocalPart = profileEmail.includes('@') ? profileEmail.split('@')[0] : profileEmail

  const identityCandidates = [
    profileName,
    profileUsername,
    emailLocalPart,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)

  const barberIds = new Set<string>()
  for (const row of barberRows || []) {
    const id = String((row as any).id || '')
    const rawName = String((row as any).name || '').trim()
    const barberName = normalizeText(rawName)
    if (!id) continue

    if (id === userId) {
      barberIds.add(id)
      continue
    }

    const isMatch = identityCandidates.some((candidate) => {
      if (!candidate || !barberName) return false
      
      const candNoSpace = candidate.replace(/\s+/g, '')
      const barbNoSpace = barberName.replace(/\s+/g, '')

      if (candNoSpace === barbNoSpace || barbNoSpace.includes(candNoSpace) || candNoSpace.includes(barbNoSpace)) {
        return true
      }

      // Check first name match if it's long enough
      const candFirstWord = candidate.split(/\s+/)[0]
      const barbFirstWord = barberName.split(/\s+/)[0]
      if (candFirstWord && barbFirstWord && candFirstWord === barbFirstWord && candFirstWord.length > 3) {
        return true
      }

      return false
    })

    if (isMatch) {
      barberIds.add(id)
    }
  }

  return Array.from(barberIds)
}

async function getCurrentUserIdentity(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const meta: any = user.user_metadata ?? {}
  let fullName: string | null = meta.full_name ?? meta.fullName ?? meta.name ?? null
  const phone: string | null = meta.phone ?? meta.phone_number ?? meta.phoneNumber ?? null

  // Some legacy users may have name only in `profiles`.
  if (!fullName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    fullName = profile?.full_name ?? null
  }

  return { user, fullName, phone }
}

async function getClientIdsForCurrentUser(
  fullName: string | null,
  phone: string | null,
): Promise<string[]> {
  if (!fullName && !phone) return []

  const adminSupabase = createAdminClient()
  let clientsQuery = adminSupabase.from('clients').select('id')
  if (phone) clientsQuery = clientsQuery.eq('phone', String(phone))
  if (!phone && fullName) clientsQuery = clientsQuery.eq('name', String(fullName))

  const { data: clientRows, error } = await clientsQuery
  if (error) {
    console.error('Error fetching client ids for current user:', error)
    return []
  }

  return (clientRows || []).map((c: any) => String(c.id))
}

async function getOrCreateClientForBarbershop(data: {
  barbershopId: string
  fullName: string
  phone: string
}): Promise<{ id: string } | null> {
  const adminSupabase = createAdminClient()

  const { data: existingClient, error: existingClientError } = await adminSupabase
    .from('clients')
    .select('id')
    .eq('barbershop_id', data.barbershopId)
    .eq('phone', data.phone)
    .limit(1)
    .maybeSingle()

  if (existingClientError) {
    console.error('Error searching existing client:', existingClientError)
    return null
  }

  if (existingClient?.id) {
    return { id: String(existingClient.id) }
  }

  const { data: createdClient, error: createdClientError } = await adminSupabase
    .from('clients')
    .insert({
      barbershop_id: data.barbershopId,
      name: data.fullName,
      phone: data.phone,
    })
    .select('id')
    .single()

  if (createdClientError || !createdClient) {
    console.error('Error creating client:', createdClientError)
    return null
  }

  return { id: String(createdClient.id) }
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

  const identity = await getCurrentUserIdentity(supabase)
  if (!identity?.user) return { success: false, error: 'Usuário não autenticado' }

  // Seu SQL não tem `clients.user_id`, então usamos os metadados do auth para criar `clients`
  const fullName = identity.fullName
  const phone = identity.phone

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

  const client = await getOrCreateClientForBarbershop({
    barbershopId: String(barber.barbershop_id),
    fullName: String(fullName),
    phone: String(phone),
  })

  if (!client) {
    return { success: false, error: 'Erro ao criar cliente' }
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: client.id,
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

  const identity = await getCurrentUserIdentity(supabase)
  if (!identity?.user) return []

  const scope = await getRoleScope()
  let data: any[] | null = null
  let error: any = null

  if (scope.role === 'admin' || scope.role === 'super_admin' || scope.role === 'barber') {
    const barbershopIds = await getScopedBarbershopIds()
    if (barbershopIds.length === 0) return []
    const result = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        barber:barbers(*)
      `)
      .in('barbershop_id', barbershopIds)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
    data = result.data
    error = result.error
  } else {
    const clientIds = await getClientIdsForCurrentUser(identity.fullName, identity.phone)
    if (clientIds.length === 0) return []
    const adminSupabase = createAdminClient()
    const result = await adminSupabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        barber:barbers(*)
      `)
      .in('client_id', clientIds)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
    data = result.data
    error = result.error
  }

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

  const identity = await getCurrentUserIdentity(supabase)
  if (!identity?.user) return null

  const scope = await getRoleScope()
  const today = new Date().toISOString().split('T')[0]
  let data: any = null
  let error: any = null

  if (scope.role === 'admin' || scope.role === 'super_admin' || scope.role === 'barber') {
    const barbershopIds = await getScopedBarbershopIds()
    if (barbershopIds.length === 0) return null
    const result = await supabase
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
    data = result.data
    error = result.error
  } else {
    const clientIds = await getClientIdsForCurrentUser(identity.fullName, identity.phone)
    if (clientIds.length === 0) return null
    const adminSupabase = createAdminClient()
    const result = await adminSupabase
      .from('appointments')
      .select(`
        *,
        service:services(id, name, price, duration_minutes)
      `)
      .in('client_id', clientIds)
      .gte('appointment_date', today)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(1)
      .single()
    data = result.data
    error = result.error
  }

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

export async function getBarberAppointments(): Promise<Appointment[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const scope = await getRoleScope()
  if (scope.role !== 'barber') return []

  const barberIds = await resolveBarberIdsForCurrentUser(supabase, user.id, scope.barbershopIds)
  if (barberIds.length === 0) return []

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      client:clients(id, name, phone, barbershop_id, created_at),
      service:services(id, name, description, price, duration_minutes, barbershop_id, created_at)
    `)
    .in('barber_id', barberIds)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (error) {
    console.error('Error fetching barber appointments:', error)
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
    client: apt?.client ? { ...apt.client } : undefined,
  }))
}

export async function cancelBarberAppointment(appointmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Usuario nao autenticado' }

  const scope = await getRoleScope()
  if (scope.role !== 'barber') return { success: false, error: 'Sem permissao' }

  const barberIds = await resolveBarberIdsForCurrentUser(supabase, user.id, scope.barbershopIds)
  if (barberIds.length === 0) {
    return { success: false, error: 'Barbeiro nao vinculado a um cadastro de atendimento' }
  }

  const { data: ownAppointment, error: ownError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .in('barber_id', barberIds)
    .single()

  if (ownError || !ownAppointment) {
    return { success: false, error: 'Agendamento nao encontrado para este barbeiro' }
  }

  if (ownAppointment.status !== 'scheduled') {
    return { success: false, error: 'Somente agendamentos marcados podem ser cancelados' }
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'canceled' })
    .eq('id', appointmentId)
    .in('barber_id', barberIds)

  if (error) return { success: false, error: 'Erro ao cancelar atendimento' }

  revalidatePath('/barber/dashboard')
  revalidatePath('/dashboard')
  revalidatePath('/meus-agendamentos')
  return { success: true }
}

export async function confirmBarberAppointment(appointmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Usuario nao autenticado' }

  const scope = await getRoleScope()
  if (scope.role !== 'barber') return { success: false, error: 'Sem permissao' }

  const barberIds = await resolveBarberIdsForCurrentUser(supabase, user.id, scope.barbershopIds)
  if (barberIds.length === 0) {
    return { success: false, error: 'Barbeiro nao vinculado a um cadastro de atendimento' }
  }

  const { data: ownAppointment, error: ownError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .in('barber_id', barberIds)
    .single()

  if (ownError || !ownAppointment) {
    return { success: false, error: 'Agendamento nao encontrado para este barbeiro' }
  }

  if (ownAppointment.status !== 'scheduled') {
    return { success: false, error: 'Somente agendamentos marcados podem ser confirmados' }
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId)
    .in('barber_id', barberIds)

  if (error) return { success: false, error: 'Erro ao confirmar atendimento' }

  revalidatePath('/barber/dashboard')
  revalidatePath('/dashboard')
  revalidatePath('/meus-agendamentos')
  return { success: true }
}
