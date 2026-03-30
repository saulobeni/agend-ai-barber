"use client"

import Link from "next/link"
import { Scissors, Calendar, Clock, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { signOut } from "@/app/actions/auth"
import type { Service, Appointment } from "@/lib/types"

interface DashboardContentProps {
  services: Service[]
  nextAppointment: Appointment | null
  userEmail?: string
}

const serviceIcons: Record<string, string> = {
  'Corte': '✂️',
  'Barba': '🪒',
  'Combo': '💈',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function formatPrice(price: number): string {
  return `R$${price.toFixed(0)}`
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`
  }
  return `${minutes} min`
}

export function DashboardContent({ services, nextAppointment, userEmail }: DashboardContentProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">
              <span className="text-foreground">Agenda</span>
              <span className="text-primary">AI</span>
              <span className="text-primary">Barber</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/meus-agendamentos" className="text-muted-foreground hover:text-foreground text-sm">
              Meus Agendamentos
            </Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2 text-balance">
            Estilo com a precisão.
          </h2>
          <p className="text-muted-foreground">
            Agende seu horário em segundos e tenha a melhor experiência de barbearia da cidade.
          </p>
        </section>

        {/* Próximo Agendamento */}
        <Card className="bg-card border-border p-4 mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Próximo Agendamento</span>
          </div>

          {nextAppointment ? (
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(nextAppointment.appointment_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{nextAppointment.appointment_time.slice(0, 5)}</span>
              </div>
              <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                {nextAppointment.service?.name || 'Serviço'}
              </span>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Nenhum agendamento futuro encontrado.
            </div>
          )}
        </Card>

        {/* Serviços */}
        <section>
          <h3 className="text-xl font-semibold text-foreground mb-4">Nossos Serviços</h3>
          
          {services.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              Nenhum serviço encontrado para sua barbearia.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map((service) => (
                <Card key={service.id} className="bg-card border-border p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{serviceIcons[service.name] || '💈'}</span>
                    <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                      {formatDuration(service.duration_minutes)}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-foreground mb-2">{service.name}</h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    {service.description || 'Serviço de barbearia profissional.'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(service.price)}
                    </span>
                    <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href={`/agendar/${service.name.toLowerCase()}`}>
                        Agendar Agora
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
