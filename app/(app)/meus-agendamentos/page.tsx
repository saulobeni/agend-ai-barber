import { redirect } from "next/navigation"
import { getUserAppointments } from "@/app/actions/appointments"
import { getRoleScope } from "@/app/actions/rbac"
import { MeusAgendamentosContent } from "@/components/meus-agendamentos-content"

export default async function MeusAgendamentosPage() {
  const scope = await getRoleScope()
  if (scope.role === "admin" || scope.role === "super_admin") {
    redirect("/dashboard")
  }
  if (scope.role === "barber") {
    redirect("/dashboard")
  }

  const appointments = await getUserAppointments()

  return <MeusAgendamentosContent appointments={appointments} />
}
