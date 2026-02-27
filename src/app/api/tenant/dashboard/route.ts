import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"
import type {
  TenantDashboardResponse,
  TenantRentInfo,
  TenantPayment,
  PaymentStatus,
} from "@/types/tenant"

function deriveStatus(dbStatus: string, dueDate: string): PaymentStatus {
  if (dbStatus === "verified") return "paid"
  if (dbStatus === "rejected") return "rejected"
  return new Date(dueDate) < new Date() ? "overdue" : "pending"
}

function nextDueDateFunc(nextDueDateStr: string) {
  const due = new Date(nextDueDateStr)
  const now = new Date()
  if (due <= now) {
    due.setMonth(due.getMonth() + 1)
  }
  return due
}

async function getAuthedUser() {
  const userData = await getUser()
  if (!userData || userData.role !== "tenant") return null
  return userData
}

export async function GET() {
  const user = await getAuthedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServerClient()

    const { data: tenancy, error: tenancyError } = await supabase
      .from("tenancies")
      .select(
        `
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
      `,
      )
      .eq("tenant_id", user.id)
      .eq("status", "active")
      .single()

    if (tenancyError || !tenancy) {
      return NextResponse.json({
        hasTenancy: false,
        rentInfo: null,
        recentPayments: [],
      } satisfies TenantDashboardResponse)
    }

    const unit = (tenancy as unknown as { unit: { name: string; rent_amount: number; property: { name: string; address: string | null } } }).unit
    const property = unit?.property
    const nextDueDate = tenancy.next_due_date ?? ""

    const dueDate = new Date(nextDueDate)
    const now = new Date()
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

interface PaymentRow {
  id: string
  amount: number
  status: string
  payment_date: string | null
  reference: string | null
  proof_url: string | null
  rejection_reason: string | null
}

const { data: paymentsRaw } = await supabase
  .from("payments")
  .select("id, amount, status, payment_date, reference, proof_url, rejection_reason")
  .eq("tenancy_id", tenancy.id)
  .order("created_at", { ascending: false })
  .limit(5) as { data: PaymentRow[] | null }

const latestPayment = paymentsRaw?.[0]
    const currentStatus: PaymentStatus = latestPayment
      ? deriveStatus(latestPayment.status, nextDueDate)
      : daysUntilDue < 0
        ? "overdue"
        : "pending"

    const rentInfo: TenantRentInfo = {
      tenancyId: tenancy.id,
      unitLabel: `Unit ${unit?.name ?? "—"}`,
      propertyName: property?.name ?? "Property",
      propertyAddress: property?.address ?? "",
      rentAmount: unit?.rent_amount ?? 0,
      nextDueDate: nextDueDateFunc(nextDueDate).toISOString(),
      daysUntilDue,
      currentPaymentStatus: currentStatus,
      currentPaymentId: latestPayment?.id ?? null,
    }

    const recentPayments: TenantPayment[] = (paymentsRaw ?? []).map((p) => ({
      id: p.id,
      amount: p.amount ?? 0,
      status: deriveStatus(p.status, nextDueDate),
      dueDate: nextDueDate,
      paidAt: p.payment_date ?? null,
      reference: p.reference ?? null,
      proofUrl: p.proof_url ?? null,
      rejectionReason: p.rejection_reason ?? null,
    }))

    return NextResponse.json({
      hasTenancy: true,
      rentInfo,
      recentPayments,
    } satisfies TenantDashboardResponse)
  } catch (err) {
    console.error("[GET /api/tenant/dashboard]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServerClient()
    const body = await req.json()
    const { tenancyId, paymentId, reference, proofUrl, amount } = body

    if (!tenancyId) {
      return NextResponse.json({ error: "tenancyId required" }, { status: 400 })
    }

    const { data: tenancy } = await supabase
      .from("tenancies")
      .select("id, next_due_date")
      .eq("id", tenancyId)
      .eq("tenant_id", user.id)
      .single()

    if (!tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (paymentId) {
      await supabase
        .from("payments")
        .update({
          reference: reference ?? null,
          proof_url: proofUrl ?? null,
          status: "pending",
        })
        .eq("id", paymentId)
        .eq("tenancy_id", tenancyId)
    } else {
      await supabase.from("payments").insert({
        tenancy_id: tenancyId,
        amount: amount ?? 0,
        status: "pending",
        due_date: tenancy.next_due_date,
        reference: reference ?? null,
        proof_url: proofUrl ?? null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/tenant/dashboard]", err)
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 })
  }
}
