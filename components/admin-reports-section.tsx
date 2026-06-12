"use client"

import { useCallback, useState, useTransition } from "react"
import { fetchAdminReportData } from "@/app/actions/rbac"
import { formatReportPeriodLabel } from "@/lib/report-date"
import type { DashboardReportMetrics, ServiceReportItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

interface AdminReportsSectionProps {
  initialMetrics: DashboardReportMetrics
  initialTopServices: ServiceReportItem[]
  initialStartDate: string
  initialEndDate: string
  barbershopName?: string
  selectedBarbershopId?: string
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
    </div>
  )
}

export function AdminReportsSection({
  initialMetrics,
  initialTopServices,
  initialStartDate,
  initialEndDate,
  barbershopName,
  selectedBarbershopId,
}: AdminReportsSectionProps) {
  const [startDateInput, setStartDateInput] = useState(initialStartDate)
  const [endDateInput, setEndDateInput] = useState(initialEndDate)
  const [appliedStartDate, setAppliedStartDate] = useState(initialStartDate)
  const [appliedEndDate, setAppliedEndDate] = useState(initialEndDate)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [topServices, setTopServices] = useState(initialTopServices)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const canSearch = Boolean(startDateInput && endDateInput)

  const loadReports = useCallback(
    (from: string, to: string) => {
      if (!from || !to) {
        setError("Informe as duas datas do período.")
        return
      }

      if (from > to) {
        setError("A data inicial não pode ser maior que a data final.")
        return
      }

      setError("")
      setAppliedStartDate(from)
      setAppliedEndDate(to)
      startTransition(async () => {
        try {
          const result = await fetchAdminReportData(from, to, selectedBarbershopId)
          setMetrics(result.metrics)
          setTopServices(result.topServices)
        } catch {
          setError("Não foi possível carregar os relatórios. Tente novamente.")
        }
      })
    },
    [selectedBarbershopId],
  )

  function handleFilter() {
    loadReports(startDateInput, endDateInput)
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground">Relatórios</h2>
            <p className="text-sm text-muted-foreground">
              {barbershopName
                ? `Visualizando dados da barbearia: ${barbershopName}`
                : "Visualizando dados das suas barbearias."}
            </p>
            <p className="text-xs text-muted-foreground">
              Período: {formatReportPeriodLabel(appliedStartDate, appliedEndDate)}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 w-full lg:max-w-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="report-start-date">Data início</Label>
                <Input
                  id="report-start-date"
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-end-date">Data fim</Label>
                <Input
                  id="report-end-date"
                  type="date"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              className="mt-3 w-full sm:w-auto"
              onClick={handleFilter}
              disabled={!canSearch || isPending}
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" />
                  Buscando...
                </>
              ) : (
                "Buscar"
              )}
            </Button>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </section>

      <section
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <MetricCard title="Total de agendamentos" value={String(metrics.totalAppointments)} />
        <MetricCard title="Agendados" value={String(metrics.scheduledAppointments)} />
        <MetricCard title="Concluídos" value={String(metrics.completedAppointments)} />
        <MetricCard title="Cancelados" value={String(metrics.canceledAppointments)} />
        <MetricCard title="Receita" value={formatCurrency(metrics.totalRevenue)} />
      </section>

      <section
        className={`bg-card border border-border rounded-lg p-4 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        <h3 className="text-lg font-semibold mb-4">Serviços mais pedidos</h3>
        {topServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado encontrado no período selecionado.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">Serviço</th>
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
    </>
  )
}
