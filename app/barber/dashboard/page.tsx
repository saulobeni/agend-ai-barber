import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoleScope } from "@/app/actions/rbac"
import { getBarberAppointments } from "@/app/actions/appointments"
import { BarberDashboardContent } from "@/components/barber-dashboard-content"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"

export default async function BarberDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const scope = await getRoleScope()
  
  if (scope.isBarbershopInactive) {
    return <DeactivatedBarbershopContent userEmail={user?.email} />
  }

  if (scope.role !== "barber") redirect("/dashboard")

  const appointments = await getBarberAppointments()
  return <BarberDashboardContent appointments={appointments} userEmail={user.email} />
}
