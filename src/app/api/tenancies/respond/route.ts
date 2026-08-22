import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { PropertyModel, TenancyModel, UnitModel } from "@/lib/mongodb/models";
import { createNotification } from "@/lib/notifications";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

function calculateNextDueDate(
  startDate: Date | string,
  rentCycle: string | null,
): Date {
  const date = startDate instanceof Date ? new Date(startDate) : new Date(startDate);
  if (rentCycle === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
}

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

async function notifyLandlordMongo(
  tenancyObjectId: Types.ObjectId,
  action: "accept" | "reject",
  tenantName: string,
) {
  const tenancy = await TenancyModel.findById(tenancyObjectId)
    .select("unitId")
    .lean();
  if (!tenancy) return;

  const unit = await UnitModel.findById(tenancy.unitId)
    .select("name propertyId")
    .lean();
  if (!unit) return;

  const property = await PropertyModel.findById(unit.propertyId)
    .select("landlordId name")
    .lean();
  if (!property?.landlordId) return;

  await createNotification({
    userId: property.landlordId,
    title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
    message: `${tenantName} has ${action === "accept" ? "accepted" : "declined"} the invitation to Unit ${unit.name} at ${property.name}.`,
    type: "system",
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const tenancyId = body.tenancyId ?? body.tenancy_id;
    const action = body.action as "accept" | "reject" | undefined;

    if (!tenancyId || !action) {
      return NextResponse.json(
        { error: "tenancyId and action required" },
        { status: 400 },
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const newStatus = action === "accept" ? "active" : "rejected";
    const provider = getDataProvider();

    if (provider === "mongo") {
      await connectToMongoDB();

      const tenancyObjectId = toObjectId(tenancyId);
      if (!tenancyObjectId) {
        return NextResponse.json({ error: "Invalid tenancyId" }, { status: 400 });
      }

      if (action === "accept") {
        await TenancyModel.updateMany(
          {
            tenantId: user.id,
            status: "active",
            _id: { $ne: tenancyObjectId },
          },
          { $set: { status: "terminated" } },
        );

        const pendingTenancy = await TenancyModel.findOne({
          _id: tenancyObjectId,
          tenantId: user.id,
          status: "pending",
        })
          .select("startDate rentCycle")
          .lean();

        if (!pendingTenancy) {
          return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
        }

        const nextDueDate = calculateNextDueDate(
          pendingTenancy.startDate,
          pendingTenancy.rentCycle,
        );

        const result = await TenancyModel.updateOne(
          {
            _id: tenancyObjectId,
            tenantId: user.id,
            status: "pending",
          },
          {
            $set: {
              status: newStatus,
              nextDueDate,
            },
          },
        );

        if (result.matchedCount === 0) {
          return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
        }
      } else {
        const result = await TenancyModel.updateOne(
          {
            _id: tenancyObjectId,
            tenantId: user.id,
            status: "pending",
          },
          { $set: { status: newStatus } },
        );

        if (result.matchedCount === 0) {
          return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
        }
      }

      await notifyLandlordMongo(
        tenancyObjectId,
        action,
        user.full_name || "A tenant",
      );

      return NextResponse.json({ success: true });
    }

    const supabase = await createServerClient();

    if (action === "accept") {
      const { error: terminateError } = await supabase
        .from("tenancies")
        .update({ status: "terminated" })
        .eq("tenant_id", user.id)
        .eq("status", "active")
        .neq("id", tenancyId);

      if (terminateError) {
        console.error("Terminate error:", terminateError);
        return NextResponse.json(
          { error: "Failed to terminate existing tenancy" },
          { status: 500 },
        );
      }

      const { data: pendingTenancy, error: fetchError } = await supabase
        .from("tenancies")
        .select("start_date, rent_cycle")
        .eq("id", tenancyId)
        .single();

      if (fetchError || !pendingTenancy) {
        return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
      }

      const nextDueDate = calculateNextDueDate(
        pendingTenancy.start_date,
        pendingTenancy.rent_cycle,
      ).toISOString();

      const { error: updateError } = await supabase
        .from("tenancies")
        .update({
          status: newStatus,
          next_due_date: nextDueDate,
        })
        .eq("id", tenancyId)
        .eq("tenant_id", user.id)
        .eq("status", "pending");

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: updateError } = await supabase
        .from("tenancies")
        .update({ status: newStatus })
        .eq("id", tenancyId)
        .eq("tenant_id", user.id)
        .eq("status", "pending");

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    const { data: tenancy } = await supabase
      .from("tenancies")
      .select(`
        id,
        units!inner(
          properties!inner(landlord_id, name),
          name
        )
      `)
      .eq("id", tenancyId)
      .single();

    if (tenancy) {
      const landlordId = tenancy.units.properties.landlord_id;
      const unitName = tenancy.units.name;
      const propertyName = tenancy.units.properties.name;

      await createNotification({
        userId: landlordId,
        title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
        message: `${user.full_name || "A tenant"} has ${action === "accept" ? "accepted" : "declined"} the invitation to Unit ${unitName} at ${propertyName}.`,
        type: "system",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/tenancies/respond]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
