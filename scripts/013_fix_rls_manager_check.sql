-- Fix manager RLS checks and ensure ownership defaults

-- Ensure owner is set on new rows
ALTER TABLE public.rental_property
  ALTER COLUMN recorded_by_user_id SET DEFAULT auth.uid();
ALTER TABLE public.utility
  ALTER COLUMN recorded_by_user_id SET DEFAULT auth.uid();
ALTER TABLE public.rent_payment
  ALTER COLUMN recorded_by_user_id SET DEFAULT auth.uid();
ALTER TABLE public.tenant
  ALTER COLUMN recorded_by_user_id SET DEFAULT auth.uid();
ALTER TABLE public.contract
  ALTER COLUMN recorded_by_user_id SET DEFAULT auth.uid();
ALTER TABLE public.utility_payment
  ALTER COLUMN recorded_by_user_id SET DEFAULT auth.uid();

-- helper function check for manager role
-- (security definer avoids RLS recursion on public.users)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'manager'
  );
$$;

-- public directory for display names (used by clients)
CREATE OR REPLACE FUNCTION public.get_user_directory(user_ids uuid[])
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    COALESCE(u.full_name, u.email, 'User') AS display_name
  FROM public.users u
  WHERE auth.role() = 'authenticated'
    AND u.id = ANY(user_ids);
$$;

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Managers can view all users" ON public.users;
DROP POLICY IF EXISTS "Managers can update all users" ON public.users;
DROP POLICY IF EXISTS "Managers can insert users" ON public.users;
DROP POLICY IF EXISTS "Managers can delete users" ON public.users;

CREATE POLICY "Users can view their own record" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Managers can view all users" ON public.users
  FOR SELECT USING (
    public.is_manager()
  );

CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can update all users" ON public.users
  FOR UPDATE USING (
    public.is_manager()
  );

CREATE POLICY "Managers can insert users" ON public.users
  FOR INSERT WITH CHECK (
    public.is_manager()
  );

CREATE POLICY "Managers can delete users" ON public.users
  FOR DELETE USING (
    public.is_manager()
  );

-- Rental property
DROP POLICY IF EXISTS "Authenticated users can view all rental properties" ON public.rental_property;
DROP POLICY IF EXISTS "Authenticated users can insert rental properties" ON public.rental_property;
DROP POLICY IF EXISTS "Managers or owners can update rental properties" ON public.rental_property;
DROP POLICY IF EXISTS "Managers or owners can delete rental properties" ON public.rental_property;

CREATE POLICY "Authenticated users can view all rental properties" ON public.rental_property
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert rental properties" ON public.rental_property
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_manager() OR recorded_by_user_id = auth.uid())
  );

CREATE POLICY "Managers or owners can update rental properties" ON public.rental_property
  FOR UPDATE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );

CREATE POLICY "Managers or owners can delete rental properties" ON public.rental_property
  FOR DELETE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );

-- Utility
DROP POLICY IF EXISTS "Authenticated users can view all utilities" ON public.utility;
DROP POLICY IF EXISTS "Authenticated users can insert utilities" ON public.utility;
DROP POLICY IF EXISTS "Managers or owners can update utilities" ON public.utility;
DROP POLICY IF EXISTS "Managers or owners can delete utilities" ON public.utility;

CREATE POLICY "Authenticated users can view all utilities" ON public.utility
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert utilities" ON public.utility
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_manager() OR recorded_by_user_id = auth.uid())
  );
CREATE POLICY "Managers or owners can update utilities" ON public.utility
  FOR UPDATE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete utilities" ON public.utility
  FOR DELETE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );

-- Rent payment
DROP POLICY IF EXISTS "Authenticated users can view all rent payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Authenticated users can insert rent payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Managers or owners can update rent payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Managers or owners can delete rent payments" ON public.rent_payment;

CREATE POLICY "Authenticated users can view all rent payments" ON public.rent_payment
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert rent payments" ON public.rent_payment
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_manager() OR recorded_by_user_id = auth.uid())
  );
CREATE POLICY "Managers or owners can update rent payments" ON public.rent_payment
  FOR UPDATE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete rent payments" ON public.rent_payment
  FOR DELETE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );

-- Tenant table policies
DROP POLICY IF EXISTS "Authenticated users can view all tenants" ON public.tenant;
DROP POLICY IF EXISTS "Authenticated users can insert tenants" ON public.tenant;
DROP POLICY IF EXISTS "Managers or owners can update tenants" ON public.tenant;
DROP POLICY IF EXISTS "Managers or owners can delete tenants" ON public.tenant;

CREATE POLICY "Authenticated users can view all tenants" ON public.tenant
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert tenants" ON public.tenant
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_manager() OR recorded_by_user_id = auth.uid())
  );
CREATE POLICY "Managers or owners can update tenants" ON public.tenant
  FOR UPDATE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete tenants" ON public.tenant
  FOR DELETE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );

-- Contract table policies
DROP POLICY IF EXISTS "Authenticated users can view all contracts" ON public.contract;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contract;
DROP POLICY IF EXISTS "Managers or owners can update contracts" ON public.contract;
DROP POLICY IF EXISTS "Managers or owners can delete contracts" ON public.contract;

CREATE POLICY "Authenticated users can view all contracts" ON public.contract
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert contracts" ON public.contract
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_manager() OR recorded_by_user_id = auth.uid())
  );
CREATE POLICY "Managers or owners can update contracts" ON public.contract
  FOR UPDATE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete contracts" ON public.contract
  FOR DELETE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );

-- Utility payment (similar rules)
DROP POLICY IF EXISTS "Authenticated users can view all utility payments" ON public.utility_payment;
DROP POLICY IF EXISTS "Authenticated users can insert utility payments" ON public.utility_payment;
DROP POLICY IF EXISTS "Managers or owners can update utility payments" ON public.utility_payment;
DROP POLICY IF EXISTS "Managers or owners can delete utility payments" ON public.utility_payment;

CREATE POLICY "Authenticated users can view all utility payments" ON public.utility_payment
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert utility payments" ON public.utility_payment
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_manager() OR recorded_by_user_id = auth.uid())
  );
CREATE POLICY "Managers or owners can update utility payments" ON public.utility_payment
  FOR UPDATE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );
CREATE POLICY "Managers or owners can delete utility payments" ON public.utility_payment
  FOR DELETE USING (
    public.is_manager()
    OR recorded_by_user_id = auth.uid()
  );
