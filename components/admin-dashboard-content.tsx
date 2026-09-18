import { AdminReportsSection } from '@/components/admin-reports-section'
import { SuperAdminOverview, type SuperAdminOverviewStats } from '@/components/super-admin-overview'
import type { Barbershop, DashboardReportMetrics, MonthlyRevenueItem, ServiceReportItem, UserRole } from '@/lib/types'

interface AdminDashboardContentProps {
  role: UserRole
  userEmail?: string
  userFullName?: string | null
  metrics: DashboardReportMetrics
  topServices: ServiceReportItem[]
  monthlyData?: MonthlyRevenueItem[]
  reportStartDate?: string
  reportEndDate?: string
  selectedBarbershopId?: string
  barbershops: Barbershop[]
  overviewStats?: SuperAdminOverviewStats
}

export function AdminDashboardContent({
  role, userEmail,
  metrics, topServices, monthlyData = [],
  reportStartDate, reportEndDate,
  selectedBarbershopId, barbershops,
  overviewStats,
}: AdminDashboardContentProps) {
  const isSuperAdmin = role === 'super_admin'
  const barbershopName = barbershops.find((b) => b.id === selectedBarbershopId)?.name

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard Administrativo</h1>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin ? 'Super Admin' : 'Admin'}{userEmail ? ` - ${userEmail}` : ''}
        </p>
      </div>

      {isSuperAdmin ? (
        <SuperAdminOverview stats={overviewStats ?? { totalShops: 0, activeShops: 0, totalAdmins: 0, totalBarbers: 0 }} />
      ) : (
        <AdminReportsSection
          initialMetrics={metrics}
          initialTopServices={topServices}
          initialMonthlyData={monthlyData}
          initialStartDate={reportStartDate!}
          initialEndDate={reportEndDate!}
          barbershopName={barbershopName}
          selectedBarbershopId={selectedBarbershopId}
        />
      )}
    </div>
  )
}
