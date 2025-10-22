import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  orgName: string;
  propertyName: string;
  propertyAddress: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password, name, orgName, propertyName, propertyAddress }: SignupRequest = await req.json();

    if (!email || !password || !name || !orgName || !propertyName || !propertyAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('[Signup] Starting signup for:', email);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      console.error('[Signup] Auth error:', authError);
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'This email is already registered. Please sign in instead.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user returned from signup');
    }

    console.log('[Signup] Auth user created:', authData.user.id);

    const userId = authData.user.id;

    const { error: userProfileError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        role: 'owner',
      });

    if (userProfileError) {
      console.error('[Signup] User profile error:', userProfileError);
      await adminClient.auth.admin.deleteUser(userId);
      throw userProfileError;
    }

    console.log('[Signup] User profile created');

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: orgName })
      .select()
      .single();

    if (orgError || !org) {
      console.error('[Signup] Organization error:', orgError);
      await adminClient.auth.admin.deleteUser(userId);
      throw orgError || new Error('Failed to create organization');
    }

    console.log('[Signup] Organization created:', org.id);

    const { error: memberError } = await adminClient
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('[Signup] Org member error:', memberError);
      await adminClient.auth.admin.deleteUser(userId);
      throw memberError;
    }

    console.log('[Signup] Org membership created');

    const { error: propertyError } = await adminClient
      .from('properties')
      .insert({
        org_id: org.id,
        name: propertyName,
        address: propertyAddress,
        type: 'apartment',
      });

    if (propertyError) {
      console.error('[Signup] Property error:', propertyError);
      await adminClient.auth.admin.deleteUser(userId);
      throw propertyError;
    }

    console.log('[Signup] Property created');

    const { error: subscriptionError } = await adminClient
      .from('subscriptions')
      .insert({
        org_id: org.id,
        plan: 'free',
        status: 'active',
      });

    if (subscriptionError) {
      console.error('[Signup] Subscription error:', subscriptionError);
      await adminClient.auth.admin.deleteUser(userId);
      throw subscriptionError;
    }

    console.log('[Signup] Subscription created');

    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      console.error('[Signup] Session creation error:', sessionError);
      throw sessionError || new Error('Failed to create session');
    }

    console.log('[Signup] Session created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData.session,
        user: sessionData.user,
        orgId: org.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Signup] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred during signup',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
