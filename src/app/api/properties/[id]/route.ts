import { NextRequest, NextResponse } from "next/server"
import { getDataProvider } from "@/lib/data/provider"
import { createPropertiesRepository } from "@/lib/data/properties"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"

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

function formatSchemaErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("Could not find the table")) {
    return "Database tables are not initialized. Run the SQL in supabase/bootstrap.sql in your Supabase SQL editor.";
  }
  return message;
}

async function getUserId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : user.id
}

// GET /api/properties/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const provider = getDataProvider()
  const supabase = provider === "supabase" ? await createServerClient() : null
  const userId =
    provider === "mongo"
      ? (await getUser())?.id ?? null
      : await getUserId(supabase!)

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const repository = await createPropertiesRepository(supabase ? { supabase } : {})
    const detail = await repository.getDetailForLandlord({
      userId,
      propertyId,
    })

    if (!detail) return NextResponse.json({ error: "Property not found" }, { status: 404 })

    const typedDetail: PropertyDetail = {
      ...detail,
      units: detail.units as UnitItem[],
    }

    return NextResponse.json({ property: typedDetail }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

// DELETE /api/properties/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const provider = getDataProvider()
  const supabase = provider === "supabase" ? await createServerClient() : null
  const userId =
    provider === "mongo"
      ? (await getUser())?.id ?? null
      : await getUserId(supabase!)

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const repository = await createPropertiesRepository(supabase ? { supabase } : {})
    const deleted = await repository.deleteForLandlord({
      userId,
      propertyId,
    })

    if (!deleted) return NextResponse.json({ error: "Property not found" }, { status: 404 })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

// PATCH /api/properties/[id] — edit property
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const provider = getDataProvider()
  const supabase = provider === "supabase" ? await createServerClient() : null
  const userId =
    provider === "mongo"
      ? (await getUser())?.id ?? null
      : await getUserId(supabase!)

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, address } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Property name required." }, { status: 400 })

  try {
    const repository = await createPropertiesRepository(supabase ? { supabase } : {})
    const updated = await repository.updateForLandlord({
      userId,
      propertyId,
      name: name.trim(),
      address: address?.trim() ?? null,
    })

    if (!updated) return NextResponse.json({ error: "Property not found" }, { status: 404 })

    return NextResponse.json({ property: updated }, { status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
