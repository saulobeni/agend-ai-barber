import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoleScope } from "@/app/actions/rbac"
import { getProfile } from "@/app/actions/auth"
import { getAdminManagementData } from "@/app/actions/admin-management"
import { AdminServicesContent } from "@/components/admin-services-content"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"

export default async function ServicosPage() {
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

  const [{ services }, profile] = await Promise.all([
    getAdminManagementData(),
    getProfile(),
  ])

  return (
    <AdminServicesContent
      services={services}
      userEmail={user.email}
      userFullName={profile?.full_name}
    />
  )
}
