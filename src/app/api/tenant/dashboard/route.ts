import { Types } from "mongoose";
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
import type {
  PaymentStatus,
  TenantDashboardResponse,
  TenantPayment,
  TenantRentInfo,
  TenantTenancyItem,
} from "@/types/tenant";

function deriveStatus(dbStatus: string, dueDate: string | null): PaymentStatus {
  if (dbStatus === "verified") return "paid";
  if (dbStatus === "rejected") return "rejected";
  return new Date(dueDate ?? "") < new Date() ? "overdue" : "pending";
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

async function getAuthedUser() {
  const userData = await getUser();
  if (!userData || userData.role !== "tenant") return null;
  return userData;
}

async function getTenantDashboardSupabase(
  userId: string,
): Promise<TenantDashboardResponse> {
  const supabase = await createServerClient();

  const { data: allTenancies } = await supabase
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
    .order("created_at", { ascending: false });

  const tenanciesList: TenantTenancyItem[] = (allTenancies ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tenancy: any) => ({
      id: tenancy.id,
      status: tenancy.status,
      startDate: tenancy.start_date,
      unitLabel: `Unit ${tenancy.unit?.name ?? "-"}`,
      propertyName: tenancy.unit?.property?.name ?? "Property",
      propertyAddress: tenancy.unit?.property?.address ?? "",
      rentAmount: tenancy.unit?.rent_amount ?? 0,
    }),
  );

  const activeTenancy = (allTenancies ?? []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tenancy: any) => tenancy.status === "active",
  );

  if (!activeTenancy) {
    return {
      hasActiveTenancy: false,
      rentInfo: null,
      recentPayments: [],
      tenancies: tenanciesList,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unit = (activeTenancy as any).unit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = unit?.property as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextDueDate = (activeTenancy as any).next_due_date ?? "";

  const dueDate = nextDueDate ? new Date(nextDueDate) : new Date();
  const now = new Date();
  const daysUntilDue = nextDueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select("id, amount, status, payment_date, reference, proof_url")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("tenancy_id", (activeTenancy as any).id)
    .order("created_at", { ascending: false })
    .limit(5);

  const latestPayment = paymentsRaw?.[0];
  const currentStatus: PaymentStatus = latestPayment
    ? deriveStatus(latestPayment.status ?? "pending", nextDueDate)
    : daysUntilDue < 0
      ? "overdue"
      : "pending";

  const rentInfo: TenantRentInfo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenancyId: (activeTenancy as any).id,
    unitLabel: `Unit ${unit?.name ?? "-"}`,
    propertyName: property?.name ?? "Property",
    propertyAddress: property?.address ?? "",
    rentAmount: unit?.rent_amount ?? 0,
    nextDueDate: nextDueDate || new Date().toISOString(),
    daysUntilDue,
    currentPaymentStatus: currentStatus,
    currentPaymentId: latestPayment?.id ?? null,
  };

  const recentPayments: TenantPayment[] = (paymentsRaw ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (payment: any) => ({
      id: payment.id,
      amount: payment.amount ?? 0,
      status: deriveStatus(payment.status ?? "pending", nextDueDate),
      dueDate: nextDueDate || new Date().toISOString(),
      paidAt: payment.payment_date ?? null,
      reference: payment.reference ?? null,
      proofUrl: payment.proof_url ?? null,
      rejectionReason: null,
    }),
  );

  return {
    hasActiveTenancy: true,
    rentInfo,
    recentPayments,
    tenancies: tenanciesList,
  };
}

