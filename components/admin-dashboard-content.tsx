import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import {
  createUserByAdmin,
  createServiceByAdmin,
  createBarbershopBySuperAdmin,
  updateServiceByAdmin,
  deleteServiceByAdmin,
  updateBarberByAdmin,
  deleteBarberByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  updateBarbershopBySuperAdmin,
  deleteBarbershopBySuperAdmin,
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
  users = [],
  canManageRoles = false,
}: AdminDashboardContentProps) {
  const barbershopName = barbershops.find((b) => b.id === selectedBarbershopId)?.name
  const barbershopNameById = new Map(barbershops.map((shop) => [shop.id, shop.name]))
  const userById = new Map(users.map((item) => [item.id, item]))
  const isSuperAdmin = role === 'super_admin'
  const totalBookings = topServices.reduce((sum, item) => sum + item.bookings, 0)
  const adminCount = roles.filter((item) => item.role === 'admin').length
  const barberCount = barbers.length
  const serviceCount = services.length

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
          {isSuperAdmin ? (
            <MetricCard title="Barbearias na plataforma" value={String(barbershops.length)} />
          ) : (
            <MetricCard title="Receita" value={formatCurrency(metrics.totalRevenue)} />
          )}
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
                    <th className="py-2">{isSuperAdmin ? 'Participacao' : 'Receita'}</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((item) => (
                    <tr key={item.service_id} className="border-b border-border/50">
                      <td className="py-2">{item.service_name}</td>
                      <td className="py-2">{item.bookings}</td>
                      <td className="py-2">
                        {isSuperAdmin
                          ? `${totalBookings > 0 ? Math.round((item.bookings / totalBookings) * 100) : 0}%`
                          : formatCurrency(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isSuperAdmin && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Admins cadastrados" value={String(adminCount)} />
            <MetricCard title="Barbeiros cadastrados" value={String(barberCount)} />
            <MetricCard title="Servicos cadastrados" value={String(serviceCount)} />
          </section>
        )}

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

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Cadastrar servico</h3>
                <form action={createServiceByAdmin} className="space-y-3">
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
                    <label className="block text-sm mb-1">Nome</label>
                    <input
                      name="name"
                      type="text"
                      required
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="Ex.: Corte premium"
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Barbeiros cadastrados</h3>
                {barbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum barbeiro cadastrado no seu escopo.</p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground))_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60">
                    {barbers.map((barber) => (
                      <div key={barber.id} className="text-sm border border-border rounded-md p-2">
                        <div className="font-medium">{barber.name}</div>
                        <div className="text-muted-foreground">
                          barbearia: {barbershopNameById.get(barber.barbershop_id) || 'Nao informada'}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <details className="group">
                            <summary className="list-none cursor-pointer bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs inline-block">
                              Editar
                            </summary>
                            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                              <div className="bg-card border border-border rounded-lg p-4 w-full max-w-md space-y-3">
                                <div className="text-sm font-semibold">Editar barbeiro</div>
                                <form action={updateBarberByAdmin} className="space-y-3">
                                  <input type="hidden" name="barberId" value={barber.id} />
                                  <input
                                    name="name"
                                    defaultValue={barber.name}
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                                      Salvar
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </details>
                          <form action={deleteBarberByAdmin}>
                            <input type="hidden" name="barberId" value={barber.id} />
                            <button className="bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs">
                              Excluir
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Usuarios</h3>
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuario encontrado no escopo.</p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground))_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60">
                    {roles.map((r) => (
                      <div key={r.id} className="text-sm border border-border rounded-md p-2">
                        {(() => {
                          const user = userById.get(r.user_id)
                          const editModalId = `edit-user-${r.id}`
                          const deleteModalId = `delete-user-${r.id}`
                          return (
                            <>
                        <div className="font-medium">
                          {user?.full_name || user?.email || 'Usuario sem nome'}
                        </div>
                        <div className="text-muted-foreground">
                          email: {user?.email || 'nao informado'}
                        </div>
                        <div className="text-muted-foreground">perfil: {r.role}</div>
                        <div className="text-muted-foreground">
                          barbearia: {r.barbershop_id ? (barbershopNameById.get(r.barbershop_id) || 'Nao informada') : 'todas'}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <label
                            htmlFor={editModalId}
                            className="cursor-pointer bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs"
                          >
                            Editar
                          </label>
                          <label
                            htmlFor={deleteModalId}
                            className="cursor-pointer bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs"
                          >
                            Excluir
                          </label>
                        </div>

                        <input id={editModalId} type="checkbox" className="peer/edit hidden" />
                        <div className="fixed inset-0 z-50 hidden peer-checked/edit:flex items-center justify-center p-4">
                          <label htmlFor={editModalId} className="absolute inset-0 bg-black/50" />
                          <div className="relative z-10 bg-card border border-border rounded-lg p-4 w-full max-w-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">Editar usuario</div>
                              <label htmlFor={editModalId} className="cursor-pointer text-muted-foreground hover:text-foreground text-lg leading-none">
                                x
                              </label>
                            </div>
                            <form action={updateUserByAdmin} className="space-y-3">
                              <input type="hidden" name="userId" value={r.user_id} />
                              <input
                                name="fullName"
                                defaultValue={user?.full_name || ''}
                                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                              />
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                  name="username"
                                  defaultValue={user?.username || ''}
                                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                />
                                <input
                                  name="email"
                                  type="email"
                                  defaultValue={user?.email || ''}
                                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                />
                                <select
                                  name="role"
                                  defaultValue={r.role === 'barber' ? 'barber' : 'admin'}
                                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                >
                                  <option value="admin">admin</option>
                                  <option value="barber">barber</option>
                                </select>
                              </div>
                              <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                                Salvar
                              </button>
                            </form>
                          </div>
                        </div>

                        <input id={deleteModalId} type="checkbox" className="peer/delete hidden" />
                        <div className="fixed inset-0 z-50 hidden peer-checked/delete:flex items-center justify-center p-4">
                          <label htmlFor={deleteModalId} className="absolute inset-0 bg-black/50" />
                          <div className="relative z-10 bg-card border border-border rounded-lg p-4 w-full max-w-md space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">Excluir usuario</div>
                              <label htmlFor={deleteModalId} className="cursor-pointer text-muted-foreground hover:text-foreground text-lg leading-none">
                                x
                              </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Confirma a exclusao deste usuario?
                            </p>
                            <form action={deleteUserByAdmin}>
                              <input type="hidden" name="userId" value={r.user_id} />
                              <button className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm">
                                Confirmar exclusao
                              </button>
                            </form>
                          </div>
                        </div>
                            </>
                          )
                        })()}
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
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground))_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60">
                    {services.map((service) => (
                      <div key={service.id} className="text-sm border border-border rounded-md p-2">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-muted-foreground">
                          {formatCurrency(service.price)} - {service.duration_minutes} min
                        </div>
                        <div className="text-muted-foreground">
                          barbearia: {barbershopNameById.get(service.barbershop_id) || 'Nao informada'}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <details className="group">
                            <summary className="list-none cursor-pointer bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs inline-block">
                              Editar
                            </summary>
                            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                              <div className="bg-card border border-border rounded-lg p-4 w-full max-w-md space-y-3">
                                <div className="text-sm font-semibold">Editar servico</div>
                                <form action={updateServiceByAdmin} className="space-y-3">
                                  <input type="hidden" name="serviceId" value={service.id} />
                                  <input
                                    name="name"
                                    defaultValue={service.name}
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      name="price"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      defaultValue={service.price}
                                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                    />
                                    <input
                                      name="durationMinutes"
                                      type="number"
                                      min="1"
                                      step="1"
                                      defaultValue={service.duration_minutes}
                                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                                    Salvar
                                  </button>
                                </form>
                              </div>
                            </div>
                          </details>
                          <form action={deleteServiceByAdmin}>
                            <input type="hidden" name="serviceId" value={service.id} />
                            <button className="bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs">
                              Excluir
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Barbearias</h3>
              {barbershops.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma barbearia no escopo.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground))_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60">
                  {barbershops.map((shop) => {
                    const editModalId = `edit-shop-${shop.id}`
                    const deleteModalId = `delete-shop-${shop.id}`
                    return (
                      <div key={shop.id} className="text-sm border border-border rounded-md p-2">
                        <div className="font-medium">{shop.name}</div>
                        <div className="text-muted-foreground">{shop.address || 'Endereco nao informado'}</div>
                        <div className="text-muted-foreground">
                          horario: {shop.opening_time} - {shop.closing_time}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <label
                            htmlFor={editModalId}
                            className="cursor-pointer bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs"
                          >
                            Editar
                          </label>
                          <label
                            htmlFor={deleteModalId}
                            className="cursor-pointer bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs"
                          >
                            Excluir
                          </label>
                        </div>

                        <input id={editModalId} type="checkbox" className="peer/edit hidden" />
                        <div className="fixed inset-0 z-50 hidden peer-checked/edit:flex items-center justify-center p-4">
                          <label htmlFor={editModalId} className="absolute inset-0 bg-black/50" />
                          <div className="relative z-10 bg-card border border-border rounded-lg p-4 w-full max-w-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">Editar barbearia</div>
                              <label htmlFor={editModalId} className="cursor-pointer text-muted-foreground hover:text-foreground text-lg leading-none">
                                x
                              </label>
                            </div>
                            <form action={updateBarbershopBySuperAdmin} className="space-y-3">
                              <input type="hidden" name="barbershopId" value={shop.id} />
                              <div>
                                <label className="block text-sm mb-1">Nome</label>
                                <input
                                  name="name"
                                  defaultValue={shop.name}
                                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm mb-1">Endereco</label>
                                <input
                                  name="address"
                                  defaultValue={shop.address || ''}
                                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-sm mb-1">Abertura</label>
                                  <input
                                    name="openingTime"
                                    type="time"
                                    defaultValue={String(shop.opening_time || '09:00:00').slice(0, 5)}
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm mb-1">Fechamento</label>
                                  <input
                                    name="closingTime"
                                    type="time"
                                    defaultValue={String(shop.closing_time || '18:00:00').slice(0, 5)}
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                </div>
                              </div>
                              <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                                Salvar
                              </button>
                            </form>
                          </div>
                        </div>

                        <input id={deleteModalId} type="checkbox" className="peer/delete hidden" />
                        <div className="fixed inset-0 z-50 hidden peer-checked/delete:flex items-center justify-center p-4">
                          <label htmlFor={deleteModalId} className="absolute inset-0 bg-black/50" />
                          <div className="relative z-10 bg-card border border-border rounded-lg p-4 w-full max-w-md space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">Excluir barbearia</div>
                              <label htmlFor={deleteModalId} className="cursor-pointer text-muted-foreground hover:text-foreground text-lg leading-none">
                                x
                              </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Confirma a exclusao da barbearia <span className="font-medium">{shop.name}</span>?
                            </p>
                            <form action={deleteBarbershopBySuperAdmin}>
                              <input type="hidden" name="barbershopId" value={shop.id} />
                              <button className="bg-destructive text-destructive-foreground px-3 py-2 rounded-md text-sm">
                                Confirmar exclusao
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
