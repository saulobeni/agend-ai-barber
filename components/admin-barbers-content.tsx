"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { UserCog, Pencil, Trash2, Info } from "lucide-react"
import { updateBarberByAdmin, deleteBarberByAdmin } from "@/app/actions/admin-management"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { Barber, Barbershop, UserRole } from "@/lib/types"

interface AdminBarbersContentProps {
  role: UserRole
  barbers: Barber[]
  barbershops: Barbershop[]
  userEmail?: string
  userFullName?: string | null
}

function useAction() {
  const [isPending, startTransition] = useTransition()

  function run(
    action: (fd: FormData) => Promise<{ success: boolean; error?: string }>,
    formData: FormData,
    opts: { successMsg: string; onSuccess?: () => void },
  ) {
    startTransition(async () => {
      const result = await action(formData)
      if (result.success) {
        toast.success(opts.successMsg)
        opts.onSuccess?.()
      } else {
        toast.error(result.error || "Ocorreu um erro inesperado.")
      }
    })
  }

  return { isPending, run }
}

export function AdminBarbersContent({
  role,
  barbers: initialBarbers,
  barbershops,
  userEmail,
}: AdminBarbersContentProps) {
  const isSuperAdmin = role === "super_admin"
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers)
  const barbershopNameById = new Map(barbershops.map((b) => [b.id, b.name]))

  const { isPending, run } = useAction()

  const [editBarber, setEditBarber] = useState<Barber | null>(null)
  const [deleteBarberId, setDeleteBarberId] = useState<string | null>(null)

  function fd(obj: Record<string, string>) {
    const f = new FormData()
    Object.entries(obj).forEach(([k, v]) => f.set(k, v))
    return f
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Barbeiros</h1>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Nome e barbearia de cada barbeiro. {userEmail ? `• ${userEmail}` : ""}
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="size-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Para cadastrar um novo barbeiro, crie um usuário com perfil <strong>Barbeiro</strong> em{" "}
          <Link href="/usuarios" className="text-primary underline underline-offset-2">
            Usuários
          </Link>
          .
        </p>
      </div>

      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="size-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Barbeiros cadastrados</h3>
          <Badge variant="outline">{barbers.length}</Badge>
        </div>
        {barbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum barbeiro cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {barbers.map((barber) => (
              <div key={barber.id} className="text-sm border border-border/60 rounded-lg p-3">
                <div className="font-medium text-foreground">{barber.name}</div>
                {isSuperAdmin && (
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {barbershopNameById.get(barber.barbershop_id) || "—"}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditBarber(barber)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteBarberId(barber.id)}>
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editBarber} onOpenChange={(o) => !o && setEditBarber(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar barbeiro</DialogTitle>
          </DialogHeader>
          {editBarber && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                run(updateBarberByAdmin, formData, {
                  successMsg: "Barbeiro atualizado!",
                  onSuccess: () => {
                    const name = String(formData.get("name"))
                    setBarbers((prev) => prev.map((b) => (b.id === editBarber.id ? { ...b, name } : b)))
                    setEditBarber(null)
                  },
                })
              }}
              className="space-y-3"
            >
              <input type="hidden" name="barberId" value={editBarber.id} />
              <div>
                <Label className="mb-1 block">Nome</Label>
                <Input name="name" defaultValue={editBarber.name} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditBarber(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteBarberId} onOpenChange={(o) => !o && setDeleteBarberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir barbeiro</DialogTitle>
            <DialogDescription>
              Isso remove apenas o registro de barbeiro (nome/agenda). A conta de login do usuário continua
              existindo — para excluir o acesso por completo, use a página Usuários.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBarberId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteBarberId) return
                run(deleteBarberByAdmin, fd({ barberId: deleteBarberId }), {
                  successMsg: "Barbeiro excluído.",
                  onSuccess: () => {
                    setBarbers((prev) => prev.filter((b) => b.id !== deleteBarberId))
                    setDeleteBarberId(null)
                  },
                })
              }}
            >
              {isPending ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
