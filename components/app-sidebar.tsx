"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Scissors,
  Store,
  TicketPercent,
  UserCog,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navByRole: Record<UserRole, NavGroup[]> = {
  user: [
    {
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Meus Agendamentos", href: "/meus-agendamentos", icon: Calendar },
      ],
    },
  ],
  barber: [
    {
      items: [{ title: "Agenda", href: "/dashboard", icon: Calendar }],
    },
  ],
  admin: [
    { label: "Visão Geral", items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
    {
      label: "Operação",
      items: [
        { title: "Cupons", href: "/cupons", icon: TicketPercent },
        { title: "Serviços por Barbeiro", href: "/servicos-por-barbeiro", icon: Link2 },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Usuários", href: "/usuarios", icon: Users },
        { title: "Serviços", href: "/servicos", icon: ClipboardList },
        { title: "Barbeiros", href: "/barbeiros", icon: UserCog },
      ],
    },
  ],
  super_admin: [
    { label: "Visão Geral", items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
    {
      label: "Gestão",
      items: [
        { title: "Barbearias", href: "/barbearias", icon: Store },
        { title: "Usuários", href: "/usuarios", icon: Users },
        { title: "Barbeiros", href: "/barbeiros", icon: UserCog },
      ],
    },
  ],
}

export function AppSidebar({ role, userEmail, userFullName }: AppSidebarProps) {
  const pathname = usePathname()
  const groups = navByRole[role] ?? navByRole.user

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
        {groups.map((group, index) => (
          <SidebarGroup key={group.label ?? index}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
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
