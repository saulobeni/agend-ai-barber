'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  Barbershop,
  DashboardReportMetrics,
  MonthlyRevenueItem,
  ServiceReportItem,
  UserRole,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

type ScopeResult = {
  userId: string
  role: UserRole | null
  isSuperAdmin: boolean
  barbershopIds: string[]
  isBarbershopInactive?: boolean
}

function normalizeMoney(value: unknown): number {
  return Number(value ?? 0)
}

type ReportDataOptions = {
  startDate?: string
  endDate?: string
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-')
  const idx = Number(month) - 1
  return `${MONTH_NAMES[idx]}/${String(year).slice(2)}`
}

export async function getRoleScope(): Promise<ScopeResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { userId: '', role: null, isSuperAdmin: false, barbershopIds: [], isBarbershopInactive: false }
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
      isBarbershopInactive: false,
    }
  }

  const associatedShopIds = rows.map((r: any) => r.barbershop_id).filter(Boolean) as string[]
  let isBarbershopInactive = false
  let activeAssociatedShopIds: string[] = []

  if (associatedShopIds.length > 0) {
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id, is_active')
      .in('id', associatedShopIds)

    const shopList = shops || []
    activeAssociatedShopIds = shopList.filter((s: any) => s.is_active !== false).map((s: any) => s.id)
    if (activeAssociatedShopIds.length === 0 && shopList.length > 0) {
      isBarbershopInactive = true
    }
  }

  const adminShops = rows
    .filter((r: any) => r.role === 'admin' && r.barbershop_id)
    .map((r: any) => String(r.barbershop_id))

  if (adminShops.length > 0) {
    const activeAdminShops = adminShops.filter((id: string) => activeAssociatedShopIds.includes(id))
    return { userId: user.id, role: isBarbershopInactive ? null : 'admin', isSuperAdmin: false, barbershopIds: activeAdminShops, isBarbershopInactive }
  }

  const barberShops = rows
    .filter((r: any) => r.role === 'barber' && r.barbershop_id)
    .map((r: any) => String(r.barbershop_id))

  if (barberShops.length > 0) {
    const activeBarberShops = barberShops.filter((id: string) => activeAssociatedShopIds.includes(id))
    return { userId: user.id, role: isBarbershopInactive ? null : 'barber', isSuperAdmin: false, barbershopIds: activeBarberShops, isBarbershopInactive }
  }

  const hasUserRole = rows.some((r: any) => r.role === 'user')
  if (hasUserRole) {
    return { userId: user.id, role: 'user', isSuperAdmin: false, barbershopIds: [], isBarbershopInactive: false }
  }

  const { data: owned } = await supabase.from('barbershops').select('id, is_active').eq('owner_id', user.id)
  const ownedShops = owned || []
  const activeOwnedShops = ownedShops.filter((s: any) => s.is_active !== false).map((s: any) => s.id)
  const allOwnedInactive = ownedShops.length > 0 && activeOwnedShops.length === 0

  return { userId: user.id, role: null, isSuperAdmin: false, barbershopIds: activeOwnedShops, isBarbershopInactive: allOwnedInactive }
}

