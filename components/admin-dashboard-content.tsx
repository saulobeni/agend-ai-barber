import { UserProfileMenu } from '@/components/user-profile-menu'
import { AdminReportsSection } from '@/components/admin-reports-section'
import {
  createUserByAdmin,
  createServiceByAdmin,
  createBarbershopBySuperAdmin,
  updateServiceByAdmin,
  deleteServiceByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  updateBarbershopBySuperAdmin,
  deleteBarbershopBySuperAdmin,
  toggleBarbershopActivationBySuperAdmin,
} from '@/app/actions/admin-management'
import type { Barbershop, DashboardReportMetrics, Service, ServiceReportItem, UserRole } from '@/lib/types'

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
  userFullName,
  metrics,
  topServices,
  reportStartDate,
  reportEndDate,
  selectedBarbershopId,
  barbershops,
  roles = [],
  services = [],
  users = [],
  canManageRoles = false,
}: AdminDashboardContentProps) {
  const barbershopName = barbershops.find((b) => b.id === selectedBarbershopId)?.name
  const barbershopNameById = new Map(barbershops.map((shop) => [shop.id, shop.name]))
  const userById = new Map(users.map((item) => [item.id, item]))
  const isSuperAdmin = role === 'super_admin'

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
          <UserProfileMenu userEmail={userEmail} userFullName={userFullName} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {!isSuperAdmin && reportStartDate && reportEndDate && (
          <AdminReportsSection
            initialMetrics={metrics}
            initialTopServices={topServices}
            initialStartDate={reportStartDate}
            initialEndDate={reportEndDate}
            barbershopName={barbershopName}
            selectedBarbershopId={selectedBarbershopId}
          />
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
                <form action={createBarbershopBySuperAdmin as any} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className={`grid grid-cols-1 gap-6 ${isSuperAdmin ? 'max-w-xl' : 'lg:grid-cols-2'}`}>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">
                  {role === 'super_admin' ? 'Cadastrar Administrador' : 'Cadastrar usuario (Admin ou Barber)'}
                </h3>
                <form action={createUserByAdmin as any} className="space-y-3">
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

              {!isSuperAdmin && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Cadastrar servico</h3>
                  <form action={createServiceByAdmin as any} className="space-y-3">
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
              )}
            </div>

            {!isSuperAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                              <form action={updateUserByAdmin as any} className="space-y-3">
                                <input type="hidden" name="userId" value={r.user_id} />
                                <input
                                  name="fullName"
                                  defaultValue={user?.full_name || ''}
                                  placeholder="Ex.: Joao da Silva"
                                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <input
                                    name="username"
                                    defaultValue={user?.username || ''}
                                    placeholder="Ex.: joao.silva"
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <input
                                    name="email"
                                    type="email"
                                    defaultValue={user?.email || ''}
                                    placeholder="Ex.: joao@email.com"
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
                              <form action={deleteUserByAdmin as any}>
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
                      {services.map((service) => {
                        const editServiceModalId = `edit-service-${service.id}`
                        return (
                        <div key={service.id} className="text-sm border border-border rounded-md p-2">
                          <div className="font-medium">{service.name}</div>
                          <div className="text-muted-foreground">
                            {formatCurrency(service.price)} - {service.duration_minutes} min
                          </div>
                          <div className="text-muted-foreground">
                            barbearia: {barbershopNameById.get(service.barbershop_id) || 'Nao informada'}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <label
                              htmlFor={editServiceModalId}
                              className="cursor-pointer bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs"
                            >
                              Editar
                            </label>

                            <input id={editServiceModalId} type="checkbox" className="peer/edit-service hidden" />
                            <div className="fixed inset-0 z-50 hidden peer-checked/edit-service:flex items-center justify-center p-4">
                              <label htmlFor={editServiceModalId} className="absolute inset-0 bg-black/50" />
                              <div className="relative z-10 bg-card border border-border rounded-lg p-4 w-full max-w-md space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-semibold">Editar servico</div>
                                  <label
                                    htmlFor={editServiceModalId}
                                    className="cursor-pointer text-muted-foreground hover:text-foreground text-lg leading-none"
                                    aria-label="Fechar"
                                  >
                                    x
                                  </label>
                                </div>
                                <form action={updateServiceByAdmin as any} className="space-y-3">
                                  <input type="hidden" name="serviceId" value={service.id} />
                                  <input
                                    name="name"
                                    defaultValue={service.name}
                                    placeholder="Ex.: Corte premium"
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      name="price"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      defaultValue={service.price}
                                      placeholder="Preco (R$)"
                                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                    />
                                    <input
                                      name="durationMinutes"
                                      type="number"
                                      min="1"
                                      step="1"
                                      defaultValue={service.duration_minutes}
                                      placeholder="Duracao (min)"
                                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm">
                                      Salvar
                                    </button>
                                    <label
                                      htmlFor={editServiceModalId}
                                      className="cursor-pointer border border-border px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground"
                                    >
                                      Cancelar
                                    </label>
                                  </div>
                                </form>
                              </div>
                            </div>
                            <form action={deleteServiceByAdmin as any}>
                              <input type="hidden" name="serviceId" value={service.id} />
                              <button className="bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs">
                                Excluir
                              </button>
                            </form>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground">{shop.name}</div>
                          {shop.is_active === false && (
                            <span className="bg-destructive/15 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Desativada
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">{shop.address || 'Endereco nao informado'}</div>
                        <div className="text-muted-foreground">
                          horario: {shop.opening_time} - {shop.closing_time}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <label
                            htmlFor={editModalId}
                            className="cursor-pointer bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Editar
                          </label>
                          <label
                            htmlFor={deleteModalId}
                            className="cursor-pointer bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Excluir
                          </label>
                          <form action={toggleBarbershopActivationBySuperAdmin as any} className="inline">
                            <input type="hidden" name="barbershopId" value={shop.id} />
                            <button
                              type="submit"
                              className={`px-2 py-1 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer text-white ${
                                shop.is_active !== false
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {shop.is_active !== false ? 'Desativar' : 'Ativar'}
                            </button>
                          </form>
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
                            <form action={updateBarbershopBySuperAdmin as any} className="space-y-3">
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
                            <form action={deleteBarbershopBySuperAdmin as any}>
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
