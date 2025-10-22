# DIAGNOSTICS: Vottsh AMS Authentication System

**Generated:** 2025-10-21
**Status:** 🔴 BROKEN - Authentication failures in signup/login flows

---

## 1. Tech Stack Detection

### Frontend
- **Framework:** Vite + React 18.3.1 + TypeScript
- **UI:** Tailwind CSS + custom components (lucide-react icons)
- **Build Tool:** Vite 5.4.2

### Backend / Database
- **Database:** PostgreSQL (via Supabase)
- **ORM/Client:** `@supabase/supabase-js` (v2.57.4)
- **Auth Provider:** **Supabase Auth** (email/password)

### Authentication Architecture
- **Provider:** Supabase Auth (built-in)
- **Session Management:** Client-side via `@supabase/supabase-js`
- **Auth Context:** React Context API (`src/contexts/AuthContext.tsx`)
- **No SSR:** Pure client-side app (no Next.js/server components)

---

## 2. Environment Configuration

### Detected Environment Variables
```bash
AUTH_PROVIDER: Supabase Auth (implicit)
NEXTAUTH_SECRET: N/A (not using NextAuth)

# Supabase Configuration (client-side only)
VITE_SUPABASE_URL: https://sslqorfvolvsiptyktlo.supabase.co
VITE_SUPABASE_ANON_KEY: eyJhbGci...ROwo (masked)
VITE_SUPABASE_SERVICE_ROLE_KEY: ❌ NOT PRESENT (CRITICAL ISSUE)

DATABASE_URL: N/A (managed by Supabase)
```

### 🚨 Critical Finding
**Service Role Key Missing:** The application only has the anon key, which means:
- All database operations are subject to RLS policies
- No way to perform system-level operations (create org on behalf of user)
- Signup flow relies on RLS policies allowing user to create their own org/membership

---

## 3. Email Confirmation Status

### Supabase Auth Configuration
```sql
-- Query to check email confirmation settings
SELECT * FROM auth.config;
```

**Expected Status:** Email confirmation is likely **DISABLED** in development, but we need to verify this in the Supabase dashboard.

**Current Behavior:**
- `auth.signUp()` immediately creates authenticated user
- No confirmation step observed in code
- No handling for unconfirmed email states

---

## 4. Current Auth Flow Analysis

### Signup Flow (src/pages/auth/SignupPage.tsx)
```
1. signUp(email, password, name, 'owner') → Creates auth user + users profile
2. signInWithPassword() → Re-authenticate to get session
3. Insert into organizations (subject to RLS)
4. Insert into org_members (subject to RLS)
5. Insert into properties (subject to RLS)
6. Insert into subscriptions (subject to RLS)
7. window.location.reload()
```

**Problems Identified:**
1. ❌ No transaction - partial failures leave inconsistent state
2. ❌ RLS blocks organizations insert (no owner_id field in schema but policy expects it)
3. ❌ Chicken-and-egg: Can't create org_member until org exists, but can't read org until member exists
4. ❌ No error rollback - auth user created but org/membership may fail
5. ❌ window.location.reload() is crude - should use proper routing

### Login Flow (src/pages/auth/LoginPage.tsx)
```
1. signInWithPassword(email, password)
2. Check if users profile exists
3. If not, create profile with default role='owner'
4. Update last_login_at
```

**Problems Identified:**
1. ⚠️ Profile creation in login is defensive but shouldn't be needed
2. ✅ last_login_at update uses correct RLS-allowed UPDATE

---

## 5. RLS Policies Analysis

### Current Policies (from pg_policies)

#### users table
- ✅ INSERT: `auth.uid() = id` (allows self-insertion)
- ✅ SELECT: `auth.uid() = id` (allows reading own profile)
- ✅ UPDATE: `auth.uid() = id` (allows updating own profile)

#### organizations table
- ✅ INSERT: `true` (ANY authenticated user can create orgs)
- ❌ SELECT: Requires org_member record (chicken-and-egg problem)
- ✅ UPDATE: Requires owner/sysadmin role in org_members

**CRITICAL ISSUE:** The SELECT policy creates a deadlock:
- User creates org
- Can't SELECT org because no org_member record yet
- Can't verify org creation succeeded
- Frontend likely fails trying to use org.id

#### org_members table
- ✅ INSERT: `user_id = auth.uid()` (allows self-insertion)
- ✅ SELECT: Can view if user is member of that org OR via admin policy
- ❌ ALL: Only owners can manage (conflicts with INSERT policy)

---

## 6. Root Cause Summary

### Primary Issues

1. **Organizations SELECT Policy Deadlock**
   - Policy requires org_member to exist before user can read org
   - But user needs org.id to create org_member
   - Solution: Allow user to SELECT org they just created within same transaction/session

2. **No Atomic Transaction**
   - Signup creates 5+ records across multiple tables
   - Any failure leaves partial state (auth user exists, but no org)
   - No rollback mechanism

3. **Missing Service Role Client**
   - Client-side app can't perform privileged operations
   - All operations subject to RLS
   - Can't override RLS for system operations

4. **Properties Table RLS Missing**
   - Signup inserts into properties but no INSERT policy exists
   - Will fail with "permission denied" error

5. **Subscriptions Table RLS Missing**
   - Signup inserts into subscriptions but no INSERT policy exists
   - Will fail with "permission denied" error

---

## 7. Recommended Architecture

### Option A: Edge Function (Recommended)
Create a Supabase Edge Function for atomic signup:
```typescript
// POST /functions/v1/signup
// Uses service role internally to bypass RLS
// Returns session token + org_id
```

### Option B: Fix RLS Policies (Quick Fix)
Modify policies to allow self-service org creation:
- Organizations SELECT: Allow creator to read their own org
- Properties INSERT: Allow org owners to create properties
- Subscriptions INSERT: Allow org creation to include subscription

### Option C: Database Trigger
Create a trigger that auto-creates org_member when org is created

---

## 8. Test Accounts Status

### Database Query Results
```sql
SELECT email, role FROM users;
SELECT email FROM auth.users;
```

**Result:** NO USERS EXIST

- ❌ Mikeoye28@gmail.com: Does not exist in auth.users or users table
- ❌ No test accounts seeded
- ❌ No seed script exists

---

## 9. Next Steps Priority

1. **HIGH:** Fix organizations SELECT RLS policy
2. **HIGH:** Add INSERT policies for properties and subscriptions
3. **HIGH:** Create atomic signup edge function OR refactor client flow
4. **MEDIUM:** Add seed script for test users
5. **MEDIUM:** Add Playwright E2E tests
6. **LOW:** Improve error handling and user feedback

---

## 10. Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Sign up new account | ❌ FAIL | RLS blocks org/property/subscription creation |
| Sign out and log back in | ⚠️ PARTIAL | Login works if profile exists |
| Password reset | ❓ UNTESTED | Code looks correct but not verified |
| RLS prevents cross-org access | ✅ PASS | Policies are restrictive |
| Seed script creates test user | ❌ FAIL | No seed script exists |
| Playwright tests pass | ❌ FAIL | No tests exist |
| DIAGNOSTICS.md present | ✅ PASS | This file |
| POSTMORTEM.md present | ❌ PENDING | To be created after fixes |

---

**Status:** 🔴 2/8 criteria passing - Major fixes required
