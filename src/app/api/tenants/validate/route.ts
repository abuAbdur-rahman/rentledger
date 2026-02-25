import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const phone = req.nextUrl.searchParams.get("phone")
  if (!phone?.trim()) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", phone.trim())
    .single()

  if (!profile) {
    return NextResponse.json({ valid: false }, { status: 200 })
  }

  return NextResponse.json({ valid: true }, { status: 200 })
}
