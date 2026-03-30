"use client"

import { useState } from "react"
import { Scissors } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login } from "@/app/actions/auth"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
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

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
            >
              {loading ? "Entrando..." : "Entrar"}
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
