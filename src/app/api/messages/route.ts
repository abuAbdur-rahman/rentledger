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
  const conversationId = searchParams.get("conversation_id")

  if (!conversationId) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
  }

  // Verify user is part of this conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("landlord_id, tenant_id")
    .eq("id", conversationId)
    .single()

  if (!conversation || (conversation.landlord_id !== userData.id && conversation.tenant_id !== userData.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, content, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(req: NextRequest) {
  const userData = await getUser()
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServerClient()
  const body = await req.json()
  const { conversation_id, content } = body

  if (!conversation_id || !content) {
    return NextResponse.json({ error: "Conversation ID and content are required" }, { status: 400 })
  }

  // Verify user is part of this conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("landlord_id, tenant_id")
    .eq("id", conversation_id)
    .single()

  if (!conversation || (conversation.landlord_id !== userData.id && conversation.tenant_id !== userData.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id,
      sender_id: userData.id,
      content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: data })
}
