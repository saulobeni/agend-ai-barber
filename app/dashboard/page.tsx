import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getServices } from "@/app/actions/services"
import { getNextAppointment } from "@/app/actions/appointments"
import { DashboardContent } from "@/components/dashboard-content"
import { AdminDashboardContent } from "@/components/admin-dashboard-content"
import { getReportData, getRoleScope, getUsersAndRolesForManagement } from "@/app/actions/rbac"

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
    const [{ metrics, topServices, barbershops }, management] = await Promise.all([
      getReportData(selectedBarbershopId),
      getUsersAndRolesForManagement(),
    ])

    return (
      <AdminDashboardContent
        role={scope.isSuperAdmin ? 'super_admin' : 'admin'}
        userEmail={user.email}
        metrics={metrics}
        topServices={topServices}
        selectedBarbershopId={selectedBarbershopId}
        barbershops={barbershops}
        users={management.users}
        roles={management.roles}
        canManageRoles={scope.isSuperAdmin}
      />
    )
  }

  const [services, nextAppointment] = await Promise.all([
    getServices(),
    getNextAppointment()
  ])

  return (
    <DashboardContent 
      services={services} 
      nextAppointment={nextAppointment}
      userEmail={user.email}
    />
  )
}
