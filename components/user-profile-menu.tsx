"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, KeyRound, LogOut, UserCircle } from "lucide-react"
import { signOut, changePassword } from "@/app/actions/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserProfileMenuProps {
  userEmail?: string
  userFullName?: string | null
}

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) {
    const localPart = email.split("@")[0] || email
    return localPart.slice(0, 2).toUpperCase()
  }
  return "U"
}

export function UserProfileMenu({ userEmail, userFullName }: UserProfileMenuProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  const displayName = userFullName?.trim() || userEmail || "Usuario"
  const initials = getInitials(userFullName, userEmail)

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")
    setPasswordLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await changePassword(formData)

    if (result?.error) {
      setPasswordError(result.error)
      setPasswordLoading(false)
      return
    }

    setPasswordSuccess("Senha alterada com sucesso.")
    e.currentTarget.reset()
    setPasswordLoading(false)

    setTimeout(() => {
      setPasswordDialogOpen(false)
      setPasswordSuccess("")
    }, 1500)
  }

  function handlePasswordDialogChange(open: boolean) {
    setPasswordDialogOpen(open)
    if (!open) {
      setPasswordError("")
      setPasswordSuccess("")
      setPasswordLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu do perfil"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block max-w-[140px] truncate text-foreground font-medium">
              {displayName}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {userEmail && (
                <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/perfil" className="flex items-center gap-2 cursor-pointer w-full">
              <UserCircle className="size-4" />
              Meu Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setPasswordDialogOpen(true)
            }}
            className="cursor-pointer"
          >
            <KeyRound className="size-4" />
            Alterar Senha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={signOut} className="w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-2 text-sm text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Informe sua senha atual e defina uma nova senha para sua conta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                {passwordSuccess}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" placeholder="Digite sua senha atual" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={6} autoComplete="new-password" placeholder="Minimo de 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" placeholder="Repita a nova senha" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handlePasswordDialogChange(false)} disabled={passwordLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
