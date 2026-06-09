"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"
import {
  createUserByAdmin,
  createServiceByAdmin,
  createBarbershopBySuperAdmin,
  updateServiceByAdmin,
  deleteServiceByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
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
import type { Barbershop, Service, UserRole } from "@/lib/types"

type RoleItem = {
  id: string
  user_id: string
  role: UserRole
  barbershop_id: string | null
  created_at: string
}

type UserItem = {
  id: string
  full_name: string
  username: string
  email: string
  role: UserRole
  barbershop_id: string | null
}

interface AdminManagementFormsProps {
  role: UserRole
  barbershops: Barbershop[]
  roles: RoleItem[]
  services: Service[]
  users: UserItem[]
  canManageRoles: boolean
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

export function AdminManagementForms({
  role,
  barbershops,
  roles,
  services,
  users,
  canManageRoles,
}: AdminManagementFormsProps) {
  const isSuperAdmin = role === "super_admin"
  const barbershopNameById = new Map(barbershops.map((b) => [b.id, b.name]))
  const userById = new Map(users.map((u) => [u.id, u]))

  const { isPending, run } = useAction()

  // ── Edit/Delete dialogs state ────────────────────────────────────────
  const [editUser, setEditUser] = useState<{ roleRow: RoleItem; user: UserItem | undefined } | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const [editService, setEditService] = useState<Service | null>(null)
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null)

  const [editShop, setEditShop] = useState<Barbershop | null>(null)
  const [deleteShopId, setDeleteShopId] = useState<string | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────
  function fd(obj: Record<string, string>) {
    const f = new FormData()
    Object.entries(obj).forEach(([k, v]) => f.set(k, v))
    return f
  }

  // ── Create User ───────────────────────────────────────────────────────
  function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    run(createUserByAdmin, formData, {
      successMsg: "Usuario criado com sucesso!",
      onSuccess: () => form.reset(),
    })
  }

  // ── Create Service ────────────────────────────────────────────────────
  function handleCreateService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    run(createServiceByAdmin, formData, {
      successMsg: "Servico cadastrado com sucesso!",
      onSuccess: () => form.reset(),
    })
  }

  // ── Create Barbershop ─────────────────────────────────────────────────
  function handleCreateBarbershop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    run(createBarbershopBySuperAdmin, formData, {
      successMsg: "Barbearia cadastrada com sucesso!",
      onSuccess: () => form.reset(),
    })
  }

  if (!canManageRoles) return null

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Cadastros administrativos</h2>
        <p className="text-sm text-muted-foreground">
          Criacao completa de usuario com senha padrao 123456, sempre vinculada a sua barbearia.
        </p>
      </div>

      {/* ── Cadastrar barbearia (super_admin only) ── */}
      {isSuperAdmin && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Cadastrar nova barbearia</h3>
          <form onSubmit={handleCreateBarbershop} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block">Nome da Barbearia</Label>
                <Input name="name" required placeholder="Ex.: Barbearia Brothers" />
              </div>
              <div>
                <Label className="mb-1 block">Endereço</Label>
                <Input name="address" placeholder="Ex.: Rua das Flores, 123" />
              </div>
            </div>
            <div className="space-y-3 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Horário de Abertura</Label>
                  <Input name="openingTime" type="time" defaultValue="09:00" />
                </div>
                <div>
                  <Label className="mb-1 block">Horário de Fechamento</Label>
                  <Input name="closingTime" type="time" defaultValue="18:00" />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="w-fit">
                {isPending ? "Cadastrando..." : "Cadastrar barbearia"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Criar usuario + Cadastrar serviço ── */}
      <div className={`grid grid-cols-1 gap-6 ${isSuperAdmin ? "max-w-xl" : "lg:grid-cols-2"}`}>
        {/* Criar usuário */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">
            {isSuperAdmin ? "Cadastrar Administrador" : "Cadastrar usuario (Admin ou Barber)"}
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-3">
            {isSuperAdmin && (
              <div>
                <Label className="mb-1 block">Barbearia Associada</Label>
                <select name="barbershopId" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                  <option value="">Selecione uma barbearia</option>
                  {barbershops.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label className="mb-1 block">Nome completo</Label>
              <Input name="fullName" required placeholder="Ex.: Joao da Silva" />
            </div>
            <div>
              <Label className="mb-1 block">Apelido</Label>
              <Input name="username" required placeholder="Ex.: joao.silva" />
            </div>
            <div>
              <Label className="mb-1 block">Email</Label>
              <Input name="email" type="email" required placeholder="Ex.: joao@email.com" />
            </div>
            {isSuperAdmin ? (
              <input type="hidden" name="role" value="admin" />
            ) : (
              <div>
                <Label className="mb-1 block">Role</Label>
                <select name="role" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                  <option value="admin">admin</option>
                  <option value="barber">barber</option>
                </select>
              </div>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar usuario"}
            </Button>
          </form>
        </div>

        {/* Cadastrar serviço (admin only) */}
        {!isSuperAdmin && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Cadastrar servico</h3>
            <form onSubmit={handleCreateService} className="space-y-3">
              <div>
                <Label className="mb-1 block">Nome</Label>
                <Input name="name" required placeholder="Ex.: Corte premium" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Preco (R$)</Label>
                  <Input name="price" type="number" min="0" step="0.01" required />
                </div>
                <div>
                  <Label className="mb-1 block">Duracao (min)</Label>
                  <Input name="durationMinutes" type="number" min="1" step="1" required />
                </div>
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Cadastrando..." : "Cadastrar servico"}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* ── Listas ── */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de usuarios */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Usuarios</h3>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuario encontrado.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {roles.map((r) => {
                  const user = userById.get(r.user_id)
                  return (
                    <div key={r.id} className="text-sm border border-border rounded-md p-2">
                      <div className="font-medium">{user?.full_name || user?.email || "Sem nome"}</div>
                      <div className="text-muted-foreground">email: {user?.email || "—"}</div>
                      <div className="text-muted-foreground">perfil: {r.role}</div>
                      <div className="text-muted-foreground">
                        barbearia: {r.barbershop_id ? (barbershopNameById.get(r.barbershop_id) || "—") : "todas"}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditUser({ roleRow: r, user })}>
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteUserId(r.user_id)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Lista de serviços */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Servicos cadastrados</h3>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum servico cadastrado.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {services.map((s) => (
                  <div key={s.id} className="text-sm border border-border rounded-md p-2">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-muted-foreground">
                      {formatCurrency(s.price)} — {s.duration_minutes} min
                    </div>
                    <div className="text-muted-foreground">
                      barbearia: {barbershopNameById.get(s.barbershop_id) || "—"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditService(s)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteServiceId(s.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de barbearias */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Barbearias</h3>
        {barbershops.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma barbearia.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {barbershops.map((shop) => (
              <div key={shop.id} className="text-sm border border-border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{shop.name}</span>
                  {shop.is_active === false && (
                    <span className="bg-destructive/15 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                      Desativada
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground">{shop.address || "Endereco nao informado"}</div>
                <div className="text-muted-foreground">
                  horario: {shop.opening_time} - {shop.closing_time}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditShop(shop)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteShopId(shop.id)}>
                    Excluir
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    className={shop.is_active !== false ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                    onClick={() =>
                      run(toggleBarbershopActivationBySuperAdmin, fd({ barbershopId: shop.id }), {
                        successMsg: shop.is_active !== false ? "Barbearia desativada." : "Barbearia ativada!",
                      })
                    }
                  >
                    {shop.is_active !== false ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* Editar usuário */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                run(updateUserByAdmin, formData, {
                  successMsg: "Usuario atualizado!",
                  onSuccess: () => setEditUser(null),
                })
              }}
              className="space-y-3"
            >
              <input type="hidden" name="userId" value={editUser.roleRow.user_id} />
              <div>
                <Label className="mb-1 block">Nome completo</Label>
                <Input name="fullName" defaultValue={editUser.user?.full_name || ""} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="mb-1 block">Apelido</Label>
                  <Input name="username" defaultValue={editUser.user?.username || ""} required />
                </div>
                <div>
                  <Label className="mb-1 block">Email</Label>
                  <Input name="email" type="email" defaultValue={editUser.user?.email || ""} required />
                </div>
                <div>
                  <Label className="mb-1 block">Role</Label>
                  <select name="role" defaultValue={editUser.roleRow.role === "barber" ? "barber" : "admin"} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                    <option value="admin">admin</option>
                    <option value="barber">barber</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão de usuário */}
      <Dialog open={!!deleteUserId} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuario</DialogTitle>
            <DialogDescription>
              Essa acao e permanente e nao pode ser desfeita. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteUserId) return
                run(deleteUserByAdmin, fd({ userId: deleteUserId }), {
                  successMsg: "Usuario excluido.",
                  onSuccess: () => setDeleteUserId(null),
                })
              }}
            >
              {isPending ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar serviço */}
      <Dialog open={!!editService} onOpenChange={(o) => !o && setEditService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar servico</DialogTitle>
          </DialogHeader>
          {editService && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                run(updateServiceByAdmin, formData, {
                  successMsg: "Servico atualizado!",
                  onSuccess: () => setEditService(null),
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
                  <Label className="mb-1 block">Preco (R$)</Label>
                  <Input name="price" type="number" min="0" step="0.01" defaultValue={editService.price} required />
                </div>
                <div>
                  <Label className="mb-1 block">Duracao (min)</Label>
                  <Input name="durationMinutes" type="number" min="1" step="1" defaultValue={editService.duration_minutes} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditService(null)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão de serviço */}
      <Dialog open={!!deleteServiceId} onOpenChange={(o) => !o && setDeleteServiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir servico</DialogTitle>
            <DialogDescription>
              Essa acao e permanente. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServiceId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteServiceId) return
                run(deleteServiceByAdmin, fd({ serviceId: deleteServiceId }), {
                  successMsg: "Servico excluido.",
                  onSuccess: () => setDeleteServiceId(null),
                })
              }}
            >
              {isPending ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar barbearia */}
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
                  onSuccess: () => setEditShop(null),
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
                <Label className="mb-1 block">Endereco</Label>
                <Input name="address" defaultValue={editShop.address || ""} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block">Abertura</Label>
                  <Input name="openingTime" type="time" defaultValue={String(editShop.opening_time || "09:00:00").slice(0, 5)} />
                </div>
                <div>
                  <Label className="mb-1 block">Fechamento</Label>
                  <Input name="closingTime" type="time" defaultValue={String(editShop.closing_time || "18:00:00").slice(0, 5)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditShop(null)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão de barbearia */}
      <Dialog open={!!deleteShopId} onOpenChange={(o) => !o && setDeleteShopId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir barbearia</DialogTitle>
            <DialogDescription>
              Todos os dados da barbearia serao removidos permanentemente. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteShopId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteShopId) return
                run(deleteBarbershopBySuperAdmin, fd({ barbershopId: deleteShopId }), {
                  successMsg: "Barbearia excluida.",
                  onSuccess: () => setDeleteShopId(null),
                })
              }}
            >
              {isPending ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
