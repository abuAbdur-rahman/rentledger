export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicPropertyItem {
  id: string;
  name: string;
  address: string;
  location: string;
  landlordName: string;
  totalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  monthlyRentMin: number;
  monthlyRentMax: number;
  createdAt: string | null;
}

export interface PublicPropertiesListResult {
  properties: PublicPropertyItem[];
  pagination: PaginationResult;
}

export interface ListPublicPropertiesInput {
  page: number;
  limit: number;
  q?: string;
}

export interface PropertyItem {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  activeTenants: number;
  pendingPayments: number;
  overduePayments: number;
  createdAt: string;
}

export interface LandlordPropertiesListResult {
  properties: PropertyItem[];
  pagination: PaginationResult;
}

export interface ListLandlordPropertiesInput {
  userId: string;
  page: number;
  limit: number;
}

export interface CreatedProperty {
  id: string;
  name: string;
  address: string | null;
  created_at: string | null;
}

export interface CreatePropertyInput {
  userId: string;
  name: string;
  address: string | null;
  unitsCount: number;
  rentAmount: number;
}

export interface UnitItem {
  id: string;
  unitNumber: string;
  rentAmount: number;
  tenantName: string | null;
  tenantId: string | null;
  tenancyId: string | null;
  paymentStatus: "paid" | "pending" | "overdue" | "vacant";
}

export interface PropertyDetail {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  unitsCount: number;
  activeTenants: number;
  totalRevenue: number;
  pendingCount: number;
  overdueCount: number;
  units: UnitItem[];
}

export interface GetPropertyDetailInput {
  userId: string;
  propertyId: string;
}

export interface DeletePropertyInput {
  userId: string;
  propertyId: string;
}

export interface UpdatePropertyInput {
  userId: string;
  propertyId: string;
  name: string;
  address: string | null;
}

export interface UpdatedProperty {
  id: string;
  name: string;
  address: string | null;
}

export interface PropertyUnitListItem {
  id: string;
  name: string;
  rent_amount: number;
  isVacant: boolean;
  tenantName: string | null;
  tenancyStatus: string | null;
}

export interface ListPropertyUnitsInput {
  userId: string;
  propertyId: string;
}

export interface AddUnitInput {
  userId: string;
  propertyId: string;
  unitNumber: string;
  rentAmount: number;
}

export interface AddedUnit {
  id: string;
  name: string;
  rent_amount: number;
}

export interface PropertiesRepository {
  listPublic(input: ListPublicPropertiesInput): Promise<PublicPropertiesListResult>;
  listForLandlord(
    input: ListLandlordPropertiesInput,
  ): Promise<LandlordPropertiesListResult>;
  createForLandlord(input: CreatePropertyInput): Promise<CreatedProperty>;
  getDetailForLandlord(input: GetPropertyDetailInput): Promise<PropertyDetail | null>;
  deleteForLandlord(input: DeletePropertyInput): Promise<boolean>;
  updateForLandlord(input: UpdatePropertyInput): Promise<UpdatedProperty | null>;
  listUnitsForLandlordProperty(
    input: ListPropertyUnitsInput,
  ): Promise<PropertyUnitListItem[] | null>;
  addUnitForLandlordProperty(input: AddUnitInput): Promise<AddedUnit | null>;
}
