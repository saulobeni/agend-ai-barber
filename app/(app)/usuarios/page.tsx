import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoleScope } from "@/app/actions/rbac"
import { getProfile } from "@/app/actions/auth"
import { getAdminManagementData } from "@/app/actions/admin-management"
import { AdminUsersContent } from "@/components/admin-users-content"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"

export default async function UsuariosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const scope = await getRoleScope()

  if (scope.isBarbershopInactive) {
    return <DeactivatedBarbershopContent userEmail={user.email} />
  }

  if (scope.role !== "admin" && !scope.isSuperAdmin) {
    redirect("/dashboard")
  }

  const [{ roles, users, barbershops }, profile] = await Promise.all([
    getAdminManagementData(),
    getProfile(),
  ])

  return (
    <AdminUsersContent
      role={scope.isSuperAdmin ? "super_admin" : "admin"}
      roles={roles}
      users={users}
      barbershops={barbershops}
      userEmail={user.email}
      userFullName={profile?.full_name}
    />
  )
}
