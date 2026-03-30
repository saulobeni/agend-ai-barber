import { Scissors, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CadastroSucessoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 shadow-lg text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-primary p-2 rounded-lg">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">
              <span className="text-foreground">Agenda</span>
              <span className="text-primary">AI</span>
              <span className="text-primary">Barber</span>
            </h1>
          </div>

          <div className="bg-primary/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Verifique seu e-mail
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Enviamos um link de confirmação para seu e-mail. 
            Clique no link para ativar sua conta e começar a agendar.
          </p>

          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/login">
              Voltar para login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
