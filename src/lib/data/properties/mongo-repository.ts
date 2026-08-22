import { Types } from "mongoose";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import {
  PaymentModel,
  ProfileModel,
  PropertyModel,
  TenancyModel,
  UnitModel,
} from "@/lib/mongodb/models";
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function toObjectId(value: string): Types.ObjectId | null {
  if (!Types.ObjectId.isValid(value)) {
    return null;
  }

  return new Types.ObjectId(value);
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: number }).code === 11000;
}

export function createMongoPropertiesRepository(): PropertiesRepository {
  return {
    async listPublic(
      input: ListPublicPropertiesInput,
    ): Promise<PublicPropertiesListResult> {
      const { page, limit, q } = input;
      await connectToMongoDB();

      const from = (page - 1) * limit;
      const query = q?.trim()
        ? {
            $or: [
              { name: { $regex: escapeRegex(q.trim()), $options: "i" } },
              { address: { $regex: escapeRegex(q.trim()), $options: "i" } },
            ],
          }
        : {};

      const [total, properties] = await Promise.all([
        PropertyModel.countDocuments(query),
        PropertyModel.find(query)
          .sort({ createdAt: -1 })
          .skip(from)
          .limit(limit)
          .lean(),
      ]);

      const propertyIds = properties.map((property) => property._id as Types.ObjectId);
      const landlordIds = Array.from(
        new Set(properties.map((property) => property.landlordId as string)),
      );

      const [units, landlordProfiles] = await Promise.all([
        propertyIds.length > 0
          ? UnitModel.find({ propertyId: { $in: propertyIds } }).lean()
          : Promise.resolve([]),
        landlordIds.length > 0
          ? ProfileModel.find({ _id: { $in: landlordIds } }).lean()
          : Promise.resolve([]),
      ]);

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

      const unitsByPropertyId = new Map<string, typeof units>();
      for (const unit of units) {
        const key = String(unit.propertyId);
        const existing = unitsByPropertyId.get(key) ?? [];
        existing.push(unit);
        unitsByPropertyId.set(key, existing);
      }

      const occupiedUnitIds = new Set(
        activeTenancies.map((tenancy) => String(tenancy.unitId)),
      );

      const landlordNames = new Map<string, string>();
      for (const profile of landlordProfiles) {
        landlordNames.set(String(profile._id), profile.fullName ?? "Landlord");
      }

      const items = properties.map((property) => {
        const propertyId = String(property._id);
        const propertyUnits = unitsByPropertyId.get(propertyId) ?? [];
        const totalUnits = propertyUnits.length;
        const occupiedUnits = propertyUnits.filter((unit) => {
          return occupiedUnitIds.has(String(unit._id));
        }).length;

        const rentAmounts = propertyUnits
          .map((unit) => Number(unit.rentAmount) || 0)
          .filter((amount) => amount > 0);

        const monthlyRentMin =
          rentAmounts.length > 0 ? Math.min(...rentAmounts) : 0;
        const monthlyRentMax =
          rentAmounts.length > 0 ? Math.max(...rentAmounts) : 0;

        const address = property.address ?? "";

        return {
          id: propertyId,
          name: property.name,
          address,
          location: extractLocation(address),
          landlordName: landlordNames.get(property.landlordId) ?? "Landlord",
          totalUnits,
          occupiedUnits,
          availableUnits: Math.max(totalUnits - occupiedUnits, 0),
          monthlyRentMin,
          monthlyRentMax,
          createdAt: property.createdAt
            ? new Date(property.createdAt).toISOString()
            : null,
        };
      });

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
      await connectToMongoDB();

      const from = (page - 1) * limit;
      const query = { landlordId: userId };

      const [total, properties] = await Promise.all([
        PropertyModel.countDocuments(query),
        PropertyModel.find(query)
          .sort({ createdAt: -1 })
          .skip(from)
          .limit(limit)
          .lean(),
      ]);

      const propertyIds = properties.map((property) => property._id as Types.ObjectId);
      const units =
        propertyIds.length > 0
          ? await UnitModel.find({ propertyId: { $in: propertyIds } }).lean()
          : [];

      const unitsByPropertyId = new Map<string, typeof units>();
      for (const unit of units) {
        const key = String(unit.propertyId);
        const existing = unitsByPropertyId.get(key) ?? [];
        existing.push(unit);
        unitsByPropertyId.set(key, existing);
      }

      const unitIds = units.map((unit) => unit._id as Types.ObjectId);
      const tenancies =
        unitIds.length > 0
          ? await TenancyModel.find({ unitId: { $in: unitIds } })
              .select("_id unitId status nextDueDate")
              .lean()
          : [];

      const tenanciesByUnitId = new Map<string, typeof tenancies>();
      for (const tenancy of tenancies) {
        const key = String(tenancy.unitId);
        const existing = tenanciesByUnitId.get(key) ?? [];
        existing.push(tenancy);
        tenanciesByUnitId.set(key, existing);
      }

      const activeTenancyIds = tenancies
        .filter((tenancy) => tenancy.status === "active")
        .map((tenancy) => tenancy._id as Types.ObjectId);

      const payments =
        activeTenancyIds.length > 0
          ? await PaymentModel.find({ tenancyId: { $in: activeTenancyIds } })
              .select("tenancyId status")
              .lean()
          : [];

      const paymentsByTenancyId = new Map<string, typeof payments>();
      for (const payment of payments) {
        const key = String(payment.tenancyId);
        const existing = paymentsByTenancyId.get(key) ?? [];
        existing.push(payment);
        paymentsByTenancyId.set(key, existing);
      }

      const now = new Date();

      const items = properties.map((property) => {
        const propertyId = String(property._id);
        const propertyUnits = unitsByPropertyId.get(propertyId) ?? [];

        const propertyTenancies = propertyUnits.flatMap((unit) => {
          return tenanciesByUnitId.get(String(unit._id)) ?? [];
        });

        const activeTenancies = propertyTenancies.filter((tenancy) => {
          return tenancy.status === "active";
        });

        const pendingPayments = activeTenancies.filter((tenancy) => {
          const tenancyPayments = paymentsByTenancyId.get(String(tenancy._id)) ?? [];
          const hasPendingPayment = tenancyPayments.some((payment) => {
            return payment.status === "pending";
          });

          if (!hasPendingPayment || !tenancy.nextDueDate) {
            return false;
          }

          return new Date(tenancy.nextDueDate) >= now;
        }).length;

        const overduePayments = activeTenancies.filter((tenancy) => {
          const tenancyPayments = paymentsByTenancyId.get(String(tenancy._id)) ?? [];
          const hasUnverifiedPayment = tenancyPayments.some((payment) => {
            return payment.status !== "paid" && payment.status !== "verified";
          });

          if (!hasUnverifiedPayment || !tenancy.nextDueDate) {
            return false;
          }

          return new Date(tenancy.nextDueDate) < now;
        }).length;

        return {
          id: propertyId,
          name: property.name,
          address: property.address ?? "",
          unitsCount: propertyUnits.length,
          activeTenants: activeTenancies.length,
          pendingPayments,
          overduePayments,
          createdAt: property.createdAt
            ? new Date(property.createdAt).toISOString()
            : new Date().toISOString(),
        };
      });

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
      await connectToMongoDB();

      const property = await PropertyModel.create({
        landlordId: userId,
        name,
        address,
      });

      try {
        const units = Array.from({ length: unitsCount }, (_, index) => ({
          propertyId: property._id,
          name: String(index + 1),
          rentAmount,
        }));

        await UnitModel.insertMany(units);
      } catch (error) {
        await PropertyModel.deleteOne({ _id: property._id });
        throw error;
      }

      return {
        id: String(property._id),
        name: property.name,
        address: property.address ?? null,
        created_at: property.createdAt
          ? new Date(property.createdAt).toISOString()
          : null,
      };
    },

    async getDetailForLandlord(
      input: GetPropertyDetailInput,
    ): Promise<PropertyDetail | null> {
      const { userId, propertyId } = input;
      await connectToMongoDB();

      const propertyObjectId = toObjectId(propertyId);
      if (!propertyObjectId) {
        return null;
      }

      const property = await PropertyModel.findOne({
        _id: propertyObjectId,
        landlordId: userId,
      }).lean();

      if (!property) {
        return null;
      }

      const units = await UnitModel.find({ propertyId: propertyObjectId })
        .sort({ name: 1 })
        .lean();

      const unitIds = units.map((unit) => unit._id as Types.ObjectId);
      const activeTenancies =
        unitIds.length > 0
          ? await TenancyModel.find({
              unitId: { $in: unitIds },
              status: "active",
            })
              .select("_id unitId tenantId nextDueDate")
              .lean()
          : [];

      const activeTenancyByUnitId = new Map<string, (typeof activeTenancies)[number]>();
      for (const tenancy of activeTenancies) {
        const key = String(tenancy.unitId);
        if (!activeTenancyByUnitId.has(key)) {
          activeTenancyByUnitId.set(key, tenancy);
        }
      }

      const tenantIds = Array.from(
        new Set(
          activeTenancies
            .map((tenancy) => tenancy.tenantId)
            .filter((tenantId): tenantId is string => !!tenantId),
        ),
      );

      const tenantProfiles =
        tenantIds.length > 0
          ? await ProfileModel.find({ _id: { $in: tenantIds } })
              .select("_id fullName")
              .lean()
          : [];

      const tenantNames = new Map<string, string>();
      for (const profile of tenantProfiles) {
        tenantNames.set(String(profile._id), profile.fullName ?? "User");
      }

      const activeTenancyIds = activeTenancies.map(
        (tenancy) => tenancy._id as Types.ObjectId,
      );

      const payments =
        activeTenancyIds.length > 0
          ? await PaymentModel.find({ tenancyId: { $in: activeTenancyIds } })
              .select("tenancyId status")
              .lean()
          : [];

      const paymentsByTenancyId = new Map<string, typeof payments>();
      for (const payment of payments) {
        const key = String(payment.tenancyId);
        const existing = paymentsByTenancyId.get(key) ?? [];
        existing.push(payment);
        paymentsByTenancyId.set(key, existing);
      }

      const now = new Date();

      const mappedUnits: UnitItem[] = units.map((unit) => {
        const activeTenancy = activeTenancyByUnitId.get(String(unit._id));

        if (!activeTenancy) {
          return {
            id: String(unit._id),
            unitNumber: unit.name,
            rentAmount: Number(unit.rentAmount) || 0,
            tenantName: null,
            tenantId: null,
            tenancyId: null,
            paymentStatus: "vacant",
          };
        }

        const tenancyPayments =
          paymentsByTenancyId.get(String(activeTenancy._id)) ?? [];

        const hasPaidPayment = tenancyPayments.some((payment) => {
          return payment.status === "verified" || payment.status === "paid";
        });

        let paymentStatus: "paid" | "pending" | "overdue" = "pending";

        if (hasPaidPayment) {
          paymentStatus = "paid";
        } else if (
          activeTenancy.nextDueDate &&
          new Date(activeTenancy.nextDueDate) < now
        ) {
          paymentStatus = "overdue";
        }

        return {
          id: String(unit._id),
          unitNumber: unit.name,
          rentAmount: Number(unit.rentAmount) || 0,
          tenantName: activeTenancy.tenantId
            ? tenantNames.get(activeTenancy.tenantId) ?? null
            : null,
          tenantId: activeTenancy.tenantId ?? null,
          tenancyId: String(activeTenancy._id),
          paymentStatus,
        };
      });

      return {
        id: String(property._id),
        name: property.name,
        address: property.address ?? "",
        createdAt: property.createdAt
          ? new Date(property.createdAt).toISOString()
          : new Date().toISOString(),
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
      await connectToMongoDB();

      const propertyObjectId = toObjectId(propertyId);
      if (!propertyObjectId) {
        return false;
      }

      const deletedProperty = await PropertyModel.findOneAndDelete({
        _id: propertyObjectId,
        landlordId: userId,
      }).lean();

      if (!deletedProperty) {
        return false;
      }

      const units = await UnitModel.find({ propertyId: propertyObjectId })
        .select("_id")
        .lean();

      const unitIds = units.map((unit) => unit._id as Types.ObjectId);

      const tenancies =
        unitIds.length > 0
          ? await TenancyModel.find({ unitId: { $in: unitIds } })
              .select("_id")
              .lean()
          : [];

      const tenancyIds = tenancies.map((tenancy) => tenancy._id as Types.ObjectId);

      await Promise.all([
        unitIds.length > 0
          ? UnitModel.deleteMany({ propertyId: propertyObjectId })
          : Promise.resolve(),
        unitIds.length > 0
          ? TenancyModel.deleteMany({ unitId: { $in: unitIds } })
          : Promise.resolve(),
        tenancyIds.length > 0
          ? PaymentModel.deleteMany({ tenancyId: { $in: tenancyIds } })
          : Promise.resolve(),
      ]);

      return true;
    },

    async updateForLandlord(
      input: UpdatePropertyInput,
    ): Promise<UpdatedProperty | null> {
      const { userId, propertyId, name, address } = input;
      await connectToMongoDB();

      const propertyObjectId = toObjectId(propertyId);
      if (!propertyObjectId) {
        return null;
      }

      const updatedProperty = await PropertyModel.findOneAndUpdate(
        {
          _id: propertyObjectId,
          landlordId: userId,
        },
        {
          $set: {
            name,
            address,
          },
        },
        {
          new: true,
        },
      ).lean();

      if (!updatedProperty) {
        return null;
      }

      return {
        id: String(updatedProperty._id),
        name: updatedProperty.name,
        address: updatedProperty.address ?? null,
      };
    },

    async listUnitsForLandlordProperty(
      input: ListPropertyUnitsInput,
    ): Promise<PropertyUnitListItem[] | null> {
      const { userId, propertyId } = input;
      await connectToMongoDB();

      const propertyObjectId = toObjectId(propertyId);
      if (!propertyObjectId) {
        return null;
      }

      const property = await PropertyModel.findOne({
        _id: propertyObjectId,
        landlordId: userId,
      })
        .select("_id")
        .lean();

      if (!property) {
        return null;
      }

      const units = await UnitModel.find({ propertyId: propertyObjectId })
        .sort({ name: 1 })
        .lean();

      const unitIds = units.map((unit) => unit._id as Types.ObjectId);
      const activeTenancies =
        unitIds.length > 0
          ? await TenancyModel.find({
              unitId: { $in: unitIds },
              status: "active",
            })
              .select("_id unitId tenantId status")
              .lean()
          : [];

      const activeTenancyByUnitId = new Map<string, (typeof activeTenancies)[number]>();
      for (const tenancy of activeTenancies) {
        const key = String(tenancy.unitId);
        if (!activeTenancyByUnitId.has(key)) {
          activeTenancyByUnitId.set(key, tenancy);
        }
      }

      const tenantIds = Array.from(
        new Set(
          activeTenancies
            .map((tenancy) => tenancy.tenantId)
            .filter((tenantId): tenantId is string => !!tenantId),
        ),
      );

      const tenantProfiles =
        tenantIds.length > 0
          ? await ProfileModel.find({ _id: { $in: tenantIds } })
              .select("_id fullName")
              .lean()
          : [];

      const tenantNames = new Map<string, string>();
      for (const profile of tenantProfiles) {
        tenantNames.set(String(profile._id), profile.fullName ?? "User");
      }

      return units.map((unit) => {
        const activeTenancy = activeTenancyByUnitId.get(String(unit._id));

        return {
          id: String(unit._id),
          name: unit.name,
          rent_amount: Number(unit.rentAmount) || 0,
          isVacant: !activeTenancy,
          tenantName: activeTenancy?.tenantId
            ? tenantNames.get(activeTenancy.tenantId) ?? null
            : null,
          tenancyStatus: activeTenancy?.status ?? null,
        };
      });
    },

    async addUnitForLandlordProperty(
      input: AddUnitInput,
    ): Promise<AddedUnit | null> {
      const { userId, propertyId, unitNumber, rentAmount } = input;
      await connectToMongoDB();

      const propertyObjectId = toObjectId(propertyId);
      if (!propertyObjectId) {
        return null;
      }

      const property = await PropertyModel.findOne({
        _id: propertyObjectId,
        landlordId: userId,
      })
        .select("_id")
        .lean();

      if (!property) {
        return null;
      }

      try {
        const unit = await UnitModel.create({
          propertyId: propertyObjectId,
          name: unitNumber,
          rentAmount,
        });

        return {
          id: String(unit._id),
          name: unit.name,
          rent_amount: Number(unit.rentAmount) || 0,
        };
      } catch (error) {
        if (isMongoDuplicateKeyError(error)) {
          throw new Error("A unit with this name already exists for this property.");
        }

        throw error;
      }
    },
  };
}
