/*
  # Vottsh AMS Core Database Schema

  ## Overview
  Complete multi-tenant apartment and estate management system with work orders,
  vendor marketplace, visitor access codes, and gas cylinder e-commerce.

  ## New Tables
  
  ### Authentication & Multi-tenancy
    - `users` - System users with extended profile data
    - `organizations` - Tenant organizations with billing info
    - `org_members` - Junction table for user-org relationships with roles
  
  ### Property Management
    - `properties` - Buildings/estates/complexes
    - `units` - Individual apartments/units within properties
    - `residents` - People living in units (may or may not be system users)
  
  ### Vendor System
    - `vendors` - Service providers (plumbers, electricians, etc.)
    - `vendor_reviews` - Ratings and feedback for vendors
  
  ### Work Orders
    - `work_orders` - Maintenance requests and tickets
    - `work_order_messages` - Communication threads on work orders
    - `quotes` - Vendor pricing proposals for work orders
  
  ### Visitor Management
    - `visitor_passes` - Time-boxed access codes for guests
    - `visitor_events` - Validation attempts and check-in/out logs
  
  ### E-commerce
    - `products` - Catalog items (primarily gas cylinders)
    - `orders` - Purchase orders
    - `deliveries` - Delivery tracking and proof
  
  ### Billing & Admin
    - `subscriptions` - Stripe subscription tracking
    - `audit_logs` - Comprehensive activity tracking
  
  ## Security
    - Row Level Security (RLS) enabled on all tables
    - Policies enforce multi-tenant isolation by organization
    - Role-based access control through org_members.role

  ## Notes
    - Uses PostGIS extension for geolocation features
    - All timestamps in UTC with proper timezone support
    - Audit trails on critical operations
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'tenant' CHECK (role IN ('sysadmin', 'owner', 'staff', 'vendor', 'tenant', 'security')),
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS (Multi-tenant)
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  billing_tier text NOT NULL DEFAULT 'free' CHECK (billing_tier IN ('free', 'premium')),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORG MEMBERS (RBAC)
-- =====================================================

CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'staff', 'vendor', 'tenant', 'security')),
  invited_by uuid REFERENCES users(id),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RESIDENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  email text,
  phone text,
  move_in_at timestamptz,
  move_out_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROPERTIES
-- =====================================================

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('apartment', 'estate', 'subdivision', 'complex')),
  address text NOT NULL,
  location geography(POINT, 4326),
  timezone text DEFAULT 'America/New_York',
  units_count int DEFAULT 0,
  amenities jsonb DEFAULT '[]'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- UNITS
-- =====================================================

CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  number text NOT NULL,
  floor int,
  resident_id uuid REFERENCES residents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, number)
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VENDORS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  org_id uuid REFERENCES organizations(id),
  company_name text NOT NULL,
  trades text[] NOT NULL DEFAULT '{}',
  service_radius_km numeric DEFAULT 50,
  verified boolean DEFAULT false,
  license_doc_url text,
  license_expiry_date date,
  insurance_doc_url text,
  insurance_expiry_date date,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_jobs int DEFAULT 0,
  location geography(POINT, 4326),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- WORK ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id),
  created_by uuid NOT NULL REFERENCES users(id),
  assigned_to_user_id uuid REFERENCES users(id),
  assigned_vendor_id uuid REFERENCES vendors(id),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'painting', 'carpentry', 'appliance', 'pest', 'landscaping', 'other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'assigned', 'in_progress', 'awaiting_parts', 'on_hold', 'completed', 'closed', 'cancelled')),
  sla_due_at timestamptz,
  cost numeric DEFAULT 0,
  parts_used jsonb DEFAULT '[]'::jsonb,
  before_photos text[] DEFAULT '{}',
  after_photos text[] DEFAULT '{}',
  completed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- WORK ORDER MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS work_order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  attachments text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_order_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- QUOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VISITOR PASSES
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id),
  code text NOT NULL UNIQUE,
  qr_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  max_uses int DEFAULT 1,
  used_count int DEFAULT 0,
  purpose text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE visitor_passes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VISITOR EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_pass_id uuid NOT NULL REFERENCES visitor_passes(id) ON DELETE CASCADE,
  validated_by uuid NOT NULL REFERENCES users(id),
  result text NOT NULL CHECK (result IN ('success', 'expired', 'invalid', 'max_uses_exceeded', 'outside_time_window')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRODUCTS (E-commerce)
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  size text,
  price numeric NOT NULL,
  active boolean DEFAULT true,
  is_gas_cylinder boolean DEFAULT false,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id),
  user_id uuid NOT NULL REFERENCES users(id),
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_intent_id text,
  items jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DELIVERIES
-- =====================================================

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  delivered_at timestamptz,
  proof_photo_url text,
  received_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'premium_monthly', 'premium_yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  stripe_subscription_id text,
  renews_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VENDOR REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(work_order_id)
);

ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Org members can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
      AND org_members.user_id = auth.uid()
      AND org_members.role IN ('owner', 'sysadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
      AND org_members.user_id = auth.uid()
      AND org_members.role IN ('owner', 'sysadmin')
    )
  );

-- Org members policies
CREATE POLICY "Org members can view members in their org"
  ON org_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage org members"
  ON org_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );

-- Properties policies
CREATE POLICY "Org members can view their properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = properties.org_id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and staff can manage properties"
  ON properties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = properties.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role IN ('owner', 'staff')
    )
  );

-- Units policies
CREATE POLICY "Property org members can view units"
  ON units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE p.id = units.property_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and staff can manage units"
  ON units FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE p.id = units.property_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'staff')
    )
  );

-- Residents policies
CREATE POLICY "Residents can view their own data"
  ON residents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN org_members om ON om.org_id = p.org_id
      WHERE u.resident_id = residents.id
      AND om.user_id = auth.uid()
    )
  );

-- Vendors policies
CREATE POLICY "Vendors can view and update own profile"
  ON vendors FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org members can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    verified = true OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.user_id = auth.uid()
    )
  );

-- Work orders policies
CREATE POLICY "Org members can view work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = work_orders.org_id
      AND org_members.user_id = auth.uid()
    ) OR
    assigned_vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and owners can manage work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = work_orders.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role IN ('owner', 'staff')
    )
  );

CREATE POLICY "Tenants can create work orders"
  ON work_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = work_orders.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'tenant'
    )
  );

-- Work order messages policies
CREATE POLICY "Work order participants can view messages"
  ON work_order_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      LEFT JOIN org_members om ON om.org_id = wo.org_id
      WHERE wo.id = work_order_messages.work_order_id
      AND (om.user_id = auth.uid() OR wo.created_by = auth.uid())
    )
  );

CREATE POLICY "Work order participants can send messages"
  ON work_order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM work_orders wo
      LEFT JOIN org_members om ON om.org_id = wo.org_id
      WHERE wo.id = work_order_messages.work_order_id
      AND (om.user_id = auth.uid() OR wo.created_by = auth.uid())
    )
  );

-- Quotes policies
CREATE POLICY "Vendors can manage their quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can view quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      JOIN org_members om ON om.org_id = wo.org_id
      WHERE wo.id = quotes.work_order_id
      AND om.user_id = auth.uid()
    )
  );

-- Visitor passes policies
CREATE POLICY "Property org members can view visitor passes"
  ON visitor_passes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE p.id = visitor_passes.property_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and tenants can create visitor passes"
  ON visitor_passes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM properties p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE p.id = visitor_passes.property_id
      AND om.user_id = auth.uid()
    )
  );

-- Visitor events policies
CREATE POLICY "Security can log visitor events"
  ON visitor_events FOR INSERT
  TO authenticated
  WITH CHECK (
    validated_by = auth.uid()
  );

CREATE POLICY "Property org members can view visitor events"
  ON visitor_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM visitor_passes vp
      JOIN properties p ON p.id = vp.property_id
      JOIN org_members om ON om.org_id = p.org_id
      WHERE vp.id = visitor_events.visitor_pass_id
      AND om.user_id = auth.uid()
    )
  );

-- Products policies
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (active = true);

-- Orders policies
CREATE POLICY "Users can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orders.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role IN ('owner', 'staff')
    )
  );

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Deliveries policies
CREATE POLICY "Order participants can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = deliveries.order_id
      AND (
        o.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM org_members om
          WHERE om.org_id = o.org_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'staff')
        )
      )
    )
  );

-- Subscriptions policies
CREATE POLICY "Owners can view their subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = subscriptions.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'owner'
    )
  );

-- Vendor reviews policies
CREATE POLICY "Anyone can view vendor reviews"
  ON vendor_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Work order creator can leave review"
  ON vendor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = vendor_reviews.work_order_id
      AND work_orders.created_by = auth.uid()
      AND work_orders.status = 'completed'
    )
  );

-- Audit logs policies
CREATE POLICY "Org owners can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = audit_logs.org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'owner'
    )
  );

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_org_id ON properties(org_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_id ON work_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_sla_due_at ON work_orders(sla_due_at);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_visitor_passes_property_id ON visitor_passes(property_id);
CREATE INDEX IF NOT EXISTS idx_visitor_passes_code ON visitor_passes(code);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
