import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  })
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: 'sysadmin' | 'owner' | 'staff' | 'vendor' | 'tenant' | 'security';
  last_login_at?: string;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  billing_tier: 'free' | 'premium';
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
};

export type OrgMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'staff' | 'vendor' | 'tenant' | 'security';
  invited_by?: string;
  joined_at: string;
  created_at: string;
};

export type Property = {
  id: string;
  org_id: string;
  name: string;
  type: 'apartment' | 'estate' | 'subdivision' | 'complex';
  address: string;
  location?: any;
  timezone: string;
  units_count: number;
  amenities: any[];
  documents: any[];
  created_at: string;
  updated_at: string;
};

export type WorkOrder = {
  id: string;
  org_id: string;
  property_id: string;
  unit_id?: string;
  created_by: string;
  assigned_to_user_id?: string;
  assigned_vendor_id?: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'painting' | 'carpentry' | 'appliance' | 'pest' | 'landscaping' | 'other';
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'on_hold' | 'completed' | 'closed' | 'cancelled';
  sla_due_at?: string;
  cost: number;
  parts_used: any[];
  before_photos: string[];
  after_photos: string[];
  completed_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
};

export type Vendor = {
  id: string;
  user_id?: string;
  org_id?: string;
  company_name: string;
  trades: string[];
  service_radius_km: number;
  verified: boolean;
  license_doc_url?: string;
  license_expiry_date?: string;
  insurance_doc_url?: string;
  insurance_expiry_date?: string;
  rating: number;
  total_jobs: number;
  location?: any;
  created_at: string;
  updated_at: string;
};

export type VisitorPass = {
  id: string;
  property_id: string;
  unit_id?: string;
  code: string;
  qr_url?: string;
  starts_at: string;
  ends_at: string;
  max_uses: number;
  used_count: number;
  purpose?: string;
  notes?: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  size?: string;
  price: number;
  active: boolean;
  is_gas_cylinder: boolean;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  org_id: string;
  property_id: string;
  unit_id?: string;
  user_id: string;
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_intent_id?: string;
  items: any;
  created_at: string;
  updated_at: string;
};

export type Lease = {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string;
  primary_tenant_id?: string;
  tenant_ids: string[];
  start_date: string;
  end_date: string;
  rent_amount: number;
  rent_currency: string;
  rent_schedule: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  deposit_amount?: number;
  documents: any[];
  status: 'draft' | 'active' | 'ending_soon' | 'ended' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type Portfolio = {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  property_ids: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type Unit = {
  id: string;
  property_id: string;
  unit_number: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  rent_amount?: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Resident = {
  id: string;
  unit_id?: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  move_in_date?: string;
  move_out_date?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type VendorProduct = {
  id: string;
  vendor_id: string;
  product_id: string;
  price: number;
  stock_quantity: number;
  available: boolean;
  delivery_time_hours: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};
