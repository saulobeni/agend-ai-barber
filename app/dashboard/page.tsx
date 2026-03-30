import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getServices } from "@/app/actions/services"
import { getNextAppointment } from "@/app/actions/appointments"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
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
