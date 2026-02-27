import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

async function getUserId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : user.id
}

// PATCH /api/payments/[id] — verify or reject a payment
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paymentId } = await params
  const supabase = await createServerClient()
  const userId = await getUserId(supabase)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, reason } = await req.json() // action: "verify" | "reject"
  if (!["verify", "reject"].includes(action)) return NextResponse.json({ error: "Invalid action." }, { status: 400 })
  if (action === "reject" && !reason?.trim()) return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 })

  const newStatus = action === "verify" ? "paid" : "rejected"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    status: newStatus,
    ...(action === "verify" ? { paid_at: new Date().toISOString() } : { rejection_reason: reason.trim(), rejected_at: new Date().toISOString() })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("payments") as any).update(updateData).eq("id", paymentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status: newStatus }, { status: 200 })
}
