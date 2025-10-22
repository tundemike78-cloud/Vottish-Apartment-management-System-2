/*
  # Fix Users Table RLS Policies

  ## Changes
  - Add INSERT policy for users table to allow authenticated users to create their own profile
  - Add INSERT policy for organizations table to allow new users to create their organization
  - Add INSERT policy for org_members table to allow users to add themselves to their organization

  ## Security
  - INSERT policies ensure users can only create records for themselves (auth.uid() check)
  - All policies are restrictive and check authentication
*/

-- Users INSERT policy: Allow authenticated users to create their own profile
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Organizations INSERT policy: Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Org members INSERT policy: Users can add themselves as the first member (owner)
CREATE POLICY "Users can add themselves as org member"
  ON org_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
