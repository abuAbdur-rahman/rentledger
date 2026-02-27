import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

async function getUserId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user.id;
}

function addCyclePeriod(dateStr: string, rentCycle: string): string {
  const date = new Date(dateStr);
  if (rentCycle === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (rentCycle === "annual") {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString();
}

// PATCH /api/payments/[id] — verify or reject a payment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: paymentId } = await params;
  const supabase = await createServerClient();
  const userId = await getUserId(supabase);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, reason } = await req.json(); // action: "verify" | "reject"
  if (!["verify", "reject"].includes(action))
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  if (action === "reject" && !reason?.trim())
    return NextResponse.json(
      { error: "Rejection reason is required." },
      { status: 400 },
    );

  // IDOR check: Verify the user owns the property for this payment's tenancy
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select(`
      id,
      tenancy_id,
      tenancies!inner(
        id,
        units!inner(
          id,
          properties!inner(landlord_id)
        )
      )
    `)
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment?.tenancies?.units?.properties) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const landlordId = payment.tenancies.units.properties.landlord_id;
  if (landlordId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newStatus = action === "verify" ? "verified" : "rejected";
  const { error } = await supabase
    .from("payments")
    .update({ status: newStatus })
    .eq("id", paymentId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === "verify") {
    const tenancyId = payment.tenancy_id;
    if (tenancyId) {
      const { data: tenancy, error: tenancyError } = await supabase
        .from("tenancies")
        .select("rent_cycle, next_due_date")
        .eq("id", tenancyId)
        .single();

      if (!tenancyError && tenancy?.next_due_date) {
        const newDueDate = addCyclePeriod(
          tenancy.next_due_date,
          tenancy.rent_cycle ?? "monthly",
        );

        await supabase
          .from("tenancies")
          .update({ next_due_date: newDueDate })
          .eq("id", tenancyId);
      }
    }
  }

  return NextResponse.json(
    { success: true, status: newStatus },
    { status: 200 },
  );
}
