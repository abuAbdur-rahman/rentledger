import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export interface PropertyItem {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  activeTenants: number;
  pendingPayments: number;
  overduePayments: number;
  createdAt: string;
}

async function getUserId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user.id;
}

// GET /api/properties — fetch all properties for the authenticated landlord
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const userId = await getUserId(supabase);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const {
    data: properties,
    count,
    error,
  } = await supabase
    .from("properties")
    .select(
      `
      id, name, address, created_at,
      units (
        id, name,
        tenancies (
          id, status, next_due_date,
          payments ( id, status )
        )
      )
    `,
      { count: "exact" },
    )
    .eq("landlord_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PropertyItem[] = (properties ?? []).map((p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTenancies = (p.units ?? []).flatMap((u: any) => u.tenancies ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeTenancies = allTenancies.filter(
      (t: any) => t.status === "active",
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pending = allTenancies.filter((t: any) => {
      if (t.status !== "active") return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasPendingPayment = t.payments?.some(
        (pay: any) => pay.status === "pending",
      );
      return hasPendingPayment && new Date(t.next_due_date) >= now;
    }).length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdue = allTenancies.filter((t: any) => {
      if (t.status !== "active") return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasPayment = t.payments?.some(
        (pay: any) => pay.status !== "paid" && pay.status !== "verified",
      );
      return hasPayment && new Date(t.next_due_date) < now;
    }).length;

    return {
      id: p.id,
      name: p.name,
      address: p.address ?? "",
      unitsCount: (p.units ?? []).length,
      activeTenants: activeTenancies.length,
      pendingPayments: pending,
      overduePayments: overdue,
      createdAt: p.created_at,
    };
  });

  const totalPages = Math.ceil((count ?? 0) / limit);

  return NextResponse.json(
    {
      properties: items,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages,
      },
    },
    { status: 200 },
  );
}

// POST /api/properties — create a new property with N units
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const userId = await getUserId(supabase);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, address, unitsCount, rentAmount } = body;

  if (!name?.trim())
    return NextResponse.json(
      { error: "Property name is required." },
      { status: 400 },
    );
  if (!unitsCount || unitsCount < 1)
    return NextResponse.json(
      { error: "Number of units is required." },
      { status: 400 },
    );
  if (!rentAmount || rentAmount < 0)
    return NextResponse.json(
      { error: "Rent amount is required." },
      { status: 400 },
    );

  // Create the property
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      landlord_id: userId,
      name: name.trim(),
      address: address?.trim() ?? null,
    })
    .select("id, name, address, created_at")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Create N units
  const units = [];
  for (let i = 1; i <= unitsCount; i++) {
    units.push({
      property_id: property.id,
      name: String(i),
      rent_amount: rentAmount,
    });
  }

  const { error: unitsError } = await supabase.from("units").insert(units);
  if (unitsError) {
    // Rollback property if units fail
    await supabase.from("properties").delete().eq("id", property.id);
    return NextResponse.json({ error: unitsError.message }, { status: 500 });
  }

  return NextResponse.json({ property }, { status: 201 });
}
