/*
  # Add Lease and Portfolio Management

  ## New Tables
  
  ### leases
  - Tracks rental agreements for units
  - Links residents to units with terms
  - Manages rent schedules and deposits
  
  ### portfolios
  - Groups properties for reporting
  - Enables multi-property management
  
  ## Security
  - RLS enabled on all tables
  - Org-scoped access control
  - Tenants can view their own leases
*/

-- =====================================================
-- LEASES
-- =====================================================

CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  primary_tenant_id uuid REFERENCES residents(id),
  tenant_ids uuid[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  rent_amount decimal(10,2) NOT NULL,
  rent_currency text NOT NULL DEFAULT 'USD',
  rent_schedule text NOT NULL DEFAULT 'monthly' CHECK (rent_schedule IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
  deposit_amount decimal(10,2),
  documents jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ending_soon', 'ended', 'cancelled')),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leases_org_id ON leases(org_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON leases(end_date);

ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PORTFOLIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  property_ids uuid[] DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_org_id ON portfolios(org_id);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: LEASES
-- =====================================================

-- Org members can view leases in their org
CREATE POLICY "Org members can view leases"
  ON leases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = leases.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- Tenants can view their own leases
CREATE POLICY "Tenants can view own leases"
  ON leases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM residents
      WHERE residents.id = ANY(leases.tenant_ids)
        AND residents.user_id = auth.uid()
    )
  );

-- Owners and staff can create leases
CREATE POLICY "Owners and staff can create leases"
  ON leases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = leases.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  );

-- Owners and staff can update leases
CREATE POLICY "Owners and staff can update leases"
  ON leases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = leases.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = leases.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  );

-- Owners can delete leases
CREATE POLICY "Owners can delete leases"
  ON leases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = leases.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'owner'
    )
  );

-- =====================================================
-- RLS POLICIES: PORTFOLIOS
-- =====================================================

-- Org members can view portfolios
CREATE POLICY "Org members can view portfolios"
  ON portfolios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = portfolios.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- Owners and staff can create portfolios
CREATE POLICY "Owners and staff can create portfolios"
  ON portfolios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = portfolios.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  );

-- Owners and staff can update portfolios
CREATE POLICY "Owners and staff can update portfolios"
  ON portfolios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = portfolios.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = portfolios.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'staff')
    )
  );

-- Owners can delete portfolios
CREATE POLICY "Owners can delete portfolios"
  ON portfolios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = portfolios.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'owner'
    )
  );
