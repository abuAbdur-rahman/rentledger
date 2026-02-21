export type UserRole = "landlord" | "tenant"
export type PaymentStatus = "pending" | "verified" | "rejected"
export type RentCycleType = "annual" | "monthly"

export interface Profile {
  id: string
  full_name: string | null
  phone_number: string | null
  role: UserRole
  created_at: string
}

export interface Property {
  id: string
  landlord_id: string
  name: string
  address: string | null
  created_at: string
}

export interface Unit {
  id: string
  property_id: string
  name: string
  rent_amount: number
  created_at: string
}

export interface Tenancy {
  id: string
  tenant_id: string | null
  unit_id: string
  start_date: string
  next_due_date: string | null
  rent_cycle: RentCycleType
  is_active: boolean
  created_at: string
}

export interface Payment {
  id: string
  tenancy_id: string
  amount: number
  status: PaymentStatus
  proof_url: string | null
  reference: string | null
  payment_date: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "created_at">
        Update: Partial<Omit<Profile, "created_at">>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, "id" | "created_at">
        Update: Partial<Omit<Property, "id" | "created_at">>
      }
      units: {
        Row: Unit
        Insert: Omit<Unit, "id" | "created_at">
        Update: Partial<Omit<Unit, "id" | "created_at">>
      }
      tenancies: {
        Row: Tenancy
        Insert: Omit<Tenancy, "id" | "created_at">
        Update: Partial<Omit<Tenancy, "id" | "created_at">>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, "id" | "created_at">
        Update: Partial<Omit<Payment, "id" | "created_at">>
      }
    }
  }
}
