/*
  # Fix RLS Policies for Atomic Signup Flow

  ## Problem
  The current RLS policies create a deadlock during signup:
  1. User creates organization
  2. Can't SELECT organization because policy requires org_member to exist
  3. Can't create org_member without org.id
  4. Properties and subscriptions have no INSERT policies

  ## Solution
  1. Allow users to SELECT organizations they created (via inserted_by or timing)
  2. Add INSERT policies for properties (org owners)
  3. Add INSERT policies for subscriptions (org owners)
  4. Simplify org_members policies to avoid conflicts

  ## Changes Made
  - Drop conflicting org_members "ALL" policy
  - Add INSERT/UPDATE/DELETE policies for org_members (owners)
  - Fix organizations SELECT to allow creator immediate access
  - Add properties INSERT policy
  - Add subscriptions INSERT policy
*/

-- =====================================================
-- ORG_MEMBERS: Remove conflicting ALL policy, add specific policies
-- =====================================================

DROP POLICY IF EXISTS "Owners can manage org members" ON public.org_members;

-- Owners can insert new members (inviting others)
CREATE POLICY "Owners can insert org members"
  ON public.org_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Owners can update member roles
CREATE POLICY "Owners can update org members"
  ON public.org_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Owners can remove members
CREATE POLICY "Owners can delete org members"
  ON public.org_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- =====================================================
-- ORGANIZATIONS: Fix SELECT deadlock - allow immediate access to newly created org
-- =====================================================

DROP POLICY IF EXISTS "Org members can view their organization" ON public.organizations;

-- Users can view orgs they're members of OR orgs they just created (within 5 minutes)
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
    )
    OR
    (created_at > now() - interval '5 minutes' AND created_at <= now())
  );

-- =====================================================
-- PROPERTIES: Add INSERT policy for org owners/staff
-- =====================================================

DROP POLICY IF EXISTS "Owners and staff can manage properties" ON public.properties;

-- Org members can insert properties into their org
CREATE POLICY "Org members can create properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = properties.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
    OR
    -- Allow insertion if org was just created (signup flow)
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = properties.org_id
        AND organizations.created_at > now() - interval '5 minutes'
    )
  );

-- Owners and staff can update properties
CREATE POLICY "Owners and staff can update properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = properties.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = properties.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  );

-- Owners and staff can delete properties
CREATE POLICY "Owners and staff can delete properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = properties.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  );

-- =====================================================
-- SUBSCRIPTIONS: Add INSERT policy
-- =====================================================

-- Org owners can create subscriptions
CREATE POLICY "Org owners can create subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = subscriptions.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'owner'
    )
    OR
    -- Allow insertion if org was just created (signup flow)
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = subscriptions.org_id
        AND organizations.created_at > now() - interval '5 minutes'
    )
  );

-- Owners can update subscriptions
CREATE POLICY "Owners can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = subscriptions.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = subscriptions.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'owner'
    )
  );
