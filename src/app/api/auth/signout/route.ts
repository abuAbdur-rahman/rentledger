import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/request"

export async function POST(req: NextRequest) {
  try {
    const { supabase, headers } = createServerClient(req)

    await supabase.auth.signOut()

    // Clear the user cookie
    headers.set("Set-Cookie", "rl_user=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0")

    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    console.error("[auth/signout]", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
