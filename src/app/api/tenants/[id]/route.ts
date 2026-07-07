import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { TenancyModel } from "@/lib/mongodb/models";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tenancyId } = await params;
  const userData = await getUser();
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body; // "accept" or "decline"

  if (!action || !["accept", "decline"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Use 'accept' or 'decline'." },
      { status: 400 },
    );
  }

  const provider = getDataProvider();

  if (provider === "mongo") {
    await connectToMongoDB();

    const tenancyObjectId = toObjectId(tenancyId);
    if (!tenancyObjectId) {
      return NextResponse.json({ error: "Invalid tenancy ID." }, { status: 400 });
    }

    const tenancy = await TenancyModel.findOne({
      _id: tenancyObjectId,
      tenantId: userData.id,
    })
      .select("_id status")
      .lean();

    if (!tenancy) {
      return NextResponse.json({ error: "Tenancy not found." }, { status: 404 });
    }

    if (tenancy.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been processed." },
        { status: 400 },
      );
    }

    const newStatus = action === "accept" ? "active" : "rejected";

    await TenancyModel.updateOne(
      { _id: tenancyObjectId },
      { $set: { status: newStatus } },
    );

    return NextResponse.json({
      success: true,
      status: newStatus,
      message:
        action === "accept" ? "Invitation accepted!" : "Invitation declined.",
    });
  }

  const supabase = await createServerClient();

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("id, tenant_id, status")
    .eq("id", tenancyId)
    .eq("tenant_id", userData.id)
    .single();

  if (!tenancy) {
    return NextResponse.json({ error: "Tenancy not found." }, { status: 404 });
  }

  if (tenancy.status !== "pending") {
    return NextResponse.json(
      { error: "This invitation has already been processed." },
      { status: 400 },
    );
  }

  const newStatus = action === "accept" ? "active" : "rejected";

  const { error } = await supabase
    .from("tenancies")
    .update({ status: newStatus })
    .eq("id", tenancyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    status: newStatus,
    message: action === "accept" ? "Invitation accepted!" : "Invitation declined.",
  });
}
