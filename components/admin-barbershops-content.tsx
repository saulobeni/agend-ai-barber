"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"
import { Store, Plus, Pencil, Trash2, Power } from "lucide-react"
import {
  createBarbershopBySuperAdmin,
  updateBarbershopBySuperAdmin,
  deleteBarbershopBySuperAdmin,
  toggleBarbershopActivationBySuperAdmin,
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
import type { Barbershop } from "@/lib/types"

interface AdminBarbershopsContentProps {
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

export function AdminBarbershopsContent({ barbershops: initialBarbershops, userEmail }: AdminBarbershopsContentProps) {
  const [barbershops, setBarbershops] = useState<Barbershop[]>(initialBarbershops)
  const { isPending, run } = useAction()

  const [editShop, setEditShop] = useState<Barbershop | null>(null)
  const [deleteShopId, setDeleteShopId] = useState<string | null>(null)

  function fd(obj: Record<string, string>) {
    const f = new FormData()
    Object.entries(obj).forEach(([k, v]) => f.set(k, v))
    return f
  }

  function handleCreateBarbershop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    run(createBarbershopBySuperAdmin, formData, {
      successMsg: "Barbearia cadastrada com sucesso!",
      onSuccess: () => form.reset(),
    })
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Barbearias</h1>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            Super Admin
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Todas as barbearias da plataforma. {userEmail ? `• ${userEmail}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-5">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground">Cadastrar nova barbearia</h3>
            </div>
            <form onSubmit={handleCreateBarbershop} className="space-y-3">
              <div>
                <Label className="mb-1 block">Nome da barbearia</Label>
                <Input name="name" required placeholder="Ex.: Barbearia Brothers" />
              </div>
              <div>
                <Label className="mb-1 block">Endereço</Label>
                <Input name="address" placeholder="Ex.: Rua das Flores, 123" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Horário de abertura</Label>
                  <Input name="openingTime" type="time" defaultValue="09:00" />
                </div>
                <div>
                  <Label className="mb-1 block">Horário de fechamento</Label>
                  <Input name="closingTime" type="time" defaultValue="18:00" />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Cadastrando..." : "Cadastrar barbearia"}
              </Button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Store className="size-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Barbearias cadastradas</h3>
              <Badge variant="outline">{barbershops.length}</Badge>
            </div>
            {barbershops.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma barbearia.</p>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {barbershops.map((shop) => (
                  <div key={shop.id} className="text-sm border border-border/60 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{shop.name}</span>
                      {shop.is_active === false && (
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          Desativada
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5">{shop.address || "Endereço não informado"}</div>
                    <div className="text-muted-foreground text-xs">
                      horário: {shop.opening_time} - {shop.closing_time}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditShop(shop)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteShopId(shop.id)}>
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                      <Button
                        size="sm"
                        disabled={isPending}
                        variant="outline"
                        className={
                          shop.is_active !== false
                            ? "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                            : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                        }
                        onClick={() =>
                          run(toggleBarbershopActivationBySuperAdmin, fd({ barbershopId: shop.id }), {
                            successMsg: shop.is_active !== false ? "Barbearia desativada." : "Barbearia ativada!",
                            onSuccess: () => {
                              setBarbershops((prev) =>
                                prev.map((b) =>
                                  b.id === shop.id ? { ...b, is_active: shop.is_active === false } : b,
                                ),
                              )
                            },
                          })
                        }
                      >
                        <Power className="size-3.5" />
                        {shop.is_active !== false ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!editShop} onOpenChange={(o) => !o && setEditShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar barbearia</DialogTitle>
          </DialogHeader>
          {editShop && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                run(updateBarbershopBySuperAdmin, formData, {
                  successMsg: "Barbearia atualizada!",
                  onSuccess: () => {
                    const name = String(formData.get("name"))
                    const address = String(formData.get("address") || "")
                    const openingTime = String(formData.get("openingTime") || "")
                    const closingTime = String(formData.get("closingTime") || "")
                    setBarbershops((prev) =>
                      prev.map((b) =>
                        b.id === editShop.id
                          ? { ...b, name, address, opening_time: openingTime, closing_time: closingTime }
                          : b,
                      ),
                    )
                    setEditShop(null)
                  },
                })
              }}
              className="space-y-3"
            >
              <input type="hidden" name="barbershopId" value={editShop.id} />
              <div>
                <Label className="mb-1 block">Nome</Label>
                <Input name="name" defaultValue={editShop.name} required />
              </div>
              <div>
                <Label className="mb-1 block">Endereço</Label>
                <Input name="address" defaultValue={editShop.address || ""} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Abertura</Label>
                  <Input
                    name="openingTime"
                    type="time"
                    defaultValue={String(editShop.opening_time || "09:00:00").slice(0, 5)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Fechamento</Label>
                  <Input
                    name="closingTime"
                    type="time"
                    defaultValue={String(editShop.closing_time || "18:00:00").slice(0, 5)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditShop(null)}>
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

      <Dialog open={!!deleteShopId} onOpenChange={(o) => !o && setDeleteShopId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir barbearia</DialogTitle>
            <DialogDescription>Todos os dados da barbearia serão removidos permanentemente. Deseja continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteShopId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteShopId) return
                run(deleteBarbershopBySuperAdmin, fd({ barbershopId: deleteShopId }), {
                  successMsg: "Barbearia excluída.",
                  onSuccess: () => {
                    setBarbershops((prev) => prev.filter((b) => b.id !== deleteShopId))
                    setDeleteShopId(null)
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
