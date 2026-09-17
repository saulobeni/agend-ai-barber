import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoleScope } from "@/app/actions/rbac"
import { getProfile } from "@/app/actions/auth"
import { getAdminBarberServicesData } from "@/app/actions/barber-services"
import { AdminBarberServicesContent } from "@/components/admin-barber-services-content"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"

export default async function ServicosPorBarbeiroPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const scope = await getRoleScope()

  if (scope.isBarbershopInactive) {
    return <DeactivatedBarbershopContent userEmail={user.email} />
  }

  if (scope.role !== "admin") {
    redirect("/dashboard")
  }

  const [{ barbers, services }, profile] = await Promise.all([
    getAdminBarberServicesData(),
    getProfile(),
  ])

  return (
    <AdminBarberServicesContent
      barbers={barbers}
      services={services}
      userEmail={user.email}
      userFullName={profile?.full_name}
    />
  )
}
