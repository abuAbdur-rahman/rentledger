import { NextRequest, NextResponse } from "next/server"
import { getDataProvider } from "@/lib/data/provider"
import { createPropertiesRepository } from "@/lib/data/properties"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"

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

// GET /api/properties/[id]/units — get all units for a property
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
    const units = await repository.listUnitsForLandlordProperty({
      userId,
      propertyId,
    })

    if (!units) return NextResponse.json({ error: "Property not found." }, { status: 404 })

    return NextResponse.json({ units }, { status: 200 })
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

// POST /api/properties/[id]/units — add unit to property
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const provider = getDataProvider()
  const supabase = provider === "supabase" ? await createServerClient() : null
  const userId =
    provider === "mongo"
      ? (await getUser())?.id ?? null
      : await getUserId(supabase!)

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { unitNumber, rentAmount } = await req.json()
  if (!unitNumber?.trim()) return NextResponse.json({ error: "Unit name is required." }, { status: 400 })
  if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) <= 0)
    return NextResponse.json({ error: "Valid rent amount is required." }, { status: 400 })

  try {
    const repository = await createPropertiesRepository(supabase ? { supabase } : {})
    const unit = await repository.addUnitForLandlordProperty({
      userId,
      propertyId,
      unitNumber: unitNumber.trim(),
      rentAmount: Number(rentAmount),
    })

    if (!unit) return NextResponse.json({ error: "Property not found." }, { status: 404 })

    return NextResponse.json({ unit }, { status: 201 })
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
