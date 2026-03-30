import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserAppointments } from "@/app/actions/appointments"
import { MeusAgendamentosContent } from "@/components/meus-agendamentos-content"

export default async function MeusAgendamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const appointments = await getUserAppointments()

  return <MeusAgendamentosContent appointments={appointments} />
}
