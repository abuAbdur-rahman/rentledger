import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import {
  PaymentModel,
  PropertyModel,
  TenancyModel,
  UnitModel,
} from "@/lib/mongodb/models";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";
import { TablesInsert } from "@/types/database";

interface TenancyWithRent {
  id: string;
  rent_amount: number;
  next_due_date: string | null;
  unit: {
    id: string;
    properties: {
      landlord_id: string;
    };
  };
}

function parseMonthYear(month: unknown, year: unknown) {
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return null;
  }

  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 9999) {
    return null;
  }

  return { monthNum, yearNum };
}

async function generatePaymentsSupabase(
  landlordId: string,
  month: number,
  year: number,
) {
  const supabase = await createServerClient();

  const { data: tenancies } = (await supabase
    .from("tenancies")
    .select(
      `
        id,
        rent_amount,
        next_due_date,
        unit:units!inner(
          id,
          properties!inner(landlord_id)
        )
      `,
    )
    .eq("unit.properties.landlord_id", landlordId)
    .eq("status", "active")) as { data: TenancyWithRent[] | null };

  const { data: existingPayments } = await supabase
    .from("payments")
    .select("tenancy_id");

  const existingTenancyIds = new Set(
    (existingPayments ?? []).map((payment) => payment.tenancy_id),
  );

  const targetDate = new Date(Date.UTC(year, month - 1, 1))
    .toISOString()
    .split("T")[0];

  const paymentsToInsert: TablesInsert<"payments">[] = (tenancies ?? [])
    .filter((tenancy) => !existingTenancyIds.has(tenancy.id))
    .map((tenancy) => ({
      tenancy_id: tenancy.id,
      amount: tenancy.rent_amount,
      status: "pending" as const,
      payment_date: targetDate,
    }));

  if (paymentsToInsert.length > 0) {
    await supabase.from("payments").insert(paymentsToInsert);
  }

  return {
    success: true,
    created: paymentsToInsert.length,
    skipped: existingTenancyIds.size,
    total: tenancies?.length ?? 0,
  };
}

async function generatePaymentsMongo(
  landlordId: string,
  month: number,
  year: number,
) {
  await connectToMongoDB();

  const properties = await PropertyModel.find({ landlordId })
    .select("_id")
    .lean();
  const propertyIds = properties.map((property) => property._id);

  const units =
    propertyIds.length > 0
      ? await UnitModel.find({ propertyId: { $in: propertyIds } })
          .select("_id rentAmount")
          .lean()
      : [];

  const unitById = new Map(units.map((unit) => [String(unit._id), unit]));
  const unitIds = units.map((unit) => unit._id);

  const tenancies =
    unitIds.length > 0
      ? await TenancyModel.find({
          unitId: { $in: unitIds },
          status: "active",
        })
          .select("_id unitId")
          .lean()
      : [];

  const tenancyIds = tenancies.map((tenancy) => tenancy._id);

  const existingPayments =
    tenancyIds.length > 0
      ? await PaymentModel.find({ tenancyId: { $in: tenancyIds } })
          .select("tenancyId")
          .lean()
      : [];

  const existingTenancyIds = new Set(
    existingPayments.map((payment) => String(payment.tenancyId)),
  );

  const targetDate = new Date(Date.UTC(year, month - 1, 1));

  const paymentsToInsert = tenancies
    .filter((tenancy) => !existingTenancyIds.has(String(tenancy._id)))
    .map((tenancy) => {
      const unit = unitById.get(String(tenancy.unitId));
      return {
        tenancyId: tenancy._id,
        amount: Number(unit?.rentAmount) || 0,
        status: "pending" as const,
        paymentDate: targetDate,
      };
    });

  if (paymentsToInsert.length > 0) {
    await PaymentModel.insertMany(paymentsToInsert);
  }

  return {
    success: true,
    created: paymentsToInsert.length,
    skipped: existingTenancyIds.size,
    total: tenancies.length,
  };
}

export async function POST(req: NextRequest) {
  const userData = await getUser();
  if (!userData || userData.role !== "landlord") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = parseMonthYear(body?.month, body?.year);

    if (!parsed) {
      return NextResponse.json(
        { error: "Valid month and year are required" },
        { status: 400 },
      );
    }

    const provider = getDataProvider();
    const result =
      provider === "mongo"
        ? await generatePaymentsMongo(userData.id, parsed.monthNum, parsed.yearNum)
        : await generatePaymentsSupabase(userData.id, parsed.monthNum, parsed.yearNum);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/payments/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
