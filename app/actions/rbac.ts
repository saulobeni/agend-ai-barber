'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  Barbershop,
  DashboardReportMetrics,
  ServiceReportItem,
  UserRole,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

type ScopeResult = {
  userId: string
  role: UserRole | null
  isSuperAdmin: boolean
  barbershopIds: string[]
}

function normalizeMoney(value: unknown): number {
  return Number(value ?? 0)
}

export async function getRoleScope(): Promise<ScopeResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      userId: '',
      role: null,
      isSuperAdmin: false,
      barbershopIds: [],
    }
  }

  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role, barbershop_id')
    .eq('user_id', user.id)

  const rows = roleRows || []
  const superAdmin = rows.some((r: any) => r.role === 'super_admin')

  if (superAdmin) {
    const { data: shops } = await supabase.from('barbershops').select('id')
    return {
      userId: user.id,
      role: 'super_admin',
      isSuperAdmin: true,
      barbershopIds: (shops || []).map((s: any) => s.id),
    }
  }

  const adminShops = rows
    .filter((r: any) => r.role === 'admin' && r.barbershop_id)
    .map((r: any) => String(r.barbershop_id))

  if (adminShops.length > 0) {
    return {
      userId: user.id,
      role: 'admin',
      isSuperAdmin: false,
      barbershopIds: adminShops,
    }
  }

  const { data: owned } = await supabase
    .from('barbershops')
    .select('id')
    .eq('owner_id', user.id)

  return {
    userId: user.id,
    role: null,
    isSuperAdmin: false,
    barbershopIds: (owned || []).map((s: any) => s.id),
  }
}

export async function getPostLoginRedirectPath(): Promise<string> {
  const scope = await getRoleScope()
  if (scope.isSuperAdmin || scope.role === 'admin') return '/dashboard'
  return '/dashboard'
}

export async function getBarbershopsForScope(): Promise<Barbershop[]> {
  const scope = await getRoleScope()
  if (scope.barbershopIds.length === 0) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('barbershops')
    .select('*')
    .in('id', scope.barbershopIds)
    .order('name', { ascending: true })

  return (data || []) as Barbershop[]
}

export async function getReportData(selectedBarbershopId?: string): Promise<{
  scope: ScopeResult
  metrics: DashboardReportMetrics
  topServices: ServiceReportItem[]
  barbershops: Barbershop[]
}> {
  const supabase = await createClient()
  const scope = await getRoleScope()
  const barbershops = await getBarbershopsForScope()

  const activeShopIds =
    selectedBarbershopId && scope.isSuperAdmin
      ? [selectedBarbershopId]
      : scope.barbershopIds

  if (activeShopIds.length === 0) {
    return {
      scope,
      barbershops,
      metrics: {
        totalAppointments: 0,
        scheduledAppointments: 0,
        completedAppointments: 0,
        canceledAppointments: 0,
        totalRevenue: 0,
      },
      topServices: [],
    }
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, service_id, status')
    .in('barbershop_id', activeShopIds)

  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .in('barbershop_id', activeShopIds)

  const { data: payments } = await supabase
    .from('payments')
    .select('appointment_id, amount')

  const aptRows = appointments || []
  const paymentMap = new Map<string, number>()
  for (const p of payments || []) {
    paymentMap.set(String((p as any).appointment_id), normalizeMoney((p as any).amount))
  }

  const metrics: DashboardReportMetrics = {
    totalAppointments: aptRows.length,
    scheduledAppointments: aptRows.filter((a: any) => a.status === 'scheduled').length,
    completedAppointments: aptRows.filter((a: any) => a.status === 'completed').length,
    canceledAppointments: aptRows.filter((a: any) => a.status === 'canceled').length,
    totalRevenue: aptRows.reduce((acc: number, a: any) => acc + (paymentMap.get(String(a.id)) || 0), 0),
  }

  const serviceNameById = new Map<string, string>(
    (services || []).map((s: any) => [String(s.id), String(s.name)])
  )

  const serviceAgg = new Map<string, { bookings: number; revenue: number }>()
  for (const apt of aptRows as any[]) {
    const sid = String(apt.service_id)
    const item = serviceAgg.get(sid) || { bookings: 0, revenue: 0 }
    item.bookings += 1
    item.revenue += paymentMap.get(String(apt.id)) || 0
    serviceAgg.set(sid, item)
  }

  const topServices: ServiceReportItem[] = Array.from(serviceAgg.entries())
    .map(([service_id, values]) => ({
      service_id,
      service_name: serviceNameById.get(service_id) || 'Servico removido',
      bookings: values.bookings,
      revenue: values.revenue,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 8)

  return { scope, metrics, topServices, barbershops }
}

export async function getUsersAndRolesForManagement() {
  const scope = await getRoleScope()
  if (!scope.isSuperAdmin) return { users: [], roles: [], barbershops: [] }

  const supabase = await createClient()
  const [{ data: profiles }, { data: roles }, { data: barbershops }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, username').order('created_at', { ascending: false }),
    supabase.from('user_roles').select('id, user_id, role, barbershop_id, created_at').order('created_at', { ascending: false }),
    supabase.from('barbershops').select('id, name').order('name', { ascending: true }),
  ])

  return {
    users: profiles || [],
    roles: roles || [],
    barbershops: barbershops || [],
  }
}

export async function assignRole(formData: FormData) {
  const scope = await getRoleScope()
  if (!scope.isSuperAdmin) return { success: false, error: 'Sem permissao' }

  const userId = String(formData.get('userId') || '')
  const role = String(formData.get('role') || '') as UserRole
  const barbershopId = String(formData.get('barbershopId') || '')

  if (!userId) return { success: false, error: 'Usuario obrigatorio' }
  if (role !== 'admin' && role !== 'super_admin') {
    return { success: false, error: 'Role invalida' }
  }
  if (role === 'admin' && !barbershopId) {
    return { success: false, error: 'Barbearia obrigatoria para admin' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('user_roles').insert({
    user_id: userId,
    role,
    barbershop_id: role === 'admin' ? barbershopId : null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
