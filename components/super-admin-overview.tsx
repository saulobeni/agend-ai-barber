import Link from "next/link"
import { Store, CheckCircle2, ShieldCheck, UserCog } from "lucide-react"

export interface SuperAdminOverviewStats {
  totalShops: number
  activeShops: number
  totalAdmins: number
  totalBarbers: number
}

interface SuperAdminOverviewProps {
  stats: SuperAdminOverviewStats
}

export function SuperAdminOverview({ stats }: SuperAdminOverviewProps) {
  const cards = [
    {
      label: "Barbearias",
      value: stats.totalShops,
      icon: Store,
      href: "/barbearias",
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "Barbearias ativas",
      value: stats.activeShops,
      icon: CheckCircle2,
      href: "/barbearias",
      iconClass: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Administradores",
      value: stats.totalAdmins,
      icon: ShieldCheck,
      href: "/usuarios",
      iconClass: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "Barbeiros",
      value: stats.totalBarbers,
      icon: UserCog,
      href: "/barbeiros",
      iconClass: "bg-amber-500/10 text-amber-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="bg-card border border-border/70 hover:border-border transition-colors rounded-xl p-4 shadow-sm block"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            <div className={`size-9 rounded-lg flex items-center justify-center ${card.iconClass}`}>
              <card.icon className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground">{card.value}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
