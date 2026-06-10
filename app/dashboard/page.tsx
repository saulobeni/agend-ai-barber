import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getServices } from "@/app/actions/services"
import { getBarberAppointments, getNextAppointment } from "@/app/actions/appointments"
import { DashboardContent } from "@/components/dashboard-content"
import { AdminDashboardContent } from "@/components/admin-dashboard-content"
import { getProfile } from "@/app/actions/auth"
import { getReportData, getRoleScope } from "@/app/actions/rbac"
import { getDefaultReportDateRange } from "@/lib/report-date"
import { getAdminManagementData } from "@/app/actions/admin-management"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"
import { BarberDashboardContent } from "@/components/barber-dashboard-content"

interface DashboardPageProps {
  searchParams?: Promise<{ barbershop?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const params = searchParams ? await searchParams : undefined
  const selectedBarbershopId = params?.barbershop
  const scope = await getRoleScope()

  if (scope.isBarbershopInactive) {
    return <DeactivatedBarbershopContent userEmail={user.email} />
  }

  if (scope.isSuperAdmin || scope.role === 'admin') {
    const reportDateRange = scope.role === 'admin' ? getDefaultReportDateRange() : undefined
    const [{ metrics, topServices, monthlyData, barbershops }, profile, management] = await Promise.all([
      getReportData(selectedBarbershopId, reportDateRange),
      getProfile(),
      (scope.role === 'admin' || scope.isSuperAdmin)
        ? getAdminManagementData()
        : Promise.resolve({ roles: [], barbers: [], services: [], users: [] }),
    ])

    return (
      <AdminDashboardContent
        role={scope.isSuperAdmin ? 'super_admin' : 'admin'}
        userEmail={user.email}
        userFullName={profile?.full_name}
        metrics={metrics}
        topServices={topServices}
        monthlyData={monthlyData}
        reportStartDate={reportDateRange?.startDate}
        reportEndDate={reportDateRange?.endDate}
        selectedBarbershopId={selectedBarbershopId}
        barbershops={barbershops}
        roles={management.roles}
        services={management.services}
        users={management.users}
        canManageRoles={scope.role === 'admin' || scope.isSuperAdmin}
      />
    )
  }

  if (scope.role === 'barber') {
    const [appointments, profile] = await Promise.all([
      getBarberAppointments(),
      getProfile(),
    ])
    return (
      <BarberDashboardContent
        appointments={appointments}
        userEmail={user.email}
        userFullName={profile?.full_name}
      />
    )
  }

  const { getBarbershops } = await import("@/app/actions/barbershops")
  const [services, nextAppointment, barbershops, profile] = await Promise.all([
    getServices(selectedBarbershopId),
    getNextAppointment(),
    getBarbershops(),
    getProfile(),
  ])

  return (
    <DashboardContent
      services={services}
      nextAppointment={nextAppointment}
      userEmail={user.email}
      userFullName={profile?.full_name}
      barbershops={barbershops}
      selectedBarbershopId={selectedBarbershopId}
    />
  )
}
