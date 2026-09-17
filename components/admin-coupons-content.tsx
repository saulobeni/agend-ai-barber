"use client"

import { useState, useTransition, useMemo } from "react"
import { toast } from "sonner"
import {
  Ticket,
  TicketPercent,
  Plus,
  Search,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Scissors,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Pencil,
  Trash2,
  Clock,
  Shuffle,
  Tag,
  DollarSign,
  Users,
} from "lucide-react"

import {
  createCouponByAdmin,
  updateCouponByAdmin,
  toggleCouponStatusByAdmin,
  deleteCouponByAdmin,
} from "@/app/actions/coupons"
import type { AdminCouponItem, Service, Barbershop, DiscountType } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AdminCouponsContentProps {
  coupons: AdminCouponItem[]
  services: Service[]
  barbershop: Barbershop | null
  userEmail?: string
  userFullName?: string | null
}

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Sem validade"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "Data inválida"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const exp = new Date(expiresAt)
  return exp.getTime() < Date.now()
}

export function AdminCouponsContent({
  coupons: initialCoupons,
  services,
  barbershop,
  userEmail,
  userFullName,
}: AdminCouponsContentProps) {
  const [coupons, setCoupons] = useState<AdminCouponItem[]>(initialCoupons)
  const [isPending, startTransition] = useTransition()

  // Filtros de listagem
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Estados do formulário de criação (para Live Preview)
  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newDiscountType, setNewDiscountType] = useState<DiscountType>("percentage")
  const [newDiscountValue, setNewDiscountValue] = useState("15")
  const [newMinServiceValue, setNewMinServiceValue] = useState("0")
  const [newMaxDiscountAmount, setNewMaxDiscountAmount] = useState("")
  const [newMaxUsesGlobal, setNewMaxUsesGlobal] = useState("")
  const [newMaxUsesPerClient, setNewMaxUsesPerClient] = useState("1")
  const [newTargetServiceId, setNewTargetServiceId] = useState("")
  const [newExpiresAt, setNewExpiresAt] = useState("")
  const [newDescription, setNewDescription] = useState("")

  // Diálogos de Edição e Exclusão
  const [editingCoupon, setEditingCoupon] = useState<AdminCouponItem | null>(null)
  const [deletingCoupon, setDeletingCoupon] = useState<AdminCouponItem | null>(null)

  // Gerador de códigos promocionais
  function generateRandomCode() {
    const prefixes = ["CORTE", "BARBER", "PROMO", "VIP", "TOP", "DESCONTO", "VALE"]
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const num = Math.floor(10 + Math.random() * 90)
    const code = `${prefix}${num}`
    setNewCode(code)
    toast.info(`Código sugerido: ${code}`)
  }

  // Copiar código com feedback
  function copyToClipboard(code: string) {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Código "${code}" copiado!`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Estatísticas calculadas
  const metrics = useMemo(() => {
    const total = coupons.length
    const active = coupons.filter((c) => c.is_active && !isExpired(c.expires_at)).length
    const totalUses = coupons.reduce((acc, c) => acc + (c.totalUses || 0), 0)
    const totalDiscountGiven = coupons.reduce((acc, c) => acc + (c.totalDiscountApplied || 0), 0)

    return { total, active, totalUses, totalDiscountGiven }
  }, [coupons])

  // Filtragem dos cupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      // Filtro de status
      const expired = isExpired(c.expires_at)
      if (filterStatus === "active" && (!c.is_active || expired)) return false
      if (filterStatus === "inactive" && (c.is_active && !expired)) return false

      // Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCode = (c.code || "").toLowerCase().includes(q)
        const matchName = c.name.toLowerCase().includes(q)
        const matchDesc = (c.description || "").toLowerCase().includes(q)
        if (!matchCode && !matchName && !matchDesc) return false
      }

      return true
    })
  }, [coupons, filterStatus, searchQuery])

  // Criação de cupom
  function handleCreateCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    formData.set("code", newCode.trim().toUpperCase())
    formData.set("discountType", newDiscountType)

    startTransition(async () => {
      const res = await createCouponByAdmin(formData)
      if (res.success) {
        toast.success("Cupom cadastrado com sucesso!")
        form.reset()
        setNewName("")
        setNewCode("")
        setNewDiscountValue("15")
        setNewMinServiceValue("0")
        setNewMaxDiscountAmount("")
        setNewMaxUsesGlobal("")
        setNewMaxUsesPerClient("1")
        setNewTargetServiceId("")
        setNewExpiresAt("")
        setNewDescription("")

        // Atualizar estado local
        const refreshedCode = (formData.get("code") as string) || "NOVO"
        setCoupons((prev) => [
          {
            id: res.couponId || `temp-${Date.now()}`,
            barbershop_id: barbershop?.id || "",
            name: (formData.get("name") as string) || "",
            code: refreshedCode,
            description: (formData.get("description") as string) || null,
            trigger_type: "manual_code",
            discount_type: newDiscountType,
            discount_value: Number(newDiscountValue) || 0,
            min_service_value: Number(newMinServiceValue) || 0,
            max_discount_amount: newMaxDiscountAmount ? Number(newMaxDiscountAmount) : null,
            max_uses_global: newMaxUsesGlobal ? parseInt(newMaxUsesGlobal, 10) : null,
            max_uses_per_client: newMaxUsesPerClient ? parseInt(newMaxUsesPerClient, 10) : 1,
            valid_days_of_week: null,
            valid_time_start: null,
            valid_time_end: null,
            target_service_id: newTargetServiceId || null,
            target_service_name: services.find((s) => s.id === newTargetServiceId)?.name || null,
            starts_at: null,
            expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
            is_active: true,
            created_at: new Date().toISOString(),
            totalUses: 0,
            totalDiscountApplied: 0,
          },
          ...prev,
        ])
      } else {
        toast.error(res.error || "Erro ao cadastrar cupom")
      }
    })
  }

  // Toggle ativação rápida
  function handleToggleStatus(coupon: AdminCouponItem) {
    const nextStatus = !coupon.is_active
    startTransition(async () => {
      const res = await toggleCouponStatusByAdmin(coupon.id, nextStatus)
      if (res.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextStatus } : c)),
        )
        toast.success(nextStatus ? `Cupom "${coupon.code}" ativado` : `Cupom "${coupon.code}" desativado`)
      } else {
        toast.error(res.error || "Erro ao atualizar status")
      }
    })
  }

  // Atualizar cupom via modal
  function handleUpdateCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingCoupon) return

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set("couponId", editingCoupon.id)

    startTransition(async () => {
      const res = await updateCouponByAdmin(formData)
      if (res.success) {
        toast.success("Cupom atualizado com sucesso!")
        const updatedName = String(formData.get("name"))
        const updatedCode = String(formData.get("code")).toUpperCase()
        const updatedType = formData.get("discountType") as DiscountType
        const updatedVal = Number(formData.get("discountValue"))
        const updatedMinVal = Number(formData.get("minServiceValue") || 0)
        const updatedMaxDisc = formData.get("maxDiscountAmount") ? Number(formData.get("maxDiscountAmount")) : null
        const updatedMaxUses = formData.get("maxUsesGlobal") ? parseInt(String(formData.get("maxUsesGlobal")), 10) : null
        const updatedTargetSvc = String(formData.get("targetServiceId") || "") || null
        const updatedExp = formData.get("expiresAt") ? new Date(String(formData.get("expiresAt"))).toISOString() : null
        const updatedActive = formData.get("isActive") !== "false"

        setCoupons((prev) =>
          prev.map((c) =>
            c.id === editingCoupon.id
              ? {
                  ...c,
                  name: updatedName,
                  code: updatedCode,
                  discount_type: updatedType,
                  discount_value: updatedVal,
                  min_service_value: updatedMinVal,
                  max_discount_amount: updatedMaxDisc,
                  max_uses_global: updatedMaxUses,
                  target_service_id: updatedTargetSvc,
                  target_service_name: services.find((s) => s.id === updatedTargetSvc)?.name || null,
                  expires_at: updatedExp,
                  is_active: updatedActive,
                }
              : c,
          ),
        )
        setEditingCoupon(null)
      } else {
        toast.error(res.error || "Erro ao atualizar cupom")
      }
    })
  }

  // Exclusão de cupom
  function handleDeleteCoupon() {
    if (!deletingCoupon) return

    startTransition(async () => {
      const res = await deleteCouponByAdmin(deletingCoupon.id)
      if (res.success) {
        toast.success(`Cupom "${deletingCoupon.code}" removido com sucesso!`)
        setCoupons((prev) => prev.filter((c) => c.id !== deletingCoupon.id))
        setDeletingCoupon(null)
      } else {
        toast.error(res.error || "Erro ao excluir cupom")
      }
    })
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── HEADER DA PÁGINA ── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Cupons</h1>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
              Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {barbershop ? barbershop.name : "Barbearia"} {userEmail ? `• ${userEmail}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const formEl = document.getElementById("cadastro-cupom-card")
              formEl?.scrollIntoView({ behavior: "smooth" })
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            Criar Novo Cupom
          </Button>
        </div>
      </div>

      {/* ── CARDS DE MÉTRICAS (KPIs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-card border border-border/70 hover:border-border transition-colors rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total de Cupons</span>
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Ticket className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground">{metrics.total}</span>
            <p className="text-xs text-muted-foreground mt-1">cadastrados para sua barbearia</p>
          </div>
        </div>

        {/* Card 2: Ativos */}
        <div className="bg-card border border-border/70 hover:border-border transition-colors rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Cupons Ativos</span>
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400">{metrics.active}</span>
            <p className="text-xs text-muted-foreground mt-1">disponíveis para clientes agendarem</p>
          </div>
        </div>

        {/* Card 3: Resgates / Usos */}
        <div className="bg-card border border-border/70 hover:border-border transition-colors rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total de Resgates</span>
            <div className="size-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-blue-400">{metrics.totalUses}</span>
            <p className="text-xs text-muted-foreground mt-1">agendamentos com desconto</p>
          </div>
        </div>

        {/* Card 4: Economia / Descontos */}
        <div className="bg-card border border-border/70 hover:border-border transition-colors rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Descontos Concedidos</span>
            <div className="size-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400">
              {formatCurrency(metrics.totalDiscountGiven)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">economia gerada para atrair clientes</p>
          </div>
        </div>
      </div>

      {/* ── GRID PRINCIPAL: FORMULÁRIO + LISTA DE CUPONS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA: FORMULÁRIO DE CADASTRO (5 colunas) */}
        <div id="cadastro-cupom-card" className="xl:col-span-5 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <TicketPercent className="size-4" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Cadastrar Novo Cupom</h2>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Defina as regras de desconto, valor mínimo e código de validação para os clientes aplicarem no agendamento.
            </p>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Nome do cupom */}
              <div>
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Título / Nome da Promoção *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Boas-vindas 15% OFF"
                  required
                  className="mt-1"
                />
              </div>

              {/* Código do cupom */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Código do Cupom *
                  </Label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Shuffle className="size-3" />
                    Sugerir código
                  </button>
                </div>
                <div className="relative mt-1">
                  <Input
                    id="code"
                    name="code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    placeholder="Ex.: BEMVINDO15"
                    required
                    className="uppercase font-mono font-bold tracking-wider pl-9"
                  />
                  <Tag className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  O código que o cliente digitará no agendamento (letras maiúsculas e sem espaços).
                </p>
              </div>

              {/* Seletor Tipo de Desconto (% ou R$) */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Tipo de Desconto *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDiscountType("percentage")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      newDiscountType === "percentage"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span>% Porcentagem</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDiscountType("fixed")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      newDiscountType === "fixed"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span>R$ Valor Fixo</span>
                  </button>
                </div>
              </div>

              {/* Valor do Desconto e Valor Mínimo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="discountValue" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {newDiscountType === "percentage" ? "Desconto (%) *" : "Desconto (R$) *"}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="discountValue"
                      name="discountValue"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={newDiscountType === "percentage" ? 100 : undefined}
                      value={newDiscountValue}
                      onChange={(e) => setNewDiscountValue(e.target.value)}
                      required
                      placeholder={newDiscountType === "percentage" ? "15" : "10,00"}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      {newDiscountType === "percentage" ? "%" : "R$"}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="minServiceValue" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor Mínimo (R$)
                  </Label>
                  <Input
                    id="minServiceValue"
                    name="minServiceValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMinServiceValue}
                    onChange={(e) => setNewMinServiceValue(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Teto de desconto (se percentual) e Limite Global de Usos */}
              <div className="grid grid-cols-2 gap-3">
                {newDiscountType === "percentage" ? (
                  <div>
                    <Label htmlFor="maxDiscountAmount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Teto Desconto (R$)
                    </Label>
                    <Input
                      id="maxDiscountAmount"
                      name="maxDiscountAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newMaxDiscountAmount}
                      onChange={(e) => setNewMaxDiscountAmount(e.target.value)}
                      placeholder="Sem teto"
                      className="mt-1"
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="maxUsesPerClient" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Usos p/ Cliente
                    </Label>
                    <Input
                      id="maxUsesPerClient"
                      name="maxUsesPerClient"
                      type="number"
                      min="1"
                      value={newMaxUsesPerClient}
                      onChange={(e) => setNewMaxUsesPerClient(e.target.value)}
                      placeholder="1"
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="maxUsesGlobal" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Limite Geral de Usos
                  </Label>
                  <Input
                    id="maxUsesGlobal"
                    name="maxUsesGlobal"
                    type="number"
                    min="1"
                    value={newMaxUsesGlobal}
                    onChange={(e) => setNewMaxUsesGlobal(e.target.value)}
                    placeholder="Ilimitado"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Serviço elegível */}
              <div>
                <Label htmlFor="targetServiceId" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Serviço Elegível
                </Label>
                <select
                  id="targetServiceId"
                  name="targetServiceId"
                  value={newTargetServiceId}
                  onChange={(e) => setNewTargetServiceId(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="">Todos os serviços da barbearia</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCurrency(s.price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Validade do cupom */}
              <div>
                <Label htmlFor="expiresAt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Data de Validade (Opcional)
                </Label>
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Descrição adicional */}
              <div>
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações / Regras
                </Label>
                <Input
                  id="description"
                  name="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex.: Válido apenas para clientes na primeira visita"
                  className="mt-1"
                />
              </div>

              {/* LIVE PREVIEW DO CUPOM */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Pré-visualização do Voucher
                </span>
                <div className="relative border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl p-4 overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block bg-primary text-primary-foreground text-xs font-extrabold px-2.5 py-1 rounded-md tracking-wider">
                        {newDiscountType === "percentage"
                          ? `${newDiscountValue || 0}% OFF`
                          : `${formatCurrency(Number(newDiscountValue || 0))} OFF`}
                      </span>
                      <h4 className="font-bold text-foreground text-sm mt-2">
                        {newName.trim() || "Nome da Promoção"}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {newDescription.trim() || "Válido no checkout do agendamento"}
                      </p>
                    </div>

                    <div className="bg-card border border-border px-2.5 py-1.5 rounded-lg text-center shrink-0">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Código
                      </span>
                      <span className="font-mono font-bold text-primary text-xs">
                        {newCode.trim() || "CÓDIGO"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/40">
                    {Number(newMinServiceValue) > 0 && (
                      <span>Min.: {formatCurrency(Number(newMinServiceValue))}</span>
                    )}
                    {newExpiresAt ? (
                      <span>Expira: {formatDate(newExpiresAt)}</span>
                    ) : (
                      <span>Sem expiração</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Envio */}
              <Button type="submit" disabled={isPending} className="w-full font-semibold mt-2">
                {isPending ? "Cadastrando Cupom..." : "Cadastrar Cupom"}
              </Button>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: LISTA DE CUPONS CADASTRADOS (7 colunas) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
            {/* Header da Lista e Controles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Cupons Cadastrados</h2>
                <p className="text-xs text-muted-foreground">
                  {filteredCoupons.length} {filteredCoupons.length === 1 ? "cupom encontrado" : "cupons encontrados"}
                </p>
              </div>

              {/* Filtro de Status */}
              <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    filterStatus === "all"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos ({coupons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("active")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    filterStatus === "active"
                      ? "bg-card text-emerald-400 shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ativos ({metrics.active})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("inactive")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    filterStatus === "inactive"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inativos/Expirados
                </button>
              </div>
            </div>

            {/* Barra de Busca */}
            <div className="relative mb-5">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código ou nome do cupom..."
                className="pl-9 text-sm"
              />
            </div>

            {/* Lista de Cupons */}
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-secondary/20">
                <div className="size-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
                  <Ticket className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Nenhum cupom encontrado</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  {searchQuery
                    ? "Nenhum cupom corresponde aos termos pesquisados."
                    : "Você ainda não possui cupons cadastrados com este filtro. Use o formulário ao lado para criar seu primeiro cupom."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {filteredCoupons.map((coupon) => {
                  const expired = isExpired(coupon.expires_at)
                  const usagePercentage =
                    coupon.max_uses_global && coupon.max_uses_global > 0
                      ? Math.min(100, Math.round((coupon.totalUses / coupon.max_uses_global) * 100))
                      : null

                  return (
                    <div
                      key={coupon.id}
                      className={`border rounded-xl p-4 transition-all duration-200 relative group ${
                        !coupon.is_active || expired
                          ? "bg-card/60 border-border/60 opacity-80"
                          : "bg-card border-border hover:border-primary/40 hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Detalhes principais */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Código com ação de copiar */}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(coupon.code || "")}
                              className="inline-flex items-center gap-1.5 font-mono text-sm font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
                              title="Clique para copiar"
                            >
                              <span>{coupon.code || "SEM CÓDIGO"}</span>
                              {copiedCode === coupon.code ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>

                            {/* Badge do Valor do Desconto */}
                            <Badge variant="default" className="font-semibold text-xs">
                              {coupon.discount_type === "percentage"
                                ? `${coupon.discount_value}% OFF`
                                : `${formatCurrency(coupon.discount_value)} OFF`}
                            </Badge>

                            {/* Status */}
                            {expired ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Expirado
                              </Badge>
                            ) : coupon.is_active ? (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Desativado
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-semibold text-foreground text-sm">{coupon.name}</h3>

                          {coupon.description && (
                            <p className="text-xs text-muted-foreground">{coupon.description}</p>
                          )}

                          {/* Chips informativos */}
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground pt-1">
                            {coupon.min_service_value > 0 && (
                              <span>Mínimo: {formatCurrency(coupon.min_service_value)}</span>
                            )}
                            {coupon.max_discount_amount && (
                              <span>Teto: {formatCurrency(coupon.max_discount_amount)}</span>
                            )}
                            {coupon.target_service_name ? (
                              <span className="flex items-center gap-1 text-primary/90">
                                <Scissors className="size-3" />
                                {coupon.target_service_name}
                              </span>
                            ) : (
                              <span>Todos os serviços</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(coupon.expires_at)}
                            </span>
                          </div>

                          {/* Barra de Usos / Limite Global */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                              <span>
                                {coupon.totalUses}{" "}
                                {coupon.totalUses === 1 ? "resgate realizado" : "resgates realizados"}
                                {coupon.max_uses_global ? ` de ${coupon.max_uses_global} disponíveis` : " (ilimitado)"}
                              </span>
                              {coupon.totalDiscountApplied > 0 && (
                                <span className="text-emerald-400 font-medium">
                                  {formatCurrency(coupon.totalDiscountApplied)} economizados
                                </span>
                              )}
                            </div>
                            {coupon.max_uses_global && (
                              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    (usagePercentage || 0) >= 100
                                      ? "bg-destructive"
                                      : (usagePercentage || 0) >= 80
                                      ? "bg-amber-400"
                                      : "bg-primary"
                                  }`}
                                  style={{ width: `${usagePercentage || 0}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ações do Cupom */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                          {/* Toggle Ativo/Inativo */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {coupon.is_active ? "Ativo" : "Inativo"}
                            </span>
                            <Switch
                              checked={coupon.is_active}
                              onCheckedChange={() => handleToggleStatus(coupon)}
                              disabled={isPending}
                            />
                          </div>

                          {/* Botões Editar / Excluir */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCoupon(coupon)}
                              className="size-8 p-0"
                              title="Editar cupom"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingCoupon(coupon)}
                              className="size-8 p-0"
                              title="Excluir cupom"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL DE EDIÇÃO DE CUPOM ── */}
      <Dialog open={!!editingCoupon} onOpenChange={(open) => !open && setEditingCoupon(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cupom de Desconto</DialogTitle>
            <DialogDescription>
              Atualize as regras, vigência e condições de uso do cupom.
            </DialogDescription>
          </DialogHeader>

          {editingCoupon && (
            <form onSubmit={handleUpdateCoupon} className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Título da Promoção *
                </Label>
                <Input
                  name="name"
                  defaultValue={editingCoupon.name}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Código do Cupom *
                </Label>
                <Input
                  name="code"
                  defaultValue={editingCoupon.code || ""}
                  required
                  className="mt-1 uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de Desconto
                  </Label>
                  <select
                    name="discountType"
                    defaultValue={editingCoupon.discount_type}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm mt-1 text-foreground"
                  >
                    <option value="percentage">% Porcentagem</option>
                    <option value="fixed">R$ Valor Fixo</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor Desconto *
                  </Label>
                  <Input
                    name="discountValue"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={editingCoupon.discount_value}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor Mínimo (R$)
                  </Label>
                  <Input
                    name="minServiceValue"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingCoupon.min_service_value}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Teto Desconto (R$)
                  </Label>
                  <Input
                    name="maxDiscountAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={editingCoupon.max_discount_amount || ""}
                    placeholder="Sem teto"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Limite Geral de Usos
                  </Label>
                  <Input
                    name="maxUsesGlobal"
                    type="number"
                    min="1"
                    defaultValue={editingCoupon.max_uses_global || ""}
                    placeholder="Ilimitado"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data de Expiração
                  </Label>
                  <Input
                    name="expiresAt"
                    type="date"
                    defaultValue={
                      editingCoupon.expires_at
                        ? new Date(editingCoupon.expires_at).toISOString().split("T")[0]
                        : ""
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Serviço Elegível
                </Label>
                <select
                  name="targetServiceId"
                  defaultValue={editingCoupon.target_service_id || ""}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm mt-1 text-foreground"
                >
                  <option value="">Todos os serviços da barbearia</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCurrency(s.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descrição / Regras
                </Label>
                <Input
                  name="description"
                  defaultValue={editingCoupon.description || ""}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modalIsActive"
                  name="isActive"
                  value="true"
                  defaultChecked={editingCoupon.is_active}
                  className="size-4 accent-primary rounded cursor-pointer"
                />
                <Label htmlFor="modalIsActive" className="text-sm cursor-pointer">
                  Cupom ativo para novos agendamentos
                </Label>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCoupon(null)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO ── */}
      <Dialog open={!!deletingCoupon} onOpenChange={(open) => !open && setDeletingCoupon(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Excluir Cupom
            </DialogTitle>
            <DialogDescription>
              {deletingCoupon?.totalUses && deletingCoupon.totalUses > 0 ? (
                <span>
                  O cupom <strong>{deletingCoupon.code}</strong> já foi utilizado em{" "}
                  <strong>{deletingCoupon.totalUses} agendamento(s)</strong>. Cupons com histórico
                  de resgates não podem ser removidos do banco por integridade contábil. Recomendamos
                  desativá-lo para impedir novos usos.
                </span>
              ) : (
                <span>
                  Tem certeza que deseja excluir o cupom <strong>{deletingCoupon?.code}</strong>?
                  Esta ação é irreversível.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingCoupon(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            {deletingCoupon?.totalUses && deletingCoupon.totalUses > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (deletingCoupon) {
                    handleToggleStatus(deletingCoupon)
                    setDeletingCoupon(null)
                  }
                }}
                disabled={isPending}
              >
                Desativar Cupom
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCoupon}
                disabled={isPending}
              >
                {isPending ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
