-- Run against a disposable Supabase database after all migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/org_members_authorization.sql
-- All fixtures and successful writes are rolled back.
BEGIN;

INSERT INTO public.users (id, email, name, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'owner@membership-test.invalid', 'Owner', 'owner'),
  ('10000000-0000-0000-0000-000000000002', 'outsider@membership-test.invalid', 'Outsider', 'owner'),
  ('10000000-0000-0000-0000-000000000003', 'tenant@membership-test.invalid', 'Tenant', 'tenant'),
  ('10000000-0000-0000-0000-000000000004', 'invitee@membership-test.invalid', 'Invitee', 'tenant');

INSERT INTO public.organizations (id, name) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Protected organization'),
  ('20000000-0000-0000-0000-000000000002', 'Outsider organization');

-- Privileged bootstrap mirrors auth-signup's service-role inserts.
INSERT INTO public.org_members (org_id, user_id, role) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'owner'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'tenant');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

DO $$
DECLARE requested_role text;
BEGIN
  -- Owning another organization must not authorize self-enrollment here,
  -- even at a lower privilege level.
  FOREACH requested_role IN ARRAY ARRAY['owner', 'staff', 'vendor', 'tenant', 'security']
  LOOP
    BEGIN
      INSERT INTO public.org_members (org_id, user_id, role) VALUES
        ('20000000-0000-0000-0000-000000000001', auth.uid(), requested_role);
      RAISE EXCEPTION 'Self-enrollment unexpectedly succeeded for role %', requested_role;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

DO $$
DECLARE changed integer;
BEGIN
  UPDATE public.org_members SET role = 'owner' WHERE user_id = auth.uid();
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'Tenant unexpectedly promoted their own membership';
  END IF;
  BEGIN
    INSERT INTO public.org_members (org_id, user_id, role) VALUES
      ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'owner');
    RAISE EXCEPTION 'Tenant unexpectedly granted owner access';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Authorized owner membership management must still work.
INSERT INTO public.org_members (org_id, user_id, role) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'staff');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = '20000000-0000-0000-0000-000000000001'
      AND user_id = '10000000-0000-0000-0000-000000000004'
      AND role = 'staff'
  ) THEN
    RAISE EXCEPTION 'Authorized owner could not add a member';
  END IF;
END $$;

ROLLBACK;
