import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

async function getUserId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : user.id
}

// GET /api/properties/[id]/units — get all units for a property
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createServerClient()
  const userId = await getUserId(supabase)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify property ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("landlord_id", userId)
    .single()

  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 })

  // Get units with tenancy status
  const { data: units, error } = await supabase
    .from("units")
    .select(`
      id, name, rent_amount,
      tenancies(id, status, profiles!inner(full_name))
    `)
    .eq("property_id", propertyId)
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Map to include vacancy status
  const result = (units ?? []).map((u) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeTenancy = u.tenancies?.find((t: any) => t.status === "active")
    return {
      id: u.id,
      name: u.name,
      rent_amount: u.rent_amount,
      isVacant: !activeTenancy,
      tenantName: activeTenancy?.profiles?.full_name || null,
      tenancyStatus: activeTenancy?.status || null,
    }
  })

  return NextResponse.json({ units: result }, { status: 200 })
}

// POST /api/properties/[id]/units — add unit to property
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createServerClient()
  const userId = await getUserId(supabase)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { unitNumber, rentAmount } = await req.json()
  if (!unitNumber?.trim()) return NextResponse.json({ error: "Unit name is required." }, { status: 400 })
  if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) <= 0)
    return NextResponse.json({ error: "Valid rent amount is required." }, { status: 400 })

  // Verify property ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("landlord_id", userId)
    .single()

  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 })

  const insertData: Database["public"]["Tables"]["units"]["Insert"] = {
    property_id: propertyId,
    name: unitNumber.trim(),
    rent_amount: Number(rentAmount),
  }

  const { data, error } = await supabase
    .from("units")
    .insert(insertData)
    .select("id, name, rent_amount")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ unit: data }, { status: 201 })
}
