/*
  # Fix org_members Infinite Recursion - Final Solution

  ## Problem
  The org_members table has RLS policies that query org_members itself,
  causing infinite recursion when trying to check permissions.

  ## Solution
  Create a security definer function that bypasses RLS to check membership,
  then use that function in policies to avoid recursion.

  ## Changes
  1. Drop all existing SELECT policies on org_members
  2. Create a security definer function to check org membership
  3. Create new policies using the function (no recursion)
*/

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Users can view own org memberships" ON public.org_members;
DROP POLICY IF EXISTS "Users can view members in same org" ON public.org_members;
DROP POLICY IF EXISTS "Org members can view members in their org" ON public.org_members;

-- Create a security definer function to check if user is in an org
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.user_is_org_member(check_org_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members
    WHERE org_id = check_org_id
    AND user_id = check_user_id
  );
$$;

-- Allow users to view their own memberships (simple, no recursion)
CREATE POLICY "Users can view own memberships"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to view other members in orgs they belong to
-- Uses the security definer function to avoid recursion
CREATE POLICY "Users can view org members"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (public.user_is_org_member(org_id, auth.uid()));
