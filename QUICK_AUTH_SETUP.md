# ⚡ CRÉATION DES UTILISATEURS AUTH - 2 ÉTAPES SIMPLES

## ✅ Déjà fait automatiquement:
- ✅ Migration RLS appliquée
- ✅ Tables créées (users, containers, etc.)
- ✅ Code mis à jour
- ✅ **Projet Supabase: lveqqmkyludigtgfqmwl**

---

## 🎯 CE QU'IL VOUS RESTE À FAIRE (2 minutes)

### Étape 1: Créer les utilisateurs Auth (1 min)

**Allez sur:** https://supabase.com/dashboard/project/lveqqmkyludigtgfqmwl/auth/users

Cliquez sur **"Add User"** → **"Create new user"** et créez chaque utilisateur:

#### Utilisateur 1 - Admin
```
Email: admin@depot.com
Password: demo123
✓ Cochez "Auto Confirm User"
```

#### Utilisateur 2 - Opérateur
```
Email: operator@depot.com
Password: demo123
✓ Cochez "Auto Confirm User"
```

#### Utilisateur 3 - Gate Officer
```
Email: gate@depot.com
Password: demo123
✓ Cochez "Auto Confirm User"
```

#### Utilisateur 4 - Superviseur
```
Email: supervisor@depot.com
Password: demo123
✓ Cochez "Auto Confirm User"
```

#### Utilisateur 5 - Viewer
```
Email: viewer@depot.com
Password: demo123
✓ Cochez "Auto Confirm User"
```

**⚠️ IMPORTANT:** Cochez TOUJOURS "Auto Confirm User" pour éviter la vérification d'email!

---

### Étape 2: Lier les utilisateurs à la base de données (1 min)

**Allez sur:** https://supabase.com/dashboard/project/lveqqmkyludigtgfqmwl/sql/new

**Copiez et exécutez ce SQL:**

```sql
-- Lier les auth users aux profils users
UPDATE public.users u
SET auth_user_id = auth.id
FROM auth.users auth
WHERE u.email = auth.email
AND u.auth_user_id IS NULL;

-- Vérifier (doit afficher 5 utilisateurs "✓ Linked")
SELECT
  u.email,
  u.name,
  u.role,
  CASE
    WHEN u.auth_user_id IS NOT NULL THEN '✓ Linked'
    ELSE '✗ Not linked'
  END as status
FROM public.users u
ORDER BY u.email;
```

**Vous devriez voir:**
```
admin@depot.com      | Admin User        | admin      | ✓ Linked
gate@depot.com       | Alice Gate Officer| operator   | ✓ Linked
operator@depot.com   | Mike Operator     | operator   | ✓ Linked
supervisor@depot.com | John Supervisor   | supervisor | ✓ Linked
viewer@depot.com     | Sarah Viewer      | viewer     | ✓ Linked
```

---

## 🎉 C'EST FAIT! Testez la connexion

1. Démarrez l'app: `npm run dev`
2. Allez sur: http://localhost:5173/login
3. Connectez-vous avec:
   - **Email:** admin@depot.com
   - **Password:** demo123

**Vous devriez être redirigé vers le tableau de bord!** 🚀

---

## 🔗 LIENS RAPIDES

| Action | Lien |
|--------|------|
| **Créer Auth Users** | https://supabase.com/dashboard/project/lveqqmkyludigtgfqmwl/auth/users |
| **SQL Editor (lien)** | https://supabase.com/dashboard/project/lveqqmkyludigtgfqmwl/sql/new |
| **Dashboard Supabase** | https://supabase.com/dashboard/project/lveqqmkyludigtgfqmwl |
| **App Login** | http://localhost:5173/login |

---

## 📋 Utilisateurs disponibles après création

| Email | Password | Rôle | Accès |
|-------|----------|------|-------|
| admin@depot.com | demo123 | Admin | Accès complet |
| operator@depot.com | demo123 | Opérateur | Gate In/Out, Containers |
| gate@depot.com | demo123 | Opérateur | Gate operations |
| supervisor@depot.com | demo123 | Superviseur | Operations + Reports |
| viewer@depot.com | demo123 | Viewer | Lecture seule |

---

## ⚠️ Problèmes courants

### "Invalid login credentials"
**Cause:** Utilisateur auth pas encore créé
**Solution:** Créer l'utilisateur dans l'Étape 1

### "User profile not found"
**Cause:** Auth user créé mais pas lié
**Solution:** Exécuter le SQL de l'Étape 2

### "Account deactivated"
**Cause:** Le champ `active` est à `false`
**Solution:**
```sql
UPDATE public.users SET active = true WHERE email = 'admin@depot.com';
```

---

## ✅ Checklist

- [ ] 5 utilisateurs auth créés dans Supabase Dashboard
- [ ] SQL de liaison exécuté
- [ ] Les 5 utilisateurs montrent "✓ Linked"
- [ ] Test de connexion réussi avec admin@depot.com
- [ ] Déconnexion testée
- [ ] Autres rôles testés

---

**⏱️ Temps estimé: 2-3 minutes**

**Status:** Prêt à exécuter maintenant!

---

## 💡 Après la connexion

Une fois connecté, vous pouvez:
- ✅ Voir le dashboard
- ✅ Gérer les containers
- ✅ Faire des opérations Gate In/Out
- ✅ Créer des release orders
- ✅ Voir les rapports (selon votre rôle)
- ✅ La session persiste (reste connecté)
- ✅ Token auto-refresh toutes les 55 minutes

**🎊 Tout est configuré! Il ne reste plus qu'à créer les auth users!**
