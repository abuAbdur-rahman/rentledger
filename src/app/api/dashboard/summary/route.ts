import { NextResponse } from "next/server";
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
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "UN";
  return parts
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString().split("T")[0] : null;
}

function resolveSummaryPaymentStatus(
  dbStatus: string | null | undefined,
  dueDate: Date | string | null | undefined,
): "paid" | "pending" | "overdue" {
  const normalized = (dbStatus ?? "").toLowerCase();
  if (normalized === "verified" || normalized === "paid") return "paid";

  const due = toDate(dueDate);
  if (due && due < new Date()) return "overdue";

  return "pending";
}

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

interface PaymentWithRelations {
  id: string;
  amount: number;
  status: Database["public"]["Enums"]["payment_status"];
  payment_date: string | null;
  tenancies: {
    id: string;
    next_due_date: string;
    unit_id: string;
    units: {
      id: string;
      name: string;
      properties: {
        id: string;
        landlord_id: string;
      };
    };
    profiles: {
      id: string;
      full_name: string;
    };
  };
}

interface TenancyWithUnit {
  id: string;
  start_date: string;
  next_due_date: string;
  rent_cycle: string;
  status: string;
  unit: {
    id: string;
    name: string;
    rent_amount: number;
    property: {
      id: string;
      name: string;
      address: string | null;
    };
  };
}

async function getLandlordSummarySupabase(userId: string) {
  const supabase = await createServerClient();

  const { count: propertiesCount } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("landlord_id", userId);

  const { data: payments } = await supabase
    .from("payments")
    .select(
      `
        id,
        amount,
        status,
        payment_date,
        tenancies!inner (
          id,
          next_due_date,
          unit_id,
          units!inner (
            id,
            name,
            properties!inner (
              id,
              landlord_id
            )
          ),
          profiles!inner (
            id,
            full_name
          )
        )
      `,
    )
    .eq("tenancies.units.properties.landlord_id", userId)
    .order("payment_date", { ascending: false });

  const { data: unitsData } = (await supabase
    .from("units")
    .select("id, property_id")) as {
    data: Array<{ id: string; property_id: string }> | null;
  };

  const { data: propertiesData } = (await supabase
    .from("properties")
    .select("id")) as {
    data: Array<{ id: string }> | null;
  };

  const propertyIds = propertiesData?.map((property) => property.id) ?? [];
  const unitIds =
    unitsData
      ?.filter((unit) => propertyIds.includes(unit.property_id))
      .map((unit) => unit.id) ?? [];

  const { count: activeTenantsCount } = await supabase
    .from("tenancies")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .in("unit_id", unitIds);

  const recentPayments = ((payments ?? []) as PaymentWithRelations[])
    .slice(0, 5)
    .map((payment) => {
      const status = resolveSummaryPaymentStatus(
        payment.status,
        payment.tenancies?.next_due_date,
      );

      const tenantName = payment.tenancies?.profiles?.full_name ?? "Unknown Tenant";

      return {
        id: payment.id,
        tenantName,
        tenantInitials: getInitials(tenantName),
        unitLabel: payment.tenancies?.units?.name ?? "Unit",
        amount: payment.amount ?? 0,
        status,
        date:
          payment.payment_date ||
          payment.tenancies?.next_due_date ||
          toDateString(new Date()) ||
          "",
      };
    });

  const totalRevenue = recentPayments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const { data: allPayments } = await supabase
    .from("payments")
    .select(
      `
        id,
        amount,
        status,
        payment_date,
        tenancies!inner (
          next_due_date
        )
      `,
    )
    .eq("tenancies.units.properties.landlord_id", userId);

  let pendingPayments = 0;
  let overduePayments = 0;

  for (const payment of allPayments ?? []) {
    const status = resolveSummaryPaymentStatus(
      payment.status,
      payment.tenancies?.next_due_date,
    );

    if (status === "overdue") overduePayments += 1;
    if (status === "pending") pendingPayments += 1;
  }

  return {
    totalRevenue,
    revenueGrowth: 0,
    pendingPayments,
    overduePayments,
    activeTenantsCount: activeTenantsCount ?? 0,
    propertiesCount: propertiesCount ?? 0,
    recentPayments,
  };
}

async function getTenantSummarySupabase(userId: string) {
  const supabase = await createServerClient();

  const { data: tenancyRaw } = await supabase
    .from("tenancies")
    .select(
      `
        id,
        start_date,
        next_due_date,
        rent_cycle,
        status,
        unit:units!inner (
          id,
          name,
          rent_amount,
          property:properties!inner (
            id,
            name,
            address
          )
        )
      `,
    )
    .eq("tenant_id", userId)
    .eq("status", "active")
    .single();

  if (!tenancyRaw) return null;

  const tenancy = tenancyRaw as TenancyWithUnit;

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select("*")
    .eq("tenancy_id", tenancy.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const payments = paymentsRaw as PaymentRow[];

  const dueDate = toDate(tenancy.next_due_date) ?? new Date();
  const now = new Date();
  const isOverdue = dueDate < now;
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const lastPayment = payments?.[0];
  const currentStatus = !lastPayment
    ? isOverdue
      ? "overdue"
      : "pending"
    : resolveSummaryPaymentStatus(lastPayment.status, tenancy.next_due_date);

  return {
    tenancy: {
      id: tenancy.id,
      unitName: tenancy.unit.name,
      propertyName: tenancy.unit.property.name,
      propertyAddress: tenancy.unit.property.address,
      rentAmount: tenancy.unit.rent_amount,
      dueDate: tenancy.next_due_date,
      daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
      isOverdue,
    },
    currentStatus,
    paymentHistory: (payments ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status:
        resolveSummaryPaymentStatus(payment.status, tenancy.next_due_date) === "paid"
          ? "paid"
          : "pending",
      date:
        payment.payment_date ||
        payment.created_at ||
        toDateString(new Date()) ||
        "",
    })),
  };
}

