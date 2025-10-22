import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('[Seed] Starting database seed...');

    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const testUser = existingUser?.users?.find(u => u.email === 'Mikeoye28@gmail.com');

    if (!testUser) {
      return new Response(
        JSON.stringify({ error: 'Please run seed-auth first to create test users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: orgData } = await adminClient
      .from('org_members')
      .select('org_id')
      .eq('user_id', testUser.id)
      .single();

    if (!orgData) {
      return new Response(
        JSON.stringify({ error: 'User has no organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = orgData.org_id;

    const { data: existingProperties } = await adminClient
      .from('properties')
      .select('id')
      .eq('org_id', orgId);

    if (existingProperties && existingProperties.length > 0) {
      console.log('[Seed] Properties already exist, skipping...');
      return new Response(
        JSON.stringify({ success: true, message: 'Data already seeded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const properties = [
      {
        name: 'Sunset Apartments',
        address: '123 Sunset Blvd, Los Angeles, CA 90001',
        type: 'apartment',
        units_count: 12,
      },
      {
        name: 'Ocean View Estates',
        address: '456 Ocean Drive, Miami, FL 33139',
        type: 'estate',
        units_count: 8,
      },
      {
        name: 'Downtown Lofts',
        address: '789 Main Street, New York, NY 10001',
        type: 'apartment',
        units_count: 24,
      },
    ];

    const createdProperties = [];

    for (const prop of properties) {
      const { data: property, error: propError } = await adminClient
        .from('properties')
        .insert({
          org_id: orgId,
          ...prop,
          timezone: 'America/New_York',
          amenities: ['parking', 'gym', 'pool'],
          documents: [],
        })
        .select()
        .single();

      if (propError) throw propError;
      createdProperties.push(property);

      for (let i = 1; i <= prop.units_count; i++) {
        await adminClient.from('units').insert({
          property_id: property.id,
          unit_number: `${String(Math.floor((i-1) / 6) + 1)}0${((i-1) % 6) + 1}`,
          floor: Math.floor((i-1) / 6) + 1,
          bedrooms: [1, 2, 2, 3][i % 4],
          bathrooms: [1, 1.5, 2, 2.5][i % 4],
          sqft: 800 + (i % 4) * 200,
          rent_amount: 1200 + (i % 4) * 300,
          status: i % 3 === 0 ? 'vacant' : 'occupied',
        });
      }

      const statuses = ['new', 'triaged', 'assigned', 'in_progress', 'completed'];
      const categories = ['plumbing', 'electrical', 'hvac', 'painting', 'other'];
      const priorities = ['low', 'normal', 'high', 'critical'];

      for (let i = 0; i < 5; i++) {
        await adminClient.from('work_orders').insert({
          org_id: orgId,
          property_id: property.id,
          created_by: testUser.id,
          title: `${categories[i]} Issue ${i + 1}`,
          description: `Sample work order for ${categories[i]} maintenance`,
          category: categories[i],
          priority: priorities[i % 4],
          status: statuses[i],
          cost: 0,
          parts_used: [],
          before_photos: [],
          after_photos: [],
        });
      }
    }

    await adminClient.from('products').insert([
      {
        name: '6kg Gas Cylinder',
        sku: 'GAS-6KG',
        size: '6kg',
        price: 25.00,
        active: true,
        is_gas_cylinder: true,
        description: 'Standard 6kg gas cylinder for home use',
      },
      {
        name: '13kg Gas Cylinder',
        sku: 'GAS-13KG',
        size: '13kg',
        price: 45.00,
        active: true,
        is_gas_cylinder: true,
        description: 'Large 13kg gas cylinder',
      },
      {
        name: '50kg Gas Cylinder',
        sku: 'GAS-50KG',
        size: '50kg',
        price: 150.00,
        active: true,
        is_gas_cylinder: true,
        description: 'Commercial 50kg gas cylinder',
      },
    ]);

    console.log('[Seed] Database seeded successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        propertiesCreated: createdProperties.length,
        message: 'Database seeded with properties, units, work orders, and products',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Seed] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to seed database' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
