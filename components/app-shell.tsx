"use client"

import type { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type { UserRole } from "@/lib/types"

interface AppShellProps {
  role: UserRole
  userEmail?: string
  userFullName?: string | null
  children: ReactNode
}

export function AppShell({ role, userEmail, userFullName, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} userEmail={userEmail} userFullName={userFullName} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
