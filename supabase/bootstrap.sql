-- RentLedger Supabase bootstrap script
-- Run this once in Supabase SQL Editor for the project configured in .env.local

create extension if not exists pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('landlord', 'tenant');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'verified', 'failed', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rent_cycle_type') THEN
    CREATE TYPE public.rent_cycle_type AS ENUM ('annual', 'monthly');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenancy_status') THEN
    CREATE TYPE public.tenancy_status AS ENUM ('pending', 'active', 'rejected', 'terminated');
  END IF;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'New User',
  phone_number text,
  role public.user_role NOT NULL DEFAULT 'tenant',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  rent_amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  next_due_date date,
  rent_cycle public.rent_cycle_type DEFAULT 'annual',
  status public.tenancy_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status public.payment_status DEFAULT 'pending',
  proof_url text,
  reference text,
  payment_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Messaging and notifications tables used by API routes
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant_id ON public.tenancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_unit_id ON public.tenancies(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenancy_id ON public.payments(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_landlord ON public.conversations(landlord_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- Auto create profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'tenant')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    role = COALESCE(EXCLUDED.role, public.profiles.role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clean old policies first
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Landlords manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Public view properties" ON public.properties;
DROP POLICY IF EXISTS "Public view units" ON public.units;
DROP POLICY IF EXISTS "Landlords manage own units" ON public.units;
DROP POLICY IF EXISTS "Tenant view own tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Landlord view property tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Landlord manage property tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Tenant update own tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "View payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants insert payments" ON public.payments;
DROP POLICY IF EXISTS "Landlords update payments" ON public.payments;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Participants view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants send messages" ON public.messages;

-- Profiles
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Properties
CREATE POLICY "Landlords manage own properties"
ON public.properties FOR ALL TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Public view properties"
ON public.properties FOR SELECT TO anon, authenticated
USING (true);

-- Units
CREATE POLICY "Public view units"
ON public.units FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Landlords manage own units"
ON public.units FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.landlord_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = units.property_id
      AND p.landlord_id = auth.uid()
  )
);

-- Tenancies
CREATE POLICY "Tenant view own tenancies"
ON public.tenancies FOR SELECT TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "Landlord view property tenancies"
ON public.tenancies FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenancies.unit_id
      AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Landlord manage property tenancies"
ON public.tenancies FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = tenancies.unit_id
      AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Tenant update own tenancies"
ON public.tenancies FOR UPDATE TO authenticated
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

-- Payments
CREATE POLICY "View payments"
ON public.payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenancies t
    WHERE t.id = payments.tenancy_id
      AND t.tenant_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tenancies t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE t.id = payments.tenancy_id
      AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Tenants insert payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenancies t
    WHERE t.id = payments.tenancy_id
      AND t.tenant_id = auth.uid()
  )
);

CREATE POLICY "Landlords update payments"
ON public.payments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenancies t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE t.id = payments.tenancy_id
      AND p.landlord_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenancies t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE t.id = payments.tenancy_id
      AND p.landlord_id = auth.uid()
  )
);

-- Notifications
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users create own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Conversations
CREATE POLICY "Participants view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (landlord_id = auth.uid() OR tenant_id = auth.uid());

CREATE POLICY "Participants create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (landlord_id = auth.uid() OR tenant_id = auth.uid());

-- Messages
CREATE POLICY "Participants view messages"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
  )
);

CREATE POLICY "Participants send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.landlord_id = auth.uid() OR c.tenant_id = auth.uid())
  )
);

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;
