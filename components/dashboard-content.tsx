"use client"

import Link from "next/link"
import { Calendar, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Service, Appointment, Barbershop } from "@/lib/types"

interface DashboardContentProps {
  services: Service[]
  nextAppointment: Appointment | null
  userEmail?: string
  userFullName?: string | null
  barbershops: Barbershop[]
  selectedBarbershopId?: string
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

function getGreeting(name?: string | null): { greeting: string; subtitle: string } {
  const hour = new Date().getHours()
  const firstName = name?.trim().split(' ')[0] || null

  let greeting = ''
  if (hour >= 5 && hour < 12) {
    greeting = firstName ? `Bom dia, ${firstName}!` : 'Bom dia!'
  } else if (hour >= 12 && hour < 18) {
    greeting = firstName ? `Boa tarde, ${firstName}!` : 'Boa tarde!'
  } else {
    greeting = firstName ? `Boa noite, ${firstName}!` : 'Boa noite!'
  }

  const subtitles = [
    'Pronto para agendar seu próximo corte?',
    'Seu estilo, no horário que preferir.',
    'Agende em segundos e garanta seu horário.',
    'Qual vai ser hoje?',
  ]
  const subtitle = subtitles[new Date().getDay() % subtitles.length]

  return { greeting, subtitle }
}

export function DashboardContent({ services, nextAppointment, userEmail, userFullName, barbershops, selectedBarbershopId }: DashboardContentProps) {
  const { greeting, subtitle } = getGreeting(userFullName)

  return (
    <>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {greeting}
        </h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </section>

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

        <section className="mb-12">
          <h3 className="text-xl font-semibold text-foreground mb-4">Selecione uma Barbearia</h3>

          {barbershops.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              Nenhuma barbearia cadastrada no sistema.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbershops.map((shop) => (
                <Link key={shop.id} href={`?barbershop=${shop.id}`}>
                  <Card className={`border-border p-6 hover:border-primary transition-colors cursor-pointer ${selectedBarbershopId === shop.id ? 'border-primary ring-1 ring-primary' : 'bg-card'}`}>
                    <h4 className="text-lg font-semibold text-foreground mb-2">{shop.name}</h4>
                    {shop.address && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{shop.address}</span>
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {selectedBarbershopId ? (
          <section>
            <h3 className="text-xl font-semibold text-foreground mb-4">Serviços da Barbearia</h3>

            {services.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Nenhum serviço encontrado para esta barbearia.
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
                        <Link href={`/agendar/${service.id}`}>
                          Agendar Agora
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </>
  )
}
