import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { assignRole } from '@/app/actions/rbac'
import type { Barbershop, DashboardReportMetrics, ServiceReportItem, UserRole } from '@/lib/types'

type ProfileItem = {
  id: string
  full_name: string | null
  username: string | null
}

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
  metrics: DashboardReportMetrics
  topServices: ServiceReportItem[]
  selectedBarbershopId?: string
  barbershops: Barbershop[]
  users?: ProfileItem[]
  roles?: RoleItem[]
  canManageRoles?: boolean
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  })
}

export function AdminDashboardContent({
  role,
  userEmail,
  metrics,
  topServices,
  selectedBarbershopId,
  barbershops,
  users = [],
  roles = [],
  canManageRoles = false,
}: AdminDashboardContentProps) {
  const barbershopName = barbershops.find((b) => b.id === selectedBarbershopId)?.name

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              {role === 'super_admin' ? 'Super Admin' : 'Admin'} {userEmail ? `- ${userEmail}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/meus-agendamentos" className="text-sm text-muted-foreground hover:text-foreground">
              Agendamentos
            </Link>
            <form action={signOut}>
              <button className="text-sm text-muted-foreground hover:text-foreground">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">Relatorios</h2>
          <p className="text-sm text-muted-foreground">
            {barbershopName
              ? `Visualizando dados da barbearia: ${barbershopName}`
              : role === 'super_admin'
                ? 'Visualizando dados consolidados de todas as barbearias.'
                : 'Visualizando dados das suas barbearias.'}
          </p>

          {role === 'super_admin' && barbershops.length > 0 && (
            <form className="flex items-center gap-2" method="get">
              <select
                name="barbershop"
                defaultValue={selectedBarbershopId || ''}
                className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todas as barbearias</option>
                {barbershops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                Aplicar
              </button>
            </form>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Total de agendamentos" value={String(metrics.totalAppointments)} />
          <MetricCard title="Agendados" value={String(metrics.scheduledAppointments)} />
          <MetricCard title="Concluidos" value={String(metrics.completedAppointments)} />
          <MetricCard title="Cancelados" value={String(metrics.canceledAppointments)} />
          <MetricCard title="Receita" value={formatCurrency(metrics.totalRevenue)} />
        </section>

        <section className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Servicos mais pedidos</h3>
          {topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dado encontrado no periodo atual.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2">Servico</th>
                    <th className="py-2">Pedidos</th>
                    <th className="py-2">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((item) => (
                    <tr key={item.service_id} className="border-b border-border/50">
                      <td className="py-2">{item.service_name}</td>
                      <td className="py-2">{item.bookings}</td>
                      <td className="py-2">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {canManageRoles && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Gerenciar roles</h3>
              <form action={assignRole} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Usuario</label>
                  <select name="userId" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                    <option value="">Selecione um usuario</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Role</label>
                  <select name="role" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Barbearia (para admin)</label>
                  <select name="barbershopId" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                    <option value="">Sem barbearia</option>
                    {barbershops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                  Adicionar role
                </button>
              </form>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Roles atuais</h3>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma role cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((r) => (
                    <div key={r.id} className="text-sm border border-border rounded-md p-2">
                      <div className="font-medium">{r.role}</div>
                      <div className="text-muted-foreground break-all">user: {r.user_id}</div>
                      <div className="text-muted-foreground break-all">
                        barbershop: {r.barbershop_id || 'todas'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
    </div>
  )
}
