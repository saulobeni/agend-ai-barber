"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, LayoutDashboard, Scissors } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { UserProfileMenu } from "@/components/user-profile-menu"
import type { UserRole } from "@/lib/types"

interface AppSidebarProps {
  role: UserRole
  userEmail?: string
  userFullName?: string | null
}

interface NavItem {
  title: string
  href: string
  icon: typeof LayoutDashboard
}

const navByRole: Record<UserRole, NavItem[]> = {
  user: [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Meus Agendamentos", href: "/meus-agendamentos", icon: Calendar },
  ],
  barber: [{ title: "Agenda", href: "/dashboard", icon: Calendar }],
  admin: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  super_admin: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
}

export function AppSidebar({ role, userEmail, userFullName }: AppSidebarProps) {
  const pathname = usePathname()
  const items = navByRole[role] ?? navByRole.user

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scissors className="size-4" />
                </div>
                <span className="truncate font-bold">
                  <span className="text-foreground">Agenda</span>
                  <span className="text-primary">AI</span>
                  <span className="text-primary">Barber</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserProfileMenu
          userEmail={userEmail}
          userFullName={userFullName}
          align="start"
          side="top"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center"
        />
      </SidebarFooter>
    </Sidebar>
  )
}
