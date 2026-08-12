"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Check, Clock, Phone, Scissors, User, X } from "lucide-react"
import { cancelBarberAppointment, confirmBarberAppointment } from "@/app/actions/appointments"
import type { Appointment } from "@/lib/types"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"

interface BarberDashboardContentProps {
  appointments: Appointment[]
  userEmail?: string
  userFullName?: string | null
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluido",
  canceled: "Cancelado",
}

const statusBadgeClass: Record<string, string> = {
  scheduled: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  canceled: "bg-destructive/15 text-destructive border-destructive/20",
}

function toDateKey(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDisplayDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`)
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function parseTimeToMinutes(time: string): number {
  const parts = time.split(":")
  return Number(parts[0] ?? 0) * 60 + Number(parts[1] ?? 0)
}

function sortAppointmentsChronologically(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => {
    const dateCompare = a.appointment_date.localeCompare(b.appointment_date)
    if (dateCompare !== 0) return dateCompare
    return parseTimeToMinutes(a.appointment_time) - parseTimeToMinutes(b.appointment_time)
  })
}

interface MetricCardProps {
  label: string
  value: number
  color: string
}

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  )
}

export function BarberDashboardContent({
  appointments,
  userEmail,
  userFullName,
}: BarberDashboardContentProps) {
  const [localAppointments, setLocalAppointments] = useState(() =>
    sortAppointmentsChronologically(appointments),
  )
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {}
    for (const apt of localAppointments) {
      const key = toDateKey(apt.appointment_date)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(apt)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = grouped[key].sort(
        (a, b) => parseTimeToMinutes(a.appointment_time) - parseTimeToMinutes(b.appointment_time),
      )
    }
    return grouped
  }, [localAppointments])

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : ""
  const selectedDayAppointments = selectedDateKey ? (appointmentsByDate[selectedDateKey] ?? []) : []

  const bookedDays = useMemo(
    () => Object.keys(appointmentsByDate).map((d) => new Date(`${d}T12:00:00`)),
    [appointmentsByDate],
  )

  // Métricas do dia selecionado
  const metrics = useMemo(() => {
    const list = selectedDayAppointments
    return {
      total: list.length,
      scheduled: list.filter((a) => a.status === "scheduled").length,
      completed: list.filter((a) => a.status === "completed").length,
      canceled: list.filter((a) => a.status === "canceled").length,
    }
  }, [selectedDayAppointments])

  async function handleCancel(appointmentId: string) {
    setActionError("")
    setLoadingId(appointmentId)
    const result = await cancelBarberAppointment(appointmentId)
    if (result.success) {
      setLocalAppointments((prev) =>
        sortAppointmentsChronologically(
          prev.map((item) =>
            item.id === appointmentId ? { ...item, status: "canceled" } : item,
          ),
        ),
      )
    } else {
      setActionError(result.error || "Nao foi possivel cancelar o agendamento.")
    }
    setLoadingId(null)
  }

  async function handleConfirm(appointmentId: string) {
    setActionError("")
    setLoadingId(appointmentId)
    const result = await confirmBarberAppointment(appointmentId)
    if (result.success) {
      setLocalAppointments((prev) =>
        sortAppointmentsChronologically(
          prev.map((item) =>
            item.id === appointmentId ? { ...item, status: "completed" } : item,
          ),
        ),
      )
    } else {
      setActionError(result.error || "Nao foi possivel confirmar o agendamento.")
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Agenda do Barbeiro</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um dia no calendario para visualizar todos os horarios agendados.
        </p>
      </section>

        {/* Cards de métricas do dia selecionado */}
        {selectedDateKey && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Total do dia" value={metrics.total} color="text-foreground" />
            <MetricCard label="Agendados" value={metrics.scheduled} color="text-primary" />
            <MetricCard label="Concluidos" value={metrics.completed} color="text-emerald-500" />
            <MetricCard label="Cancelados" value={metrics.canceled} color="text-destructive" />
          </section>
        )}

        {actionError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          {/* Calendário */}
          <div className="bg-card border border-border rounded-xl p-4 xl:sticky xl:top-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Calendario</h3>
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => setSelectedDate(date)}
                modifiers={{ hasAppointments: bookedDays }}
                modifiersClassNames={{
                  hasAppointments:
                    "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                }}
                className="rounded-md border border-border"
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Dias com ponto indicam agendamentos marcados.
            </p>
          </div>

          {/* Lista de agendamentos */}
          <div className="bg-card border border-border rounded-xl p-5 min-h-[520px] flex flex-col">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground capitalize">
                  {selectedDateKey ? formatDisplayDate(selectedDateKey) : "Selecione um dia"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDayAppointments.length === 0
                    ? "Nenhum agendamento para este dia."
                    : `${selectedDayAppointments.length} agendamento(s) neste dia.`}
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {selectedDayAppointments.filter((a) => a.status === "scheduled").length} pendente(s)
              </Badge>
            </div>

            <div className="flex-1 space-y-4">
              {selectedDayAppointments.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-base font-medium text-foreground">
                    Nenhum agendamento para este dia
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-md">
                    Quando houver atendimentos marcados, eles aparecerao aqui em ordem cronologica.
                  </p>
                </div>
              ) : (
                selectedDayAppointments.map((apt) => (
                  <article
                    key={apt.id}
                    className="rounded-xl border border-border bg-background/60 p-4 shadow-sm transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm font-semibold text-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            {apt.appointment_time.slice(0, 5)}
                          </span>
                          <Badge className={statusBadgeClass[apt.status] || ""}>
                            {statusLabels[apt.status] || apt.status}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Cliente
                          </p>
                          <p className="text-lg font-semibold text-foreground flex items-center gap-2 mt-1">
                            <User className="h-4 w-4 text-primary" />
                            {apt.client?.name || "Cliente nao identificado"}
                          </p>
                          {apt.client?.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Phone className="h-4 w-4" />
                              {apt.client.phone}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Servico
                          </p>
                          <p className="text-sm font-medium text-foreground flex items-center gap-2 mt-1">
                            <Scissors className="h-4 w-4 text-primary" />
                            {apt.service?.name || "Servico"}
                            {apt.service?.duration_minutes ? (
                              <span className="text-muted-foreground">
                                - {apt.service.duration_minutes} min
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      {apt.status === "scheduled" && (
                        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:min-w-[160px]">
                          <button
                            onClick={() => handleConfirm(apt.id)}
                            disabled={loadingId === apt.id}
                            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            {loadingId === apt.id ? "Confirmando..." : "Confirmar"}
                          </button>
                          <button
                            onClick={() => handleCancel(apt.id)}
                            disabled={loadingId === apt.id}
                            className="inline-flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            {loadingId === apt.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
      </section>
    </div>
  )
}
