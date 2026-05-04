import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getServices } from "@/app/actions/services"
import { getNextAppointment } from "@/app/actions/appointments"
import { DashboardContent } from "@/components/dashboard-content"
import { AdminDashboardContent } from "@/components/admin-dashboard-content"
import { getReportData, getRoleScope } from "@/app/actions/rbac"
import { getAdminManagementData } from "@/app/actions/admin-management"

interface DashboardPageProps {
  searchParams?: Promise<{ barbershop?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const params = searchParams ? await searchParams : undefined
  const selectedBarbershopId = params?.barbershop
  const scope = await getRoleScope()

  if (scope.isSuperAdmin || scope.role === 'admin') {
    const { metrics, topServices, barbershops } = await getReportData(selectedBarbershopId)
    const management = (scope.role === 'admin' || scope.isSuperAdmin)
      ? await getAdminManagementData()
      : { roles: [], barbers: [], services: [], users: [] }

    return (
      <AdminDashboardContent
        role={scope.isSuperAdmin ? 'super_admin' : 'admin'}
        userEmail={user.email}
        metrics={metrics}
        topServices={topServices}
        selectedBarbershopId={selectedBarbershopId}
        barbershops={barbershops}
        roles={management.roles}
        barbers={management.barbers}
        services={management.services}
        users={management.users}
        canManageRoles={scope.role === 'admin' || scope.isSuperAdmin}
      />
    )
  }

  if (scope.role === 'barber') {
    redirect('/barber/dashboard')
  }

  const { getBarbershops } = await import("@/app/actions/barbershops")

  const [services, nextAppointment, barbershops] = await Promise.all([
    getServices(selectedBarbershopId),
    getNextAppointment(),
    getBarbershops()
  ])

  return (
    <DashboardContent 
      services={services} 
      nextAppointment={nextAppointment}
      userEmail={user.email}
      barbershops={barbershops}
      selectedBarbershopId={selectedBarbershopId}
    />
  )
}
