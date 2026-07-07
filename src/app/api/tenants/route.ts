import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import {
  PaymentModel,
  ProfileModel,
  PropertyModel,
  TenancyModel,
  UnitModel,
} from "@/lib/mongodb/models";
import { createNotification } from "@/lib/notifications";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

type TenancyStatus = "pending" | "active" | "rejected" | "terminated";

const ALLOWED_TENANCY_STATUS = new Set<TenancyStatus>([
  "pending",
  "active",
  "rejected",
  "terminated",
]);

interface MongoOutstandingBalanceRow {
  _id: Types.ObjectId;
  outstandingBalance: number;
}

async function getSupabaseUserId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user.id;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits;
  }

  return value.trim();
}

function buildPhoneCandidates(value: string): string[] {
  const trimmed = value.trim();
  const normalized = normalizePhoneNumber(trimmed);
  const candidates = new Set<string>([trimmed, normalized]);

  if (normalized.length === 11 && normalized.startsWith("0")) {
    candidates.add(`+234${normalized.slice(1)}`);
  }

  return Array.from(candidates).filter(Boolean);
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

export interface TenantItem {
  id: string;
  tenancyId: string;
  fullName: string;
  phone: string | null;
  unitLabel: string;
  propertyName: string;
  status: TenancyStatus;
  outstandingBalance: number;
  startDate: string;
}

function resolveStatus(value: string): TenancyStatus {
  return ALLOWED_TENANCY_STATUS.has(value as TenancyStatus)
    ? (value as TenancyStatus)
    : "pending";
}

// GET /api/tenants — all tenants for landlord's properties
export async function GET(req: NextRequest) {
  const provider = getDataProvider();

  const searchParams = req.nextUrl.searchParams;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 10);
  const statusFilter = searchParams.get("status") ?? "all";

  if (limit > 100) {
    return NextResponse.json(
      { error: "Invalid pagination parameters. page >= 1, limit >= 1 and <= 100" },
      { status: 400 },
    );
  }

  if (provider === "mongo") {
    const userData = await getUser();
    const userId = userData?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    const from = (page - 1) * limit;

    const properties = await PropertyModel.find({ landlordId: userId })
      .select("_id name")
      .lean();

    const propertyIds = properties.map((property) => property._id as Types.ObjectId);

    if (propertyIds.length === 0) {
      return NextResponse.json(
        {
          tenants: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
        { status: 200 },
      );
    }

    const units = await UnitModel.find({ propertyId: { $in: propertyIds } })
      .select("_id name propertyId")
      .lean();

    const unitIds = units.map((unit) => unit._id as Types.ObjectId);

    if (unitIds.length === 0) {
      return NextResponse.json(
        {
          tenants: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
        { status: 200 },
      );
    }

    const query: { unitId: { $in: Types.ObjectId[] }; status?: TenancyStatus } = {
      unitId: { $in: unitIds },
    };

    if (statusFilter !== "all" && ALLOWED_TENANCY_STATUS.has(statusFilter as TenancyStatus)) {
      query.status = statusFilter as TenancyStatus;
    }

    const [tenancies, total] = await Promise.all([
      TenancyModel.find(query)
        .sort({ startDate: -1, createdAt: -1 })
        .skip(from)
        .limit(limit)
        .lean(),
      TenancyModel.countDocuments(query),
    ]);

    const tenantIds = Array.from(
      new Set(
        tenancies
          .map((tenancy) => tenancy.tenantId)
          .filter((tenantId): tenantId is string => !!tenantId),
      ),
    );

    const [profiles, balances] = await Promise.all([
      tenantIds.length > 0
        ? ProfileModel.find({ _id: { $in: tenantIds } })
            .select("_id fullName phoneNumber")
            .lean()
        : Promise.resolve([]),
      tenancies.length > 0
        ? PaymentModel.aggregate([
            {
              $match: {
                tenancyId: {
                  $in: tenancies.map((tenancy) => tenancy._id as Types.ObjectId),
                },
                status: { $ne: "verified" },
              },
            },
            {
              $group: {
                _id: "$tenancyId",
                outstandingBalance: { $sum: { $ifNull: ["$amount", 0] } },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const propertiesById = new Map(
      properties.map((property) => [String(property._id), property]),
    );
    const unitsById = new Map(units.map((unit) => [String(unit._id), unit]));
    const profilesById = new Map(
      profiles.map((profile) => [String(profile._id), profile]),
    );
    const balancesByTenancyId = new Map(
      (balances as MongoOutstandingBalanceRow[]).map((row) => [
        String(row._id),
        Number(row.outstandingBalance ?? 0),
      ]),
    );

    const items: TenantItem[] = tenancies.map((tenancy) => {
      const unit = unitsById.get(String(tenancy.unitId));
      const property = unit
        ? propertiesById.get(String(unit.propertyId))
        : undefined;
      const profile = tenancy.tenantId
        ? profilesById.get(tenancy.tenantId)
        : undefined;

      return {
        id: tenancy.tenantId ?? "",
        tenancyId: String(tenancy._id),
        fullName: profile?.fullName ?? "Unknown",
        phone: profile?.phoneNumber ?? null,
        unitLabel: `Unit ${unit?.name ?? "N/A"}`,
        propertyName: property?.name ?? "",
        status: resolveStatus(tenancy.status),
        outstandingBalance: balancesByTenancyId.get(String(tenancy._id)) ?? 0,
        startDate: toIsoString(tenancy.startDate) ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(
      {
        tenants: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  }

  const supabase = await createServerClient();
  const userId = await getSupabaseUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    query = query.eq("status", resolveStatus(statusFilter));
  }

  const {
    data: tenancies,
    count,
    error,
  } = await query.order("start_date", { ascending: false }).range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tenancyIds = (tenancies ?? []).map((tenancy) => tenancy.id);

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
  for (const payment of payments) {
    balanceMap.set(
      payment.tenancy_id,
      (balanceMap.get(payment.tenancy_id) ?? 0) + (payment.amount ?? 0),
    );
  }

  const items: TenantItem[] = (tenancies ?? []).map((tenancy) => ({
    id: tenancy.profiles?.id,
    tenancyId: tenancy.id,
    fullName: tenancy.profiles?.full_name ?? "Unknown",
    phone: tenancy.profiles?.phone_number ?? null,
    unitLabel: `Unit ${tenancy.units?.name ?? "N/A"}`,
    propertyName: tenancy.units?.properties?.name ?? "",
    status: resolveStatus(tenancy.status),
    outstandingBalance: balanceMap.get(tenancy.id) ?? 0,
    startDate: tenancy.start_date,
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
  const provider = getDataProvider();
  const body = await req.json();

  const phone = typeof body.phone === "string" ? body.phone : body.phoneNumber;
  const unitId = body.unitId as string | undefined;
  const startDate = body.startDate as string | undefined;
  const rentCycle = body.rentCycle as string | undefined;

  if (!phone?.trim()) {
    return NextResponse.json({ error: "Tenant phone is required." }, { status: 400 });
  }

  const phoneCandidates = buildPhoneCandidates(phone);

  if (!unitId) {
    return NextResponse.json({ error: "Please select a unit." }, { status: 400 });
  }

  const validRentCycles = ["monthly", "annual"];
  const rentCycleValue = validRentCycles.includes(rentCycle ?? "")
    ? (rentCycle as "monthly" | "annual")
    : "annual";

  const parsedStartDate = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(parsedStartDate.getTime())) {
    return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
  }

  if (provider === "mongo") {
    const userData = await getUser();
    const userId = userData?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    const unitObjectId = toObjectId(unitId);
    if (!unitObjectId) {
      return NextResponse.json({ error: "Unit not found." }, { status: 404 });
    }

    const unit = await UnitModel.findById(unitObjectId)
      .select("_id name propertyId")
      .lean();
    if (!unit) {
      return NextResponse.json({ error: "Unit not found." }, { status: 404 });
    }

    const property = await PropertyModel.findOne({
      _id: unit.propertyId,
      landlordId: userId,
    })
      .select("_id name")
      .lean();

    if (!property) {
      return NextResponse.json({ error: "Unit not found." }, { status: 404 });
    }

    const existing = await TenancyModel.findOne({
      unitId: unitObjectId,
      status: "active",
    })
      .select("_id")
      .lean();

    if (existing) {
      return NextResponse.json(
        { error: "This unit is already occupied." },
        { status: 409 },
      );
    }

    const tenantProfile = await ProfileModel.findOne({
      role: "tenant",
      phoneNumber: { $in: phoneCandidates },
    })
      .select("_id fullName")
      .lean();

    const legacyTenantProfile = !tenantProfile
      ? await ProfileModel.collection.findOne(
          {
            role: "tenant",
            phone_number: { $in: phoneCandidates },
          },
          {
            projection: {
              _id: 1,
              fullName: 1,
              full_name: 1,
            },
          },
        )
      : null;

    const resolvedTenantId = tenantProfile
      ? String(tenantProfile._id)
      : legacyTenantProfile
        ? String(legacyTenantProfile._id)
        : null;

    if (!resolvedTenantId) {
      return NextResponse.json(
        {
          error: "User not found. They must register on the app first.",
          needsRegistration: true,
        },
        { status: 404 },
      );
    }

    const tenancy = await TenancyModel.create({
      tenantId: resolvedTenantId,
      unitId: unitObjectId,
      status: "pending",
      startDate: parsedStartDate,
      rentCycle: rentCycleValue,
    });

    await createNotification({
      userId: resolvedTenantId,
      title: "Tenancy Invitation",
      message: `You have been invited to Unit ${unit.name} at ${property.name}. Please accept or decline.`,
      type: "tenancy",
      data: { tenancy_id: String(tenancy._id) },
    });

    return NextResponse.json(
      {
        tenancy: { id: String(tenancy._id) },
        message: "Invitation sent successfully!",
      },
      { status: 201 },
    );
  }

  const supabase = await createServerClient();
  const userId = await getSupabaseUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, properties!inner(landlord_id, name)")
    .eq("id", unitId)
    .eq("properties.landlord_id", userId)
    .single();

  if (!unit) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("tenancies")
    .select("id")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This unit is already occupied." },
      { status: 409 },
    );
  }

  const { data: tenantProfile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone_number", normalizePhoneNumber(phone))
    .eq("role", "tenant")
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

  const { data: tenancy, error: tenancyError } = await supabase
    .from("tenancies")
    .insert({
      tenant_id: tenantProfile.id,
      unit_id: unitId,
      status: "pending",
      start_date: parsedStartDate.toISOString(),
      rent_cycle: rentCycleValue,
    })
    .select("id")
    .single();

  if (tenancyError) {
    return NextResponse.json({ error: tenancyError.message }, { status: 500 });
  }

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
