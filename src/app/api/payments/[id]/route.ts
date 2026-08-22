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

async function getUserId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user.id;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addCyclePeriod(
  dateValue: Date | string | null | undefined,
  rentCycle: string,
): Date {
  const date = toDate(dateValue) ?? new Date();

  if (rentCycle === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (rentCycle === "annual") {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

// PATCH /api/payments/[id] — verify or reject a payment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: paymentId } = await params;

  const { action, reason } = await req.json();
  if (!["verify", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (action === "reject" && !reason?.trim()) {
    return NextResponse.json(
      { error: "Rejection reason is required." },
      { status: 400 },
    );
  }

  try {
    const provider = getDataProvider();

    if (provider === "mongo") {
      const user = await getUser();
      if (!user || user.role !== "landlord") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const paymentObjectId = toObjectId(paymentId);
      if (!paymentObjectId) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      await connectToMongoDB();

      const payment = await PaymentModel.findById(paymentObjectId)
        .select("_id tenancyId")
        .lean();

      if (!payment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      const tenancy = await TenancyModel.findById(payment.tenancyId)
        .select("_id unitId rentCycle nextDueDate")
        .lean();

      if (!tenancy) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      const unit = await UnitModel.findById(tenancy.unitId)
        .select("_id propertyId")
        .lean();

      if (!unit) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      const property = await PropertyModel.findById(unit.propertyId)
        .select("_id landlordId")
        .lean();

      if (!property) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      if (property.landlordId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const newStatus = action === "verify" ? "verified" : "rejected";

      await PaymentModel.updateOne(
        { _id: paymentObjectId },
        { $set: { status: newStatus } },
      );

      if (action === "verify") {
        const newDueDate = addCyclePeriod(
          tenancy.nextDueDate,
          tenancy.rentCycle ?? "monthly",
        );

        await TenancyModel.updateOne(
          { _id: tenancy._id },
          { $set: { nextDueDate: newDueDate } },
        );
      }

      return NextResponse.json(
        { success: true, status: newStatus },
        { status: 200 },
      );
    }

    const supabase = await createServerClient();
    const userId = await getUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select(
        `
          id,
          tenancy_id,
          tenancies!inner(
            id,
            units!inner(
              id,
              properties!inner(landlord_id)
            )
          )
        `,
      )
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment?.tenancies?.units?.properties) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const landlordId = payment.tenancies.units.properties.landlord_id;
    if (landlordId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newStatus = action === "verify" ? "verified" : "rejected";

    const { error } = await supabase
      .from("payments")
      .update({ status: newStatus })
      .eq("id", paymentId);

    if (error) {
      throw new Error(error.message);
    }

    if (action === "verify") {
      const tenancyId = payment.tenancy_id;
      if (tenancyId) {
        const { data: tenancy, error: tenancyError } = await supabase
          .from("tenancies")
          .select("rent_cycle, next_due_date")
          .eq("id", tenancyId)
          .single();

        if (!tenancyError && tenancy?.next_due_date) {
          const newDueDate = addCyclePeriod(
            tenancy.next_due_date,
            tenancy.rent_cycle ?? "monthly",
          );

          await supabase
            .from("tenancies")
            .update({ next_due_date: newDueDate.toISOString() })
            .eq("id", tenancyId);
        }
      }
    }

    return NextResponse.json(
      { success: true, status: newStatus },
      { status: 200 },
    );
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
