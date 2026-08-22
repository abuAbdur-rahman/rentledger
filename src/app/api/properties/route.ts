import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { createServerClient } from "@/lib/supabase/server";
import { createPropertiesRepository } from "@/lib/data/properties";
import { getUser } from "@/services/user";

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

function formatSchemaErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("Could not find the table")) {
    return "Database tables are not initialized. Run the SQL in supabase/bootstrap.sql in your Supabase SQL editor.";
  }
  return message;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  const provider = getDataProvider();
  const supabase = provider === "supabase" ? await createServerClient() : null;

  const userId =
    provider === "mongo"
      ? (await getUser())?.id ?? null
      : await getUserId(supabase!);

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repository = await createPropertiesRepository(
    supabase ? { supabase } : {},
  );
  const searchParams = req.nextUrl.searchParams;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 10);

  try {
    const result = await repository.listForLandlord({
      userId,
      page,
      limit,
    });

    const typedProperties: PropertyItem[] = result.properties;

    return NextResponse.json(
      {
        properties: typedProperties,
        pagination: result.pagination,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// POST /api/properties — create a new property with N units
export async function POST(req: NextRequest) {
  const provider = getDataProvider();
  const supabase = provider === "supabase" ? await createServerClient() : null;

  const userId =
    provider === "mongo"
      ? (await getUser())?.id ?? null
      : await getUserId(supabase!);

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repository = await createPropertiesRepository(
    supabase ? { supabase } : {},
  );

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

  try {
    const property = await repository.createForLandlord({
      userId,
      name: name.trim(),
      address: address?.trim() ?? null,
      unitsCount,
      rentAmount,
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
