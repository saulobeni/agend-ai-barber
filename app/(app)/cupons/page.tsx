import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoleScope } from "@/app/actions/rbac"
import { getProfile } from "@/app/actions/auth"
import { getAdminCouponsData } from "@/app/actions/coupons"
import { AdminCouponsContent } from "@/components/admin-coupons-content"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"

export default async function CuponsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const scope = await getRoleScope()

  if (scope.isBarbershopInactive) {
    return <DeactivatedBarbershopContent userEmail={user.email} />
  }

  // Apenas para perfis admin (conforme solicitação explícita do usuário)
  if (scope.role !== "admin") {
    redirect("/dashboard")
  }

  const [{ coupons, services, barbershop }, profile] = await Promise.all([
    getAdminCouponsData(),
    getProfile(),
  ])

  return (
    <AdminCouponsContent
      coupons={coupons}
      services={services}
      barbershop={barbershop}
      userEmail={user.email}
      userFullName={profile?.full_name}
    />
  )
}
