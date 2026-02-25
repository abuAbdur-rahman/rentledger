import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"

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
    .select("id, title, message, type, read, created_at")
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
  const { notification_id, mark_all_read } = body

  if (mark_all_read) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userData.id)
      .eq("read", false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (notification_id) {
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
