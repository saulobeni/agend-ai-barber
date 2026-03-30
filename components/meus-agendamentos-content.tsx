"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cancelAppointment } from "@/app/actions/appointments"
import type { Appointment } from "@/lib/types"

interface MeusAgendamentosContentProps {
  appointments: Appointment[]
}

const statusLabels: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-yellow-500/10 text-yellow-500" },
  completed: { label: "Concluído", className: "bg-blue-500/10 text-blue-500" },
  canceled: { label: "Cancelado", className: "bg-red-500/10 text-red-500" },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  })
}

export function MeusAgendamentosContent({ appointments }: MeusAgendamentosContentProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [localAppointments, setLocalAppointments] = useState(appointments)

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return
    
    setLoading(appointmentId)
    const result = await cancelAppointment(appointmentId)
    
    if (result.success) {
      setLocalAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'canceled' as const } 
            : apt
        )
      )
    }
    setLoading(null)
  }

  const upcomingAppointments = localAppointments.filter(
    apt => apt.status === 'scheduled'
  )
  
  const pastAppointments = localAppointments.filter(
    apt => apt.status === 'completed' || apt.status === 'canceled'
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-foreground">Meus Agendamentos</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {localAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Nenhum agendamento encontrado
            </h2>
            <p className="text-muted-foreground mb-6">
              Você ainda não fez nenhum agendamento.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/dashboard">
                Agendar Agora
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Próximos Agendamentos */}
            {upcomingAppointments.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Próximos Agendamentos
                </h2>
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <Card key={appointment.id} className="bg-card border-border p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {appointment.service?.name || 'Serviço'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${statusLabels[appointment.status].className}`}>
                              {statusLabels[appointment.status].label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(appointment.appointment_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.appointment_time.slice(0, 5)}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            R${appointment.service?.price.toFixed(0) || '0'}
                          </p>
                        </div>
                        
                        {appointment.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={loading === appointment.id}
                            onClick={() => handleCancel(appointment.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {loading === appointment.id ? "Cancelando..." : "Cancelar"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Histórico */}
            {pastAppointments.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Histórico
                </h2>
                <div className="space-y-4">
                  {pastAppointments.map((appointment) => (
                    <Card key={appointment.id} className="bg-card border-border p-4 opacity-60">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {appointment.service?.name || 'Serviço'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusLabels[appointment.status].className}`}>
                            {statusLabels[appointment.status].label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{appointment.appointment_time.slice(0, 5)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
