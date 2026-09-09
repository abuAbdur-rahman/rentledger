import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";
import type {
  TenantDashboardResponse,
  TenantRentInfo,
  TenantPayment,
  PaymentStatus,
  TenantTenancyItem,
} from "@/types/tenant";

function deriveStatus(dbStatus: string, dueDate: string | null): PaymentStatus {
  if (dbStatus === "verified") return "paid";
  if (dbStatus === "rejected") return "rejected";
  return new Date(dueDate ?? "") < new Date() ? "overdue" : "pending";
}

async function getAuthedUser() {
  const userData = await getUser();
  if (!userData || userData.role !== "tenant") return null;
  return userData;
}

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();

    const { data: allTenancies, error: tenanciesError } = await supabase
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
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false });

    if (tenanciesError) {
      console.error("Tenancies error:", tenanciesError);
    }

    const tenanciesList: TenantTenancyItem[] = (allTenancies ?? []).map(
      (t: any) => ({
        id: t.id,
        status: t.status,
        startDate: t.start_date,
        unitLabel: `Unit ${t.unit?.name ?? "—"}`,
        propertyName: t.unit?.property?.name ?? "Property",
        propertyAddress: t.unit?.property?.address ?? "",
        rentAmount: t.unit?.rent_amount ?? 0,
      }),
    );

    const activeTenancy = (allTenancies ?? []).find(
      (t: any) => t.status === "active",
    );
    const hasActiveTenancy = !!activeTenancy;

    if (!activeTenancy) {
      return NextResponse.json({
        hasActiveTenancy: false,
        rentInfo: null,
        recentPayments: [],
        tenancies: tenanciesList,
      } satisfies TenantDashboardResponse);
    }

    const tenancyWithUnit = activeTenancy as any;
    const unit = tenancyWithUnit.unit;
    const property = unit?.property;
    const nextDueDate = tenancyWithUnit.next_due_date ?? "";

    const dueDate = nextDueDate ? new Date(nextDueDate) : new Date();
    const now = new Date();
    const daysUntilDue = nextDueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const { data: paymentsRaw } = await supabase
      .from("payments")
      .select("id, amount, status, payment_date, reference, proof_url")
      .eq("tenancy_id", activeTenancy.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const latestPayment = paymentsRaw?.[0];
    const currentStatus: PaymentStatus = latestPayment
      ? deriveStatus(latestPayment.status ?? "pending", nextDueDate)
      : daysUntilDue < 0
        ? "overdue"
        : "pending";

    const rentInfo: TenantRentInfo = {
      tenancyId: activeTenancy.id,
      unitLabel: `Unit ${unit?.name ?? "—"}`,
      propertyName: property?.name ?? "Property",
      propertyAddress: property?.address ?? "",
      rentAmount: unit?.rent_amount ?? 0,
      nextDueDate: nextDueDate || new Date().toISOString(),
      daysUntilDue,
      currentPaymentStatus: currentStatus,
      currentPaymentId: latestPayment?.id ?? null,
    };

    const recentPayments: TenantPayment[] = (paymentsRaw ?? []).map(
      (p: any) => ({
        id: p.id,
        amount: p.amount ?? 0,
        status: deriveStatus(p.status ?? "pending", nextDueDate),
        dueDate: nextDueDate || new Date().toISOString(),
        paidAt: p.payment_date ?? null,
        reference: p.reference ?? null,
        proofUrl: p.proof_url ?? null,
        rejectionReason: null,
      }),
    );

    return NextResponse.json({
      hasActiveTenancy,
      rentInfo,
      recentPayments,
      tenancies: tenanciesList,
    } satisfies TenantDashboardResponse);
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
    const supabase = await createServerClient();
    
    const formData = await req.formData();
    const tenancyId = formData.get("tenancyId") as string;
    const paymentId = formData.get("paymentId") as string | null;
    const reference = formData.get("reference") as string | null;
    const amount = formData.get("amount") as string | null;
    const file = formData.get("file") as File | null;

    if (!tenancyId) {
      return NextResponse.json(
        { error: "tenancyId required" },
        { status: 400 },
      );
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

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExt = file.name.split(".").pop();
      const newFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
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

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase.from("payments").insert({
        tenancy_id: tenancyId,
        amount: amount ? parseFloat(amount) : 0,
        status: "pending",
        payment_date: new Date().toISOString().split("T")[0],
        reference: reference ?? null,
        proof_url: uploadedUrl ?? null,
      });

      if (insertError) {
        throw insertError;
      }
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
