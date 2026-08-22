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
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

async function getUserId(
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

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function resolvePaymentStatus(
  status: string | null | undefined,
  dueDate: Date | string | null | undefined,
): "paid" | "pending" | "overdue" | "rejected" {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "verified" || normalized === "paid") return "paid";
  if (normalized === "rejected") return "rejected";

  const due = toDate(dueDate);
  if (due && due < new Date()) return "overdue";

  return "pending";
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

async function getSupabasePayments(
  userId: string,
  page: number,
  limit: number,
  statusFilter: string,
) {
  const supabase = await createServerClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: rows, count, error } = await supabase
    .from("payments")
    .select(
      `
        id, amount, status, payment_date, reference, proof_url,
        tenancies!inner(
          id,
          next_due_date,
          units!inner(name, properties!inner(landlord_id, name)),
          profiles!inner(full_name)
        )
      `,
      { count: "exact" },
    )
    .eq("tenancies.units.properties.landlord_id", userId)
    .order("payment_date", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mapped: PaymentRow[] = (rows ?? []).map((payment: any) => {
    const tenantName = payment.tenancies?.profiles?.full_name ?? "Unknown";
    const dueDate = payment.tenancies?.next_due_date ?? "";

    return {
      id: payment.id,
      tenantName,
      tenantInitials: getInitials(tenantName),
      unitLabel: `Unit ${payment.tenancies?.units?.name ?? "N/A"}`,
      propertyName: payment.tenancies?.units?.properties?.name ?? "",
      amount: Number(payment.amount) || 0,
      status: resolvePaymentStatus(payment.status, dueDate),
      dueDate,
      paidAt: payment.payment_date ?? null,
      reference: payment.reference ?? null,
      proofUrl: payment.proof_url ?? null,
    };
  });

  if (statusFilter === "pending") {
    mapped = mapped.filter((payment) => payment.status === "pending");
  } else if (statusFilter === "verified") {
    mapped = mapped.filter((payment) => payment.status === "paid");
  } else if (statusFilter === "rejected") {
    mapped = mapped.filter((payment) => payment.status === "rejected");
  }

  const total = count ?? 0;

  return {
    payments: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getMongoPayments(
  userId: string,
  page: number,
  limit: number,
  statusFilter: string,
) {
  await connectToMongoDB();

  const properties = await PropertyModel.find({ landlordId: userId })
    .select("_id name")
    .lean();

  const propertyById = new Map(
    properties.map((property) => [String(property._id), property.name]),
  );
  const propertyIds = properties.map((property) => property._id);

  const units =
    propertyIds.length > 0
      ? await UnitModel.find({ propertyId: { $in: propertyIds } })
          .select("_id name propertyId")
          .lean()
      : [];

  const unitById = new Map(units.map((unit) => [String(unit._id), unit]));
  const unitIds = units.map((unit) => unit._id);

  const tenancies =
    unitIds.length > 0
      ? await TenancyModel.find({ unitId: { $in: unitIds } })
          .select("_id unitId tenantId nextDueDate")
          .lean()
      : [];

  const tenancyById = new Map(
    tenancies.map((tenancy) => [String(tenancy._id), tenancy]),
  );

  const tenantIds = Array.from(
    new Set(
      tenancies
        .map((tenancy) => tenancy.tenantId)
        .filter((tenantId): tenantId is string => !!tenantId),
    ),
  );

  const profiles =
    tenantIds.length > 0
      ? await ProfileModel.find({ _id: { $in: tenantIds } })
          .select("_id fullName")
          .lean()
      : [];

  const profileById = new Map(
    profiles.map((profile) => [String(profile._id), profile.fullName]),
  );

  const tenancyIds = tenancies.map((tenancy) => tenancy._id);

  const payments =
    tenancyIds.length > 0
      ? await PaymentModel.find({ tenancyId: { $in: tenancyIds } })
          .select("_id tenancyId amount status paymentDate reference proofUrl")
          .sort({ paymentDate: -1, createdAt: -1 })
          .lean()
      : [];

  let mapped: PaymentRow[] = payments.map((payment) => {
    const tenancy = tenancyById.get(String(payment.tenancyId));
    const unit = tenancy ? unitById.get(String(tenancy.unitId)) : undefined;
    const propertyName = unit
      ? propertyById.get(String(unit.propertyId)) ?? ""
      : "";

    const tenantName = tenancy?.tenantId
      ? profileById.get(tenancy.tenantId) ?? "Unknown"
      : "Unknown";

    const dueDate = tenancy?.nextDueDate
      ? new Date(tenancy.nextDueDate).toISOString()
      : "";

    return {
      id: String(payment._id),
      tenantName,
      tenantInitials: getInitials(tenantName),
      unitLabel: `Unit ${unit?.name ?? "N/A"}`,
      propertyName,
      amount: Number(payment.amount) || 0,
      status: resolvePaymentStatus(payment.status, tenancy?.nextDueDate),
      dueDate,
      paidAt: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString()
        : null,
      reference: payment.reference ?? null,
      proofUrl: payment.proofUrl ?? null,
    };
  });

  if (statusFilter === "pending") {
    mapped = mapped.filter((payment) => payment.status === "pending");
  } else if (statusFilter === "verified") {
    mapped = mapped.filter((payment) => payment.status === "paid");
  } else if (statusFilter === "rejected") {
    mapped = mapped.filter((payment) => payment.status === "rejected");
  }

  const total = mapped.length;
  const from = (page - 1) * limit;
  const to = from + limit;

  return {
    payments: mapped.slice(from, to),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// GET /api/payments?status=all|pending|paid|rejected&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 10);
    const statusFilter = searchParams.get("status") ?? "all";

    const provider = getDataProvider();

    if (provider === "mongo") {
      const user = await getUser();
      if (!user || user.role !== "landlord") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const result = await getMongoPayments(user.id, page, limit, statusFilter);
      return NextResponse.json(result, { status: 200 });
    }

    const supabase = await createServerClient();
    const userId = await getUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getSupabasePayments(userId, page, limit, statusFilter);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
