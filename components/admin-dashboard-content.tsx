import { AdminReportsSection } from '@/components/admin-reports-section'
import { AdminManagementForms } from '@/components/admin-management-forms'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const showReports = !isSuperAdmin && reportStartDate && reportEndDate

  const managementForms = (
    <AdminManagementForms
      role={role}
      barbershops={barbershops}
      roles={roles}
      services={services}
      users={users}
      canManageRoles={canManageRoles}
    />
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard Administrativo</h1>
        <p className="text-sm text-muted-foreground">
          {role === 'super_admin' ? 'Super Admin' : 'Admin'}{userEmail ? ` - ${userEmail}` : ''}
        </p>
      </div>

      {showReports ? (
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="management">Gerenciamento</TabsTrigger>
          </TabsList>
          <TabsContent value="reports" className="space-y-6">
            <AdminReportsSection
              initialMetrics={metrics}
              initialTopServices={topServices}
              initialMonthlyData={monthlyData}
              initialStartDate={reportStartDate!}
              initialEndDate={reportEndDate!}
              barbershopName={barbershopName}
              selectedBarbershopId={selectedBarbershopId}
            />
          </TabsContent>
          <TabsContent value="management" className="space-y-6">
            {managementForms}
          </TabsContent>
        </Tabs>
      ) : (
        managementForms
      )}
    </div>
  )
}
