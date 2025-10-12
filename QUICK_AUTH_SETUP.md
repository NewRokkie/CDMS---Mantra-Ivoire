# ⚡ QUICK AUTH SETUP - 3 MINUTES

## ✅ Migration Already Applied!

The auth migration has been successfully applied to your database. Now you just need to create the auth users.

---

## 🎯 WHAT YOU NEED TO DO (2 Steps)

### Step 1: Create Auth Users (2 min)

Go to: **Supabase Dashboard → Authentication → Users → Add User**

Create these 5 users (copy/paste each):

```
Email: admin@depot.com
Password: demo123
✓ Auto Confirm User
```

```
Email: operator@depot.com
Password: demo123
✓ Auto Confirm User
```

```
Email: gate@depot.com
Password: demo123
✓ Auto Confirm User
```

```
Email: supervisor@depot.com
Password: demo123
✓ Auto Confirm User
```

```
Email: viewer@depot.com
Password: demo123
✓ Auto Confirm User
```

### Step 2: Link Auth Users (1 min)

Go to: **Supabase Dashboard → SQL Editor**

Run this SQL:

```sql
UPDATE public.users u
SET auth_user_id = auth.id
FROM auth.users auth
WHERE u.email = auth.email
AND u.auth_user_id IS NULL;

-- Verify (should show 5 users as "✓ Linked")
SELECT
  u.email,
  u.role,
  CASE WHEN u.auth_user_id IS NOT NULL THEN '✓ Linked' ELSE '✗ Not linked' END as status
FROM public.users u
ORDER BY u.email;
```

---

## 🎉 DONE! Test Login

1. Go to: http://localhost:5173/login
2. Email: **admin@depot.com**
3. Password: **demo123**
4. Click **Se connecter**

You should be logged in and see the dashboard! 🚀

---

## 📋 What Was Done Automatically

- ✅ Auth migration applied
- ✅ RLS policies updated with auth.uid()
- ✅ All 7 tables secured
- ✅ Trigger functions created
- ✅ Permissions granted
- ✅ useAuth hook updated
- ✅ Build tested (7.37s - successful)

## ⏳ What You Need to Do Manually

- [ ] Create 5 auth users in Dashboard
- [ ] Run SQL to link users
- [ ] Test login

**Total time: ~3 minutes**

---

## 🔗 Helpful Links

**Supabase Dashboard:**
https://supabase.com/dashboard/project/bvwwapktqvxyqlbtqoxa

**Create Users:**
https://supabase.com/dashboard/project/bvwwapktqvxyqlbtqoxa/auth/users

**SQL Editor:**
https://supabase.com/dashboard/project/bvwwapktqvxyqlbtqoxa/sql

**App Login:**
http://localhost:5173/login

---

## ⚠️ Common Issues

**"Invalid credentials"** → Auth user not created yet
**"User profile not found"** → Run linking SQL
**"Account deactivated"** → User is inactive in database

---

## 💡 After Login Works

Test each role to verify permissions:
- **admin@depot.com** → Full access
- **operator@depot.com** → Gate operations
- **supervisor@depot.com** → Operations + Reports
- **gate@depot.com** → Gate only
- **viewer@depot.com** → Read-only

---

**Status:** ✅ Ready to use after manual auth user creation

**Documentation:** See CREATE_AUTH_USERS_MANUAL.md for detailed instructions
