# 🔐 CREATE SUPABASE AUTH USERS - MANUAL STEPS

## ⚠️ IMPORTANT: Auth Users Need to Be Created Manually

The Supabase service role key is not available in this environment, so auth users must be created manually through the Supabase Dashboard.

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **bvwwapktqvxyqlbtqoxa**

### Step 2: Navigate to Authentication

1. In the left sidebar, click **Authentication**
2. Click **Users** tab

### Step 3: Create Each User

Click **"Add User"** → **"Create new user"** and enter:

#### User 1: Admin
```
Email: admin@depot.com
Password: demo123
✓ Auto Confirm User (check this box!)
```

#### User 2: Operator
```
Email: operator@depot.com
Password: demo123
✓ Auto Confirm User (check this box!)
```

#### User 3: Gate Officer
```
Email: gate@depot.com
Password: demo123
✓ Auto Confirm User (check this box!)
```

#### User 4: Supervisor
```
Email: supervisor@depot.com
Password: demo123
✓ Auto Confirm User (check this box!)
```

#### User 5: Viewer
```
Email: viewer@depot.com
Password: demo123
✓ Auto Confirm User (check this box!)
```

**IMPORTANT:** Always check **"Auto Confirm User"** to skip email verification!

### Step 4: Link Auth Users to Public Users Table

After creating the auth users, run this SQL to link them:

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste this SQL:

```sql
-- Link auth users to public.users by email
UPDATE public.users u
SET auth_user_id = auth.id
FROM auth.users auth
WHERE u.email = auth.email
AND u.auth_user_id IS NULL;

-- Verify linking
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.auth_user_id,
  CASE
    WHEN u.auth_user_id IS NOT NULL THEN '✓ Linked'
    ELSE '✗ Not linked'
  END as status
FROM public.users u
ORDER BY u.email;
```

3. Click **Run**
4. Verify all users show "✓ Linked"

---

## ✅ VERIFICATION

### Test Login

1. Go to your app: http://localhost:5173/login
2. Try logging in with:
   - **Email:** admin@depot.com
   - **Password:** demo123

3. You should be redirected to the dashboard

### Test Different Roles

Try each user to verify permissions:

| Email | Password | Expected Access |
|-------|----------|-----------------|
| admin@depot.com | demo123 | Full access (all modules) |
| operator@depot.com | demo123 | Gate In/Out, Containers |
| gate@depot.com | demo123 | Gate operations only |
| supervisor@depot.com | demo123 | Operations + Reports |
| viewer@depot.com | demo123 | Read-only access |

---

## 🔧 TROUBLESHOOTING

### "Invalid login credentials"

**Causes:**
1. Auth user not created yet → Create in Dashboard
2. Wrong password → Use exactly "demo123"
3. Email not confirmed → Check "Auto Confirm User" was checked

**Solution:** Recreate the user with auto-confirm enabled

### "User profile not found"

**Cause:** Auth user exists but not linked to public.users

**Solution:** Run the SQL linking query from Step 4

### "Account deactivated"

**Cause:** User's `active` field is false

**Solution:**
```sql
UPDATE public.users
SET active = true
WHERE email = 'admin@depot.com';
```

---

## 📝 CURRENT DATABASE USERS

These users exist in `public.users` and need auth users created:

| Email | Name | Role | Auth Linked? |
|-------|------|------|--------------|
| admin@depot.com | Admin User | admin | ⏳ Pending |
| operator@depot.com | Mike Operator | operator | ⏳ Pending |
| gate@depot.com | Alice Gate Officer | operator | ⏳ Pending |
| supervisor@depot.com | John Supervisor | supervisor | ⏳ Pending |
| viewer@depot.com | Sarah Viewer | viewer | ⏳ Pending |

---

## 🎯 WHAT HAPPENS AFTER LINKING

Once auth users are created and linked:

1. **Login Works** ✅
   - User enters email/password
   - Supabase Auth validates
   - App loads user profile from public.users

2. **Session Persists** ✅
   - User stays logged in
   - Token auto-refreshes
   - Session lasts 7 days

3. **RLS Enforced** ✅
   - All queries check auth.uid()
   - Users only see allowed data
   - Role-based access works

4. **Audit Logging** ✅
   - Last login tracked
   - All actions logged
   - Full traceability

---

## 🚀 AFTER COMPLETION

Once all 5 users are created and linked:

- [x] Auth migration applied
- [x] RLS policies updated
- [ ] Auth users created (5 users)
- [ ] Auth users linked to public.users
- [ ] Login tested (admin@depot.com)
- [ ] All roles tested
- [ ] Session persistence verified

**Next:** Test the application with real authentication!

---

## 📞 NEED HELP?

If you encounter issues:

1. Check Supabase logs (Dashboard → Logs)
2. Check browser console for errors
3. Verify RLS policies are active
4. Confirm auth users are confirmed (not pending)

---

**⏱️ Estimated Time: 5-10 minutes**

**Created:** 2025-10-12
**Status:** Ready to execute
