"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts"
import { fetchAdminReportData } from "@/app/actions/rbac"
import { formatReportPeriodLabel } from "@/lib/report-date"
import type { DashboardReportMetrics, MonthlyRevenueItem, ServiceReportItem } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

// Cor primária hardcoded — Recharts SVG não resolve CSS oklch()
const PRIMARY = "#EAB308"
const PRIMARY_MUTED = ["#EAB308","#D4A007","#BF8F06","#AA7F05","#957004","#806003","#6B5003","#564002"]

interface AdminReportsSectionProps {
  initialMetrics: DashboardReportMetrics
  initialTopServices: ServiceReportItem[]
  initialMonthlyData: MonthlyRevenueItem[]
  initialStartDate: string
  initialEndDate: string
  barbershopName?: string
  selectedBarbershopId?: string
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
    </div>
  )
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:8, padding:"8px 12px", fontSize:13 }}>
      <p style={{ fontWeight:600, color:"hsl(var(--foreground))", marginBottom:2 }}>{d.fullName}</p>
      <p style={{ color:"hsl(var(--muted-foreground))" }}>{d.pedidos} pedido(s)</p>
    </div>
  )
}

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:8, padding:"8px 12px", fontSize:13 }}>
      <p style={{ fontWeight:600, color:"hsl(var(--foreground))", marginBottom:4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color:"hsl(var(--muted-foreground))" }}>
          {p.dataKey === "revenue" ? formatCurrency(p.value) : `${p.value} agend.`}
        </p>
      ))}
    </div>
  )
}

export function AdminReportsSection({
  initialMetrics, initialTopServices, initialMonthlyData,
  initialStartDate, initialEndDate, barbershopName, selectedBarbershopId,
}: AdminReportsSectionProps) {
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [topServices, setTopServices] = useState(initialTopServices)
  const [monthlyData, setMonthlyData] = useState(initialMonthlyData)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const loadReports = useCallback((from: string, to: string) => {
    if (!from || !to) { setError("Informe as duas datas do periodo."); return }
    if (from > to) { setError("A data inicial nao pode ser maior que a data final."); return }
    setError("")
    startTransition(async () => {
      try {
        const result = await fetchAdminReportData(from, to, selectedBarbershopId)
        setMetrics(result.metrics)
        setTopServices(result.topServices)
        setMonthlyData(result.monthlyData ?? [])
      } catch {
        setError("Nao foi possivel carregar os relatorios.")
      }
    })
  }, [selectedBarbershopId])

  useEffect(() => {
    if (startDate === initialStartDate && endDate === initialEndDate) return
    const t = setTimeout(() => loadReports(startDate, endDate), 400)
    return () => clearTimeout(t)
  }, [startDate, endDate, initialStartDate, initialEndDate, loadReports])

  const barData = topServices.map((s) => ({
    name: s.service_name.length > 14 ? s.service_name.slice(0, 14) + "…" : s.service_name,
    fullName: s.service_name,
    pedidos: s.bookings,
  }))

  const hasMonthly = monthlyData.length >= 2

  return (
    <>
      {/* Filtro */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground">Relatorios</h2>
            <p className="text-sm text-muted-foreground">
              {barbershopName ? `Barbearia: ${barbershopName}` : "Todas as suas barbearias."}
            </p>
            <p className="text-xs text-muted-foreground">Periodo: {formatReportPeriodLabel(startDate, endDate)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 w-full lg:max-w-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="report-start-date">Data inicio</Label>
                <Input id="report-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-end-date">Data fim</Label>
                <Input id="report-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isPending} />
              </div>
            </div>
            {isPending && <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="size-4" /> Atualizando...</div>}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity ${isPending ? "opacity-60" : ""}`}>
        <MetricCard title="Total" value={String(metrics.totalAppointments)} />
        <MetricCard title="Agendados" value={String(metrics.scheduledAppointments)} />
        <MetricCard title="Concluidos" value={String(metrics.completedAppointments)} />
        <MetricCard title="Cancelados" value={String(metrics.canceledAppointments)} />
        <MetricCard title="Receita" value={formatCurrency(metrics.totalRevenue)} />
      </section>

      {/* Gráficos */}
      <section className={`grid grid-cols-1 ${hasMonthly ? "lg:grid-cols-2" : ""} gap-4 transition-opacity ${isPending ? "opacity-60" : ""}`}>
        {barData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold mb-4">Servicos mais pedidos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top:4, right:8, left:-16, bottom:4 }}>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:"#888" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize:11, fill:"#888" }} axisLine={false} tickLine={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill:"rgba(255,255,255,0.05)" }} />
                <Bar dataKey="pedidos" radius={[4,4,0,0]}>
                  {barData.map((_, i) => <Cell key={i} fill={PRIMARY_MUTED[i % PRIMARY_MUTED.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {hasMonthly && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold mb-4">Receita por mes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top:4, right:8, left:-16, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize:11, fill:"#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<LineTooltip />} cursor={{ stroke:"rgba(255,255,255,0.1)" }} />
                <Line type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={2.5}
                  dot={{ fill:PRIMARY, r:4 }} activeDot={{ r:6, fill:PRIMARY }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Tabela */}
      {topServices.length > 0 && (
        <section className={`bg-card border border-border rounded-lg p-4 transition-opacity ${isPending ? "opacity-60" : ""}`}>
          <h3 className="text-base font-semibold mb-4">Detalhamento por servico</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">Servico</th><th className="py-2">Pedidos</th><th className="py-2">Receita</th>
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
        </section>
      )}
    </>
  )
}