async function getTenantDashboardMongo(
  userId: string,
): Promise<TenantDashboardResponse> {
  await connectToMongoDB();

  const allTenancies = await TenancyModel.find({ tenantId: userId })
    .sort({ createdAt: -1 })
    .lean();

  const unitIds = Array.from(
    new Set(allTenancies.map((tenancy) => String(tenancy.unitId))),
  )
    .map((id) => toObjectId(id))
    .filter((id): id is Types.ObjectId => !!id);

  const units =
    unitIds.length > 0
      ? await UnitModel.find({ _id: { $in: unitIds } }).lean()
      : [];

  const unitsById = new Map(units.map((unit) => [String(unit._id), unit]));

  const propertyIds = Array.from(
    new Set(units.map((unit) => String(unit.propertyId))),
  )
    .map((id) => toObjectId(id))
    .filter((id): id is Types.ObjectId => !!id);

  const properties =
    propertyIds.length > 0
      ? await PropertyModel.find({ _id: { $in: propertyIds } }).lean()
      : [];

  const propertiesById = new Map(
    properties.map((property) => [String(property._id), property]),
  );

  const tenanciesList: TenantTenancyItem[] = allTenancies.map((tenancy) => {
    const unit = unitsById.get(String(tenancy.unitId));
    const property = unit
      ? propertiesById.get(String(unit.propertyId))
      : undefined;

    return {
      id: String(tenancy._id),
      status: tenancy.status as TenantTenancyItem["status"],
      startDate: toIsoString(tenancy.startDate),
      unitLabel: `Unit ${unit?.name ?? "-"}`,
      propertyName: property?.name ?? "Property",
      propertyAddress: property?.address ?? "",
      rentAmount: Number(unit?.rentAmount ?? 0),
    };
  });

  const activeTenancy = allTenancies.find((tenancy) => tenancy.status === "active");

  if (!activeTenancy) {
    return {
      hasActiveTenancy: false,
      rentInfo: null,
      recentPayments: [],
      tenancies: tenanciesList,
    };
  }

  const unit = unitsById.get(String(activeTenancy.unitId));
  const property = unit
    ? propertiesById.get(String(unit.propertyId))
    : undefined;

  const nextDueDate = toIsoString(activeTenancy.nextDueDate) ?? "";

  const dueDate = nextDueDate ? new Date(nextDueDate) : new Date();
  const now = new Date();
  const daysUntilDue = nextDueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const paymentsRaw = await PaymentModel.find({ tenancyId: activeTenancy._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const latestPayment = paymentsRaw?.[0];
  const currentStatus: PaymentStatus = latestPayment
    ? deriveStatus(latestPayment.status ?? "pending", nextDueDate)
    : daysUntilDue < 0
      ? "overdue"
      : "pending";

  const rentInfo: TenantRentInfo = {
    tenancyId: String(activeTenancy._id),
    unitLabel: `Unit ${unit?.name ?? "-"}`,
    propertyName: property?.name ?? "Property",
    propertyAddress: property?.address ?? "",
    rentAmount: Number(unit?.rentAmount ?? 0),
    nextDueDate: nextDueDate || new Date().toISOString(),
    daysUntilDue,
    currentPaymentStatus: currentStatus,
    currentPaymentId: latestPayment ? String(latestPayment._id) : null,
  };

  const recentPayments: TenantPayment[] = (paymentsRaw ?? []).map((payment) => ({
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
    hasActiveTenancy: true,
    rentInfo,
    recentPayments,
    tenancies: tenanciesList,
  };
}

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const provider = getDataProvider();

    const response =
      provider === "mongo"
        ? await getTenantDashboardMongo(user.id)
        : await getTenantDashboardSupabase(user.id);

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/tenant/dashboard]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uploadedUrl: string | null = null;
  let fileNameToDelete: string | null = null;

  try {
    const provider = getDataProvider();
    const supabase = await createServerClient();

    const formData = await req.formData();
    const tenancyId = formData.get("tenancyId") as string;
    const paymentId = formData.get("paymentId") as string | null;
    const reference = formData.get("reference") as string | null;
    const amount = formData.get("amount") as string | null;
    const file = formData.get("file") as File | null;

    if (!tenancyId) {
      return NextResponse.json({ error: "tenancyId required" }, { status: 400 });
    }

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExt = file.name.split(".").pop();
      const newFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(newFileName, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 },
        );
      }

      fileNameToDelete = newFileName;
      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(newFileName);
      uploadedUrl = urlData.publicUrl;
    }

    if (provider === "mongo") {
      await connectToMongoDB();

      const tenancyObjectId = toObjectId(tenancyId);
      if (!tenancyObjectId) {
        return NextResponse.json({ error: "Invalid tenancyId" }, { status: 400 });
      }

      const tenancy = await TenancyModel.findOne({
        _id: tenancyObjectId,
        tenantId: user.id,
      })
        .select("_id")
        .lean();

      if (!tenancy) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (paymentId) {
        const paymentObjectId = toObjectId(paymentId);
        if (!paymentObjectId) {
          return NextResponse.json({ error: "Invalid paymentId" }, { status: 400 });
        }

        const result = await PaymentModel.updateOne(
          {
            _id: paymentObjectId,
            tenancyId: tenancyObjectId,
          },
          {
            $set: {
              reference: reference ?? null,
              proofUrl: uploadedUrl ?? null,
              status: "pending",
            },
          },
        );

        if (result.matchedCount === 0) {
          return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }
      } else {
        await PaymentModel.create({
          tenancyId: tenancyObjectId,
          amount: amount ? Number.parseFloat(amount) : 0,
          status: "pending",
          paymentDate: new Date(),
          reference: reference ?? null,
          proofUrl: uploadedUrl ?? null,
        });
      }

      return NextResponse.json({ success: true });
    }

    const { data: tenancy } = await supabase
      .from("tenancies")
      .select("id, next_due_date")
      .eq("id", tenancyId)
      .eq("tenant_id", user.id)
      .single();

    if (!tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (paymentId) {
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          reference: reference ?? null,
          proof_url: uploadedUrl ?? null,
          status: "pending",
        })
        .eq("id", paymentId)
        .eq("tenancy_id", tenancyId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("payments").insert({
        tenancy_id: tenancyId,
        amount: amount ? Number.parseFloat(amount) : 0,
        status: "pending",
        payment_date: new Date().toISOString().split("T")[0],
        reference: reference ?? null,
        proof_url: uploadedUrl ?? null,
      });

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/tenant/dashboard]", err);

    if (uploadedUrl && fileNameToDelete) {
      try {
        const supabase = await createServerClient();
        await supabase.storage.from("payment-proofs").remove([fileNameToDelete]);
      } catch {
        console.error("Failed to cleanup uploaded file");
      }
    }

    return NextResponse.json(
      { error: "Failed to submit payment" },
      { status: 500 },
    );
  }
}
