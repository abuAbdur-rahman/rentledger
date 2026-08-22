import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  AddedUnit,
  AddUnitInput,
  CreatePropertyInput,
  CreatedProperty,
  DeletePropertyInput,
  GetPropertyDetailInput,
  LandlordPropertiesListResult,
  ListLandlordPropertiesInput,
  ListPropertyUnitsInput,
  ListPublicPropertiesInput,
  PropertiesRepository,
  PropertyDetail,
  PropertyUnitListItem,
  PublicPropertiesListResult,
  UnitItem,
  UpdatePropertyInput,
  UpdatedProperty,
} from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

function extractLocation(address: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return "Unknown";
}

export function createSupabasePropertiesRepository(
  supabase: SupabaseServerClient,
): PropertiesRepository {
  return {
    async listPublic(
      input: ListPublicPropertiesInput,
    ): Promise<PublicPropertiesListResult> {
      const { page, limit, q } = input;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("properties")
        .select(
          `
            id,
            name,
            address,
            created_at,
            profiles!properties_landlord_id_fkey ( full_name ),
            units (
              id,
              rent_amount,
              tenancies ( id, status )
            )
          `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (q) {
        query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, count, error } = (await query) as any;

      if (error) {
        throw new Error(error.message);
      }

      const items = (data ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (property: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const units = (property.units ?? []) as any[];
          const totalUnits = units.length;

          const occupiedUnits = units.filter((unit) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (unit.tenancies ?? []).some((tenancy: any) => tenancy.status === "active"),
          ).length;

          const rentAmounts = units
            .map((unit) => Number(unit.rent_amount) || 0)
            .filter((amount) => amount > 0);

          const monthlyRentMin =
            rentAmounts.length > 0 ? Math.min(...rentAmounts) : 0;
          const monthlyRentMax =
            rentAmounts.length > 0 ? Math.max(...rentAmounts) : 0;

          const address = property.address ?? "";

          const landlordName = Array.isArray(property.profiles)
            ? (property.profiles[0]?.full_name ?? "Landlord")
            : (property.profiles?.full_name ?? "Landlord");

          return {
            id: property.id,
            name: property.name,
            address,
            location: extractLocation(address),
            landlordName,
            totalUnits,
            occupiedUnits,
            availableUnits: Math.max(totalUnits - occupiedUnits, 0),
            monthlyRentMin,
            monthlyRentMax,
            createdAt: property.created_at ?? null,
          };
        },
      );

      const total = count ?? 0;

      return {
        properties: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },

    async listForLandlord(
      input: ListLandlordPropertiesInput,
    ): Promise<LandlordPropertiesListResult> {
      const { userId, page, limit } = input;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const {
        data: properties,
        count,
        error,
      } = await supabase
        .from("properties")
        .select(
          `
            id, name, address, created_at,
            units (
              id, name,
              tenancies (
                id, status, next_due_date,
                payments ( id, status )
              )
            )
          `,
          { count: "exact" },
        )
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(error.message);
      }

      const now = new Date();
      const items = (properties ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (property: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allTenancies = (property.units ?? []).flatMap((unit: any) =>
            unit.tenancies ?? [],
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeTenancies = allTenancies.filter((tenancy: any) => {
            return tenancy.status === "active";
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pendingPayments = allTenancies.filter((tenancy: any) => {
            if (tenancy.status !== "active") {
              return false;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasPendingPayment = tenancy.payments?.some((payment: any) => {
              return payment.status === "pending";
            });

            if (!hasPendingPayment || !tenancy.next_due_date) {
              return false;
            }

            return new Date(tenancy.next_due_date) >= now;
          }).length;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const overduePayments = allTenancies.filter((tenancy: any) => {
            if (tenancy.status !== "active") {
              return false;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasUnverifiedPayment = tenancy.payments?.some((payment: any) => {
              return payment.status !== "paid" && payment.status !== "verified";
            });

            if (!hasUnverifiedPayment || !tenancy.next_due_date) {
              return false;
            }

            return new Date(tenancy.next_due_date) < now;
          }).length;

          return {
            id: property.id,
            name: property.name,
            address: property.address ?? "",
            unitsCount: (property.units ?? []).length,
            activeTenants: activeTenancies.length,
            pendingPayments,
            overduePayments,
            createdAt: property.created_at,
          };
        },
      );

      const total = count ?? 0;

      return {
        properties: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },

    async createForLandlord(
      input: CreatePropertyInput,
    ): Promise<CreatedProperty> {
      const { userId, name, address, unitsCount, rentAmount } = input;

      const { data: property, error } = await supabase
        .from("properties")
        .insert({
          landlord_id: userId,
          name,
          address,
        })
        .select("id, name, address, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const units = Array.from({ length: unitsCount }, (_, index) => ({
        property_id: property.id,
        name: String(index + 1),
        rent_amount: rentAmount,
      }));

      const { error: unitsError } = await supabase.from("units").insert(units);

      if (unitsError) {
        await supabase.from("properties").delete().eq("id", property.id);
        throw new Error(unitsError.message);
      }

      return {
        id: property.id,
        name: property.name,
        address: property.address ?? null,
        created_at: property.created_at ?? null,
      };
    },

    async getDetailForLandlord(
      input: GetPropertyDetailInput,
    ): Promise<PropertyDetail | null> {
      const { userId, propertyId } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: property, error: propertyError } = (await (supabase
        .from("properties")
        .select("id, name, address, created_at")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .maybeSingle() as any));

      if (propertyError) {
        throw new Error(propertyError.message);
      }

      if (!property) {
        return null;
      }

      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select(
          `
            id,
            name,
            rent_amount,
            tenancies!left(
              id,
              status,
              next_due_date,
              profiles!left(id, full_name),
              payments(id, status, amount)
            )
          `,
        )
        .eq("property_id", propertyId)
        .order("name", { ascending: true });

      if (unitsError) {
        throw new Error(unitsError.message);
      }

      const now = new Date();
      const mappedUnits: UnitItem[] = (units ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (unit: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeTenancy = (unit.tenancies ?? []).find((tenancy: any) => {
            return tenancy.status === "active";
          });

          if (!activeTenancy) {
            return {
              id: unit.id,
              unitNumber: unit.name,
              rentAmount: Number(unit.rent_amount) || 0,
              tenantName: null,
              tenantId: null,
              tenancyId: null,
              paymentStatus: "vacant",
            };
          }

          const payments = activeTenancy.payments ?? [];
          const hasPaidPayment = payments.some(
            (payment: { status: string }) => {
              return (
                payment.status === "verified" || payment.status === "paid"
              );
            },
          );

          let paymentStatus: "paid" | "pending" | "overdue" = "pending";

          if (hasPaidPayment) {
            paymentStatus = "paid";
          } else if (
            activeTenancy.next_due_date &&
            new Date(activeTenancy.next_due_date) < now
          ) {
            paymentStatus = "overdue";
          }

          const tenantProfile = Array.isArray(activeTenancy.profiles)
            ? activeTenancy.profiles[0]
            : activeTenancy.profiles;

          return {
            id: unit.id,
            unitNumber: unit.name,
            rentAmount: Number(unit.rent_amount) || 0,
            tenantName: tenantProfile?.full_name ?? null,
            tenantId: tenantProfile?.id ?? null,
            tenancyId: activeTenancy.id,
            paymentStatus,
          };
        },
      );

      return {
        id: property.id,
        name: property.name,
        address: property.address ?? "",
        createdAt: property.created_at,
        unitsCount: mappedUnits.length,
        activeTenants: mappedUnits.filter((unit) => !!unit.tenantId).length,
        totalRevenue: 0,
        pendingCount: mappedUnits.filter((unit) => unit.paymentStatus === "pending")
          .length,
        overdueCount: mappedUnits.filter((unit) => unit.paymentStatus === "overdue")
          .length,
        units: mappedUnits,
      };
    },

    async deleteForLandlord(input: DeletePropertyInput): Promise<boolean> {
      const { userId, propertyId } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (supabase
        .from("properties")
        .delete()
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .select("id") as any));

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).length > 0;
    },

    async updateForLandlord(
      input: UpdatePropertyInput,
    ): Promise<UpdatedProperty | null> {
      const { userId, propertyId, name, address } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await ((supabase.from("properties") as any)
        .update({ name, address })
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .select("id, name, address")
        .maybeSingle() as any));

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        address: data.address ?? null,
      };
    },

    async listUnitsForLandlordProperty(
      input: ListPropertyUnitsInput,
    ): Promise<PropertyUnitListItem[] | null> {
      const { userId, propertyId } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: property, error: propertyError } = (await (supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .maybeSingle() as any));

      if (propertyError) {
        throw new Error(propertyError.message);
      }

      if (!property) {
        return null;
      }

      const { data: units, error } = await supabase
        .from("units")
        .select(
          `
            id,
            name,
            rent_amount,
            tenancies(id, status, profiles!inner(full_name))
          `,
        )
        .eq("property_id", propertyId)
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (units ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (unit: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeTenancy = unit.tenancies?.find((tenancy: any) => {
            return tenancy.status === "active";
          });

          const tenantProfile = Array.isArray(activeTenancy?.profiles)
            ? activeTenancy?.profiles[0]
            : activeTenancy?.profiles;

          return {
            id: unit.id,
            name: unit.name,
            rent_amount: Number(unit.rent_amount) || 0,
            isVacant: !activeTenancy,
            tenantName: tenantProfile?.full_name ?? null,
            tenancyStatus: activeTenancy?.status ?? null,
          };
        },
      );
    },

    async addUnitForLandlordProperty(
      input: AddUnitInput,
    ): Promise<AddedUnit | null> {
      const { userId, propertyId, unitNumber, rentAmount } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: property, error: propertyError } = (await (supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("landlord_id", userId)
        .maybeSingle() as any));

      if (propertyError) {
        throw new Error(propertyError.message);
      }

      if (!property) {
        return null;
      }

      const insertData: Database["public"]["Tables"]["units"]["Insert"] = {
        property_id: propertyId,
        name: unitNumber,
        rent_amount: rentAmount,
      };

      const { data, error } = await supabase
        .from("units")
        .insert(insertData)
        .select("id, name, rent_amount")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        name: data.name,
        rent_amount: Number(data.rent_amount) || 0,
      };
    },
  };
}
