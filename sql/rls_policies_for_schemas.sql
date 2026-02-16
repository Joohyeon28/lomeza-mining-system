-- RLS policies for site schemas: sileko, kalagadi, and public
-- Run this in the Supabase SQL editor (or psql) using a superuser/service role.
-- It enables Row Level Security (safely using IF EXISTS) and creates
-- INSERT/SELECT policies that allow authenticated users with JWT
-- claim `role = 'controller'` and `site = '<schema>'` to operate on
-- records for their site.

-- Adjust claim key `jwt.claims.site` if your tokens use a different claim name.
-- Edit the table list below if your table names differ (e.g., daily_plans vs shift_plans).

-- Schemas and tables to configure
-- Tables: shift_plans, daily_plan_machines, daily_plans

-- -----------------------------
-- SILEKO
-- -----------------------------
ALTER TABLE IF EXISTS sileko.shift_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sileko.daily_plan_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sileko.daily_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present (safe to run repeatedly)
DROP POLICY IF EXISTS sileko_controllers_insert_shift_plans ON sileko.shift_plans;
DROP POLICY IF EXISTS sileko_controllers_select_shift_plans ON sileko.shift_plans;
DROP POLICY IF EXISTS sileko_controllers_insert_daily_plan_machines ON sileko.daily_plan_machines;
DROP POLICY IF EXISTS sileko_controllers_select_daily_plan_machines ON sileko.daily_plan_machines;
DROP POLICY IF EXISTS sileko_controllers_insert_daily_plans ON sileko.daily_plans;
DROP POLICY IF EXISTS sileko_controllers_select_daily_plans ON sileko.daily_plans;

-- Allow controllers from sileko to INSERT/SELECT
CREATE POLICY sileko_controllers_insert_shift_plans
  ON sileko.shift_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'sileko'
    )
  );

CREATE POLICY sileko_controllers_select_shift_plans
  ON sileko.shift_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'sileko'
    )
  );

CREATE POLICY sileko_controllers_insert_daily_plan_machines
  ON sileko.daily_plan_machines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'sileko'
    )
  );

CREATE POLICY sileko_controllers_select_daily_plan_machines
  ON sileko.daily_plan_machines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'sileko'
    )
  );

CREATE POLICY sileko_controllers_insert_daily_plans
  ON sileko.daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'sileko'
    )
  );

CREATE POLICY sileko_controllers_select_daily_plans
  ON sileko.daily_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'sileko'
    )
  );

-- -----------------------------
-- KALAGADI
-- -----------------------------
ALTER TABLE IF EXISTS kalagadi.shift_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kalagadi.daily_plan_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kalagadi.daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kalagadi_controllers_insert_shift_plans ON kalagadi.shift_plans;
DROP POLICY IF EXISTS kalagadi_controllers_select_shift_plans ON kalagadi.shift_plans;
DROP POLICY IF EXISTS kalagadi_controllers_insert_daily_plan_machines ON kalagadi.daily_plan_machines;
DROP POLICY IF EXISTS kalagadi_controllers_select_daily_plan_machines ON kalagadi.daily_plan_machines;
DROP POLICY IF EXISTS kalagadi_controllers_insert_daily_plans ON kalagadi.daily_plans;
DROP POLICY IF EXISTS kalagadi_controllers_select_daily_plans ON kalagadi.daily_plans;

CREATE POLICY kalagadi_controllers_insert_shift_plans
  ON kalagadi.shift_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'kalagadi'
    )
  );

CREATE POLICY kalagadi_controllers_select_shift_plans
  ON kalagadi.shift_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'kalagadi'
    )
  );

CREATE POLICY kalagadi_controllers_insert_daily_plan_machines
  ON kalagadi.daily_plan_machines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'kalagadi'
    )
  );

CREATE POLICY kalagadi_controllers_select_daily_plan_machines
  ON kalagadi.daily_plan_machines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site = 'kalagadi'
    )
  );

CREATE POLICY kalagadi_controllers_insert_daily_plans
  ON kalagadi.daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'controller'
    AND current_setting('jwt.claims.site', true) = 'kalagadi'
  );

CREATE POLICY kalagadi_controllers_select_daily_plans
  ON kalagadi.daily_plans
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'controller'
    AND current_setting('jwt.claims.site', true) = 'kalagadi'
  );

-- -----------------------------
-- PUBLIC (optional fallback)
-- -----------------------------
ALTER TABLE IF EXISTS public.shift_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_plan_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_controllers_insert_shift_plans ON public.shift_plans;
DROP POLICY IF EXISTS public_controllers_select_shift_plans ON public.shift_plans;
DROP POLICY IF EXISTS public_controllers_insert_daily_plan_machines ON public.daily_plan_machines;
DROP POLICY IF EXISTS public_controllers_select_daily_plan_machines ON public.daily_plan_machines;
DROP POLICY IF EXISTS public_controllers_insert_daily_plans ON public.daily_plans;
DROP POLICY IF EXISTS public_controllers_select_daily_plans ON public.daily_plans;

CREATE POLICY public_controllers_insert_shift_plans
  ON public.shift_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site IN ('sileko','kalagadi','public')
    )
  );

CREATE POLICY public_controllers_select_shift_plans
  ON public.shift_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'controller'
        AND u.site IN ('sileko','kalagadi','public')
    )
  );

CREATE POLICY public_controllers_insert_daily_plan_machines
  ON public.daily_plan_machines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'controller'
    AND current_setting('jwt.claims.site', true) IN ('sileko','kalagadi','public')
  );

CREATE POLICY public_controllers_select_daily_plan_machines
  ON public.daily_plan_machines
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'controller'
    AND current_setting('jwt.claims.site', true) IN ('sileko','kalagadi','public')
  );

CREATE POLICY public_controllers_insert_daily_plans
  ON public.daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'controller'
    AND current_setting('jwt.claims.site', true) IN ('sileko','kalagadi','public')
  );

CREATE POLICY public_controllers_select_daily_plans
  ON public.daily_plans
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'controller'
    AND current_setting('jwt.claims.site', true) IN ('sileko','kalagadi','public')
  );

-- -----------------------------
-- End of file
-- -----------------------------
-- After running: refresh Supabase UI and test from a signed-in controller for each site.
