import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"
import { createNotification } from "@/lib/notifications"

function calculateNextDueDate(startDate: string, rentCycle: string | null): string {
  const date = new Date(startDate);
  if (rentCycle === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString();
}

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

    if (action === "accept") {
      const { error: terminateError } = await supabase
        .from("tenancies")
        .update({ status: "terminated" })
        .eq("tenant_id", user.id)
        .eq("status", "active")
        .neq("id", tenancyId)

      if (terminateError) {
        console.error("Terminate error:", terminateError)
        return NextResponse.json({ error: "Failed to terminate existing tenancy" }, { status: 500 })
      }

      const { data: pendingTenancy, error: fetchError } = await supabase
        .from("tenancies")
        .select("start_date, rent_cycle")
        .eq("id", tenancyId)
        .single()

      if (fetchError || !pendingTenancy) {
        return NextResponse.json({ error: "Tenancy not found" }, { status: 404 })
      }

      const nextDueDate = calculateNextDueDate(
        pendingTenancy.start_date,
        pendingTenancy.rent_cycle
      )

      const { error: updateError } = await supabase
        .from("tenancies")
        .update({ 
          status: newStatus,
          next_due_date: nextDueDate,
        })
        .eq("id", tenancyId)
        .eq("tenant_id", user.id)
        .eq("status", "pending")

      if (updateError) {
        console.error("Update error:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
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
