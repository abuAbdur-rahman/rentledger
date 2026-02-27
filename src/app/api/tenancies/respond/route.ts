import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"
import { createNotification } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServerClient()
    const body = await req.json()
    const { tenancyId, action } = body

    if (!tenancyId || !action) {
      return NextResponse.json({ error: "tenancyId and action required" }, { status: 400 })
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const newStatus = action === "accept" ? "active" : "rejected"

    const { error: updateError } = await supabase
      .from("tenancies")
      .update({ status: newStatus })
      .eq("id", tenancyId)
      .eq("tenant_id", user.id)
      .eq("status", "pending")

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: tenancy } = await supabase
      .from("tenancies")
      .select(`
        id,
        units!inner(
          properties!inner(landlord_id, name),
          name
        )
      `)
      .eq("id", tenancyId)
      .single()

    if (tenancy) {
      const landlordId = tenancy.units.properties.landlord_id
      const unitName = tenancy.units.name
      const propertyName = tenancy.units.properties.name

      await createNotification({
        userId: landlordId,
        title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
        message: `${user.full_name || "A tenant"} has ${action === "accept" ? "accepted" : "declined"} the invitation to Unit ${unitName} at ${propertyName}.`,
        type: "system",
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/tenancies/respond]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
