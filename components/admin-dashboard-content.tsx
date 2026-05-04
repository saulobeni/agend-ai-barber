import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import {
  createUserByAdmin,
  createServiceByAdmin,
  createBarbershopBySuperAdmin,
} from '@/app/actions/admin-management'
import type { Barber, Barbershop, DashboardReportMetrics, Service, ServiceReportItem, UserRole } from '@/lib/types'

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
  roles?: RoleItem[]
  barbers?: Barber[]
  services?: Service[]
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
  roles = [],
  barbers = [],
  services = [],
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
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Cadastros administrativos</h2>
              <p className="text-sm text-muted-foreground">
                Criacao completa de usuario com senha padrao 123456, sempre vinculada a sua barbearia.
              </p>
            </div>

            {role === 'super_admin' && (
              <div className="bg-card border border-border rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Cadastrar nova barbearia</h3>
                <form action={createBarbershopBySuperAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">Nome da Barbearia</label>
                      <input
                        name="name"
                        type="text"
                        required
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Ex.: Barbearia Brothers"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Endereço</label>
                      <input
                        name="address"
                        type="text"
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Ex.: Rua das Flores, 123"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm mb-1">Horário de Abertura</label>
                        <input
                          name="openingTime"
                          type="time"
                          defaultValue="09:00"
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Horário de Fechamento</label>
                        <input
                          name="closingTime"
                          type="time"
                          defaultValue="18:00"
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm mt-auto w-fit">
                      Cadastrar barbearia
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">
                  {role === 'super_admin' ? 'Cadastrar Administrador' : 'Cadastrar usuario (Admin ou Barber)'}
                </h3>
                <form action={createUserByAdmin} className="space-y-3">
                  {role === 'super_admin' && (
                    <div>
                      <label className="block text-sm mb-1">Barbearia Associada</label>
                      <select name="barbershopId" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                        <option value="">Selecione uma barbearia</option>
                        {barbershops.map((shop) => (
                          <option key={shop.id} value={shop.id}>{shop.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm mb-1">Nome completo</label>
                    <input
                      name="fullName"
                      type="text"
                      required
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="Ex.: Joao da Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Apelido</label>
                    <input
                      name="username"
                      type="text"
                      required
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="Ex.: joao.silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="Ex.: joao@email.com"
                    />
                  </div>
                  {role === 'super_admin' ? (
                    <input type="hidden" name="role" value="admin" />
                  ) : (
                    <div>
                      <label className="block text-sm mb-1">Role</label>
                      <select name="role" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" required>
                        <option value="admin">admin</option>
                        <option value="barber">barber</option>
                      </select>
                    </div>
                  )}
                  <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                    Criar usuario
                  </button>
                </form>
              </div>

              {role !== 'super_admin' && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Cadastrar servico</h3>
                  <form action={createServiceByAdmin} className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">Nome</label>
                      <input
                        name="name"
                        type="text"
                        required
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Ex.: Corte premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Descricao</label>
                      <textarea
                        name="description"
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm mb-1">Preco (R$)</label>
                        <input
                          name="price"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Duracao (min)</label>
                        <input
                          name="durationMinutes"
                          type="number"
                          min="1"
                          step="1"
                          required
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                      Cadastrar servico
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Barbeiros cadastrados</h3>
                {barbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum barbeiro cadastrado no seu escopo.</p>
                ) : (
                  <div className="space-y-2">
                    {barbers.map((barber) => (
                      <div key={barber.id} className="text-sm border border-border rounded-md p-2">
                        <div className="font-medium">{barber.name}</div>
                        <div className="text-muted-foreground break-all">barbershop: {barber.barbershop_id}</div>
                      </div>
                    ))}
                  </div>
                )}
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

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Servicos cadastrados</h3>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum servico cadastrado no seu escopo.</p>
                ) : (
                  <div className="space-y-2">
                    {services.map((service) => (
                      <div key={service.id} className="text-sm border border-border rounded-md p-2">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-muted-foreground">
                          {formatCurrency(service.price)} - {service.duration_minutes} min
                        </div>
                        <div className="text-muted-foreground break-all">barbershop: {service.barbershop_id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
