import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getServiceBySlug } from "@/app/actions/services"
import { getAvailableBarbers } from "@/app/actions/appointments"
import { getRoleScope } from "@/app/actions/rbac"
import { AgendarContent } from "@/components/agendar-content"

interface AgendarPageProps {
  params: Promise<{ servico: string }>
}

export default async function AgendarPage({ params }: AgendarPageProps) {
  const { servico } = await params
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const scope = await getRoleScope()
  if (scope.role === "admin" || scope.role === "super_admin") {
    redirect("/dashboard")
  }
  if (scope.role === "barber") {
    redirect("/dashboard")
  }

  const service = await getServiceBySlug(servico)
  
  if (!service) {
    redirect("/dashboard")
  }

  const barbers = await getAvailableBarbers(service.barbershop_id)

  return (
    <AgendarContent 
      service={service}
      barbers={barbers}
    />
  )
}
