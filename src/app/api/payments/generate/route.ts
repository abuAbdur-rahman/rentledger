import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"
import { TablesInsert } from "@/types/database"

interface TenancyWithRent {
  id: string
  rent_amount: number
  next_due_date: string | null
  unit: {
    id: string
    properties: {
      landlord_id: string
    }
  }
}

export async function POST(req: NextRequest) {
  const userData = await getUser()
  if (!userData || userData.role !== "landlord") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServerClient()
    const body = await req.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      )
    }

    const { data: tenancies } = await supabase
      .from("tenancies")
      .select(`
        id,
        rent_amount,
        next_due_date,
        unit:units!inner(
          id,
          properties!inner(landlord_id)
        )
      `)
      .eq("unit.properties.landlord_id", userData.id)
      .eq("status", "active") as { data: TenancyWithRent[] | null }

    const { data: existingPayments } = await supabase
      .from("payments")
      .select("tenancy_id")

    const existingTenancyIds = new Set(
      (existingPayments ?? []).map(p => p.tenancy_id)
    )

    const paymentsToInsert: TablesInsert<"payments">[] = (tenancies ?? [])
      .filter((t: TenancyWithRent) => !existingTenancyIds.has(t.id))
      .map((t: TenancyWithRent) => ({
        tenancy_id: t.id,
        amount: t.rent_amount,
        status: "pending" as const,
      }))

    if (paymentsToInsert.length > 0) {
      await supabase.from("payments").insert(paymentsToInsert)
    }

    return NextResponse.json({
      success: true,
      created: paymentsToInsert.length,
      skipped: existingTenancyIds.size,
      total: tenancies?.length ?? 0,
    })
  } catch (err) {
    console.error("[POST /api/payments/generate]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
