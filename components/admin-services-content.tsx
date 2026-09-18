"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"
import { ClipboardList, Plus, Pencil, Trash2 } from "lucide-react"
import {
  createServiceByAdmin,
  updateServiceByAdmin,
  deleteServiceByAdmin,
} from "@/app/actions/admin-management"
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
import type { Service } from "@/lib/types"

interface AdminServicesContentProps {
  services: Service[]
  userEmail?: string
  userFullName?: string | null
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
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

export function AdminServicesContent({ services: initialServices, userEmail }: AdminServicesContentProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const { isPending, run } = useAction()

  const [editService, setEditService] = useState<Service | null>(null)
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null)

  function fd(obj: Record<string, string>) {
    const f = new FormData()
    Object.entries(obj).forEach(([k, v]) => f.set(k, v))
    return f
  }

  function handleCreateService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    run(createServiceByAdmin, formData, {
      successMsg: "Serviço cadastrado com sucesso!",
      onSuccess: () => form.reset(),
    })
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Serviços</h1>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            Admin
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Catálogo de serviços da sua barbearia. {userEmail ? `• ${userEmail}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-5">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground">Cadastrar serviço</h3>
            </div>
            <form onSubmit={handleCreateService} className="space-y-3">
              <div>
                <Label className="mb-1 block">Nome</Label>
                <Input name="name" required placeholder="Ex.: Corte premium" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Preço (R$)</Label>
                  <Input name="price" type="number" min="0" step="0.01" required />
                </div>
                <div>
                  <Label className="mb-1 block">Duração (min)</Label>
                  <Input name="durationMinutes" type="number" min="1" step="1" required />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Cadastrando..." : "Cadastrar serviço"}
              </Button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="size-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Serviços cadastrados</h3>
              <Badge variant="outline">{services.length}</Badge>
            </div>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {services.map((s) => (
                  <div key={s.id} className="text-sm border border-border/60 rounded-lg p-3">
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {formatCurrency(s.price)} • {s.duration_minutes} min
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditService(s)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteServiceId(s.id)}>
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!editService} onOpenChange={(o) => !o && setEditService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar serviço</DialogTitle>
          </DialogHeader>
          {editService && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                run(updateServiceByAdmin, formData, {
                  successMsg: "Serviço atualizado!",
                  onSuccess: () => {
                    const name = String(formData.get("name"))
                    const price = Number(formData.get("price"))
                    const duration = Number(formData.get("durationMinutes"))
                    setServices((prev) =>
                      prev.map((s) =>
                        s.id === editService.id ? { ...s, name, price, duration_minutes: duration } : s,
                      ),
                    )
                    setEditService(null)
                  },
                })
              }}
              className="space-y-3"
            >
              <input type="hidden" name="serviceId" value={editService.id} />
              <div>
                <Label className="mb-1 block">Nome</Label>
                <Input name="name" defaultValue={editService.name} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Preço (R$)</Label>
                  <Input name="price" type="number" min="0" step="0.01" defaultValue={editService.price} required />
                </div>
                <div>
                  <Label className="mb-1 block">Duração (min)</Label>
                  <Input
                    name="durationMinutes"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={editService.duration_minutes}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditService(null)}>
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

      <Dialog open={!!deleteServiceId} onOpenChange={(o) => !o && setDeleteServiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir serviço</DialogTitle>
            <DialogDescription>Essa ação é permanente. Deseja continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServiceId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteServiceId) return
                run(deleteServiceByAdmin, fd({ serviceId: deleteServiceId }), {
                  successMsg: "Serviço excluído.",
                  onSuccess: () => {
                    setServices((prev) => prev.filter((s) => s.id !== deleteServiceId))
                    setDeleteServiceId(null)
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
