import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUser } from "@/services/user"

export async function GET() {
  const userData = await getUser()
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServerClient()

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(`
      id,
      landlord_id,
      tenant_id,
      created_at,
      landlord:profiles!conversations_landlord_id_fkey(id, full_name),
      tenant:profiles!conversations_tenant_id_fkey(id, full_name),
      messages(id, content, sender_id, created_at)
    `)
    .or(`landlord_id.eq.${userData.id},tenant_id.eq.${userData.id}`)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted = (conversations ?? []).map((c: Record<string, unknown>) => {
    const messages = (c.messages as Record<string, unknown>[]) || []
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
    const otherUser = userData.role === "landlord"
      ? (c.tenant as Record<string, unknown>)
      : (c.landlord as Record<string, unknown>)

    return {
      id: c.id,
      otherUser: {
        id: otherUser?.id,
        name: otherUser?.full_name || "Unknown",
      },
      lastMessage: lastMessage?.content,
      lastMessageAt: lastMessage?.created_at,
      createdAt: c.created_at,
    }
  })

  return NextResponse.json({ conversations: formatted })
}

export async function POST(req: NextRequest) {
  const userData = await getUser()
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServerClient()
  const body = await req.json()
  const { tenant_id } = body

  if (!tenant_id) {
    return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
  }

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("landlord_id", userData.id)
    .eq("tenant_id", tenant_id)
    .single()

  if (existing) {
    return NextResponse.json({ conversation_id: existing.id })
  }

  // Create new conversation
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      landlord_id: userData.id,
      tenant_id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation_id: data.id })
}
