import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { PaymentModel, TenancyModel } from "@/lib/mongodb/models";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";
import type { PaymentStatus, TenantHistoryResponse, TenantPayment } from "@/types/tenant";

function deriveStatus(dbStatus: string, dueDate: string): PaymentStatus {
  if (dbStatus === "verified") return "paid";
  if (dbStatus === "rejected") return "rejected";
  return new Date(dueDate) < new Date() ? "overdue" : "pending";
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getAuthedUser() {
  const userData = await getUser();
  if (!userData || userData.role !== "tenant") return null;
  return userData;
}

async function getTenantHistorySupabase(
  userId: string,
  page: number,
  limit: number,
): Promise<TenantHistoryResponse> {
  const supabase = await createServerClient();

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("id, next_due_date")
    .eq("tenant_id", userId)
    .eq("status", "active")
    .single();

  if (!tenancy) {
    return {
      hasTenancy: false,
      payments: [],
      total: 0,
      page,
      limit,
    };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: rows, count, error: paymentsError } = await supabase
    .from("payments")
    .select(
      "id, amount, status, payment_date, reference, proof_url",
      { count: "exact" },
    )
    .eq("tenancy_id", tenancy.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const nextDueDate = tenancy.next_due_date ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payments: TenantPayment[] = (rows ?? []).map((payment: any) => ({
    id: payment.id,
    amount: payment.amount ?? 0,
    status: deriveStatus(payment.status ?? "pending", nextDueDate),
    dueDate: nextDueDate || new Date().toISOString(),
    paidAt: payment.payment_date ?? null,
    reference: payment.reference ?? null,
    proofUrl: payment.proof_url ?? null,
    rejectionReason: null,
  }));

  return {
    hasTenancy: true,
    payments,
    total: count ?? 0,
    page,
    limit,
  };
}

async function getTenantHistoryMongo(
  userId: string,
  page: number,
  limit: number,
): Promise<TenantHistoryResponse> {
  await connectToMongoDB();

  const tenancy = await TenancyModel.findOne({
    tenantId: userId,
    status: "active",
  })
    .select("_id nextDueDate")
    .lean();

  if (!tenancy) {
    return {
      hasTenancy: false,
      payments: [],
      total: 0,
      page,
      limit,
    };
  }

  const from = (page - 1) * limit;

  const [rows, count] = await Promise.all([
    PaymentModel.find({ tenancyId: tenancy._id })
      .sort({ createdAt: -1 })
      .skip(from)
      .limit(limit)
      .lean(),
    PaymentModel.countDocuments({ tenancyId: tenancy._id }),
  ]);

  const nextDueDate = toIsoString(tenancy.nextDueDate) ?? "";

  const payments: TenantPayment[] = (rows ?? []).map((payment) => ({
    id: String(payment._id),
    amount: Number(payment.amount ?? 0),
    status: deriveStatus(payment.status ?? "pending", nextDueDate),
    dueDate: nextDueDate || new Date().toISOString(),
    paidAt: toIsoString(payment.paymentDate),
    reference: payment.reference ?? null,
    proofUrl: payment.proofUrl ?? null,
    rejectionReason: null,
  }));

  return {
    hasTenancy: true,
    payments,
    total: count ?? 0,
    page,
    limit,
  };
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1);
  const limit = Math.min(
    50,
    parsePositiveInt(req.nextUrl.searchParams.get("limit"), 20),
  );

  try {
    const provider = getDataProvider();
    const response =
      provider === "mongo"
        ? await getTenantHistoryMongo(user.id, page, limit)
        : await getTenantHistorySupabase(user.id, page, limit);

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/tenant/history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
