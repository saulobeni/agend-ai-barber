"use client"

import { Scissors, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const servicos = [
  {
    id: "corte",
    nome: "Corte",
    descricao: "Corte masculino moderno com acabamento preciso e estilização personalizada.",
    duracao: "45 min",
    preco: 45,
    icone: "scissors",
  },
  {
    id: "barba",
    nome: "Barba",
    descricao: "Aparar e modelar barba com toalha quente e produtos premium.",
    duracao: "30 min",
    preco: 30,
    icone: "razor",
  },
  {
    id: "combo",
    nome: "Combo",
    descricao: "Corte + Barba completos com tratamento VIP e finalização impecável.",
    duracao: "1h",
    preco: 65,
    icone: "combo",
  },
]

// Simula um próximo agendamento do usuário
const proximoAgendamento = {
  data: "16 de março",
  horario: "14:00",
  servico: "Corte",
}

function ServiceIcon({ type }: { type: string }) {
  switch (type) {
    case "scissors":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
          <circle cx="6" cy="6" r="3" stroke="#e74c3c" strokeWidth="2" fill="none" />
          <circle cx="6" cy="18" r="3" stroke="#e74c3c" strokeWidth="2" fill="none" />
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "razor":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
          <path d="M7 3L17 3L21 21L3 21L7 3Z" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M12 8L12 16" stroke="#3498db" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "combo":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
          <rect x="8" y="2" width="8" height="20" rx="2" stroke="#e67e22" strokeWidth="2" fill="none" />
          <path d="M8 6L16 6" stroke="#e67e22" strokeWidth="2" />
          <path d="M8 10L16 10" stroke="#e67e22" strokeWidth="2" />
          <circle cx="12" cy="16" r="2" stroke="#e67e22" strokeWidth="2" fill="none" />
        </svg>
      )
    default:
      return <Scissors className="h-8 w-8 text-primary" />
  }
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
          <Link href="/login">
            <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
            Estilo com a precisão.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl">
            Agende seu horário em segundos e tenha a melhor experiência de barbearia da cidade.
          </p>
        </section>

        {/* Próximo Agendamento */}
        <section className="mb-10">
          <div className="bg-secondary/50 border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-primary font-semibold">Próximo Agendamento</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{proximoAgendamento.data}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{proximoAgendamento.horario}</span>
              </div>
              <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm">
                {proximoAgendamento.servico}
              </span>
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section>
          <h3 className="text-xl font-bold text-foreground mb-6">Nossos Serviços</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {servicos.map((servico) => (
              <div
                key={servico.id}
                className="bg-card border border-border rounded-xl p-6 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <ServiceIcon type={servico.icone} />
                  <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                    {servico.duracao}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">{servico.nome}</h4>
                <p className="text-muted-foreground text-sm mb-4 flex-grow">
                  {servico.descricao}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-2xl font-bold text-primary">
                    R${servico.preco}
                  </span>
                  <Link href={`/agendar/${servico.id}`}>
                    <Button 
                      variant="outline" 
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Agendar Agora
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
