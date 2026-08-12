'use client'

import { signOut } from '@/app/actions/auth'

interface DeactivatedBarbershopContentProps {
  userEmail?: string
}

export function DeactivatedBarbershopContent({ userEmail }: DeactivatedBarbershopContentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-2xl p-8 shadow-sm relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-2 animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Acesso Suspenso
          </h2>
          
          <div className="h-px bg-border/60 my-2" />

          <p className="text-sm text-muted-foreground leading-relaxed">
            Sua barbearia associada foi temporariamente <span className="font-semibold text-destructive">desativada</span> pelo administrador do sistema.
          </p>
          
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border/40">
            Enquanto esta unidade estiver desativada, seu acesso ao painel de gestão permanece bloqueado. Para reativação, entre em contato com o suporte ou o administrador geral.
          </p>

          {userEmail && (
            <div className="text-xs text-muted-foreground pt-1">
              Logado como: <span className="font-medium text-foreground/80">{userEmail}</span>
            </div>
          )}
        </div>

        <div className="pt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-border bg-input hover:bg-muted text-foreground text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
            >
              Sair da Conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
