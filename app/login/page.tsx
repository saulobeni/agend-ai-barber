"use client"

import { useState } from "react"
import { Scissors } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simula login - em produção conectaria com backend
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 shadow-lg">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-primary p-2 rounded-lg">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">
              <span className="text-foreground">Agenda</span>
              <span className="text-primary">AI</span>
              <span className="text-primary">Barber</span>
            </h1>
          </div>
          
          <p className="text-muted-foreground text-center mb-6">
            Entre na sua conta para agendar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="senha" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <Input
                id="senha"
                type="password"
                placeholder="********"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
            >
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {"Não tem uma conta? "}
            <Link href="/cadastro" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
