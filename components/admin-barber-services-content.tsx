"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Scissors, User, Save, CheckCheck, X } from "lucide-react"

import { setBarberServices } from "@/app/actions/barber-services"
import type { AdminBarberServiceItem, Service } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface AdminBarberServicesContentProps {
  barbers: AdminBarberServiceItem[]
  services: Service[]
  userEmail?: string
  userFullName?: string | null
}

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function AdminBarberServicesContent({
  barbers: initialBarbers,
  services,
  userEmail,
}: AdminBarberServicesContentProps) {
  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {}
    for (const b of initialBarbers) {
      initial[b.barber_id] = new Set(b.service_ids)
    }
    return initial
  })
  const [savedState, setSavedState] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {}
    for (const b of initialBarbers) {
      initial[b.barber_id] = new Set(b.service_ids)
    }
    return initial
  })
  const [isPending, startTransition] = useTransition()
  const [savingBarberId, setSavingBarberId] = useState<string | null>(null)

  function toggleService(barberId: string, serviceId: string) {
    setSelections((prev) => {
      const current = new Set(prev[barberId] || [])
      if (current.has(serviceId)) {
        current.delete(serviceId)
      } else {
        current.add(serviceId)
      }
      return { ...prev, [barberId]: current }
    })
  }

  function selectAll(barberId: string) {
    setSelections((prev) => ({ ...prev, [barberId]: new Set(services.map((s) => s.id)) }))
  }

  function clearAll(barberId: string) {
    setSelections((prev) => ({ ...prev, [barberId]: new Set() }))
  }

  function isDirty(barberId: string): boolean {
    const current = selections[barberId] || new Set<string>()
    const saved = savedState[barberId] || new Set<string>()
    if (current.size !== saved.size) return true
    for (const id of current) {
      if (!saved.has(id)) return true
    }
    return false
  }

  function handleSave(barber: AdminBarberServiceItem) {
    const serviceIds = Array.from(selections[barber.barber_id] || [])
    setSavingBarberId(barber.barber_id)
    startTransition(async () => {
      const res = await setBarberServices(barber.barber_id, serviceIds)
      setSavingBarberId(null)
      if (res.success) {
        setSavedState((prev) => ({ ...prev, [barber.barber_id]: new Set(serviceIds) }))
        toast.success(`Serviços de ${barber.barber_name} atualizados`)
      } else {
        toast.error(res.error || "Erro ao salvar serviços do barbeiro")
      }
    })
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── HEADER DA PÁGINA ── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Serviços por Barbeiro</h1>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            Admin
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Escolha quais serviços cada barbeiro realiza. {userEmail ? `• ${userEmail}` : ""}
        </p>
      </div>

      {services.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl p-8 text-center">
          <Scissors className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Nenhum serviço cadastrado</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Cadastre os serviços da sua barbearia no Dashboard antes de vinculá-los aos barbeiros.
          </p>
        </div>
      ) : initialBarbers.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl p-8 text-center">
          <User className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Nenhum barbeiro cadastrado</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Cadastre um barbeiro no Dashboard para poder vincular os serviços que ele realiza.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {initialBarbers.map((barber) => {
            const currentSet = selections[barber.barber_id] || new Set<string>()
            const dirty = isDirty(barber.barber_id)
            const saving = isPending && savingBarberId === barber.barber_id

            return (
              <div
                key={barber.barber_id}
                className="bg-card border border-border/70 hover:border-border transition-colors rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <User className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{barber.barber_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {currentSet.size} de {services.length} serviço(s) selecionado(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => selectAll(barber.barber_id)}>
                      <CheckCheck className="size-4" />
                      Selecionar todos
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => clearAll(barber.barber_id)}>
                      <X className="size-4" />
                      Limpar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!dirty || saving}
                      onClick={() => handleSave(barber)}
                    >
                      <Save className="size-4" />
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {services.map((service) => {
                    const checkboxId = `barber-${barber.barber_id}-service-${service.id}`
                    const checked = currentSet.has(service.id)
                    return (
                      <label
                        key={service.id}
                        htmlFor={checkboxId}
                        className="flex items-start gap-2 rounded-lg border border-border/60 p-3 cursor-pointer hover:border-border transition-colors"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={checked}
                          onCheckedChange={() => toggleService(barber.barber_id, service.id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <Label htmlFor={checkboxId} className="text-sm font-medium text-foreground cursor-pointer">
                            {service.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(service.price)} • {service.duration_minutes} min
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
