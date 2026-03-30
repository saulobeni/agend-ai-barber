"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createAppointment, getAvailableTimes } from "@/app/actions/appointments"
import type { Service, Barber } from "@/lib/types"

interface AgendarContentProps {
  service: Service
  barbers: Barber[]
}

const serviceIcons: Record<string, string> = {
  'Corte': '✂️',
  'Barba': '🪒',
  'Combo': '💈',
}

const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]
const meses = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]

function gerarCalendario(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const diasNoMes = ultimoDia.getDate()
  const diaSemanaInicio = primeiroDia.getDay()
  
  const dias: (number | null)[] = []
  
  for (let i = 0; i < diaSemanaInicio; i++) {
    dias.push(null)
  }
  
  for (let i = 1; i <= diasNoMes; i++) {
    dias.push(i)
  }
  
  while (dias.length % 7 !== 0) {
    dias.push(null)
  }
  
  return dias
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`
  }
  return `${minutes} min`
}

export function AgendarContent({ service, barbers }: AgendarContentProps) {
  const router = useRouter()
  const hoje = new Date()
  
  const [mesAtual, setMesAtual] = useState(hoje.getMonth())
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string | null>(
    barbers.length > 0 ? barbers[0].id : null
  )
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const diasCalendario = gerarCalendario(anoAtual, mesAtual)

  // Buscar horários quando selecionar dia e barbeiro
  useEffect(() => {
    async function fetchHorarios() {
      if (!diaSelecionado || !barbeiroSelecionado) {
        setHorariosDisponiveis([])
        return
      }

      setLoadingHorarios(true)
      const data = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`
      
      const horarios = await getAvailableTimes(
        barbeiroSelecionado,
        data,
        service.duration_minutes
      )
      
      setHorariosDisponiveis(horarios)
      setHorarioSelecionado(null)
      setLoadingHorarios(false)
    }

    fetchHorarios()
  }, [diaSelecionado, barbeiroSelecionado, mesAtual, anoAtual, service.duration_minutes])

  const irMesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual(anoAtual - 1)
    } else {
      setMesAtual(mesAtual - 1)
    }
    setDiaSelecionado(null)
    setHorarioSelecionado(null)
  }

  const irProximoMes = () => {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual(anoAtual + 1)
    } else {
      setMesAtual(mesAtual + 1)
    }
    setDiaSelecionado(null)
    setHorarioSelecionado(null)
  }

  const formatarData = () => {
    if (!diaSelecionado) return "-"
    const dia = String(diaSelecionado).padStart(2, "0")
    const mes = String(mesAtual + 1).padStart(2, "0")
    return `${dia}/${mes}/${anoAtual}`
  }

  const handleConfirmar = async () => {
    if (!diaSelecionado || !horarioSelecionado || !barbeiroSelecionado) return

    setLoading(true)
    setError("")

    const data = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`

    const result = await createAppointment({
      serviceId: service.id,
      barberId: barbeiroSelecionado,
      date: data,
      time: horarioSelecionado,
      duration: service.duration_minutes,
    })

    if (result.success) {
      router.push(`/agendamento/confirmado?id=${result.appointmentId}`)
    } else {
      setError(result.error || "Erro ao criar agendamento")
      setLoading(false)
    }
  }

  const isDiaPassado = (dia: number) => {
    const dataComparar = new Date(anoAtual, mesAtual, dia)
    const hojeZerado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    return dataComparar < hojeZerado
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Agendar {service.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDuration(service.duration_minutes)} · R${service.price.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Calendário e Horários */}
          <div className="lg:col-span-2 space-y-8">
            {/* Seleção de Barbeiro */}
            {barbers.length > 1 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Escolha o barbeiro</h2>
                <div className="flex flex-wrap gap-2">
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={() => setBarbeiroSelecionado(barber.id)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${barbeiroSelecionado === barber.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-foreground hover:bg-secondary/80"}
                      `}
                    >
                      {barber.name || "Barbeiro"}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Calendário */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Escolha a data</h2>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-4 max-w-md">
                {/* Navegação do mês */}
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={irMesAnterior}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    {"<"}
                  </button>
                  <span className="font-medium text-foreground">
                    {meses[mesAtual]} {anoAtual}
                  </span>
                  <button 
                    onClick={irProximoMes}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    {">"}
                  </button>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {diasSemana.map((dia) => (
                    <div key={dia} className="text-center text-sm text-muted-foreground py-2">
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Dias do mês */}
                <div className="grid grid-cols-7 gap-1">
                  {diasCalendario.map((dia, index) => {
                    if (dia === null) {
                      return <div key={index} className="py-2" />
                    }
                    
                    const passado = isDiaPassado(dia)
                    const selecionado = dia === diaSelecionado
                    const ehHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()
                    
                    return (
                      <button
                        key={index}
                        disabled={passado}
                        onClick={() => setDiaSelecionado(dia)}
                        className={`
                          py-2 text-center rounded-lg text-sm transition-colors
                          ${passado ? "text-muted-foreground/40 cursor-not-allowed" : ""}
                          ${selecionado ? "bg-primary text-primary-foreground" : ""}
                          ${!passado && !selecionado ? "hover:bg-secondary text-foreground" : ""}
                          ${ehHoje && !selecionado ? "ring-1 ring-primary" : ""}
                        `}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Horários */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Horários disponíveis</h2>
              </div>
              
              {loadingHorarios ? (
                <p className="text-muted-foreground">Carregando horários...</p>
              ) : !diaSelecionado ? (
                <p className="text-muted-foreground">Selecione uma data para ver os horários disponíveis.</p>
              ) : horariosDisponiveis.length === 0 ? (
                <p className="text-muted-foreground">Nenhum horário disponível nesta data.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {horariosDisponiveis.map((horario) => {
                    const selecionado = horario === horarioSelecionado
                    
                    return (
                      <button
                        key={horario}
                        onClick={() => setHorarioSelecionado(horario)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${selecionado ? "bg-primary text-primary-foreground" : ""}
                          ${!selecionado ? "bg-secondary text-foreground hover:bg-secondary/80" : ""}
                        `}
                      >
                        {horario}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Resumo do Pedido</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Serviço</span>
                  <div className="flex items-center gap-2">
                    <span>{serviceIcons[service.name] || '💈'}</span>
                    <span className="text-foreground font-medium">{service.name}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duração</span>
                  <span className="text-foreground">{formatDuration(service.duration_minutes)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="text-foreground">{formatarData()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  {horarioSelecionado ? (
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs">
                      {horarioSelecionado}
                    </span>
                  ) : (
                    <span className="text-foreground">-</span>
                  )}
                </div>
              </div>

              <div className="border-t border-border my-4" />
              
              <div className="flex items-center justify-between mb-6">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">R${service.price.toFixed(0)}</span>
              </div>

              <Button
                onClick={handleConfirmar}
                disabled={!diaSelecionado || !horarioSelecionado || loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {loading ? "Confirmando..." : "Confirmar Agendamento"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
