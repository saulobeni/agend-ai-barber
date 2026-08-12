import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/app/actions/auth"
import { getRoleScope } from "@/app/actions/rbac"
import { AppShell } from "@/components/app-shell"
import { DeactivatedBarbershopContent } from "@/components/deactivated-barbershop-content"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const scope = await getRoleScope()

  if (scope.isBarbershopInactive) {
    return <DeactivatedBarbershopContent userEmail={user.email} />
  }

  if (!scope.role) redirect("/login")

  const profile = await getProfile()

  return (
    <AppShell role={scope.role} userEmail={user.email} userFullName={profile?.full_name}>
      {children}
    </AppShell>
  )
}
