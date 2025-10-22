# 🚀 Quick Start Guide - Vottsh AMS

## For the User (You!)

### 1. Create Test Users (ONE TIME)
```bash
./scripts/seed-auth.sh
```

**This creates 3 ready-to-use accounts:**
- ✅ Mikeoye28@gmail.com / Test@12345 (Owner)
- ✅ tenant+demo@vottsh.test / Test@12345 (Tenant)
- ✅ vendor+demo@vottsh.test / Test@12345 (Vendor)

### 2. Login and Test
1. Open the app (it's running)
2. Use: **Mikeoye28@gmail.com** / **Test@12345**
3. You should see your dashboard immediately

### 3. Sign Up New Account (Optional)
1. Click "Sign up"
2. Fill in ALL fields:
   - Full Name: Your Name
   - Email: your@email.com
   - Password: Test@12345 (or better)
   - Organization Name: My Company
   - Property Name: My Building
   - Address: 123 Main Street
3. Click "Create Account"
4. You'll be redirected to dashboard automatically

---

## Test Credentials Cheat Sheet

```
OWNER ACCOUNT:
Email: Mikeoye28@gmail.com
Password: Test@12345
Access: Full system access, can manage org

TENANT ACCOUNT:
Email: tenant+demo@vottsh.test
Password: Test@12345
Access: Limited to tenant features

VENDOR ACCOUNT:
Email: vendor+demo@vottsh.test
Password: Test@12345
Access: Vendor features, not verified yet
```

---

## Common Issues & Fixes

### "Can't log in"
✅ **Fix:** Run seed script first: `./scripts/seed-auth.sh`

### "Signup fails"
✅ **Fix:** Check all fields are filled, especially org name and property details

### "See errors in console"
✅ **Fix:** Refresh the page (auth state might need sync)

### "Want to test signup without creating real account"
✅ **Fix:** Use `test+anything@vottsh.test` format - these are throwaway emails

---

## What Works Now

✅ **Signup** - Create new accounts with org/property
✅ **Login** - Sign in with email/password
✅ **Logout** - Sign out cleanly
✅ **Password Reset** - Request reset email
✅ **Session Management** - Stay logged in across refreshes
✅ **RLS Security** - Data isolated by organization

---

## For Developers

### Run Tests
```bash
# E2E tests (requires dev server running)
npm run test:e2e

# Interactive test UI
npm run test:e2e:ui

# See browser while testing
npm run test:e2e:headed
```

### Seed Test Data
```bash
npm run db:seed:auth
```

### Build for Production
```bash
npm run build
```

### Check Migration Status
Go to Supabase Dashboard → SQL Editor → Check applied migrations

---

## Architecture At-A-Glance

```
Signup Flow:
Browser → Edge Function (auth-signup) → Creates:
  ✓ Auth User
  ✓ User Profile
  ✓ Organization
  ✓ Org Membership
  ✓ Property
  ✓ Subscription
→ Returns Session → Browser redirects to Dashboard

Login Flow:
Browser → Supabase Auth → Session Token → Dashboard

Security:
- RLS enabled on all tables
- Org isolation enforced
- Time-based grace periods for signup
- Service role only in Edge Functions
```

---

## Documentation Index

- **DIAGNOSTICS.md** - Complete tech stack analysis
- **POSTMORTEM.md** - What broke and how we fixed it
- **AUTH_FIX_SUMMARY.md** - Comprehensive change log
- **QUICK_START.md** - This file (quickest way to get started)

---

## Next Steps

1. ✅ Login with test account
2. ✅ Explore dashboard
3. ✅ Try creating work orders
4. ✅ Test visitor passes
5. ✅ Check gas store

**Everything should work now!** 🎉

---

**Need Help?** Check POSTMORTEM.md for detailed technical explanations.
