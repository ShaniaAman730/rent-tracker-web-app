-- Update RLS policies to enforce manager/contributor ownership rules

-- Ensure ownership columns exist on tables we reference
ALTER TABLE public.rental_property
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.utility
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.rent_payment
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.contract
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.utility_payment
  ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES public.users(id);

-- helper function check for manager role
-- (the policy uses a subselect each time)

-- Rental property
DROP POLICY IF EXISTS "Authenticated users can view all rental properties" ON public.rental_property;
DROP POLICY IF EXISTS "Authenticated users can insert rental properties" ON public.rental_property;
DROP POLICY IF EXISTS "Authenticated users can update rental properties" ON public.rental_property;
DROP POLICY IF EXISTS "Authenticated users can delete rental properties" ON public.rental_property;

CREATE POLICY "Managers or owners can view rental properties" ON public.rental_property
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

CREATE POLICY "Authenticated users can insert rental properties" ON public.rental_property
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Managers or owners can update rental properties" ON public.rental_property
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

CREATE POLICY "Managers or owners can delete rental properties" ON public.rental_property
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

-- Utility
DROP POLICY IF EXISTS "Authenticated users can view all utilities" ON public.utility;
DROP POLICY IF EXISTS "Authenticated users can insert utilities" ON public.utility;
DROP POLICY IF EXISTS "Authenticated users can update utilities" ON public.utility;
DROP POLICY IF EXISTS "Authenticated users can delete utilities" ON public.utility;

CREATE POLICY "Managers or owners can view utilities" ON public.utility
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Authenticated users can insert utilities" ON public.utility
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers or owners can update utilities" ON public.utility
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete utilities" ON public.utility
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

-- For tables that already store recorded_by_user_id we can use similar rules

-- Rent payment
DROP POLICY IF EXISTS "Authenticated users can view all rent payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Authenticated users can insert rent payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Authenticated users can update rent payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Authenticated users can delete rent payments" ON public.rent_payment;
CREATE POLICY "Managers or owners can view rent payments" ON public.rent_payment
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Authenticated users can insert rent payments" ON public.rent_payment
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers or owners can update rent payments" ON public.rent_payment
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete rent payments" ON public.rent_payment
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

-- Contract table policies
DROP POLICY IF EXISTS "Authenticated users can view all contracts" ON public.contract;

-- Tenant table policies
DROP POLICY IF EXISTS "Authenticated users can view all tenants" ON public.tenant;
DROP POLICY IF EXISTS "Authenticated users can insert tenants" ON public.tenant;
DROP POLICY IF EXISTS "Authenticated users can update tenants" ON public.tenant;
DROP POLICY IF EXISTS "Authenticated users can delete tenants" ON public.tenant;
CREATE POLICY "Managers or owners can view tenants" ON public.tenant
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Authenticated users can insert tenants" ON public.tenant
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers or owners can update tenants" ON public.tenant
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete tenants" ON public.tenant
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

-- Contract table policies
DROP POLICY IF EXISTS "Authenticated users can view all contracts" ON public.contract;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contract;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contract;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON public.contract;
CREATE POLICY "Managers or owners can view contracts" ON public.contract
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Authenticated users can insert contracts" ON public.contract
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers or owners can update contracts" ON public.contract
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete contracts" ON public.contract
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

-- Utility payment (similar rules)
DROP POLICY IF EXISTS "Authenticated users can view all utility payments" ON public.utility_payment;
DROP POLICY IF EXISTS "Authenticated users can insert utility payments" ON public.utility_payment;
DROP POLICY IF EXISTS "Authenticated users can update utility payments" ON public.utility_payment;
DROP POLICY IF EXISTS "Authenticated users can delete utility payments" ON public.utility_payment;
CREATE POLICY "Managers or owners can view utility payments" ON public.utility_payment
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Authenticated users can insert utility payments" ON public.utility_payment
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers or owners can update utility payments" ON public.utility_payment
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete utility payments" ON public.utility_payment
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'manager')
    OR recorded_by_user_id = auth.uid()
  );

-- You can expand these rules for other tables similarly if needed
