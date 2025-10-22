import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  orgName: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'Mikeoye28@gmail.com',
    password: 'Test@12345',
    name: 'Mike Oye',
    role: 'owner',
    orgName: 'Vottsh Test Org',
  },
  {
    email: 'tenant+demo@vottsh.test',
    password: 'Test@12345',
    name: 'Demo Tenant',
    role: 'tenant',
    orgName: 'Tenant Test Org',
  },
  {
    email: 'vendor+demo@vottsh.test',
    password: 'Test@12345',
    name: 'Demo Vendor',
    role: 'vendor',
    orgName: 'Vendor Test Org',
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('[Seed] Starting to seed test users...');

    const results = [];

    for (const testUser of TEST_USERS) {
      try {
        console.log(`[Seed] Processing user: ${testUser.email}`);

        const { data: existingAuthUser } = await adminClient.auth.admin.listUsers();
        const userExists = existingAuthUser?.users?.find(u => u.email === testUser.email);

        if (userExists) {
          console.log(`[Seed] User ${testUser.email} already exists, skipping...`);
          results.push({ email: testUser.email, status: 'skipped', reason: 'already exists' });
          continue;
        }

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: { name: testUser.name },
        });

        if (authError) {
          console.error(`[Seed] Auth error for ${testUser.email}:`, authError);
          results.push({ email: testUser.email, status: 'error', error: authError.message });
          continue;
        }

        if (!authData.user) {
          throw new Error('No user returned');
        }

        const userId = authData.user.id;

        await adminClient.from('users').insert({
          id: userId,
          email: testUser.email,
          name: testUser.name,
          role: testUser.role,
        });

        const { data: org } = await adminClient
          .from('organizations')
          .insert({ name: testUser.orgName })
          .select()
          .single();

        if (!org) {
          throw new Error('Failed to create org');
        }

        await adminClient.from('org_members').insert({
          org_id: org.id,
          user_id: userId,
          role: testUser.role === 'owner' ? 'owner' : testUser.role,
        });

        await adminClient.from('properties').insert({
          org_id: org.id,
          name: `${testUser.name}'s Property`,
          address: '123 Test Street, Test City, TC 12345',
          type: 'apartment',
        });

        await adminClient.from('subscriptions').insert({
          org_id: org.id,
          plan: 'free',
          status: 'active',
        });

        if (testUser.role === 'vendor') {
          await adminClient.from('vendors').insert({
            user_id: userId,
            company_name: `${testUser.name} Services`,
            trades: ['plumbing', 'electrical'],
            verified: false,
          });
        }

        console.log(`[Seed] Successfully created user: ${testUser.email}`);
        results.push({ email: testUser.email, status: 'created', userId, orgId: org.id });
      } catch (error: any) {
        console.error(`[Seed] Error processing ${testUser.email}:`, error);
        results.push({ email: testUser.email, status: 'error', error: error.message });
      }
    }

    console.log('[Seed] Seeding complete!');

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Seed] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to seed users',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
