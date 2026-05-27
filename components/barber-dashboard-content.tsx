"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Clock, LogOut, User, X } from "lucide-react"
import { signOut } from "@/app/actions/auth"
import { cancelBarberAppointment, confirmBarberAppointment } from "@/app/actions/appointments"
import type { Appointment } from "@/lib/types"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
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

  async function handleConfirm(appointmentId: string) {
    setLoadingId(appointmentId)
    const result = await confirmBarberAppointment(appointmentId)
    if (result.success) {
      setLocalAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: "completed" } : item))
      )
    }
    setLoadingId(null)
  }

  const normalizeDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const appointmentsByDate = localAppointments.reduce<Record<string, Appointment[]>>((acc, appointment) => {
    const dateKey = appointment.appointment_date
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(appointment)
    return acc
  }, {})

  const selectedDateKey = selectedDate ? normalizeDateKey(selectedDate) : ""
  const selectedDayAppointments = selectedDateKey ? appointmentsByDate[selectedDateKey] ?? [] : []
  const bookedDays = Object.keys(appointmentsByDate).map((date) => new Date(`${date}T00:00:00`))

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
        <h2 className="text-2xl font-semibold mb-4">Agenda de atendimentos</h2>

        {localAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
        ) : (
          <div className="bg-card border border-border rounded-lg p-4 inline-block">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date)}
              onDayClick={(date) => {
                setSelectedDate(date)
                setIsDayModalOpen(true)
              }}
              modifiers={{ hasAppointments: bookedDays }}
              modifiersClassNames={{
                hasAppointments: "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
              }}
            />
          </div>
        )}

        <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedDate ? `Agenda de ${formatDate(selectedDateKey)}` : "Agenda do dia"}</DialogTitle>
              <DialogDescription>
                {selectedDayAppointments.length === 0
                  ? "Nenhum agendamento para este dia."
                  : `${selectedDayAppointments.length} agendamento(s) neste dia.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground">Selecione outro dia para ver os atendimentos.</p>
              )}

              {selectedDayAppointments.map((apt) => (
                <div key={apt.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 text-sm">
                      <div className="font-semibold text-foreground">{apt.service?.name || "Servico"}</div>
                      <div className="text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{apt.client?.name || "Cliente nao identificado"}</span>
                      </div>
                      <div className="text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.appointment_time.slice(0, 5)}
                      </div>
                      <div className="text-xs text-muted-foreground">Status: {statusLabels[apt.status] || apt.status}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {apt.status === "scheduled" && (
                        <>
                          <button
                            onClick={() => handleConfirm(apt.id)}
                            disabled={loadingId === apt.id}
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            {loadingId === apt.id ? "Confirmando..." : "Confirmar"}
                          </button>
                          <button
                            onClick={() => handleCancel(apt.id)}
                            disabled={loadingId === apt.id}
                            className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            {loadingId === apt.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-6">
          <Link href="/meus-agendamentos" className="text-sm text-muted-foreground hover:text-foreground">
            Ver historico de agendamentos
          </Link>
        </div>
      </main>
    </div>
  )
}
