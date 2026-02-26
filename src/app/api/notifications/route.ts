import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"
import { createNotification } from "@/lib/notifications"

export async function GET(req: NextRequest) {
  const userData = await getUser()
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServerClient()
  const searchParams = req.nextUrl.searchParams
  const unreadOnly = searchParams.get("unread") === "true"

  let query = supabase
    .from("notifications")
    .select("id, title, message, type, read, created_at, data")
    .eq("user_id", userData.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (unreadOnly) {
    query = query.eq("read", false)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userData.id)
    .eq("read", false)

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: count ?? 0,
  })
}

export async function PATCH(req: NextRequest) {
  const userData = await getUser()
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServerClient()
  const body = await req.json()
  const { notification_id, mark_all_read, action, tenancy_id } = body

  if (mark_all_read) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userData.id)
      .eq("read", false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (notification_id) {
    if (action === "accept" || action === "reject") {
      if (!tenancy_id) {
        return NextResponse.json({ error: "Tenancy ID required" }, { status: 400 })
      }

      const newStatus = action === "accept" ? "active" : "rejected"

      const { error: updateError } = await supabase
        .from("tenancies")
        .update({ status: newStatus })
        .eq("id", tenancy_id)
        .eq("tenant_id", userData.id)

      if (updateError) {
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
        .eq("id", tenancy_id)
        .single()

      if (tenancy) {
        const landlordId = tenancy.units.properties.landlord_id
        const unitName = tenancy.units.name
        const propertyName = tenancy.units.properties.name

        await createNotification({
          userId: landlordId,
          title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
          message: `${userData.full_name || "A tenant"} has ${action === "accept" ? "accepted" : "declined"} the invitation to Unit ${unitName} at ${propertyName}.`,
          type: "system",
        })
      }
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification_id)
      .eq("user_id", userData.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
