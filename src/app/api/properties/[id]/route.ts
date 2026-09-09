import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export interface UnitItem {
  id: string
  unitNumber: string
  rentAmount: number
  tenantName: string | null
  tenantId: string | null
  tenancyId: string | null
  paymentStatus: "paid" | "pending" | "overdue" | "vacant"
}

export interface PropertyDetail {
  id: string
  name: string
  address: string
  createdAt: string
  unitsCount: number
  activeTenants: number
  totalRevenue: number
  pendingCount: number
  overdueCount: number
  units: UnitItem[]
}

async function getUserId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : user.id
}

// GET /api/properties/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createServerClient()
  const userId = await getUserId(supabase)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property, error } = await (supabase.from("properties").select(`id, name, address, created_at`).eq("id", propertyId).eq("landlord_id", userId).single() as any)
  if (error || !property) return NextResponse.json({ error: "Property not found" }, { status: 404 })

  const { data: units } = await supabase.from("units").select(`
    id, name, rent_amount,
    tenancies!left(id, status, next_due_date, profiles!left(id, full_name),
      payments(id, status, amount))
  `).eq("property_id", propertyId).order("name")

  const now = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedUnits: UnitItem[] = (units ?? []).map((u: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeTenancy = (u.tenancies ?? []).find((t: any) => t.status === 'active')
    if (!activeTenancy) return { id: u.id, unitNumber: u.name, rentAmount: u.rent_amount ?? 0, tenantName: null, tenantId: null, tenancyId: null, paymentStatus: "vacant" }
    const payments = activeTenancy.payments ?? []
    const hasPaidPayment = payments.some((p: { status: string }) => p.status === "verified" || p.status === "paid")
    let paymentStatus: "paid" | "pending" | "overdue" = "pending"
    if (hasPaidPayment) {
      paymentStatus = "paid"
    } else if (new Date(activeTenancy.next_due_date) < now) {
      paymentStatus = "overdue"
    }
    return { id: u.id, unitNumber: u.name, rentAmount: u.rent_amount ?? 0, tenantName: activeTenancy.profiles?.full_name ?? null, tenantId: activeTenancy.profiles?.id ?? null, tenancyId: activeTenancy.id, paymentStatus }
  })

  const detail: PropertyDetail = {
    id: property.id, name: property.name, address: property.address ?? "", createdAt: property.created_at,
    unitsCount: mappedUnits.length, activeTenants: mappedUnits.filter(u => u.tenantId).length,
    totalRevenue: 0, pendingCount: mappedUnits.filter(u => u.paymentStatus === "pending").length,
    overdueCount: mappedUnits.filter(u => u.paymentStatus === "overdue").length, units: mappedUnits,
  }
  return NextResponse.json({ property: detail }, { status: 200 })
}

// DELETE /api/properties/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createServerClient()
  const userId = await getUserId(supabase)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { error } = await supabase.from("properties").delete().eq("id", propertyId).eq("landlord_id", userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 200 })
}

// PATCH /api/properties/[id] — edit property
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createServerClient()
  const userId = await getUserId(supabase)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, address } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Property name required." }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("properties") as any).update({ name: name.trim(), address: address?.trim() ?? null }).eq("id", propertyId).eq("landlord_id", userId).select("id, name, address").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ property: data }, { status: 200 })
}
