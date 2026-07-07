import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { PropertyModel, TenancyModel, UnitModel } from "@/lib/mongodb/models";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

interface ActiveTenancy {
  unit_id: string
}

interface UnitWithProperty {
  id: string
  name: string
  rent_amount: number
}

// GET /api/tenants/units — fetch available (unoccupied) units for landlord
export async function GET() {
  const provider = getDataProvider();

  if (provider === "mongo") {
    const userData = await getUser();
    const userId = userData?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    const properties = await PropertyModel.find({ landlordId: userId })
      .select("_id name landlordId")
      .lean();

    const propertyIds = properties.map((property) => property._id as Types.ObjectId);

    if (propertyIds.length === 0) {
      return NextResponse.json({ units: [] }, { status: 200 });
    }

    const units = await UnitModel.find({ propertyId: { $in: propertyIds } })
      .select("_id name rentAmount propertyId")
      .lean();

    const unitIds = units.map((unit) => unit._id as Types.ObjectId);
    const activeTenancies =
      unitIds.length > 0
        ? await TenancyModel.find({
            unitId: { $in: unitIds },
            status: "active",
          })
            .select("unitId")
            .lean()
        : [];

    const occupiedUnitIds = new Set(
      activeTenancies.map((tenancy) => String(tenancy.unitId)),
    );
    const propertiesById = new Map(
      properties.map((property) => [String(property._id), property]),
    );

    const availableUnits = units
      .filter((unit) => !occupiedUnitIds.has(String(unit._id)))
      .map((unit) => {
        const property = propertiesById.get(String(unit.propertyId));
        return {
          id: String(unit._id),
          name: unit.name,
          rent_amount: Number(unit.rentAmount ?? 0),
          properties: {
            id: property ? String(property._id) : "",
            name: property?.name ?? "",
            landlord_id: property?.landlordId ?? userId,
          },
        };
      });

    return NextResponse.json({ units: availableUnits }, { status: 200 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: activeTenancies } = await supabase
    .from("tenancies")
    .select("unit_id")
    .eq("status", "active");

  const occupiedUnitIds = (activeTenancies ?? []).map((t: ActiveTenancy) => t.unit_id);

  const { data: units } = await supabase
    .from("units")
    .select("id, name, rent_amount, properties!inner(id, name, landlord_id)")
    .eq("properties.landlord_id", userId);

  const availableUnits = (units ?? []).filter(
    (u: UnitWithProperty) => !occupiedUnitIds.includes(u.id),
  );

  return NextResponse.json({ units: availableUnits }, { status: 200 });
}
