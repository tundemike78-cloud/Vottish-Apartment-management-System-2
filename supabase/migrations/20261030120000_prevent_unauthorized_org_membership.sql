-- Prevent authenticated users from granting themselves membership in arbitrary
-- organizations. Permissive INSERT policies are ORed, so the existing owner-only
-- policy cannot protect the table while this self-enrollment policy exists.
--
-- Keep "Owners can insert org members": an existing owner can manage membership
-- only in their own organization. Initial owner creation continues through the
-- auth-signup Edge Function's service-role client, which bypasses RLS.
DROP POLICY IF EXISTS "Users can add themselves as org member"
  ON public.org_members;
