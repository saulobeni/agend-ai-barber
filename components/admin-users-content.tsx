"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"
import { Users, UserPlus, Pencil, Trash2 } from "lucide-react"
import {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
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
import type { Barbershop, UserRole } from "@/lib/types"

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

interface AdminUsersContentProps {
  role: UserRole
  roles: RoleItem[]
  users: UserItem[]
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

export function AdminUsersContent({
  role,
  roles: initialRoles,
  users: initialUsers,
  barbershops,
  userEmail,
}: AdminUsersContentProps) {
  const isSuperAdmin = role === "super_admin"
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles)
  const [users, setUsers] = useState<UserItem[]>(initialUsers)
  const barbershopNameById = new Map(barbershops.map((b) => [b.id, b.name]))
  const userById = new Map(users.map((u) => [u.id, u]))

  const { isPending, run } = useAction()

  const [editUser, setEditUser] = useState<{ roleRow: RoleItem; user: UserItem | undefined } | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  function fd(obj: Record<string, string>) {
    const f = new FormData()
    Object.entries(obj).forEach(([k, v]) => f.set(k, v))
    return f
  }

  function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    run(createUserByAdmin, formData, {
      successMsg: "Usuário criado com sucesso!",
      onSuccess: () => form.reset(),
    })
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── HEADER ── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Contas de administradores e barbeiros. {userEmail ? `• ${userEmail}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ── FORMULÁRIO DE CRIAÇÃO ── */}
        <div className="xl:col-span-5">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isSuperAdmin ? "Cadastrar administrador" : "Cadastrar usuário"}
                </h3>
                <p className="text-xs text-muted-foreground">Senha padrão: 123456</p>
              </div>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              {isSuperAdmin && (
                <div>
                  <Label className="mb-1 block">Barbearia associada</Label>
                  <select
                    name="barbershopId"
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecione uma barbearia</option>
                    {barbershops.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label className="mb-1 block">Nome completo</Label>
                <Input name="fullName" required placeholder="Ex.: João da Silva" />
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
                  <Label className="mb-1 block">Perfil</Label>
                  <select name="role" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                    <option value="admin">admin</option>
                    <option value="barber">barber</option>
                  </select>
                </div>
              )}
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Criando..." : "Criar usuário"}
              </Button>
            </form>
          </div>
        </div>

        {/* ── LISTA ── */}
        <div className="xl:col-span-7">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Usuários cadastrados</h3>
              <Badge variant="outline">{roles.length}</Badge>
            </div>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {roles.map((r) => {
                  const user = userById.get(r.user_id)
                  return (
                    <div key={r.id} className="text-sm border border-border/60 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-foreground">{user?.full_name || user?.email || "Sem nome"}</div>
                          <div className="text-muted-foreground text-xs mt-0.5">{user?.email || "—"}</div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 capitalize">
                          {r.role}
                        </Badge>
                      </div>
                      {isSuperAdmin && (
                        <div className="text-muted-foreground text-xs mt-1">
                          barbearia: {r.barbershop_id ? barbershopNameById.get(r.barbershop_id) || "—" : "todas"}
                        </div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditUser({ roleRow: r, user })}>
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteUserId(r.user_id)}>
                          <Trash2 className="size-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                run(updateUserByAdmin, formData, {
                  successMsg: "Usuário atualizado!",
                  onSuccess: () => {
                    const updatedFullName = String(formData.get("fullName"))
                    const updatedUsername = String(formData.get("username"))
                    const updatedEmail = String(formData.get("email"))
                    const updatedRole = formData.get("role") as UserRole
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === editUser.roleRow.user_id
                          ? { ...u, full_name: updatedFullName, username: updatedUsername, email: updatedEmail, role: updatedRole }
                          : u,
                      ),
                    )
                    setRoles((prev) =>
                      prev.map((r) => (r.id === editUser.roleRow.id ? { ...r, role: updatedRole } : r)),
                    )
                    setEditUser(null)
                  },
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
                  <Label className="mb-1 block">Perfil</Label>
                  <select
                    name="role"
                    defaultValue={editUser.roleRow.role === "barber" ? "barber" : "admin"}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="admin">admin</option>
                    <option value="barber">barber</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
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

      <Dialog open={!!deleteUserId} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>Essa ação é permanente e não pode ser desfeita. Deseja continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleteUserId) return
                run(deleteUserByAdmin, fd({ userId: deleteUserId }), {
                  successMsg: "Usuário excluído.",
                  onSuccess: () => {
                    setRoles((prev) => prev.filter((r) => r.user_id !== deleteUserId))
                    setUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
                    setDeleteUserId(null)
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
