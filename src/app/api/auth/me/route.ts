import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/request"

export async function GET(req: NextRequest) {
  try {
    const { supabase } = createServerClient(req)

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone_number")
      .eq("id", user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        role: profile?.role || user.user_metadata?.role || "tenant",
        phone: profile?.phone_number || user.user_metadata?.phone_number,
      },
    })
  } catch (error) {
    console.error("[auth/me]", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
