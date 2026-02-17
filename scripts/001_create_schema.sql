-- Create users table (extends Supabase auth.users)
-- This table stores additional user info beyond Supabase auth
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rental_property table
CREATE TABLE IF NOT EXISTS public.rental_property (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  no_units INTEGER NOT NULL CHECK (no_units > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unit table
CREATE TABLE IF NOT EXISTS public.unit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_property_id UUID NOT NULL REFERENCES public.rental_property(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  track_utilities BOOLEAN DEFAULT FALSE,
  contract_address TEXT,
  rent_amount DECIMAL(12, 2) NOT NULL CHECK (rent_amount >= 0),
  cash_bond_amount DECIMAL(12, 2) NOT NULL CHECK (cash_bond_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rental_property_id, name)
);

-- Create tenant table
CREATE TABLE IF NOT EXISTS public.tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.unit(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  contract_name TEXT NOT NULL,
  contact_no TEXT,
  messenger TEXT,
  address TEXT,
  begin_contract DATE NOT NULL,
  end_contract DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id)
);

-- Create contract table
CREATE TABLE IF NOT EXISTS public.contract (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.unit(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  signed BOOLEAN DEFAULT FALSE,
  signed_recorded_by_user_id UUID REFERENCES public.users(id),
  signed_recorded_date TIMESTAMP WITH TIME ZONE,
  notarized BOOLEAN DEFAULT FALSE,
  notarized_recorded_by_user_id UUID REFERENCES public.users(id),
  notarized_recorded_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id, year)
);

-- Create rent_payment table
CREATE TABLE IF NOT EXISTS public.rent_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.unit(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  paid BOOLEAN DEFAULT FALSE,
  recorded_by_user_id UUID NOT NULL REFERENCES public.users(id),
  recorded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id, year, month)
);

-- Create utility table
CREATE TABLE IF NOT EXISTS public.utility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.unit(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('MNWD', 'Casureco')),
  due_date DATE NOT NULL,
  date_of_reading DATE NOT NULL,
  unit_reading DECIMAL(10, 2) NOT NULL CHECK (unit_reading >= 0),
  first_floor_reading DECIMAL(10, 2) NOT NULL CHECK (first_floor_reading >= 0),
  second_floor_reading DECIMAL(10, 2) NOT NULL CHECK (second_floor_reading >= 0),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create utility_payment table
CREATE TABLE IF NOT EXISTS public.utility_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id UUID NOT NULL REFERENCES public.utility(id) ON DELETE CASCADE,
  paid BOOLEAN DEFAULT FALSE,
  recorded_by_user_id UUID NOT NULL REFERENCES public.users(id),
  recorded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(utility_id)
);

-- Enable Row Level Security for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_property ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_payment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own record" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for rental_property table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all rental properties" ON public.rental_property
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert rental properties" ON public.rental_property
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update rental properties" ON public.rental_property
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete rental properties" ON public.rental_property
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for unit table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all units" ON public.unit
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert units" ON public.unit
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update units" ON public.unit
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete units" ON public.unit
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for tenant table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all tenants" ON public.tenant
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tenants" ON public.tenant
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tenants" ON public.tenant
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tenants" ON public.tenant
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for contract table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all contracts" ON public.contract
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert contracts" ON public.contract
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contracts" ON public.contract
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete contracts" ON public.contract
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for rent_payment table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all rent payments" ON public.rent_payment
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert rent payments" ON public.rent_payment
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update rent payments" ON public.rent_payment
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete rent payments" ON public.rent_payment
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for utility table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all utilities" ON public.utility
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert utilities" ON public.utility
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update utilities" ON public.utility
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete utilities" ON public.utility
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for utility_payment table (all authenticated users can access)
CREATE POLICY "Authenticated users can view all utility payments" ON public.utility_payment
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert utility payments" ON public.utility_payment
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update utility payments" ON public.utility_payment
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete utility payments" ON public.utility_payment
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger function to create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unit_rental_property_id ON public.unit(rental_property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_unit_id ON public.tenant(unit_id);
CREATE INDEX IF NOT EXISTS idx_contract_unit_id ON public.contract(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_payment_unit_id ON public.rent_payment(unit_id);
CREATE INDEX IF NOT EXISTS idx_utility_unit_id ON public.utility(unit_id);
CREATE INDEX IF NOT EXISTS idx_utility_payment_utility_id ON public.utility_payment(utility_id);
CREATE INDEX IF NOT EXISTS idx_rent_payment_year_month ON public.rent_payment(year, month);
CREATE INDEX IF NOT EXISTS idx_utility_type ON public.utility(type);