export async function getPostLoginRedirectPath(): Promise<string> {
  const scope = await getRoleScope()
  if (scope.isSuperAdmin || scope.role === 'admin') return '/dashboard'
  if (scope.role === 'barber') return '/dashboard'
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

export async function getReportData(
  selectedBarbershopId?: string,
  options?: ReportDataOptions,
): Promise<{
  scope: ScopeResult
  metrics: DashboardReportMetrics
  topServices: ServiceReportItem[]
  monthlyData: MonthlyRevenueItem[]
  barbershops: Barbershop[]
}> {
  const supabase = await createClient()
  const scope = await getRoleScope()
  const barbershops = await getBarbershopsForScope()

  const activeShopIds =
    selectedBarbershopId && scope.isSuperAdmin
      ? [selectedBarbershopId]
      : scope.barbershopIds

  const emptyResult = {
    scope,
    barbershops,
    metrics: { totalAppointments: 0, scheduledAppointments: 0, completedAppointments: 0, canceledAppointments: 0, totalRevenue: 0 },
    topServices: [],
    monthlyData: [],
  }

  if (activeShopIds.length === 0) return emptyResult

  let appointmentsQuery = supabase
    .from('appointments')
    .select('id, service_id, status, appointment_date')
    .in('barbershop_id', activeShopIds)

  if (options?.startDate) appointmentsQuery = appointmentsQuery.gte('appointment_date', options.startDate)
  if (options?.endDate) appointmentsQuery = appointmentsQuery.lte('appointment_date', options.endDate)

  const { data: appointments } = await appointmentsQuery

  const { data: services } = await supabase
    .from('services')
    .select('id, name, price')
    .in('barbershop_id', activeShopIds)

  const aptRows = appointments || []
  const servicePriceById = new Map<string, number>(
    (services || []).map((s: any) => [String(s.id), normalizeMoney(s.price)]),
  )
  const serviceNameById = new Map<string, string>(
    (services || []).map((s: any) => [String(s.id), String(s.name)]),
  )

  const isRevenueEligible = (status: string) => status === 'completed' || status === 'scheduled'

  const metrics: DashboardReportMetrics = {
    totalAppointments: aptRows.length,
    scheduledAppointments: aptRows.filter((a: any) => a.status === 'scheduled').length,
    completedAppointments: aptRows.filter((a: any) => a.status === 'completed').length,
    canceledAppointments: aptRows.filter((a: any) => a.status === 'canceled').length,
    totalRevenue: aptRows.reduce((acc: number, apt: any) => {
      if (!isRevenueEligible(apt.status)) return acc
      return acc + (servicePriceById.get(String(apt.service_id)) || 0)
    }, 0),
  }

  // Serviços mais pedidos
  const serviceAgg = new Map<string, { bookings: number; revenue: number }>()
  for (const apt of aptRows as any[]) {
    const sid = String(apt.service_id)
    const item = serviceAgg.get(sid) || { bookings: 0, revenue: 0 }
    if (apt.status !== 'canceled') item.bookings += 1
    if (isRevenueEligible(apt.status)) item.revenue += servicePriceById.get(sid) || 0
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

  // Receita por mês
  const monthlyMap = new Map<string, { revenue: number; appointments: number }>()
  for (const apt of aptRows as any[]) {
    const month = String(apt.appointment_date || '').slice(0, 7) // "YYYY-MM"
    if (!month || month.length < 7) continue
    const existing = monthlyMap.get(month) || { revenue: 0, appointments: 0 }
    if (apt.status !== 'canceled') existing.appointments += 1
    if (isRevenueEligible(apt.status)) existing.revenue += servicePriceById.get(String(apt.service_id)) || 0
    monthlyMap.set(month, existing)
  }

  const monthlyData: MonthlyRevenueItem[] = Array.from(monthlyMap.entries())
    .map(([month, values]) => ({ month, label: monthLabel(month), ...values }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return { scope, metrics, topServices, monthlyData, barbershops }
}

export async function fetchAdminReportData(
  startDate: string,
  endDate: string,
  selectedBarbershopId?: string,
) {
  return getReportData(selectedBarbershopId, { startDate, endDate })
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

  return { users: profiles || [], roles: roles || [], barbershops: barbershops || [] }
}

export async function assignRole(formData: FormData) {
  const scope = await getRoleScope()
  if (!scope.isSuperAdmin) return { success: false, error: 'Sem permissao' }

  const userId = String(formData.get('userId') || '')
  const role = String(formData.get('role') || '') as UserRole
  const barbershopId = String(formData.get('barbershopId') || '')

  if (!userId) return { success: false, error: 'Usuario obrigatorio' }
  if (role !== 'admin' && role !== 'super_admin') return { success: false, error: 'Role invalida' }
  if (role === 'admin' && !barbershopId) return { success: false, error: 'Barbearia obrigatoria para admin' }

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
