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

export interface PaymentRow {
  id: string;
  tenantName: string;
  tenantInitials: string;
  unitLabel: string;
  propertyName: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "rejected";
  dueDate: string;
  paidAt: string | null;
  reference: string | null;
  proofUrl: string | null;
}

// GET /api/payments?status=all|pending|paid|rejected&page=1&limit=10
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const userId = await getUserId(supabase);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const statusFilter = searchParams.get("status") ?? "all"
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: rows, count, error } = await supabase
    .from("payments")
    .select(
      `
    id, amount, status, payment_date, reference, proof_url,
    tenancies!inner(id, next_due_date, units!inner(name, properties!inner(landlord_id, name)), profiles!inner(full_name))
  `,
      { count: "exact" }
    )
    .eq("tenancies.units.properties.landlord_id", userId)
    .order("payment_date", { ascending: false })
    .range(from, to)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mapped: PaymentRow[] = (rows ?? []).map((p: any) => {
    const dueDate = p.tenancies?.next_due_date;
    const isOverdue =
      p.status !== "verified" && p.status !== "paid" && new Date(dueDate) < now;
    const effectiveStatus = isOverdue
      ? "overdue"
      : p.status === "verified"
        ? "paid"
        : p.status;
    const name = p.tenancies?.profiles?.full_name ?? "Unknown";
    return {
      id: p.id,
      tenantName: name,
      tenantInitials: name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      unitLabel: `Unit ${p.tenancies?.units?.name ?? "N/A"}`,
      propertyName: p.tenancies?.units?.properties?.name ?? "",
      amount: p.amount ?? 0,
      status: effectiveStatus as "paid" | "pending" | "overdue" | "rejected",
      dueDate: dueDate,
      paidAt: p.payment_date ?? null,
      reference: p.reference ?? null,
      proofUrl: p.proof_url ?? null,
    };
  });

  if (statusFilter === "pending")
    mapped = mapped.filter((p) => p.status === "pending");
  else if (statusFilter === "verified")
    mapped = mapped.filter((p) => p.status === "paid");
  else if (statusFilter === "rejected")
    mapped = mapped.filter((p) => p.status === "rejected");

  const totalPages = Math.ceil((count ?? 0) / limit)

  return NextResponse.json({ 
    payments: mapped,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages
    }
  }, { status: 200 });
}