async function getLandlordSummaryMongo(userId: string) {
  await connectToMongoDB();

  const properties = await PropertyModel.find({ landlordId: userId })
    .select("_id")
    .lean();
  const propertiesCount = properties.length;
  const propertyIds = properties.map((property) => property._id);

  const units =
    propertyIds.length > 0
      ? await UnitModel.find({ propertyId: { $in: propertyIds } })
          .select("_id name propertyId")
          .lean()
      : [];

  const unitIds = units.map((unit) => unit._id);

  const tenancies =
    unitIds.length > 0
      ? await TenancyModel.find({ unitId: { $in: unitIds } })
          .select("_id unitId tenantId nextDueDate status")
          .lean()
      : [];

  const activeTenantsCount = tenancies.filter((tenancy) => tenancy.status === "active")
    .length;

  const tenancyIds = tenancies.map((tenancy) => tenancy._id);

  const payments =
    tenancyIds.length > 0
      ? await PaymentModel.find({ tenancyId: { $in: tenancyIds } })
          .select("_id tenancyId amount status paymentDate createdAt")
          .sort({ paymentDate: -1, createdAt: -1 })
          .lean()
      : [];

  const tenancyById = new Map(
    tenancies.map((tenancy) => [String(tenancy._id), tenancy]),
  );
  const unitById = new Map(units.map((unit) => [String(unit._id), unit]));

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

  const mappedPayments = payments.map((payment) => {
    const tenancy = tenancyById.get(String(payment.tenancyId));
    const unit = tenancy ? unitById.get(String(tenancy.unitId)) : null;
    const tenantName = tenancy?.tenantId
      ? profileById.get(tenancy.tenantId) ?? "Unknown Tenant"
      : "Unknown Tenant";

    const status = resolveSummaryPaymentStatus(payment.status, tenancy?.nextDueDate);

    return {
      id: String(payment._id),
      tenantName,
      tenantInitials: getInitials(tenantName),
      unitLabel: unit?.name ?? "Unit",
      amount: Number(payment.amount) || 0,
      status,
      date:
        toDateString(payment.paymentDate) ||
        toDateString(tenancy?.nextDueDate) ||
        toDateString(payment.createdAt) ||
        "",
    };
  });

  const recentPayments = mappedPayments.slice(0, 5);

  const totalRevenue = recentPayments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingPayments = mappedPayments.filter(
    (payment) => payment.status === "pending",
  ).length;
  const overduePayments = mappedPayments.filter(
    (payment) => payment.status === "overdue",
  ).length;

  return {
    totalRevenue,
    revenueGrowth: 0,
    pendingPayments,
    overduePayments,
    activeTenantsCount,
    propertiesCount,
    recentPayments,
  };
}

async function getTenantSummaryMongo(userId: string) {
  await connectToMongoDB();

  const activeTenancy = await TenancyModel.findOne({
    tenantId: userId,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!activeTenancy) return null;

  const unit = await UnitModel.findById(activeTenancy.unitId)
    .select("_id name rentAmount propertyId")
    .lean();
  if (!unit) return null;

  const property = await PropertyModel.findById(unit.propertyId)
    .select("_id name address")
    .lean();

  const payments = await PaymentModel.find({ tenancyId: activeTenancy._id })
    .select("_id amount status paymentDate createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const dueDate = toDate(activeTenancy.nextDueDate) ?? new Date();
  const now = new Date();
  const isOverdue = dueDate < now;
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const latestPayment = payments[0];
  const currentStatus = !latestPayment
    ? isOverdue
      ? "overdue"
      : "pending"
    : resolveSummaryPaymentStatus(latestPayment.status, activeTenancy.nextDueDate);

  return {
    tenancy: {
      id: String(activeTenancy._id),
      unitName: unit.name,
      propertyName: property?.name ?? "Property",
      propertyAddress: property?.address ?? null,
      rentAmount: Number(unit.rentAmount) || 0,
      dueDate: toDateString(activeTenancy.nextDueDate),
      daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
      isOverdue,
    },
    currentStatus,
    paymentHistory: payments.map((payment) => ({
      id: String(payment._id),
      amount: Number(payment.amount) || 0,
      status:
        resolveSummaryPaymentStatus(payment.status, activeTenancy.nextDueDate) === "paid"
          ? "paid"
          : "pending",
      date:
        toDateString(payment.paymentDate) ||
        toDateString(payment.createdAt) ||
        toDateString(new Date()) ||
        "",
    })),
  };
}

export async function GET() {
  try {
    const userData = await getUser();
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const provider = getDataProvider();

    if (userData.role === "landlord") {
      const summary =
        provider === "mongo"
          ? await getLandlordSummaryMongo(userData.id)
          : await getLandlordSummarySupabase(userData.id);

      return NextResponse.json({
        role: "landlord",
        summary,
      });
    }

    const summary =
      provider === "mongo"
        ? await getTenantSummaryMongo(userData.id)
        : await getTenantSummarySupabase(userData.id);

    if (!summary) {
      return NextResponse.json({
        role: "tenant",
        summary: null,
        message: "No active tenancy",
      });
    }

    return NextResponse.json({
      role: "tenant",
      summary,
    });
  } catch (err) {
    console.error("[dashboard/summary]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
