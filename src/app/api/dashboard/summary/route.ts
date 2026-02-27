import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"]

interface PaymentWithRelations {
  id: string
  amount: number
  status: Database["public"]["Enums"]["payment_status"]
  payment_date: string | null
  tenancies: {
    id: string
    next_due_date: string
    unit_id: string
    units: {
      id: string
      name: string
      properties: {
        id: string
        landlord_id: string
      }
    }
    profiles: {
      id: string
      full_name: string
    }
  }
}

interface TenancyWithUnit {
  id: string
  start_date: string
  next_due_date: string
  rent_cycle: string
  status: string
  unit: {
    id: string
    name: string
    rent_amount: number
    property: {
      id: string
      name: string
      address: string | null
    }
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single() as { data: { role: "landlord" | "tenant" } | null }

    const role: "landlord" | "tenant" = profile?.role ?? "tenant"

    // Landlord dashboard data
    if (role === "landlord") {
      // Get properties count
      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", user.id)

      // Get all payments for landlord's properties
      const { data: payments } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          status,
          payment_date,
          tenancies!inner (
            id,
            next_due_date,
            unit_id,
            units!inner (
              id,
              name,
              properties!inner (
                id,
                landlord_id
              )
            ),
            profiles!inner (
              id,
              full_name
            )
          )
        `)
        .eq("tenancies.units.properties.landlord_id", user.id)
        .order("payment_date", { ascending: false })

      // Get units for this landlord
      const { data: unitsData } = await supabase
        .from("units")
        .select("id, property_id") as { data: Array<{ id: string; property_id: string }> | null }

      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id") as { data: Array<{ id: string }> | null }

      const propertyIds = propertiesData?.map((p) => p.id) ?? []
      const unitIds =
        unitsData?.filter((u) => propertyIds.includes(u.property_id)).map((u) => u.id) ?? []

      const { count: activeTenantsCount } = await supabase
        .from("tenancies")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .in("unit_id", unitIds)

      // Compute aggregates
      const now = new Date()

      const recentPayments = ((payments ?? []) as PaymentWithRelations[]).slice(0, 5).map((p) => {
        const dueDate = new Date(p.tenancies?.next_due_date ?? "")
        const isOverdue =
          p.status !== "verified" && dueDate < now

        return {
          id: p.id,
          tenantName: p.tenancies?.profiles?.full_name ?? "Unknown Tenant",
          tenantInitials: getInitials(p.tenancies?.profiles?.full_name ?? "Unknown"),
          unitLabel: p.tenancies?.units?.name ?? "Unit",
          amount: p.amount ?? 0,
          status: isOverdue
            ? "overdue"
            : p.status === "verified"
              ? "paid"
              : "pending",
          date: p.payment_date || p.tenancies?.next_due_date,
        }
      })

      const totalRevenue = recentPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0)

      const pendingPayments = recentPayments.filter((p) => p.status === "pending").length
      const overduePayments = recentPayments.filter((p) => p.status === "overdue").length

      return NextResponse.json({
        role,
        summary: {
          totalRevenue,
          revenueGrowth: 0,
          pendingPayments,
          overduePayments,
          activeTenantsCount: activeTenantsCount ?? 0,
          propertiesCount: propertiesCount ?? 0,
          recentPayments,
        },
      })
    }

    // Tenant dashboard data
    // Get active tenancy
    const { data: tenancyRaw } = await supabase
      .from("tenancies")
      .select(`
        id,
        start_date,
        next_due_date,
        rent_cycle,
        status,
        unit:units!inner (
          id,
          name,
          rent_amount,
          property:properties!inner (
            id,
            name,
            address
          )
        )
      `)
      .eq("tenant_id", user.id)
      .eq("status", "active")
      .single()

    if (!tenancyRaw) {
      return NextResponse.json({
        role,
        summary: null,
        message: "No active tenancy",
      })
    }

    const tenancy = tenancyRaw as TenancyWithUnit

    // Get payment history
    const { data: paymentsRaw } = await supabase
      .from("payments")
      .select("*")
      .eq("tenancy_id", tenancy.id)
      .order("created_at", { ascending: false })
      .limit(10)

    const payments = paymentsRaw as PaymentRow[]

    const now = new Date()
    const dueDate = new Date(tenancy.next_due_date)
    const isOverdue = dueDate < now
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    const lastPayment = payments?.[0]
    const paymentStatus = (lastPayment?.status ?? "pending") as string
    const currentStatus: "paid" | "pending" | "overdue" = !lastPayment
      ? isOverdue
        ? "overdue"
        : "pending"
      : paymentStatus === "verified" || paymentStatus === "paid"
        ? "paid"
        : isOverdue
          ? "overdue"
          : "pending"

    return NextResponse.json({
      role,
      summary: {
        tenancy: {
          id: tenancy.id,
          unitName: tenancy.unit.name,
          propertyName: tenancy.unit.property.name,
          propertyAddress: tenancy.unit.property.address,
          rentAmount: tenancy.unit.rent_amount,
          dueDate: tenancy.next_due_date,
          daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
          isOverdue,
        },
        currentStatus,
        paymentHistory: (payments ?? []).map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status === "verified" ? "paid" : "pending",
          date: p.payment_date || p.created_at || "",
        })),
      },
    })
  } catch (err) {
    console.error("[dashboard/summary]", err)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}
