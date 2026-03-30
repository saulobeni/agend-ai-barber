import Link from "next/link"
import { CheckCircle, Calendar, Clock, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AgendamentoConfirmadoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="bg-green-500/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Agendamento Confirmado!
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Seu horário foi reservado com sucesso. Você receberá uma confirmação por e-mail.
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/meus-agendamentos">
                Ver Meus Agendamentos
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">
                Voltar ao Início
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
