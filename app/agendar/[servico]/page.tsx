"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"

const servicosData: Record<string, { nome: string; duracao: string; preco: number; icone: string }> = {
  corte: {
    nome: "Corte",
    duracao: "45 min",
    preco: 45,
    icone: "scissors",
  },
  barba: {
    nome: "Barba",
    duracao: "30 min",
    preco: 30,
    icone: "razor",
  },
  combo: {
    nome: "Combo",
    duracao: "1h",
    preco: 65,
    icone: "combo",
  },
}

const horarios = [
  "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"
]

const horariosIndisponiveis = ["11:00"]

const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]

function gerarCalendario(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const diasNoMes = ultimoDia.getDate()
  const diaSemanaInicio = primeiroDia.getDay()
  
  const dias: (number | null)[] = []
  
  // Dias vazios antes do primeiro dia
  for (let i = 0; i < diaSemanaInicio; i++) {
    dias.push(null)
  }
  
  // Dias do mês
  for (let i = 1; i <= diasNoMes; i++) {
    dias.push(i)
  }
  
  // Completar a última semana
  while (dias.length % 7 !== 0) {
    dias.push(null)
  }
  
  return dias
}

const meses = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]

function ServiceIcon({ type }: { type: string }) {
  switch (type) {
    case "scissors":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="6" cy="6" r="3" stroke="#e74c3c" strokeWidth="2" fill="none" />
          <circle cx="6" cy="18" r="3" stroke="#e74c3c" strokeWidth="2" fill="none" />
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "razor":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M7 3L17 3L21 21L3 21L7 3Z" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M12 8L12 16" stroke="#3498db" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "combo":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <rect x="8" y="2" width="8" height="20" rx="2" stroke="#e67e22" strokeWidth="2" fill="none" />
          <path d="M8 6L16 6" stroke="#e67e22" strokeWidth="2" />
          <path d="M8 10L16 10" stroke="#e67e22" strokeWidth="2" />
          <circle cx="12" cy="16" r="2" stroke="#e67e22" strokeWidth="2" fill="none" />
        </svg>
      )
    default:
      return <Scissors className="h-5 w-5 text-primary" />
  }
}

export default function AgendarPage() {
  const params = useParams()
  const router = useRouter()
  const servicoId = params.servico as string
  const servico = servicosData[servicoId] || servicosData.corte

  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(hoje.getMonth())
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null)

  const diasCalendario = gerarCalendario(anoAtual, mesAtual)

  const irMesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual(anoAtual - 1)
    } else {
      setMesAtual(mesAtual - 1)
    }
    setDiaSelecionado(null)
  }

  const irProximoMes = () => {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual(anoAtual + 1)
    } else {
      setMesAtual(mesAtual + 1)
    }
    setDiaSelecionado(null)
  }

  const formatarData = () => {
    if (!diaSelecionado) return "-"
    const dia = String(diaSelecionado).padStart(2, "0")
    const mes = String(mesAtual + 1).padStart(2, "0")
    return `${dia}/${mes}/${anoAtual}`
  }

  const handleConfirmar = () => {
    if (diaSelecionado && horarioSelecionado) {
      alert(`Agendamento confirmado!\n\nServiço: ${servico.nome}\nData: ${formatarData()}\nHorário: ${horarioSelecionado}\nTotal: R$${servico.preco}`)
      router.push("/")
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
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Agendar {servico.nome}</h1>
              <p className="text-sm text-muted-foreground">{servico.duracao} · R${servico.preco}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Calendário e Horários */}
          <div className="lg:col-span-2 space-y-8">
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
              
              <div className="flex flex-wrap gap-2">
                {horarios.map((horario) => {
                  const indisponivel = horariosIndisponiveis.includes(horario)
                  const selecionado = horario === horarioSelecionado
                  
                  return (
                    <button
                      key={horario}
                      disabled={indisponivel}
                      onClick={() => setHorarioSelecionado(horario)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${indisponivel ? "bg-muted text-muted-foreground/40 cursor-not-allowed line-through" : ""}
                        ${selecionado ? "bg-primary text-primary-foreground" : ""}
                        ${!indisponivel && !selecionado ? "bg-secondary text-foreground hover:bg-secondary/80" : ""}
                      `}
                    >
                      {horario}
                    </button>
                  )
                })}
              </div>
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
                    <ServiceIcon type={servico.icone} />
                    <span className="text-foreground font-medium">{servico.nome}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duração</span>
                  <span className="text-foreground">{servico.duracao}</span>
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
                <span className="text-2xl font-bold text-primary">R${servico.preco}</span>
              </div>

              <Button
                onClick={handleConfirmar}
                disabled={!diaSelecionado || !horarioSelecionado}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
