import { UserProfileMenu } from '@/components/user-profile-menu'
import { AdminReportsSection } from '@/components/admin-reports-section'
import { AdminManagementForms } from '@/components/admin-management-forms'
import type { Barbershop, DashboardReportMetrics, MonthlyRevenueItem, Service, ServiceReportItem, UserRole } from '@/lib/types'

type RoleItem = {
  id: string
  user_id: string
  role: UserRole
  barbershop_id: string | null
  created_at: string
}

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
  roles?: RoleItem[]
  services?: Service[]
  users?: Array<{
    id: string
    full_name: string
    username: string
    email: string
    role: UserRole
    barbershop_id: string | null
  }>
  canManageRoles?: boolean
}

export function AdminDashboardContent({
  role, userEmail, userFullName,
  metrics, topServices, monthlyData = [],
  reportStartDate, reportEndDate,
  selectedBarbershopId, barbershops,
  roles = [], services = [], users = [],
  canManageRoles = false,
}: AdminDashboardContentProps) {
  const isSuperAdmin = role === 'super_admin'
  const barbershopName = barbershops.find((b) => b.id === selectedBarbershopId)?.name

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              {role === 'super_admin' ? 'Super Admin' : 'Admin'}{userEmail ? ` - ${userEmail}` : ''}
            </p>
          </div>
          <UserProfileMenu userEmail={userEmail} userFullName={userFullName} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {!isSuperAdmin && reportStartDate && reportEndDate && (
          <AdminReportsSection
            initialMetrics={metrics}
            initialTopServices={topServices}
            initialMonthlyData={monthlyData}
            initialStartDate={reportStartDate}
            initialEndDate={reportEndDate}
            barbershopName={barbershopName}
            selectedBarbershopId={selectedBarbershopId}
          />
        )}

        <AdminManagementForms
          role={role}
          barbershops={barbershops}
          roles={roles}
          services={services}
          users={users}
          canManageRoles={canManageRoles}
        />
      </main>
    </div>
  )
}
