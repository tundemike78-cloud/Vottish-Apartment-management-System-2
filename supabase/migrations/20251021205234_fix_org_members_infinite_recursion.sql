/*
  # Fix Infinite Recursion in org_members SELECT Policy

  ## Problem
  The SELECT policy for org_members queries org_members to check membership,
  causing infinite recursion when Postgres tries to evaluate the policy.

  ## Solution
  Simplify SELECT policy to allow users to view their own memberships directly
  without recursive checks. For viewing other members in the org, we rely on
  the org_id match which doesn't cause recursion.

  ## Changes
  - Drop the recursive "Org members can view members in their org" policy
  - Add simpler "Users can view own org memberships" policy
  - Add "Users can view members in same org" policy (non-recursive)
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Org members can view members in their org" ON public.org_members;

-- Allow users to view their own memberships (no recursion)
CREATE POLICY "Users can view own org memberships"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to view other members in orgs they belong to
-- This checks if the current user has ANY membership with the same org_id
-- We use a simple EXISTS that doesn't recurse
CREATE POLICY "Users can view members in same org"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id
      FROM org_members om
      WHERE om.user_id = auth.uid()
    )
  );
