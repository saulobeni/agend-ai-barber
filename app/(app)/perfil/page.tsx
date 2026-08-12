"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { User } from "lucide-react"
import { toast } from "sonner"
import { getProfileData, updateProfile } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PerfilPage() {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    getProfileData().then((data) => {
      if (!data) {
        router.push("/login")
        return
      }
      setFullName(data.fullName)
      setPhone(data.phone)
      setEmail(data.email)
      setLoading(false)
    })
  }, [router])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.success) {
        toast.success("Perfil atualizado com sucesso!")
      } else {
        toast.error(result?.error || "Erro ao atualizar perfil")
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Meu Perfil</h1>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{fullName || "Usuario"}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <hr className="border-border" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail nao pode ser alterado por aqui.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar alteracoes"}
              </Button>
            </div>
          </form>
      </div>
    </div>
  )
}
