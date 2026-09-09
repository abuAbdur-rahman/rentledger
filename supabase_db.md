# Supabase Backend: RentLedger

## Overview

This document describes the Supabase backend schema and configuration for RentLedger, a landlord-tenant payment tracking system.

---

## Environment Variables

Add these to your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 1. Database Schema

### Enums

```sql
CREATE TYPE user_role AS ENUM ('landlord', 'tenant');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE rent_cycle_type AS ENUM ('annual', 'monthly');
```

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User accounts (landlords & tenants) |
| `properties` | Buildings owned by landlords |
| `units` | Individual units within properties |
| `tenancies` | Active tenant-unit assignments |
| `payments` | Rent payment records |

### Table Definitions

```sql
-- Users: Full name, phone, role (landlord/tenant)
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'tenant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties: Owned by landlords
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units: Part of a property, has rent amount
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rent_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenancies: Links tenants to units
CREATE TABLE tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  next_due_date DATE,
  rent_cycle rent_cycle_type DEFAULT 'annual',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments: Rent payments linked to tenancies
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status payment_status DEFAULT 'pending',
  proof_url TEXT,
  reference TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** Uses `NUMERIC(12, 2)` for financial amounts to avoid floating-point errors.

---

## 2. Authentication

### Auto-create Profile on Signup

A trigger automatically creates a profile when users sign up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'tenant')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Client-side Signup

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@email.com',
  password: 'securepassword',
  options: {
    data: { 
      full_name: 'John Doe', 
      role: 'landlord' // or 'tenant'
    }
  }
});
```

---

## 3. Row Level Security (RLS)

### Enable RLS on All Tables

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

### Policies

**Profiles** — Users can only view/update their own profile:

```sql
CREATE POLICY "Users view own profile" ON profiles 
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
  
CREATE POLICY "Users update own profile" ON profiles 
  FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()));
```

**Properties** — Landlords manage their own properties:

```sql
CREATE POLICY "Landlords manage own properties" ON properties 
  FOR ALL TO authenticated USING (landlord_id = (SELECT auth.uid()));
```

**Units** — Anyone can view (read-only):

```sql
CREATE POLICY "View units" ON units FOR SELECT TO authenticated USING (true);
```

**Tenancies** — Tenants view their own:

```sql
CREATE POLICY "Tenants view own tenancies" ON tenancies 
  FOR SELECT TO authenticated USING (tenant_id = (SELECT auth.uid()));
```

**Payments** — Tenants can view/insert, landlords can view/update:

```sql
-- View: Tenant or their landlord
CREATE POLICY "View payments" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tenancies WHERE id = payments.tenancy_id AND tenant_id = (SELECT auth.uid()))
  OR 
  EXISTS (
    SELECT 1 FROM tenancies 
    JOIN units ON tenancies.unit_id = units.id
    JOIN properties ON units.property_id = properties.id
    WHERE tenancies.id = payments.tenancy_id AND properties.landlord_id = (SELECT auth.uid())
  )
);

-- Insert: Tenants for their own tenancies
CREATE POLICY "Tenants insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tenancies WHERE id = payments.tenancy_id AND tenant_id = (SELECT auth.uid()))
);

-- Update: Landlords for their properties
CREATE POLICY "Landlords update payments" ON payments FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tenancies 
    JOIN units ON tenancies.unit_id = units.id
    JOIN properties ON units.property_id = properties.id
    WHERE tenancies.id = payments.tenancy_id AND properties.landlord_id = (SELECT auth.uid())
  )
);
```

**Performance Note:** Uses `SELECT auth.uid()` as a subquery to avoid repeated function calls and satisfy the Supabase policy linter.

---

## 4. Storage

### Bucket: `payment-proofs`

- **Purpose:** Store payment receipt screenshots uploaded by tenants
- **Configuration:** Public access enabled
- **Access:** Anyone with the URL can view (acceptable for MVP; production should add RLS)

---

## 5. Quick Reference

| Entity | Owner | Access |
|--------|-------|--------|
| `profiles` | User | Self |
| `properties` | Landlord | Landlord only |
| `units` | Property | All authenticated |
| `tenancies` | Tenant | Tenant + Landlord |
| `payments` | Tenant/Landlord | Tenant insert, Landlord update |
| `payment-proofs` | Tenant | Upload via client |
