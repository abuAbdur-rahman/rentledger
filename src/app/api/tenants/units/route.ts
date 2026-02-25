import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

interface ActiveTenancy {
  unit_id: string
}

interface UnitWithProperty {
  id: string
  name: string
  rent_amount: number
}

// GET /api/tenants/units — fetch available (unoccupied) units for landlord
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: activeTenancies } = await supabase
    .from("tenancies")
    .select("unit_id")
    .eq("status", "active")

  const occupiedUnitIds = (activeTenancies ?? []).map((t: ActiveTenancy) => t.unit_id)

  const { data: units } = await supabase
    .from("units")
    .select("id, name, rent_amount, properties!inner(id, name, landlord_id)")
    .eq("properties.landlord_id", userId)

  const availableUnits = (units ?? []).filter((u: UnitWithProperty) => !occupiedUnitIds.includes(u.id))
  
  return NextResponse.json({ units: availableUnits }, { status: 200 })
}
