import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

async function getUserId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user.id;
}

export interface TenantItem {
  id: string;
  tenancyId: string;
  fullName: string;
  phone: string | null;
  unitLabel: string;
  propertyName: string;
  status: "pending" | "active" | "rejected" | "terminated";
  outstandingBalance: number;
  startDate: string;
}

// GET /api/tenants — all tenants for landlord's properties
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const userId = await getUserId(supabase);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const statusFilter = searchParams.get("status") ?? "all";
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("tenancies")
    .select(
      `
      id, status, start_date,
      profiles!inner(id, full_name, phone_number),
      units!inner(name, properties!inner(landlord_id, name))
    `,
      { count: "exact" },
    )
    .eq("units.properties.landlord_id", userId);

  if (statusFilter !== "all") {
    query = query.eq(
      "status",
      statusFilter as "pending" | "active" | "rejected" | "terminated",
    );
  }

  const {
    data: tenancies,
    count,
    error,
  } = await query.order("start_date", { ascending: false }).range(from, to);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch outstanding balance (unpaid payments) per tenancy
  const tenancyIds = (tenancies ?? []).map((t) => t.id);

  let payments: { tenancy_id: string; amount: number }[] = [];
  if (tenancyIds.length > 0) {
    const { data: payData } = await supabase
      .from("payments")
      .select("tenancy_id, amount")
      .in("tenancy_id", tenancyIds)
      .neq("status", "verified");
    payments = payData ?? [];
  }

  const balanceMap = new Map<string, number>();
  for (const p of payments) {
    balanceMap.set(
      p.tenancy_id,
      (balanceMap.get(p.tenancy_id) ?? 0) + (p.amount ?? 0),
    );
  }

  const items: TenantItem[] = (tenancies ?? []).map((t) => ({
    id: t.profiles?.id,
    tenancyId: t.id,
    fullName: t.profiles?.full_name ?? "Unknown",
    phone: t.profiles?.phone_number ?? null,
    unitLabel: `Unit ${t.units?.name ?? "N/A"}`,
    propertyName: t.units?.properties?.name ?? "",
    status:
      t.status === "pending" ||
      t.status === "active" ||
      t.status === "rejected" ||
      t.status === "terminated"
        ? t.status
        : "pending",
    outstandingBalance: balanceMap.get(t.id) ?? 0,
    startDate: t.start_date,
  }));

  const totalPages = Math.ceil((count ?? 0) / limit);

  return NextResponse.json(
    {
      tenants: items,
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

// POST /api/tenants — invite tenant by phone
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const userId = await getUserId(supabase);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, unitId, startDate } = await req.json();
  if (!phone?.trim())
    return NextResponse.json(
      { error: "Tenant phone is required." },
      { status: 400 },
    );
  if (!unitId)
    return NextResponse.json(
      { error: "Please select a unit." },
      { status: 400 },
    );

  // Verify unit belongs to landlord
  const { data: unit } = await supabase
    .from("units")
    .select("id, name, properties!inner(landlord_id, name)")
    .eq("id", unitId)
    .eq("properties.landlord_id", userId)
    .single();

  if (!unit)
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });

  // Check unit is not already occupied by active tenant
  const { data: existing } = await supabase
    .from("tenancies")
    .select("id")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .single();

  if (existing)
    return NextResponse.json(
      { error: "This unit is already occupied." },
      { status: 409 },
    );

  // Look up tenant by phone in profiles
  const { data: tenantProfile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone_number", phone.trim())
    .single();

  if (!tenantProfile) {
    return NextResponse.json(
      {
        error: "User not found. They must register on the app first.",
        needsRegistration: true,
      },
      { status: 404 },
    );
  }

  // Create pending tenancy
  const { data: tenancy, error: tenancyError } = await supabase
    .from("tenancies")
    .insert({
      tenant_id: tenantProfile.id,
      unit_id: unitId,
      status: "pending",
      start_date: startDate ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (tenancyError)
    return NextResponse.json({ error: tenancyError.message }, { status: 500 });

  // Send notification to tenant
  await createNotification({
    userId: tenantProfile.id,
    title: "Tenancy Invitation",
    message: `You have been invited to Unit ${unit.name} at ${unit.properties.name}. Please accept or decline.`,
    type: "tenancy",
    data: { tenancy_id: tenancy.id },
  });

  return NextResponse.json(
    {
      tenancy: { id: tenancy.id },
      message: "Invitation sent successfully!",
    },
    { status: 201 },
  );
}
