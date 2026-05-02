"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, Clock, LogOut, User } from "lucide-react"
import { signOut } from "@/app/actions/auth"
import { cancelBarberAppointment } from "@/app/actions/appointments"
import type { Appointment } from "@/lib/types"

interface BarberDashboardContentProps {
  appointments: Appointment[]
  userEmail?: string
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluido",
  canceled: "Cancelado",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function BarberDashboardContent({ appointments, userEmail }: BarberDashboardContentProps) {
  const [localAppointments, setLocalAppointments] = useState(appointments)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleCancel(appointmentId: string) {
    setLoadingId(appointmentId)
    const result = await cancelBarberAppointment(appointmentId)
    if (result.success) {
      setLocalAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: "canceled" } : item))
      )
    }
    setLoadingId(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard do Barbeiro</h1>
            <p className="text-sm text-muted-foreground">{userEmail ? `Barbeiro - ${userEmail}` : "Barbeiro"}</p>
          </div>
          <form action={signOut}>
            <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Agenda do dia</h2>

        {localAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="space-y-3">
            {localAppointments.map((apt) => (
              <div key={apt.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-foreground">{apt.service?.name || "Servico"}</div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{apt.client?.name || "Cliente nao identificado"}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(apt.appointment_date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.appointment_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">Status: {statusLabels[apt.status] || apt.status}</div>
                  </div>

                  {apt.status === "scheduled" && (
                    <button
                      onClick={() => handleCancel(apt.id)}
                      disabled={loadingId === apt.id}
                      className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm disabled:opacity-50"
                    >
                      {loadingId === apt.id ? "Cancelando..." : "Cancelar atendimento"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/meus-agendamentos" className="text-sm text-muted-foreground hover:text-foreground">
            Ver historico de agendamentos
          </Link>
        </div>
      </main>
    </div>
  )
}
