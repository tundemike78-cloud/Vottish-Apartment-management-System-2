/*
  # Add Vendor Inventory System for Gas Store

  ## Overview
  This migration adds the ability for vendors to manage their own gas product inventory
  that customers can browse and order from.

  ## New Tables
  1. `vendor_products`
    - Links vendors to products they sell
    - Allows vendors to set their own pricing and stock levels
    - Tracks inventory availability

  ## Changes
  1. Create vendor_products table
  2. Add RLS policies for vendor product management
  3. Create indexes for performance

  ## Security
  - Vendors can only manage their own products
  - Customers can view all available vendor products
  - Stock levels are enforced
*/

-- Create vendor_products table
CREATE TABLE IF NOT EXISTS public.vendor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  delivery_time_hours integer DEFAULT 24,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, product_id)
);

-- Enable RLS
ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own products
CREATE POLICY "Vendors can view own products"
  ON public.vendor_products FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Anyone can view available vendor products
CREATE POLICY "Anyone can view available vendor products"
  ON public.vendor_products FOR SELECT
  TO authenticated
  USING (available = true AND stock_quantity > 0);

-- Vendors can insert their own products
CREATE POLICY "Vendors can add own products"
  ON public.vendor_products FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can update their own products
CREATE POLICY "Vendors can update own products"
  ON public.vendor_products FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can delete their own products
CREATE POLICY "Vendors can delete own products"
  ON public.vendor_products FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_id ON public.vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_product_id ON public.vendor_products(product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_available ON public.vendor_products(available) WHERE available = true;

-- Add vendor_product_id to orders to track which vendor fulfilled the order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vendor_product_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN vendor_product_id uuid REFERENCES public.vendor_products(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_vendor_product_id ON public.orders(vendor_product_id);
