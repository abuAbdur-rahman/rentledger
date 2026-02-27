import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"
import type { TenantHistoryResponse, TenantPayment, PaymentStatus } from "@/types/tenant"

function deriveStatus(dbStatus: string, dueDate: string): PaymentStatus {
  if (dbStatus === "verified") return "paid"
  if (dbStatus === "rejected") return "rejected"
  return new Date(dueDate) < new Date() ? "overdue" : "pending"
}

async function getAuthedUser() {
  const userData = await getUser()
  if (!userData || userData.role !== "tenant") return null
  return userData
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServerClient()

    const { data: tenancy, error: tenancyError } = await supabase
      .from("tenancies")
      .select("id, next_due_date")
      .eq("tenant_id", user.id)
      .eq("status", "active")
      .single()

    if (tenancyError || !tenancy) {
      return NextResponse.json({
        hasTenancy: false,
        payments: [],
        total: 0,
        page: 1,
        limit: 20,
      } satisfies TenantHistoryResponse)
    }

    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1))
    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 20))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: rows, count, error: paymentsError } = await supabase
      .from("payments")
      .select(
        "id, amount, status, payment_date, reference, proof_url, rejection_reason",
        { count: "exact" },
      )
      .eq("tenancy_id", tenancy.id)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    const nextDueDate = tenancy.next_due_date ?? ""

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments: TenantPayment[] = (rows ?? []).map((p: any) => ({
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
      payments,
      total: count ?? 0,
      page,
      limit,
    } satisfies TenantHistoryResponse)
  } catch (err) {
    console.error("[GET /api/tenant/history]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
